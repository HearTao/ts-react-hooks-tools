import * as assert from 'assert';
import * as vscode from 'vscode';

import {
    createTestEditor,
    executeAndCompareCodeActionBewteenLabel,
    normalizedCompare,
    projectFile,
    runInFlagContext,
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
        const file = projectFile('cases/configs/preferFullAccess.tsx');
        const editor = await createTestEditor(file);

        await runInFlagContext('preferFullAccess', false, async () => {
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
        });
    });

    test('Should work with preferImmutableCall', async () => {
        const file = projectFile('cases/configs/preferImmutableCall1.tsx');
        const editor = await createTestEditor(file);

        await runInFlagContext('preferImmutableCall', false, async () => {
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
                    console.log(getValue(props.value));
                }, [getValue(props.value)]);
            `
            );
        });
    });

    test('Should work with preferImmutableCall - inner reference', async () => {
        const file = projectFile('cases/configs/preferImmutableCall2.tsx');
        const editor = await createTestEditor(file);

        await runInFlagContext('preferImmutableCall', false, async () => {
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
                    const v = 1;
                    console.log(getValue(v));
                }, [getValue]);
            `
            );
        });
    });

    test('Should work with preferConstantCall', async () => {
        const file = projectFile('cases/configs/preferConstantCall.tsx');
        const editor = await createTestEditor(file);

        await runInFlagContext('preferConstantCall', false, async () => {
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
                    console.log(value.id);
                }, [value.id]);
            `
            );
        });
    });
});
