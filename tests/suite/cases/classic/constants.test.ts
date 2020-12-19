import * as assert from 'assert';
import * as vscode from 'vscode';

import {
    createTestEditor,
    executeAndCompareCodeActionBewteenLabel,
    executeAndCompareCodeActionInLine,
    normalizedCompare,
    projectFile,
    wait
} from '../../tesUtils';
import {
    wrapIntoUseCallbackActionDescription,
    wrapIntoUseMemoActionDescription
} from '../../../../src/constants';

suite('Regression test', async () => {
    suiteSetup(async () => {
        await wait(1000);

        await vscode.workspace
            .getConfiguration('trht')
            .update('preferFullAccess', true);
    });

    teardown(async () => {
        await vscode.commands.executeCommand(
            'workbench.action.closeAllEditors'
        );
    });

    test('Should work with constants literal - 1', async () => {
        const file = projectFile('cases/constants/shouldWorkWithLiteral1.tsx');
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
            'const value = React.useMemo(() => 1 + literal, []);'
        );
    });

    test('Should work with constants literal - 2', async () => {
        const file = projectFile('cases/constants/shouldWorkWithLiteral2.tsx');
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
            'const value = React.useMemo(() => 1 + literal, []);'
        );
    });

    test('Should work with constants literal - 3', async () => {
        const file = projectFile('cases/constants/shouldWorkWithLiteral3.tsx');
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
            'const value = React.useMemo(() => 1 + literal, []);'
        );
    });

    test('Should work with constants literal - 4', async () => {
        const file = projectFile('cases/constants/shouldWorkWithLiteral4.tsx');
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
            'const value = React.useMemo(() => 1 + literal, []);'
        );
    });

    test('Should work with constants literal - 5', async () => {
        const file = projectFile('cases/constants/shouldWorkWithLiteral5.tsx');
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
            'const value = React.useMemo(() => 1 + literal, []);'
        );
    });

    test('Should work with constants literal - 6', async () => {
        const file = projectFile('cases/constants/shouldWorkWithLiteral6.tsx');
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
            'const value = React.useMemo(() => 1 + literal, []);'
        );
    });

    test('Should work with constants literal - 7', async () => {
        const file = projectFile('cases/constants/shouldWorkWithLiteral7.tsx');
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
            'const value = React.useMemo(() => 1 + literal, []);'
        );
    });

    test('Should work with constants literal - 8', async () => {
        const file = projectFile('cases/constants/shouldWorkWithLiteral8.tsx');
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
            'const value = React.useMemo(() => 1 + literal, []);'
        );
    });

    test('Should work with constants literal - 9', async () => {
        const file = projectFile('cases/constants/shouldWorkWithLiteral9.tsx');
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
            'const value = React.useMemo(() => 1 + literal, []);'
        );
    });

    test('Should work with constants literal - 10', async () => {
        const file = projectFile('cases/constants/shouldWorkWithLiteral10.tsx');
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
            'const value = React.useMemo(() => 1 + literal(), []);'
        );
    });

    test('Should work with constants literal - 11', async () => {
        const file = projectFile('cases/constants/shouldWorkWithLiteral11.tsx');
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
            'const value = React.useMemo(() => literal(), []);'
        );
    });

    test('Should work with constants literal - 12', async () => {
        const file = projectFile('cases/constants/shouldWorkWithLiteral12.tsx');
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
            'const value = React.useMemo(() => literal(), [literal]);'
        );
    });

    test('Should work with constants literal - 13', async () => {
        const file = projectFile('cases/constants/shouldWorkWithLiteral13.tsx');
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
            'const value = React.useMemo(() => literal, [literal]);'
        );
    });
});
