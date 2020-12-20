import type * as ts from 'typescript/lib/tsserverlibrary';
import { Constants } from './constants';
import { first } from './helper';
import { DepSymbolResolver, FunctionExpressionLike } from './types';
import {
    isDeclarationAssignedByConstantsUseCallback,
    isDeclarationAssignedByConstantsUseMemo,
    isDeclarationAssignedByUseReducer,
    isDeclarationAssignedByUseRef,
    isDeclarationAssignedByUseState,
    isFunctionExpressionLike,
    isTopLevelConstantDeclaration,
    skipSymbolAlias
} from './utils';

export function isInTypeContext(typescript: typeof ts, node: ts.Node) {
    return typescript.isTypeElement(node) || typescript.isPartOfTypeNode(node);
}

export function createDepSymbolResolver(
    typescript: typeof ts,
    scope: ts.Node,
    additionalScope: readonly ts.Node[],
    file: ts.SourceFile,
    checker: ts.TypeChecker
): DepSymbolResolver {
    const cached = new Map<ts.Symbol, boolean>();
    const duplicated = new Set<ts.Symbol>();
    const accessExpressionContainsInnerCached = new Map<ts.Node, boolean>();

    return {
        shouldSymbolDefinitelyBeIgnoreInDeps,
        alreadyDuplicated,
        markAsDuplicated,
        isExpressionContainsDeclaredInner,
        markExpressionContainsDeclaredInner
    };

    function isWellKnownGlobalSymbol(symbol: ts.Symbol) {
        return (
            checker.isUndefinedSymbol(symbol) ||
            checker.isArgumentsSymbol(symbol)
        );
    }

    function markExpressionContainsDeclaredInner(
        expr: ts.Node,
        value: boolean
    ) {
        if (accessExpressionContainsInnerCached.has(expr)) {
            return;
        }
        accessExpressionContainsInnerCached.set(expr, value);
    }

    function isDeclarationContainsInnerFile(valueDeclaration: ts.Declaration) {
        if (valueDeclaration.getSourceFile() !== file) {
            return false;
        }

        if (typescript.rangeContainsRange(scope, valueDeclaration)) {
            return true;
        }

        if (
            additionalScope.some(s =>
                typescript.rangeContainsRange(s, valueDeclaration)
            )
        ) {
            return true;
        }
        return false;
    }

    function isExpressionContainsDeclaredInner(expr: ts.Node) {
        return visitor(expr);

        function visitor(node: ts.Node): boolean | undefined {
            if (!accessExpressionContainsInnerCached.has(node)) {
                if (typescript.isTypeNode(node)) {
                    return undefined;
                }

                if (typescript.isIdentifier(node)) {
                    const rawSymbol = checker.getSymbolAtLocation(node);
                    const symbol =
                        rawSymbol &&
                        skipSymbolAlias(typescript, rawSymbol, checker);
                    if (
                        symbol &&
                        !isWellKnownGlobalSymbol(symbol) &&
                        symbol.valueDeclaration
                    ) {
                        const result = isDeclarationContainsInnerFile(
                            symbol.valueDeclaration
                        );
                        accessExpressionContainsInnerCached.set(node, result);
                        return result;
                    }
                    accessExpressionContainsInnerCached.set(node, false);
                    return false;
                }
                const result = typescript.forEachChild(node, visitor);
                accessExpressionContainsInnerCached.set(node, !!result);
                return result;
            }
            return accessExpressionContainsInnerCached.get(node);
        }
    }

    function peekSymbolDefinitelyBeIgnoreInDeps(rawSymbol: ts.Symbol) {
        if (isWellKnownGlobalSymbol(rawSymbol)) {
            return true;
        }

        const symbol = skipSymbolAlias(typescript, rawSymbol, checker);
        const valueDeclaration = symbol.valueDeclaration;
        if (!valueDeclaration) {
            return false;
        }

        const declFile = valueDeclaration.getSourceFile();
        if (declFile.isDeclarationFile) {
            return true;
        }

        const inTypeContext = isInTypeContext(typescript, valueDeclaration);
        if (inTypeContext) {
            return false;
        }

        if (declFile !== file) {
            return true;
        }

        if (isDeclarationContainsInnerFile(valueDeclaration)) {
            return true;
        }

        if (
            isDeclarationAssignedByUseRef(typescript, valueDeclaration) ||
            isDeclarationAssignedByUseState(typescript, valueDeclaration) ||
            isDeclarationAssignedByUseReducer(typescript, valueDeclaration) ||
            isDeclarationAssignedByConstantsUseMemo(
                typescript,
                valueDeclaration
            ) ||
            isDeclarationAssignedByConstantsUseCallback(
                typescript,
                valueDeclaration
            )
        ) {
            return true;
        }

        if (isDeclarationConstants(valueDeclaration)) {
            return true;
        }

        if (isTopLevelConstantDeclaration(typescript, valueDeclaration)) {
            return true;
        }
        return false;

        function isExpressionConstants(node: ts.Expression) {
            if (typescript.isLiteralExpression(node)) {
                return true;
            }

            if (
                typescript.isParenthesizedExpression(node) ||
                typescript.isNonNullExpression(node)
            ) {
                return isParenExpressionOrNonNullExpressionConstants(node);
            }
            if (typescript.isIdentifier(node)) {
                return isIdentifierConstants(node);
            }
            if (typescript.isPropertyAccessExpression(node)) {
                return isPropertyAccessConstants(node);
            }
            if (typescript.isElementAccessExpression(node)) {
                return isElementAccessConstants(node);
            }
            if (typescript.isTemplateExpression(node)) {
                return isTemplateLiteralConstants(node);
            }
            if (typescript.isBinaryExpression(node)) {
                return isBinaryExpressionConstants(node);
            }
            if (
                typescript.isPrefixUnaryExpression(node) ||
                typescript.isPostfixUnaryExpression(node)
            ) {
                return isUpdateExpressionConstant(node);
            }
            if (typescript.isCallExpression(node)) {
                return isCallExpressionConstants(node);
            }
            if (isFunctionExpressionLike(typescript, node)) {
                return isSimpleFunctionLikeConstants(node);
            }
            return false;
        }

        function isDeclarationConstants(decl: ts.Declaration): boolean {
            if (
                typescript.isEnumDeclaration(decl) ||
                typescript.isEnumMember(decl) ||
                typescript.isModuleDeclaration(decl)
            ) {
                return true;
            }
            if (
                typescript.isVariableDeclaration(decl) &&
                typescript.getCombinedNodeFlags(decl) &
                    typescript.NodeFlags.Const &&
                decl.initializer &&
                isExpressionConstants(decl.initializer)
            ) {
                return true;
            }
            if (isFunctionExpressionLike(typescript, decl)) {
                return isSimpleFunctionLikeConstants(decl);
            }
            return false;
        }

        function isParenExpressionOrNonNullExpressionConstants(
            expression: ts.ParenthesizedExpression | ts.NonNullExpression
        ): boolean {
            return isExpressionConstants(expression.expression);
        }

        function isSimpleFunctionLikeConstants(
            func: FunctionExpressionLike
        ): boolean {
            if (func.parameters.length !== 0) {
                return false;
            }
            if (typescript.isBlock(func.body)) {
                const effectiveStatement = func.body.statements.filter(stmt =>
                    typescript.isEmptyStatement(stmt)
                );
                if (effectiveStatement.length === 1) {
                    const firstStatement = first(effectiveStatement);
                    if (
                        typescript.isReturnStatement(firstStatement) &&
                        firstStatement.expression
                    ) {
                        return isExpressionConstants(firstStatement.expression);
                    }
                }
            } else {
                return isExpressionConstants(func.body);
            }
            return false;
        }

        function isCallExpressionConstants(call: ts.CallExpression): boolean {
            if (call.arguments.length) {
                return false;
            }

            return isExpressionConstants(call.expression);
        }

        function isBinaryExpressionConstants(
            expression: ts.BinaryExpression
        ): boolean {
            if (typescript.isAssignmentExpression(expression)) {
                return false;
            }
            return (
                isExpressionConstants(expression.left) &&
                isExpressionConstants(expression.right)
            );
        }

        function isUpdateExpressionConstant(
            expression: ts.PrefixUnaryExpression | ts.PostfixUnaryExpression
        ): boolean {
            if (
                expression.operator === typescript.SyntaxKind.PlusPlusToken ||
                expression.operator === typescript.SyntaxKind.MinusMinusToken
            ) {
                return false;
            }
            return isExpressionConstants(expression.operand);
        }

        function isIdentifierImmutable(identifier: ts.Identifier) {
            return (
                identifier.text === Constants.UndefinedKeyword &&
                identifier.originalKeywordKind ===
                    typescript.SyntaxKind.UndefinedKeyword
            );
        }

        function isIdentifierConstants(expression: ts.Identifier): boolean {
            if (isIdentifierImmutable(expression)) {
                return true;
            }
            const symbol = checker.getSymbolAtLocation(expression);
            return !!(symbol && shouldSymbolDefinitelyBeIgnoreInDeps(symbol));
        }

        function isLiteralImmutable(expression: ts.Expression) {
            switch (expression.kind) {
                case typescript.SyntaxKind.StringLiteral:
                case typescript.SyntaxKind.NoSubstitutionTemplateLiteral:
                case typescript.SyntaxKind.NumericLiteral:
                case typescript.SyntaxKind.TrueKeyword:
                case typescript.SyntaxKind.FalseKeyword:
                case typescript.SyntaxKind.NullKeyword:
                case typescript.SyntaxKind.RegularExpressionLiteral:
                    return true;
                case typescript.SyntaxKind.Identifier:
                    return isIdentifierImmutable(expression as ts.Identifier);
                default:
                    return false;
            }
        }

        function isPropertyAccessConstants(
            expression: ts.PropertyAccessExpression
        ): boolean {
            const symbol = checker.getSymbolAtLocation(expression);
            if (symbol && shouldSymbolDefinitelyBeIgnoreInDeps(symbol)) {
                return true;
            }
            return isLiteralImmutable(expression.expression);
        }

        function isElementAccessConstants(
            expression: ts.ElementAccessExpression
        ): boolean {
            const symbol = checker.getSymbolAtLocation(expression);
            if (symbol && shouldSymbolDefinitelyBeIgnoreInDeps(symbol)) {
                return true;
            }
            return (
                isLiteralImmutable(expression.expression) &&
                isExpressionConstants(expression.argumentExpression)
            );
        }

        function isTemplateLiteralConstants(
            expression: ts.TemplateExpression
        ): boolean {
            return expression.templateSpans.every(span =>
                isExpressionConstants(span.expression)
            );
        }
    }

    function shouldSymbolDefinitelyBeIgnoreInDeps(rawSymbol: ts.Symbol) {
        if (!cached.has(rawSymbol)) {
            cached.set(
                rawSymbol,
                peekSymbolDefinitelyBeIgnoreInDeps(rawSymbol)
            );
        }

        return cached.get(rawSymbol);
    }

    function alreadyDuplicated(symbol: ts.Symbol) {
        return duplicated.has(symbol);
    }

    function markAsDuplicated(symbol: ts.Symbol) {
        duplicated.add(symbol);
    }
}
