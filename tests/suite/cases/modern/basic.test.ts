import * as assert from 'assert';
import * as vscode from 'vscode';

import {
    createTestEditor,
    executeAndCompareCodeActionBewteenLabel,
    newProjectFile,
    wait
} from '../../tesUtils';
import { wrapIntoUseMemoActionDescription } from '../../../../src/constants';

suite('Regression test', async () => {
    suiteSetup(async () => {
        await wait(1000);
    });

    teardown(async () => {
        await vscode.commands.executeCommand(
            'workbench.action.closeAllEditors'
        );
    });

    test('Should work with new jsx', async () => {
        const file = newProjectFile('cases/shouldWork.tsx');
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
            'const value = useMemo(() => 1 + 2 + 3, []);'
        );
        assert.strictEqual(
            editor.document.lineAt(0).text,
            `import { useMemo } from "react";`
        );
    });

    test('Should work if already has import declaration', async () => {
        const file = newProjectFile('cases/shouldWorkIfAlreadyHasImport.tsx');
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
            'const value = useMemo(() => 1 + 2 + 3, []);'
        );
        assert.strictEqual(
            editor.document.lineAt(0).text,
            `import { useCallback, useMemo } from 'react';`
        );
    });

    test('Should work if already imported', async () => {
        const file = newProjectFile('cases/shouldWorkIfAlreadyImported.tsx');
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
            'const value = useMemo(() => 1 + 2 + 3, []);'
        );
        assert.strictEqual(
            editor.document.lineAt(0).text,
            `import { useMemo } from 'react';`
        );
    });

    test('Should work if already have invalid import', async () => {
        const file = newProjectFile('cases/shouldWorkIfHaveInvalidImport.tsx');
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
            'const value = useMemo(() => 1 + 2 + 3, []);'
        );
        assert.strictEqual(
            editor.document.lineAt(0).text,
            `import { useMemo } from "react";`
        );
        assert.strictEqual(
            editor.document.lineAt(1).text,
            `import * as React from 'react';`
        );
    });
});
