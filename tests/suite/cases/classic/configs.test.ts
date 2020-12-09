import * as assert from 'assert';
import * as vscode from 'vscode';

import {
    createTestEditor,
    executeAndCompareCodeActionBewteenLabel,
    normalizedCompare,
    projectFile,
    wait
} from '../../tesUtils';
import { wrapIntoUseCallbackActionDescription } from '../../../../src/constants';

suite('Config test', async () => {
    suiteSetup(async () => {
        await wait(1000);
    });

    teardown(async () => {
        await vscode.commands.executeCommand(
            'workbench.action.closeAllEditors'
        );
    });

    test('Should work with preferFullAccess', async () => {
        const file = projectFile('cases/configs/perferFullAccess.tsx');
        const editor = await createTestEditor(file);

        assert.notStrictEqual(
            vscode.workspace.getConfiguration('trht').get('preferFullAccess'),
            false
        );
        await vscode.workspace
            .getConfiguration('trht')
            .update('preferFullAccess', false);

        const result = await executeAndCompareCodeActionBewteenLabel(
            file,
            editor,
            'a',
            'b',
            wrapIntoUseCallbackActionDescription
        );
        normalizedCompare(
            result,
            `
            const onClick = React.useCallback(() => {
                console.log(value.a.b);
            }, [value]);
        `
        );
        await vscode.workspace
            .getConfiguration('trht')
            .update('preferFullAccess', true);
    });
});
