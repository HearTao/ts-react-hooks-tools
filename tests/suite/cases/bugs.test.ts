import * as assert from 'assert';
import * as vscode from 'vscode';

import {
    createTestEditor,
    executeAndCompareCodeActionBewteenLabel,
    projectFile,
    wait
} from '../tesUtils';
import { wrapIntoUseMemoActionDescription } from '../../../src/constants';

suite('Regression test', async () => {
    suiteSetup(async () => {
        await wait(1000);
    });

    teardown(async () => {
        await vscode.commands.executeCommand(
            'workbench.action.closeAllEditors'
        );
    });

    test('Should work with #44', async () => {
        const file = projectFile(
            'cases/bugs/shouldWorkWithNonValueDeclaration.tsx'
        );
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

    test('Should work with #58', async () => {
        const file = projectFile('cases/bugs/shouldWorkWithAsExpression.tsx');
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
            'const value = React.useMemo(() => v as 6, [v]);'
        );
    });

    test('Should work with #57', async () => {
        const file = projectFile('cases/bugs/shouldWorkWithPropertyAccess.tsx');
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
            'const vv = React.useMemo(() => value.find(Boolean) ?? 1, [value]);'
        );
    });
});
