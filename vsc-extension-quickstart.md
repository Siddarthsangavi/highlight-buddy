# Highlight Buddy - Development Guide

## Development Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development environment:
   - Press `F5` to open a new window with your extension loaded
   - Or run `npm run watch` in terminal for automatic recompilation

## Making Changes

* The extension entry point is in `./src/extension.ts`
* Make changes to the code and reload (`Ctrl+R` or `Cmd+R` on Mac) the VS Code window to test
* Watch for any errors in the Debug Console

## Adding New Features

### Adding a New Color
1. Update `HighlightColor` type in `extension.ts`
2. Add the RGB value in `getColorRGB` method
3. Register a new command in `package.json`
4. Add the command handler in `activate` function

### Modifying Opacity Ranges
- Opacity values are defined in `createDecorationTypes` method
- Default opacity is set to 0.8

## Testing

* Run tests using `npm test`
* Tests are located in `./src/test`

## Packaging

1. Update version in `package.json`
2. Update `CHANGELOG.md`
3. Run:
   ```bash
   vsce package
   ```

## Publishing

1. Make sure you have a Visual Studio Marketplace publisher account
2. Run:
   ```bash
   vsce publish
   ```

## Troubleshooting

* If highlights don't appear, check the Debug Console for errors
* Make sure the extension is activated by using one of its commands
* Verify that the text editor is in focus when using keyboard shortcuts

## Need Help?

* Check the [VS Code Extension Development](https://code.visualstudio.com/api) documentation
* File issues on the GitHub repository
