import type * as ts from 'typescript/lib/tsserverlibrary';
import { DependExpression, FunctionExpressionLike } from './types';

export function isDef<T>(v: T | undefined | null): v is T {
    return v !== undefined && v !== null;
}

export function assertDef<T>(v: T | undefined | null): asserts v is T {
    if (!isDef(v)) {
        throw new Error('Must be defined');
    }
}

export function first<T>(v: readonly T[]): T {
    if (v.length === 0) {
        throw new Error('Index out of range');
    }
    return v[0];
}

export function getRangeOfPositionOrRange(
    positionOrRange: number | ts.TextRange
) {
    const [startPosition, endPosition] =
        typeof positionOrRange === 'number'
            ? [positionOrRange, undefined]
            : [positionOrRange.pos, positionOrRange.end];
    return [startPosition, endPosition] as const;
}

export function startEndContainsStartEndSkipTrivia(
    typescript: typeof ts,
    start: number,
    end: number,
    node: ts.Node,
    file: ts.SourceFile
): boolean {
    return (
        start <= typescript.skipTrivia(file.text, node.pos) && end >= node.end
    );
}

export function findTopLevelNodeInSelection(
    typescript: typeof ts,
    token: ts.Node,
    start: number,
    end: number,
    file: ts.SourceFile
) {
    return typescript.findAncestor(token, node => {
        if (
            !startEndContainsStartEndSkipTrivia(
                typescript,
                start,
                end,
                node.parent,
                file
            )
        ) {
            return true;
        }
        return false;
    });
}

export function isInFunctionComponent(node: Node) {}

export function functionExpressionLikeToExpression(
    typescript: typeof ts,
    func: FunctionExpressionLike
): Exclude<FunctionExpressionLike, ts.FunctionDeclaration> {
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
            );
        default:
            return func;
    }
}

export function createDepSymbolResolver(
    typescript: typeof ts,
    node: ts.Node,
    file: ts.SourceFile
) {
    const cached = new Map<ts.Symbol, boolean>();

    return {
        shouldSymbolDefinitelyBeIgnoreInDeps
    };

    function shouldSymbolDefinitelyBeIgnoreInDeps(symbol: ts.Symbol) {
        check: if (!cached.has(symbol)) {
            const valueDeclaration = symbol.valueDeclaration;
            if (valueDeclaration?.getSourceFile() !== file) {
                cached.set(symbol, true);
                break check;
            }

            if (typescript.rangeContainsRange(node, valueDeclaration)) {
                cached.set(symbol, true);
                break check;
            }

            cached.set(symbol, false);
        }

        return cached.get(symbol);
    }
}

export function isFunctionExpressionLike(
    typescript: typeof ts,
    v: ts.Node
): v is FunctionExpressionLike {
    return (
        (typescript.isArrowFunction(v) ||
            typescript.isFunctionDeclaration(v) ||
            typescript.isFunctionExpression(v)) &&
        !!v.body
    );
}

export function cloneDeep(typescript: typeof ts, v: ts.Node): ts.Node {
    return typescript.transform(v, [
        conext => {
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
                );
            }
        }
    ]).transformed[0];
}

export function skipSingleValueDeclaration(
    typescript: typeof ts,
    node: ts.Node
): ts.Node {
    const original = node;
    if (typescript.isVariableStatement(node)) {
        node = node.declarationList;
    }
    if (
        typescript.isVariableDeclarationList(node) &&
        node.declarations.length === 1
    ) {
        node = first(node.declarations);
    }
    if (typescript.isVariableDeclaration(node) && node.initializer) {
        return node.initializer;
    }
    return original;
}

export function isExpression(
    typescript: typeof ts,
    node: ts.Node
): node is ts.Expression {
    return typescript.isExpressionNode(node);
}

export function wrapIntoJsxExpressionIfNeed(
    typescript: typeof ts,
    node: ts.Node,
    newNode: ts.Expression
) {
    return typescript.isJsxElement(node.parent)
        ? typescript.factory.createJsxExpression(undefined, newNode)
        : newNode;
}

export function skipParenthesesUp(
    typescript: typeof ts,
    node: ts.Node
): ts.Node {
    while (node.kind === typescript.SyntaxKind.ParenthesizedExpression) {
        node = node.parent;
    }
    return node;
}

function alreadyWrappedInHooks(
    typescript: typeof ts,
    node: ts.Node,
    checker: ts.TypeChecker
): boolean {
    const maybeHooks = typescript.findAncestor(node, parent => {
        if (
            !typescript.isCallExpression(parent) ||
            !typescript.rangeContainsRange(parent.arguments, node)
        ) {
            return false;
        }

        const expression = typescript.skipParentheses(parent.expression);
        const symbol = checker.getSymbolAtLocation(expression);
        if (!symbol) {
            return dummyCheckHooks(typescript, expression);
        }

        //TODO: check by declaration
        return dummyCheckHooks(typescript, expression);
    });

    return !!maybeHooks;
}

function alreadyContainsHooks(
    typescript: typeof ts,
    node: ts.Node,
    checker: ts.TypeChecker
): boolean {
    let maybeHooks = false;
    visitor(node);

    return !!maybeHooks;

    function visitor(child: ts.Node) {
        if (typescript.isCallExpression(child)) {
            const expression = typescript.skipParentheses(child.expression);
            const symbol = checker.getSymbolAtLocation(expression);
            if (!symbol && dummyCheckHooks(typescript, expression)) {
                maybeHooks ||= true;
                return true;
            } else if (dummyCheckHooks(typescript, expression)) {
                //TODO: check by declaration
                maybeHooks ||= true;
                return true;
            }
        }
        typescript.forEachChild(child, visitor);
    }
}

export function alreadyWrappedOrContainsInHooks(
    typescript: typeof ts,
    node: ts.Node,
    checker: ts.TypeChecker
) {
    return (
        alreadyWrappedInHooks(typescript, node, checker) ||
        alreadyContainsHooks(typescript, node, checker)
    );
}

export function compareIgnoreCase(a: string, b: string) {
    return a.toLowerCase() === b.toLowerCase();
}

export function isReactText(s: string) {
    return compareIgnoreCase(s, 'react');
}

export function isUseSomething(s: string) {
    return s.toLowerCase().startsWith('use');
}

export function dummyCheckHooks(
    typescript: typeof ts,
    expression: ts.Expression
): boolean {
    if (typescript.isIdentifier(expression)) {
        return isUseSomething(expression.text);
    }
    if (typescript.isPropertyAccessExpression(expression)) {
        return (
            typescript.isIdentifier(expression.expression) &&
            isReactText(expression.expression.text) &&
            isUseSomething(expression.name.text)
        );
    }
    if (typescript.isElementAccessExpression(expression)) {
        return (
            typescript.isIdentifier(expression.expression) &&
            typescript.isStringLiteralLike(expression.argumentExpression) &&
            isReactText(expression.expression.text) &&
            isUseSomething(expression.argumentExpression.text)
        );
    }
    return false;
}
