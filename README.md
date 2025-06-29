1. download this repository as zip
2. unzip folder
3. Open Chrome and navigate to `chrome://extensions/`
4. Enable "Developer mode" (toggle in the top-right corner)
5. Click "Load unpacked" and select the `dist` folder from the unzipped folder
6. Refresh openfront after installing to make sure it takes effect.

ALL CHATGPT BELOW (lol)

## Implementation Details

This extension is specifically designed for the Openfront game interface. It uses a precise DOM path to locate the population counter element:

```javascript
document.getElementsByTagName('control-panel')[0].children[1].children[0].children[0].children[1]
```

The extension also handles text formats like "12.1K / 12.1K (+3)" by ignoring the content in parentheses.

## Development

### Prerequisites

- Node.js and npm

### Setup

1. Install dependencies:
   ```
   npm install
   ```

2. Build the extension:
   ```
   npm run build
   ```

3. The compiled extension will be in the `dist` folder

### Updating

After making changes to the code:

1. Run `npm run build` to rebuild the extension
2. Go to `chrome://extensions/` in Chrome
3. Click the refresh icon on the extension card
4. Reload the Openfront game page (openfront.io)

## How It Works

The extension:
1. Finds the population counter element using the specific DOM path in the Openfront game interface
2. Cleans the text by removing any content in parentheses (e.g., "(+3)")
3. Parses the text to extract current and maximum population values
4. Calculates the percentage (current/maximum * 100)
5. Appends the percentage to the original text
6. Updates this calculation 10 times per second

## License

MIT
