import type * as ts from 'typescript/lib/tsserverlibrary';

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

export namespace JsxNames {
    export const JSX = 'JSX';
    export const Element = 'Element';
}

export const enum Ternary {
    False = 0,
    Unknown = 1,
    Maybe = 3,
    True = -1
}

export enum HooksNameType {
    useIdentifier,
    usePropertyAccess
}

export interface IdentifierHooksName {
    type: HooksNameType.useIdentifier;
    alreadyHasReference: boolean;
}

export interface PropertyAccessHooksName {
    type: HooksNameType.usePropertyAccess;
    name: string;
}

export type HooksReferenceNameType =
    | IdentifierHooksName
    | PropertyAccessHooksName;

export interface SynchronizedConfiguration {
    preferFullAccess?: boolean;
}

export interface DepSymbolResolver {
    shouldSymbolDefinitelyBeIgnoreInDeps: (
        rawSymbol: ts.Symbol
    ) => boolean | undefined;
    alreadyDuplicated: (rawSymbol: ts.Symbol) => boolean;
    markAsDuplicated: (symbol: ts.Symbol) => void;
    isExpressionContainsDeclaredInner: (expr: ts.Node) => boolean | undefined;
    markExpressionContainsDeclaredInner: (
        expr: ts.Node,
        value: boolean
    ) => void;
}
