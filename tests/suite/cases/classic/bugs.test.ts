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
        await vscode.workspace
            .getConfiguration('trht')
            .update('preferImmutableCall', true);
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
            'const value = React.useMemo(() => v, [v]) as 6;'
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

    test('Should work with #56', async () => {
        const file = projectFile('cases/bugs/shouldWorkWithInnerParams.tsx');
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
            const printEnum = React.useCallback((v: string) => {
                console.log(Enum[v]);
            }, []);
        `
        );
    });

    test('Should work with #61', async () => {
        const file = projectFile(
            'cases/bugs/shouldWorkWithDuplicatedUnknown.tsx'
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
            'const value = React.useMemo(() => a + a + b, [a, b]);'
        );
    });

    test('Should work with #71', async () => {
        const file = projectFile(
            'cases/bugs/shouldWorkWithLiteralUndefined.tsx'
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
            'const value = React.useMemo(() => v.undefined ? undefined : null, [v.undefined]);'
        );
    });

    test('Should work with #71 - arguments & #76', async () => {
        const file = projectFile(
            'cases/bugs/shouldWorkWithFunctionDeclarationAndLiteralArguments.tsx'
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
            const onClick = React.useCallback(function onClick() {
                console.log(arguments, 123);
            }, []);
        `
        );
    });

    test('Should work with #81', async () => {
        const file = projectFile('cases/bugs/shouldWorkWithJsxAttribute.tsx');
        const editor = await createTestEditor(file);
        const result = await executeAndCompareCodeActionInLine(
            file,
            editor,
            11,
            wrapIntoUseMemoActionDescription
        );
        assert.strictEqual(
            result,
            '{React.useMemo(() => <span id={id}>Foo</span>, [id])}'
        );
    });

    test('Should work with #74', async () => {
        const file = projectFile(
            'cases/bugs/shouldWorkWithOverlappedAccess.tsx'
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
                console.log(v, v.undefined);
            }, [v]);
        `
        );
    });

    test('Should work with #74 - reversed', async () => {
        const file = projectFile(
            'cases/bugs/shouldWorkWithOverlappedAccessReversed.tsx'
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
                console.log(v.undefined, v);
            }, [v]);
        `
        );
    });

    test('Should work with #87 - Zero', async () => {
        const file = projectFile(
            'cases/bugs/shouldWorkWithIndexAccessAndCallInZeroArgs.tsx'
        );
        const editor = await createTestEditor(file);
        const result = await executeAndCompareCodeActionInLine(
            file,
            editor,
            7,
            wrapIntoUseMemoActionDescription
        );
        assert.strictEqual(
            result,
            '{React.useMemo(() => <span>{value()[0]}</span>, [value()[0]])}'
        );
    });

    test('Should work with #87 - One', async () => {
        const file = projectFile(
            'cases/bugs/shouldWorkWithIndexAccessAndCallInOneArgs.tsx'
        );
        const editor = await createTestEditor(file);
        const result = await executeAndCompareCodeActionInLine(
            file,
            editor,
            7,
            wrapIntoUseMemoActionDescription
        );
        assert.strictEqual(
            result,
            '{React.useMemo(() => <span>{value(1)[0]}</span>, [value(1)[0]])}'
        );
    });

    test('Should work with #88', async () => {
        const file = projectFile(
            'cases/bugs/shouldWorkIfComponentMayReturnNull.tsx'
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
            'const value = React.useMemo(() => 1 + 2 + 3, []);'
        );
    });

    test('Should work with #92', async () => {
        const file = projectFile('cases/bugs/shouldWorkWithOptionalChains.tsx');
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
            'const value = React.useMemo(() => 1 + props.value?.foo ?? 0, [props.value?.foo]);'
        );
    });

    test('Should work with #91', async () => {
        const file = projectFile(
            'cases/bugs/shouldWorkWithElementAccessWithLocalArgExpression.tsx'
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
            const foo = React.useCallback((v: keyof Props['value']) => {
                console.log(props.value[v]);
            }, [props.value]);
        `
        );
    });
});
