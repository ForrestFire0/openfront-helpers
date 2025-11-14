/**
 * Openfront Population Percentage Calculator
 *
 * This script finds a population counter in the Openfront game,
 * calculates the percentage, and adds it to the display.
 * Updates 10 times per second.
 */

// Configuration
const UPDATE_INTERVAL_MS = 100; // 10 times per second

// Interface for parsed population values
interface PopulationValues {
    current: number;
    maximum: number;
    percentage: number;
    growthMultiplier: number; // 0-1 factor representing current growth rate as a percentage of maximum possible growth rate
}

/**
 * Parses a population string like "50k / 10M" into numeric values
 * @param populationText The text containing the population values
 * @returns Object with current, maximum, and percentage values
 */
function parsePopulationValues(populationText: string): PopulationValues | null {
    // Match patterns like "50k / 10M" or "1.2M/5M" or "500/1000"
    const match = populationText.match(/(\d+(?:\.\d+)?)\s*([kKmMbB]?)\s*\/\s*(\d+(?:\.\d+)?)\s*([kKmMbB]?)/);

    if (!match) {
        return null;
    }

    // Calculate actual values
    const current = parseFloat(match[1]) * getMultiplier(match[2]);
    const maximum = parseFloat(match[3]) * getMultiplier(match[4]);

    // Calculate percentage (rounded to nearest 1%)
    const percentage = Math.round((current / maximum) * 100);
    // exponent & coefficient already simplified
    const maxGrowthRateForMaxPop = 10 + 0.07697433367625858 * maximum ** 0.73;
    const actualGrowthRate = 10 + (current ** 0.73) / 4 * (1 - current / maximum);
    const growthMultiplier = actualGrowthRate / maxGrowthRateForMaxPop;

    return {current, maximum, percentage, growthMultiplier};
}

/**
 * Converts a multiplier character (k, M, B) to its numeric value
 * @param multiplier The multiplier character
 * @returns The numeric value of the multiplier
 */
function getMultiplier(multiplier: string): number {
    if (!multiplier) return 1;

    switch (multiplier.toUpperCase()) {
        case 'K':
            return 1000;
        case 'M':
            return 1000000;
        case 'B':
            return 1000000000;
        default:
            return 1;
    }
}

/**
 * Updates the population display with the calculated percentage
 */
function updatePopulationDisplay(): void {
    // console.log('updating population display...')
    try {
        // Use the specific DOM path to get the population element
        const controlPanels = document.getElementsByTagName('control-panel');
        if (!controlPanels || controlPanels.length === 0) {
            // Control panel not found, schedule next update and skip this one
            setTimeout(updatePopulationDisplay, UPDATE_INTERVAL_MS);
            updateRecording(false, 0);
            return;
        }

        const populationElement = controlPanels[0].children[1].children[0].children[0].children[1];
        if (!populationElement) {
            // Population element not found, schedule next update and skip this one
            setTimeout(updatePopulationDisplay, UPDATE_INTERVAL_MS);
            updateRecording(false, 0);
            return;
        }

        // Cast to HTMLElement to access properties
        const htmlElement = populationElement as HTMLElement;

        // Get the text content for parsing (without modifying the DOM)
        let textContent = htmlElement.textContent || '';

        // Remove any existing percentage text nodes
        for (let i = 0; i < htmlElement.childNodes.length; i++) {
            const node = htmlElement.childNodes[i];
            if (node.nodeType === Node.TEXT_NODE && node.textContent && node.textContent.includes('%')) {
                htmlElement.removeChild(node);
                i--; // Adjust index since we removed a node
            }
        }

        // Extract the base text (without parentheses) for parsing
        const baseTextMatch = textContent.match(/^(.*?)(?:\s*\([^)]*\))?$/);
        const baseText = baseTextMatch ? baseTextMatch[1].trim() : textContent;

        const values = parsePopulationValues(baseText);


        if (!values) {
            console.log('NO GOOD VALUES, waiting 1 second and trying again...')
            setTimeout(updatePopulationDisplay, 1000);
            updateRecording(false, 0);
            return; // Couldn't parse the values, skip this update
        }

        updateRecording(true, values.current);

        // Find any existing span with parentheses
        let spanElement: HTMLElement | null = null;
        for (let i = 0; i < htmlElement.childNodes.length; i++) {
            const node = htmlElement.childNodes[i];
            if (node.nodeType === Node.ELEMENT_NODE && (node as HTMLElement).tagName === 'SPAN') {
                spanElement = node as HTMLElement;
                break;
            }
        }

        // Create our text node with both percentage and growth multiplier
        // Format the growth multiplier to be more readable (as a percentage of maximum growth)
        const metricsText = document.createTextNode(` pop: ${values.percentage}% g: ${((values.growthMultiplier).toFixed(2))}`);

        if (spanElement) {
            // If there's a span, insert before it
            htmlElement.insertBefore(metricsText, spanElement);
        } else {
            // If no span, just append to the end
            htmlElement.appendChild(metricsText);
        }

        // Schedule the next update
        setTimeout(updatePopulationDisplay, UPDATE_INTERVAL_MS);
    } catch (error) {
        console.error('Error updating population display (exiting)', error);
        // Schedule next update even after an error
        setTimeout(updatePopulationDisplay, UPDATE_INTERVAL_MS);
        updateRecording(false, 0);
    }
}

// Set up the first update to happen after a short delay
setTimeout(updatePopulationDisplay, UPDATE_INTERVAL_MS);

// Log that the extension is running
console.log('Openfront Population Percentage extension is active');

const GAME_STATES = {
    NOT_ACTIVE: 0,
    RECORDING: 1,
    DONE_RECORDING: 2,
}

let gameState = GAME_STATES.NOT_ACTIVE;
let gameStart = Date.now();
let recording: number[] = [];
let lastRecorded = 0;
let lastStorageSave = 0;
let currentGameId: string | null = null;

/**
 * Extracts the game ID from the URL
 * @returns The game ID or null if not found
 */
function getGameId(): string | null {
    // Sample URL: https://openfront.io/#join=DgUjVkVW
    const hashMatch = window.location.hash.match(/#join=([A-Za-z0-9]+)/);
    if (hashMatch && hashMatch[1]) {
        return hashMatch[1];
    }

    // Also check URL parameters as a fallback
    const urlParam = new URLSearchParams(window.location.search).get('join');
    if (urlParam) {
        return urlParam;
    }

    return null;
}

/**
 * Saves the current recording to chrome.storage.local
 */
async function saveRecordingToStorage() {
    if (!currentGameId || recording.length === 0) {
        return;
    }

    try {
        // Save the recording with the game ID as the key
        //@ts-ignore
        await chrome.storage.local.set({
            [currentGameId]: {
                recording: recording,
                timestamp: Date.now()
            }
        });
        console.log(`Saved recording for game ${currentGameId} with ${recording.length} data points`);
    } catch (error) {
        console.error('Error saving recording to storage:', error);
    }
}

/**
 * Updates the recording with the current population value
 * @param valid Whether the population value is valid
 * @param population The current population value
 */
function updateRecording(valid: boolean, population: number) {
    // Get the current game ID
    const gameId = getGameId();

    if (!valid) {
        if (gameState !== GAME_STATES.NOT_ACTIVE) {
            // If we were recording but now we're not, save the final recording
            if (currentGameId && recording.length > 0) {
                saveRecordingToStorage();
            }
        }

        gameState = GAME_STATES.NOT_ACTIVE;
        gameStart = Date.now();
        recording = [];
        lastRecorded = 0;
        lastStorageSave = 0;
        currentGameId = null;
        return;
    }

    // If this is a new game, initialize the recording
    if (gameId !== currentGameId) {
        // Save the previous recording if there was one
        if (currentGameId && recording.length > 0) {
            saveRecordingToStorage();
        }

        // Start a new recording
        currentGameId = gameId;
        gameStart = Date.now();
        recording = [];
        lastRecorded = 0;
        lastStorageSave = 0;
        gameState = GAME_STATES.RECORDING;
    }

    // Record the population value once per second
    if (Date.now() - lastRecorded > 1000) {
        recording.push(population); // 1 Hz recording
        lastRecorded = Date.now();
        console.log('recording', population)
    }

    // Save to storage every minute
    if (Date.now() - lastStorageSave > 5000) {
        saveRecordingToStorage();
        lastStorageSave = Date.now();
    }
}
