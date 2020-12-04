import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path'

const projectFolder = vscode.Uri.file(path.resolve(__dirname, '../../project'));
const indexFile = vscode.Uri.file(path.join(projectFolder.fsPath, 'index.tsx'));

function getLabelPosition (label: string, fullText: string, editor: vscode.TextEditor) {
	const labelOffset = fullText.indexOf(`/*[${label}]*/`)
	return editor.document.positionAt(labelOffset);
}

suite('Extension Test Suite', () => {
	vscode.window.showInformationMessage('Start all tests.');

	test('Open project', async () => {
		await vscode.commands.executeCommand('vscode.openFolder', projectFolder);
		await vscode.commands.executeCommand('vscode.open', indexFile);
		const editor = vscode.window.activeTextEditor!;
		assert.notStrictEqual(editor, undefined)

		assert.strictEqual(editor.document.languageId, 'typescriptreact')

		const tsExtension = vscode.extensions.getExtension('vscode.typescript-language-features');
		await tsExtension?.activate();
		assert.strictEqual(tsExtension?.isActive, true)

		const extensions = vscode.extensions.getExtension('kingwl.ts-react-hooks-tools');
		assert.notStrictEqual(extensions, undefined)
		await extensions?.activate()
		assert.strictEqual(extensions?.isActive, true)

		const fullText = editor.document.getText();
		const labelAPos = getLabelPosition('a', fullText, editor);
		const labelBPos = getLabelPosition('b', fullText, editor);
		editor.selection = new vscode.Selection(
			labelAPos,
			labelBPos
		)

		await new Promise((resolve) => { setTimeout(resolve, 5000)})

		await vscode.commands.executeCommand('editor.action.refactor')
	});
});