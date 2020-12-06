import type * as ts from 'typescript/lib/tsserverlibrary';
import { HooksReferenceNameType } from './utils';

export enum RefactorKind {
    useMemo,
    useCallback
}

type MustHaveBody<T extends { body?: unknown }> = T extends {
    body?: infer B | undefined;
}
    ? T & { body: B }
    : T;

export type FunctionExpressionLike = MustHaveBody<
    ts.ArrowFunction | ts.FunctionDeclaration | ts.FunctionExpression
>;

export type DependExpression =
    | ts.Identifier
    | ts.ElementAccessExpression
    | ts.PropertyAccessExpression;

export interface UseCallbackInfo {
    kind: RefactorKind.useCallback;
    func: FunctionExpressionLike;
    deps: DependExpression[];
    hooksReference: HooksReferenceNameType | undefined;
}

export interface UseMemoInfo {
    kind: RefactorKind.useMemo;
    expression: ts.Expression;
    deps: DependExpression[];
    hooksReference: HooksReferenceNameType | undefined;
}

export type Info = UseCallbackInfo | UseMemoInfo;

export interface RefactorContext {
    program: ts.Program;
    file: ts.SourceFile;
}
