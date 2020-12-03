import type * as ts from 'typescript/lib/tsserverlibrary'

export enum RefactorKind {
    useMemo,
    useCallback
}

type MustHaveBody<T extends { body?: unknown }> = T extends { body?: infer B | undefined } ? T & {  body: B } : T

export type FunctionExpressionLike = MustHaveBody<
    ts.ArrowFunction | ts.FunctionDeclaration | ts.FunctionExpression
>

export type DependExpression = ts.Identifier | ts.ElementAccessExpression | ts.PropertyAccessExpression

export interface Info {
    kind: RefactorKind
    func: FunctionExpressionLike;
    deps: DependExpression[]
}

export interface RefactorContext {
    program: ts.Program
    file: ts.SourceFile
}

