import * as assert from 'assert';
import * as vscode from 'vscode';

import {
    createTestEditor,
    executeAndCompareCodeActionBewteenLabel,
    executeAndNotExistCodeActionBewteenLabel,
    normalizedCompare,
    openProjectFolder,
    projectFile
} from '../tesUtils';
import { wrapIntoUseCallbackActionDescription } from '../../../src/constants';

suite('Use callback test', async () => {
    teardown(async () => {
        await vscode.commands.executeCommand(
            'workbench.action.closeAllEditors'
        );
    });

    test('Should work', async () => {
        await openProjectFolder();

        const file = projectFile('cases/useCallback/shouldWork.tsx');
        const editor = await createTestEditor(file);
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
                console.log(123);
            }, []);
        `
        );
    });

    test('Should work with deps', async () => {
        await openProjectFolder();

        const file = projectFile('cases/useCallback/shouldWorkWithDeps.tsx');
        const editor = await createTestEditor(file);
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
                console.log(value, state);
            }, [value, state]);
        `
        );
    });

    test('Should work with constants', async () => {
        await openProjectFolder();

        const file = projectFile(
            'cases/useCallback/shouldWorkWithConstants.tsx'
        );
        const editor = await createTestEditor(file);
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
                console.log(state, topLevelConstant, outsideValue);
            }, [state]);
        `
        );
    });

    test('Should not work with overlapped hooks', async () => {
        await openProjectFolder();

        const file = projectFile('cases/useCallback/shouldNotWorkOverlap.tsx');
        const editor = await createTestEditor(file);
        await executeAndNotExistCodeActionBewteenLabel(
            file,
            editor,
            'a',
            'b',
            wrapIntoUseCallbackActionDescription
        );
    });

    test('Should work with setState and useRef', async () => {
        await openProjectFolder();

        const file = projectFile(
            'cases/useCallback/shouldIgnoreSetStateAndRef.tsx'
        );
        const editor = await createTestEditor(file);
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
                setState(prev => prev + refs.current);
            }, []);
        `
        );
    });
});
