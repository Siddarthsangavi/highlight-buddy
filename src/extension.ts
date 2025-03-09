import * as vscode from 'vscode';

type HighlightColor = 'red' | 'blue' | 'green' | 'purple';

interface HighlightDecoration {
    id: string;
    range: vscode.Range;
    color: HighlightColor;
    opacity: number;
}

class HighlightManager {
    private decorationTypes: Map<string, vscode.TextEditorDecorationType> = new Map();
    private editorDecorations: Map<string, Map<string, HighlightDecoration>> = new Map();
    private lastColor: HighlightColor;
    private lastOpacity: number;
    private context: vscode.ExtensionContext;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.lastColor = this.context.globalState.get<HighlightColor>('lastColor', 'blue');
        this.lastOpacity = this.context.globalState.get<number>('lastOpacity', 0.8);
        this.createDecorationTypes();
    }

    private createDecorationTypes() {
        const colors: HighlightColor[] = ['red', 'blue', 'green', 'purple'];
        const opacities = [0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0];

        colors.forEach(color => {
            opacities.forEach(opacity => {
                const key = `${color}-${opacity}`;
                this.decorationTypes.set(key, vscode.window.createTextEditorDecorationType({
                    backgroundColor: `rgba(${this.getColorRGB(color)},${opacity})`
                }));
            });
        });
    }

    private getColorRGB(color: HighlightColor): string {
        switch (color) {
            case 'red': return '255,0,0';
            case 'blue': return '0,0,255';
            case 'green': return '0,255,0';
            case 'purple': return '128,0,128';
        }
    }

    private getDecorationKey(color: HighlightColor, opacity: number): string {
        return `${color}-${opacity}`;
    }

    private generateId(): string {
        return Math.random().toString(36).substring(2);
    }

    private getEditorKey(editor: vscode.TextEditor): string {
        return editor.document.uri.toString();
    }

    private getOrCreateEditorDecorations(editor: vscode.TextEditor): Map<string, HighlightDecoration> {
        const editorKey = this.getEditorKey(editor);
        if (!this.editorDecorations.has(editorKey)) {
            this.editorDecorations.set(editorKey, new Map());
        }
        return this.editorDecorations.get(editorKey)!;
    }

    private rangesOverlap(range1: vscode.Range, range2: vscode.Range): boolean {
        return !range1.end.isBefore(range2.start) && !range2.end.isBefore(range1.start);
    }

    public async setLastColor(color: HighlightColor) {
        this.lastColor = color;
        await this.context.globalState.update('lastColor', color);
    }

    public getLastColor(): HighlightColor {
        return this.lastColor;
    }

    public async setLastOpacity(opacity: number) {
        this.lastOpacity = opacity;
        await this.context.globalState.update('lastOpacity', opacity);
    }

    public highlight(editor: vscode.TextEditor, selections: readonly vscode.Selection[]) {
        const decorations = this.getOrCreateEditorDecorations(editor);
        
        // If no text is selected, use cursor positions to create word selections
        const effectiveSelections = selections.map(selection => {
            if (selection.isEmpty) {
                const wordRange = editor.document.getWordRangeAtPosition(selection.active);
                return wordRange ? new vscode.Selection(wordRange.start, wordRange.end) : selection;
            }
            return selection;
        }).filter(selection => !selection.isEmpty); // Filter out any remaining empty selections

        if (effectiveSelections.length === 0) {
            return; // No valid selections to highlight
        }

        const decorationsToRemove = new Set<string>();
        decorations.forEach((decoration, id) => {
            if (effectiveSelections.some(selection => this.rangesOverlap(selection, decoration.range))) {
                decorationsToRemove.add(id);
            }
        });

        decorationsToRemove.forEach(id => {
            decorations.delete(id);
        });

        effectiveSelections.forEach(selection => {
            const id = this.generateId();
            decorations.set(id, {
                id,
                range: new vscode.Range(selection.start, selection.end),
                color: this.lastColor,
                opacity: this.lastOpacity
            });
        });

        this.updateEditorDecorations(editor);
    }

    private updateEditorDecorations(editor: vscode.TextEditor) {
        const decorations = this.getOrCreateEditorDecorations(editor);
        const decorationsByType = new Map<string, vscode.Range[]>();

        this.decorationTypes.forEach(decorationType => {
            editor.setDecorations(decorationType, []);
        });

        decorations.forEach(decoration => {
            const key = this.getDecorationKey(decoration.color, decoration.opacity);
            if (!decorationsByType.has(key)) {
                decorationsByType.set(key, []);
            }
            decorationsByType.get(key)!.push(decoration.range);
        });

        decorationsByType.forEach((ranges, key) => {
            const decorationType = this.decorationTypes.get(key);
            if (decorationType) {
                editor.setDecorations(decorationType, ranges);
            }
        });
    }

    public clearAllHighlights(editor: vscode.TextEditor) {
        const editorKey = this.getEditorKey(editor);
        this.editorDecorations.delete(editorKey);
        
        this.decorationTypes.forEach(decorationType => {
            editor.setDecorations(decorationType, []);
        });
    }
}

let highlightManager: HighlightManager;

export function activate(context: vscode.ExtensionContext) {
    highlightManager = new HighlightManager(context);

    // Add back the general highlight command that uses lastColor
    const highlightCommand = vscode.commands.registerCommand('highlight-buddy.highlight', () => {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            highlightManager.highlight(editor, editor.selections);
        }
    });

    const highlightRedCommand = vscode.commands.registerCommand('highlight-buddy.highlightRed', async () => {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            await highlightManager.setLastColor('red');
            highlightManager.highlight(editor, editor.selections);
        }
    });

    const highlightBlueCommand = vscode.commands.registerCommand('highlight-buddy.highlightBlue', async () => {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            await highlightManager.setLastColor('blue');
            highlightManager.highlight(editor, editor.selections);
        }
    });

    const highlightGreenCommand = vscode.commands.registerCommand('highlight-buddy.highlightGreen', async () => {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            await highlightManager.setLastColor('green');
            highlightManager.highlight(editor, editor.selections);
        }
    });

    const highlightPurpleCommand = vscode.commands.registerCommand('highlight-buddy.highlightPurple', async () => {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            await highlightManager.setLastColor('purple');
            highlightManager.highlight(editor, editor.selections);
        }
    });

    const highlightWithOpacityCommand = vscode.commands.registerCommand('highlight-buddy.highlightWithOpacity', async () => {
        const opacity = await vscode.window.showInputBox({
            prompt: 'Enter opacity (0 to 1)',
            validateInput: (value: string): string | undefined => {
                const num = parseFloat(value);
                if (isNaN(num) || num < 0 || num > 1) {
                    return 'Opacity must be a number between 0 and 1';
                }
                return undefined;
            }
        });

        if (opacity !== undefined) {
            await highlightManager.setLastOpacity(parseFloat(opacity));
            const editor = vscode.window.activeTextEditor;
            if (editor) {
                highlightManager.highlight(editor, editor.selections);
            }
        }
    });

    const clearAllHighlightsCommand = vscode.commands.registerCommand('highlight-buddy.clearAllHighlights', () => {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            highlightManager.clearAllHighlights(editor);
        }
    });

    context.subscriptions.push(
        highlightCommand,
        highlightRedCommand,
        highlightBlueCommand,
        highlightGreenCommand,
        highlightPurpleCommand,
        highlightWithOpacityCommand,
        clearAllHighlightsCommand
    );
}

export function deactivate() {}
