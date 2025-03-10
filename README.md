# Highlight Buddy

Highlight Buddy is a Visual Studio Code extension that allows you to easily highlight code blocks with different colors and customizable opacity. Perfect for code reviews, presentations, or personal reference.

## Features

- Multiple color options (Blue, Red, Green, Purple, Yellow)
- Adjustable opacity levels (0.2 to 1.0)
- Quick highlighting with keyboard shortcuts
- Independent color highlights (different sections can have different colors)
- Easy to clear all highlights

## Default Settings

- Default Color: Blue
- Default Opacity: 0.8

## Commands

You can access all commands through the Command Palette (`Cmd+Shift+P` on macOS):

- `Highlight Selection (Yellow)`: Highlight selected text in yellow
- `Highlight Selection (Red)`: Highlight selected text in red
- `Highlight Selection (Blue)`: Highlight selected text in blue
- `Highlight Selection (Green)`: Highlight selected text in green
- `Highlight Selection (Purple)`: Highlight selected text in purple
- `Highlight Selection with Opacity`: Set custom opacity (0-1) for highlights
- `Highlight Buddy: Clear All Highlights`: Remove all highlights from the current editor

## Keyboard Shortcuts

- `Cmd+H`: Quick highlight with the last used color and opacity

## Usage

1. **Basic Highlighting**
   - Select the text you want to highlight
   - Press `Cmd+H` to highlight with the current color (default: blue)

2. **Hover Actions**
   - Hover over any highlighted text to see available actions
   - Click "Change Color" to change the color of the specific highlight
   - Click "Remove Highlight" to remove just that highlight

3. **Changing Colors**
   - Open Command Palette (`Cmd+Shift+P`)
   - Type "Highlight" to see all available colors
   - Select your preferred color
   - The new color becomes the default for subsequent highlights
   - Or hover over an existing highlight and use "Change Color"

4. **Custom Opacity**
   - Open Command Palette
   - Select "Highlight Selection with Opacity"
   - Enter a value between 0 and 1 (e.g., 0.5 for 50% opacity)
   - The new opacity becomes the default for subsequent highlights

5. **Clearing Highlights**
   - To remove all highlights, open Command Palette
   - Select "Highlight Buddy: Clear All Highlights"

## Notes

- Each highlight maintains its color and opacity independently
- When you highlight over an existing highlight, the new color replaces the old one
- Highlights persist until you clear them or close the editor
- The last used color and opacity settings are remembered for subsequent highlights

## Contributing

Feel free to submit issues and enhancement requests on the GitHub repository.

## License

This extension is released under the [MIT License](LICENSE).
