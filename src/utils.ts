import type * as ts from 'typescript/lib/tsserverlibrary';
import { FunctionExpressionLike } from './types';

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

namespace JsxNames {
    export const JSX = 'JSX';
    export const Element = 'Element';
}

export function getGlobalJsxNamespace(
    typescript: typeof ts,
    checker: ts.TypeChecker
) {
    return checker.resolveName(
        JsxNames.JSX,
        undefined,
        typescript.SymbolFlags.Namespace,
        false
    );
}

function getSymbol(
    typescript: typeof ts,
    checker: ts.TypeChecker,
    symbols: ts.SymbolTable,
    name: string,
    meaning: ts.SymbolFlags
): ts.Symbol | undefined {
    if (meaning) {
        const symbol = checker.getMergedSymbol(
            symbols.get(name as ts.__String)
        );
        if (symbol) {
            if (symbol.flags & meaning) {
                return symbol;
            }
            if (symbol.flags & typescript.SymbolFlags.Alias) {
                const target = checker.getAliasedSymbol(symbol);
                if (checker.isUnknownSymbol(target) || target.flags & meaning) {
                    return symbol;
                }
            }
        }
    }
    return undefined;
}

export function getGlobalJsxElementType(
    typescript: typeof ts,
    checker: ts.TypeChecker
) {
    const globalJsxNamespace = getGlobalJsxNamespace(typescript, checker);
    if (!globalJsxNamespace) return undefined;

    const exportsSymbols = checker.getExportsOfModule(globalJsxNamespace);
    const symbolTable = typescript.createSymbolTable(exportsSymbols);
    const elementSymbol = getSymbol(
        typescript,
        checker,
        symbolTable,
        JsxNames.Element,
        typescript.SymbolFlags.Type
    );
    return elementSymbol
        ? checker.getDeclaredTypeOfSymbol(elementSymbol)
        : undefined;
}

export const enum Ternary {
    False = 0,
    Unknown = 1,
    Maybe = 3,
    True = -1
}

export function isFunctionComponentLike(
    node: FunctionExpressionLike,
    checker: ts.TypeChecker,
    globalJsxElementType: ts.Type
) {
    const signature = checker.getSignatureFromDeclaration(node);
    if (signature) {
        const returnType = checker.getReturnTypeOfSignature(signature);
        if (checker.isTypeAssignableTo(returnType, globalJsxElementType)) {
            return true;
        }
    }
    return false;
}

export function maybeCustomHooks(
    typescript: typeof ts,
    node: FunctionExpressionLike
) {
    switch (node.kind) {
        case typescript.SyntaxKind.FunctionExpression:
        case typescript.SyntaxKind.FunctionDeclaration:
            if (node.name) {
                return isUseSomething(node.name.text);
            }

        case typescript.SyntaxKind.ArrowFunction:
            const parent = node.parent;
            if (
                typescript.isVariableDeclaration(parent) &&
                typescript.isIdentifier(parent.name)
            ) {
                return isUseSomething(parent.name.text);
            }
        default:
            return false;
    }
}

export function isInFunctionComponent(
    typescript: typeof ts,
    node: ts.Node,
    checker: ts.TypeChecker
): Ternary {
    const globalJsxElementType = getGlobalJsxElementType(typescript, checker);
    if (!globalJsxElementType) return Ternary.Maybe;

    const maybeFC = typescript.findAncestor(node, parent => {
        if (isFunctionExpressionLike(typescript, parent)) {
            return (
                maybeCustomHooks(typescript, parent) ||
                isFunctionComponentLike(parent, checker, globalJsxElementType)
            );
        }
        return false;
    });
    return maybeFC ? Ternary.True : Ternary.False;
}

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

export function byPassRootDeclaration(
    typescript: typeof ts,
    node: ts.Node
): ts.Node {
    switch (node.kind) {
        case typescript.SyntaxKind.VariableDeclaration:
        case typescript.SyntaxKind.VariableDeclarationList:
        case typescript.SyntaxKind.BindingElement:
        case typescript.SyntaxKind.ArrayBindingPattern:
        case typescript.SyntaxKind.ObjectBindingPattern:
            return byPassRootDeclaration(typescript, node.parent);
        default:
            return node;
    }
}

export function isConstantDeclarationIfRoot(
    typescript: typeof ts,
    node: ts.Node
) {
    switch (node.kind) {
        case typescript.SyntaxKind.VariableStatement:
            return !!(
                typescript.getCombinedNodeFlags(
                    (node as ts.VariableStatement).declarationList
                ) & typescript.NodeFlags.Const
            );
        case typescript.SyntaxKind.FunctionDeclaration:
        case typescript.SyntaxKind.ClassDeclaration:
            return true;
        default:
            return false;
    }
}

export function isTopLevelConstantDeclaration(
    typescript: typeof ts,
    declaration: ts.Declaration
) {
    const rootDeclaration = byPassRootDeclaration(typescript, declaration);
    if (typescript.isSourceFile(rootDeclaration.parent)) {
        return isConstantDeclarationIfRoot(typescript, rootDeclaration);
    }
    return false;
}

export function isDeclarationAssignedByHooks(
    typescript: typeof ts,
    declaration: ts.Declaration,
    pred = isUseSomething
) {
    if (
        typescript.isVariableDeclaration(declaration) &&
        declaration.initializer &&
        typescript.isCallExpression(declaration.initializer)
    ) {
        if (
            dummyCheckHooks(
                typescript,
                declaration.initializer.expression,
                pred
            )
        ) {
            return true;
        }
    }
    return false;
}

export function isDeclarationAssignedByUseRef(
    typescript: typeof ts,
    declaration: ts.Declaration
) {
    return isDeclarationAssignedByHooks(typescript, declaration, isUseRef);
}

export function isDeclarationAssignedByUseState(
    typescript: typeof ts,
    declaration: ts.Declaration
) {
    if (
        typescript.isBindingElement(declaration) &&
        typescript.isArrayBindingPattern(declaration.parent) &&
        declaration.parent.elements.length === 2 &&
        declaration.parent.elements[1] === declaration &&
        typescript.isVariableDeclaration(declaration.parent.parent)
    ) {
        const name = declaration.propertyName ?? declaration.name;
        return (
            typescript.isIdentifier(name) &&
            startsWithIgnoreCase(name.text, 'set') &&
            isDeclarationAssignedByHooks(
                typescript,
                declaration.parent.parent,
                isUseState
            )
        );
    }
    return false;
}

export function isDeclarationDefinitelyConstants(
    typescript: typeof ts,
    declaration: ts.Declaration
) {
    if (
        typescript.isEnumDeclaration(declaration) ||
        typescript.isEnumMember(declaration)
    ) {
        return true;
    }
    if (
        typescript.isVariableDeclaration(declaration) &&
        typescript.getCombinedNodeFlags(declaration) &
            typescript.NodeFlags.Const &&
        declaration.initializer &&
        typescript.isLiteralExpression(declaration.initializer)
    ) {
        return true;
    }
    return;
}

export function createDepSymbolResolver(
    typescript: typeof ts,
    node: ts.Node,
    file: ts.SourceFile
) {
    const cached = new Map<ts.Symbol, boolean>();

    return {
        shouldSymbolDefinitelyBeIgnoreInDeps,
        alreadyDuplicated
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

            if (
                isDeclarationAssignedByUseRef(typescript, valueDeclaration) ||
                isDeclarationAssignedByUseState(typescript, valueDeclaration)
            ) {
                cached.set(symbol, true);
                break check;
            }

            if (
                isDeclarationDefinitelyConstants(typescript, valueDeclaration)
            ) {
                cached.set(symbol, true);
                break check;
            }

            if (isTopLevelConstantDeclaration(typescript, valueDeclaration)) {
                cached.set(symbol, true);
                break check;
            }

            cached.set(symbol, false);
        }

        return cached.get(symbol);
    }

    function alreadyDuplicated(symbol: ts.Symbol) {
        return cached.has(symbol);
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

export function startsWithIgnoreCase(a: string, b: string) {
    return a.toLowerCase().startsWith(b.toLowerCase());
}

export function isReactText(s: string) {
    return compareIgnoreCase(s, 'react');
}

export function isUseSomething(s: string) {
    return startsWithIgnoreCase(s, 'use');
}

export function isUseRef(s: string) {
    return compareIgnoreCase(s, 'useRef');
}

export function isUseState(s: string) {
    return compareIgnoreCase(s, 'useState');
}

export function dummyCheckHooks(
    typescript: typeof ts,
    expression: ts.Expression,
    pred = isUseSomething
): boolean {
    if (typescript.isIdentifier(expression)) {
        return pred(expression.text);
    }
    if (typescript.isPropertyAccessExpression(expression)) {
        return (
            typescript.isIdentifier(expression.expression) &&
            isReactText(expression.expression.text) &&
            pred(expression.name.text)
        );
    }
    if (typescript.isElementAccessExpression(expression)) {
        return (
            typescript.isIdentifier(expression.expression) &&
            typescript.isStringLiteralLike(expression.argumentExpression) &&
            isReactText(expression.expression.text) &&
            pred(expression.argumentExpression.text)
        );
    }
    return false;
}
