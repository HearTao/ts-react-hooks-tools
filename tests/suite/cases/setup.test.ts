import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import { createTestEditor, wait, nulToken } from '../tesUtils';
import { wrapIntoUseMemoActionDescription } from '../../../src/constants';

const projectFolder = vscode.Uri.file(path.resolve(__dirname, '../../project'));
const indexFile = vscode.Uri.file(path.join(projectFolder.fsPath, 'index.tsx'));

function getLabelPosition(
    label: string,
    fullText: string,
    editor: vscode.TextEditor,
    ignoreLabel: boolean
) {
    const labelText = `/*[${label}]*/`;
    const labelOffset =
        fullText.indexOf(labelText) + (ignoreLabel ? labelText.length : 0);
    return editor.document.positionAt(labelOffset);
}

function getSelectionBetweenLabel(
    start: string,
    end: string,
    editor: vscode.TextEditor
) {
    const fullText = editor.document.getText();
    const labelAPos = getLabelPosition(start, fullText, editor, true);
    const labelBPos = getLabelPosition(end, fullText, editor, false);
    return new vscode.Selection(labelAPos, labelBPos);
}

function convertSelectionIntoRange(selection: vscode.Selection) {
    return new vscode.Range(selection.start, selection.end);
}

suite('Use memo test', async () => {
    test('Should work', async () => {
        await vscode.commands.executeCommand(
            'vscode.openFolder',
            projectFolder
        );
        const editor = await createTestEditor(indexFile);
        const range = getSelectionBetweenLabel('a', 'b', editor);

        await wait(4000);

        const codeActions =
            (await vscode.commands.executeCommand<vscode.CodeAction[]>(
                'vscode.executeCodeActionProvider',
                indexFile,
                range
            )) ?? [];
        assert.notStrictEqual(codeActions.length, 0);

        const useMemoAction = codeActions.find(
            x => x.title === wrapIntoUseMemoActionDescription
        )!;
        assert.notStrictEqual(useMemoAction, undefined);

        const applyCommand = useMemoAction.command!;
        assert.notStrictEqual(applyCommand, undefined);

        const codeAction = applyCommand.arguments![0]!.codeAction!;

        await codeAction.resolve(nulToken);

        await vscode.workspace.applyEdit(codeAction.edit);

        const newRange = getSelectionBetweenLabel('a', 'b', editor);
        assert.strictEqual(
            editor.document.getText(convertSelectionIntoRange(newRange)),
            'const value = React.useMemo(() => props.foo + 1 + b.aaaa, [props.foo, b.aaaa]);'
        );
    });
});
