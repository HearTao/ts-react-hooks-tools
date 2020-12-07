import * as vscode from 'vscode';

import {
    createTestEditor,
    executeAndCompareCodeActionBewteenLabel,
    executeAndNotExistCodeActionBewteenLabel,
    normalizedCompare,
    projectFile,
    wait
} from '../../tesUtils';
import { wrapIntoUseCallbackActionDescription } from '../../../../src/constants';

suite('Use callback test', async () => {
    suiteSetup(async () => {
        await wait(1000);
    });

    teardown(async () => {
        await vscode.commands.executeCommand(
            'workbench.action.closeAllEditors'
        );
    });

    test('Should work', async () => {
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
