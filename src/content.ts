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

    console.log({current, maximum, percentage})

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
    console.log('updating population display...')
    try {
        // Use the specific DOM path to get the population element
        const controlPanels = document.getElementsByTagName('control-panel');
        if (!controlPanels || controlPanels.length === 0) {
            // Control panel not found, schedule next update and skip this one
            setTimeout(updatePopulationDisplay, UPDATE_INTERVAL_MS);
            return;
        }

        const populationElement = controlPanels[0].children[1].children[0].children[0].children[1];
        if (!populationElement) {
            // Population element not found, schedule next update and skip this one
            setTimeout(updatePopulationDisplay, UPDATE_INTERVAL_MS);
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
            return; // Couldn't parse the values, skip this update
        }

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
    }
}

// Set up the first update to happen after a short delay
setTimeout(updatePopulationDisplay, UPDATE_INTERVAL_MS);

// Also run once immediately
updatePopulationDisplay();

// Log that the extension is running
console.log('Openfront Population Percentage extension is active');
