"use strict";
/**
 * Background script for the Openfront Helpers extension
 *
 * This script handles the click on the extension icon and downloads
 * the population history as a CSV file.
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
// Listen for clicks on the extension icon
//@ts-ignore
chrome.action.onClicked.addListener(() => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Get all recording data from storage
        //@ts-ignore
        const result = yield chrome.storage.local.get(null);
        if (Object.keys(result).length === 0) {
            console.log('No recording data found in storage');
            return;
        }
        // Convert the data to CSV format
        let csvContent = 'game_id,population_values\n';
        for (const gameId in result) {
            if (result[gameId] && result[gameId].recording && result[gameId].recording.length > 0) {
                csvContent += `${gameId},${result[gameId].recording.join(',')}\n`;
            }
        }
        // Create a data URL for the CSV content
        const dataUrl = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvContent);
        // Download the file
        //@ts-ignore
        chrome.downloads.download({
            url: dataUrl,
            filename: `openfront_population_history_${new Date().toISOString().replace(/[:.]/g, '-')}.csv`,
            saveAs: true
        });
    }
    catch (error) {
        console.error('Error downloading CSV:', error);
    }
}));
