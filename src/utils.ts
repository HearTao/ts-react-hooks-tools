import type * as ts from 'typescript/lib/tsserverlibrary'
import { DependExpression, FunctionExpressionLike } from "./types";

export function isDef<T>(v: T | undefined | null): v is T {
    return v !== undefined && v !== null;
}

export function assertDef<T>(v: T | undefined | null): asserts v is T {
    if (!isDef(v)) {
        throw new Error('Must be defined')
    }
}

export function getRangeOfPositionOrRange (positionOrRange: number | ts.TextRange) {
    const [startPosition, endPosition] = typeof positionOrRange === "number" ? [positionOrRange, undefined] : [positionOrRange.pos, positionOrRange.end];
    return [startPosition, endPosition] as const;
}

export function startEndContainsStartEndSkipTrivia(typescript: typeof ts, start: number, end: number, node: ts.Node, file: ts.SourceFile): boolean {
    return start <= typescript.skipTrivia(file.text, node.pos) && end >= node.end;
}

export function findTopLevelNodeInSelection (typescript: typeof ts, token: ts.Node, start: number, end: number, file: ts.SourceFile) {
    return typescript.findAncestor(token, node => {
        if (!startEndContainsStartEndSkipTrivia(typescript, start, end, node.parent, file)) {
            return true
        }
        return false;
    })
}

export function functionExpressionLikeToExpression (typescript: typeof ts, func: FunctionExpressionLike): Exclude<FunctionExpressionLike, ts.FunctionDeclaration> {
    switch (func.kind) {
        case typescript.SyntaxKind.FunctionDeclaration:
            return typescript.factory.createFunctionExpression(
                func.modifiers,
                func.asteriskToken,
                func.name,
                func.typeParameters,
                func.parameters,
                func.type,
                func.body
            )
        default:
            return func;
    }
}

export function createDepSymbolResolver (typescript: typeof ts, node: ts.Node, file: ts.SourceFile) {
    const cached = new Map<ts.Symbol, boolean>();

    return {
        shouldSymbolDefinitelyBeIgnoreInDeps
    }

    function shouldSymbolDefinitelyBeIgnoreInDeps(symbol: ts.Symbol) {
        
        check: if (!cached.has(symbol)) {
            const valueDeclaration = symbol.valueDeclaration;
            if (valueDeclaration?.getSourceFile() !== file) {
                cached.set(symbol, true);
                break check
            }

            if (typescript.rangeContainsRange(node, valueDeclaration)) {
                cached.set(symbol, true);
                break check
            }

            cached.set(symbol, false)
        }

        return cached.get(symbol)
    }
}

export function isFunctionExpressionLike(typescript: typeof ts, v: ts.Node): v is FunctionExpressionLike {
    return (typescript.isArrowFunction(v) || typescript.isFunctionDeclaration(v) || typescript.isFunctionExpression(v)) && !!v.body
}

export function cloneDeep(typescript: typeof ts, v: ts.Node): ts.Node {
    return typescript.transform(v, [conext => {
        return node => visitor(node);

        function visitor(node: ts.Node): ts.Node {
            return typescript.setTextRange(
                typescript.factory.cloneNode(
                    typescript.visitEachChild(node, visitor, conext)
                ),
                {
                    pos: -1,
                    end: -1
                }
            )
        }
    }]).transformed[0]
}