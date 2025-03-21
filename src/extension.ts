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
    private hoverProvider: vscode.Disposable | undefined;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.lastColor = this.context.globalState.get<HighlightColor>('lastColor', 'blue');
        this.lastOpacity = this.context.globalState.get<number>('lastOpacity', 0.8);
        this.createDecorationTypes();
        
        // Restore saved decorations
        const savedDecorations = this.context.globalState.get<any>('editorDecorations', {});
        Object.entries(savedDecorations).forEach(([editorKey, decorations]: [string, any]) => {
            const decorationMap = new Map();
            Object.entries(decorations).forEach(([id, decoration]: [string, any]) => {
                decorationMap.set(id, {
                    ...decoration,
                    range: new vscode.Range(
                        new vscode.Position(decoration.range.start.line, decoration.range.start.character),
                        new vscode.Position(decoration.range.end.line, decoration.range.end.character)
                    )
                });
            });
            this.editorDecorations.set(editorKey, decorationMap);
        });

        this.registerHoverProvider();
    }

    private createDecorationTypes() {
        const colors: HighlightColor[] = ['red', 'blue', 'green', 'purple'];
        const opacities = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0];

        colors.forEach(color => {
            opacities.forEach(opacity => {
                const key = `${color}-${opacity}`;
                this.decorationTypes.set(key, vscode.window.createTextEditorDecorationType({
                    backgroundColor: `rgba(${this.getColorRGB(color)},${opacity})`,
                    overviewRulerColor: `rgba(${this.getColorRGB(color)},${opacity})`,
                    overviewRulerLane: vscode.OverviewRulerLane.Right
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

    private async saveDecorations() {
        const decorationsToSave: any = {};
        this.editorDecorations.forEach((decorations, editorKey) => {
            decorationsToSave[editorKey] = {};
            decorations.forEach((decoration, id) => {
                decorationsToSave[editorKey][id] = {
                    ...decoration,
                    range: {
                        start: { line: decoration.range.start.line, character: decoration.range.start.character },
                        end: { line: decoration.range.end.line, character: decoration.range.end.character }
                    }
                };
            });
        });
        await this.context.globalState.update('editorDecorations', decorationsToSave);
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
        
        // If no text is selected, use cursor positions to create selections
        const effectiveSelections = selections.map(selection => {
            if (selection.isEmpty) {
                // If no text is selected, highlight the entire line
                const line = editor.document.lineAt(selection.active.line);
                return new vscode.Selection(line.range.start, line.range.end);
            }
            return selection;
        });

        if (effectiveSelections.length === 0) {
            return; // No valid selections to highlight
        }

        // Add new highlights for the selections
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
        this.saveDecorations(); // Save after updating decorations
    }

    public updateEditorDecorations(editor: vscode.TextEditor) {
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
        // Clear all decorations from all editors
        this.editorDecorations.clear();
        
        // Clear decorations from the current editor
        this.decorationTypes.forEach(decorationType => {
            editor.setDecorations(decorationType, []);
        });

        // Clear decorations from all visible editors
        vscode.window.visibleTextEditors.forEach(visibleEditor => {
            if (visibleEditor !== editor) {
                this.decorationTypes.forEach(decorationType => {
                    visibleEditor.setDecorations(decorationType, []);
                });
            }
        });

        this.saveDecorations(); // Save after clearing all decorations
    }

    private registerHoverProvider() {
        this.hoverProvider = vscode.languages.registerHoverProvider('*', {
            provideHover: (document, position) => {
                const editor = vscode.window.activeTextEditor;
                if (!editor || editor.document !== document) {
                    return undefined;
                }

                const decorations = this.getOrCreateEditorDecorations(editor);
                let foundDecoration: HighlightDecoration | undefined;

                decorations.forEach(decoration => {
                    if (decoration.range.contains(position)) {
                        foundDecoration = decoration;
                    }
                });

                if (!foundDecoration) {
                    return undefined;
                }

                const commandLinks = [
                    new vscode.MarkdownString(`[Change Color](command:highlight-buddy.changeHighlightColor?${encodeURIComponent(JSON.stringify([position]))})`),
                    new vscode.MarkdownString(`[Remove Highlight](command:highlight-buddy.removeHighlight?${encodeURIComponent(JSON.stringify([position]))})`)
                ];

                commandLinks.forEach(link => link.isTrusted = true);
                return new vscode.Hover(commandLinks);
            }
        });
    }

    public getDecorationAtPosition(editor: vscode.TextEditor, position: vscode.Position): HighlightDecoration | undefined {
        const decorations = this.getOrCreateEditorDecorations(editor);
        let foundDecoration: HighlightDecoration | undefined;

        decorations.forEach(decoration => {
            if (decoration.range.contains(position)) {
                foundDecoration = decoration;
            }
        });

        return foundDecoration;
    }

    public removeHighlightAtPosition(editor: vscode.TextEditor, position: vscode.Position) {
        const decorations = this.getOrCreateEditorDecorations(editor);
        decorations.forEach((decoration, id) => {
            if (decoration.range.contains(position)) {
                decorations.delete(id);
            }
        });
        this.updateEditorDecorations(editor);
        this.saveDecorations();
    }

    private splitDecoration(decoration: HighlightDecoration, selection: vscode.Selection): HighlightDecoration[] {
        const result: HighlightDecoration[] = [];
        
        // If selection completely contains decoration or matches exactly, return empty array
        if (selection.contains(decoration.range)) {
            return result;
        }

        // If selection is within decoration, split into two parts
        if (decoration.range.contains(selection)) {
            // Create decoration before selection if needed
            if (!decoration.range.start.isEqual(selection.start)) {
                result.push({
                    id: this.generateId(),
                    range: new vscode.Range(decoration.range.start, selection.start),
                    color: decoration.color,
                    opacity: decoration.opacity
                });
            }
            
            // Create decoration after selection if needed
            if (!decoration.range.end.isEqual(selection.end)) {
                result.push({
                    id: this.generateId(),
                    range: new vscode.Range(selection.end, decoration.range.end),
                    color: decoration.color,
                    opacity: decoration.opacity
                });
            }
        }
        // If there's partial overlap, keep the non-overlapping part
        else if (this.rangesOverlap(decoration.range, selection)) {
            if (decoration.range.start.isBefore(selection.start)) {
                result.push({
                    id: this.generateId(),
                    range: new vscode.Range(decoration.range.start, selection.start),
                    color: decoration.color,
                    opacity: decoration.opacity
                });
            } else {
                result.push({
                    id: this.generateId(),
                    range: new vscode.Range(selection.end, decoration.range.end),
                    color: decoration.color,
                    opacity: decoration.opacity
                });
            }
        }
        // If no overlap, keep original decoration
        else {
            result.push(decoration);
        }

        return result;
    }

    public changeHighlightColor(editor: vscode.TextEditor, selection: vscode.Selection, newColor: HighlightColor) {
        const decorations = this.getOrCreateEditorDecorations(editor);
        const decorationsToAdd: HighlightDecoration[] = [];
        const decorationsToRemove = new Set<string>();

        // Process existing decorations
        decorations.forEach((decoration, id) => {
            if (this.rangesOverlap(selection, decoration.range)) {
                // Split or remove existing decoration
                const splitDecorations = this.splitDecoration(decoration, selection);
                decorationsToRemove.add(id);
                decorationsToAdd.push(...splitDecorations);
            }
        });

        // Remove old decorations
        decorationsToRemove.forEach(id => {
            decorations.delete(id);
        });

        // Add split decorations
        decorationsToAdd.forEach(decoration => {
            decorations.set(decoration.id, decoration);
        });

        // Add new decoration for selected area
        const newDecoration: HighlightDecoration = {
            id: this.generateId(),
            range: selection,
            color: newColor,
            opacity: this.lastOpacity
        };
        decorations.set(newDecoration.id, newDecoration);

        this.updateEditorDecorations(editor);
        this.saveDecorations();
    }

    public dispose() {
        if (this.hoverProvider) {
            this.hoverProvider.dispose();
        }
        this.decorationTypes.forEach(type => type.dispose());
    }
}

let highlightManager: HighlightManager;

export function activate(context: vscode.ExtensionContext) {
    highlightManager = new HighlightManager(context);

    // Add listener for active editor changes
    vscode.window.onDidChangeActiveTextEditor((editor) => {
        if (editor) {
            highlightManager.updateEditorDecorations(editor);
        }
    }, null, context.subscriptions);

    // Add listener for editor content changes
    vscode.workspace.onDidChangeTextDocument((event) => {
        const editor = vscode.window.activeTextEditor;
        if (editor && event.document === editor.document) {
            highlightManager.updateEditorDecorations(editor);
        }
    }, null, context.subscriptions);

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

    const removeHighlightCommand = vscode.commands.registerCommand('highlight-buddy.removeHighlight', (position?: vscode.Position) => {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            const pos = position ?? editor.selection.active;
            highlightManager.removeHighlightAtPosition(editor, pos);
        }
    });

    const changeHighlightColorCommand = vscode.commands.registerCommand('highlight-buddy.changeHighlightColor', async (position?: vscode.Position) => {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            const pos = position ?? editor.selection.active;
            const decoration = highlightManager.getDecorationAtPosition(editor, pos);
            
            if (decoration) {
                const colors: HighlightColor[] = ['red', 'blue', 'green', 'purple'];
                const selected = await vscode.window.showQuickPick(colors, {
                    placeHolder: 'Select a color'
                });
                
                if (selected) {
                    await highlightManager.setLastColor(selected as HighlightColor);
                    highlightManager.changeHighlightColor(editor, new vscode.Selection(decoration.range.start, decoration.range.end), selected as HighlightColor);
                }
            }
        }
    });

    context.subscriptions.push(
        highlightCommand,
        highlightRedCommand,
        highlightBlueCommand,
        highlightGreenCommand,
        highlightPurpleCommand,
        highlightWithOpacityCommand,
        clearAllHighlightsCommand,
        removeHighlightCommand,
        changeHighlightColorCommand
    );
}

export function deactivate() {}
