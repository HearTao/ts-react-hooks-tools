import * as assert from 'assert';
import * as vscode from 'vscode';

import {
    createTestEditor,
    executeAndCompareCodeActionBewteenLabel,
    openProjectFolder,
    projectFile
} from '../tesUtils';
import { wrapIntoUseMemoActionDescription } from '../../../src/constants';

suite('Regression test', async () => {
    teardown(async () => {
        await vscode.commands.executeCommand(
            'workbench.action.closeAllEditors'
        );
    });

    test('Should work with #44', async () => {
        await openProjectFolder();

        const file = projectFile('cases/bugs/shouldWorkWithNonValueDeclaration.tsx');
        const editor = await createTestEditor(file);
        const result = await executeAndCompareCodeActionBewteenLabel(
            file,
            editor,
            'a',
            'b',
            wrapIntoUseMemoActionDescription
        );
        assert.strictEqual(
            result,
            'const value = React.useMemo(() => record.a + record.b, [record.a, record.b]);'
        );
    });
});
