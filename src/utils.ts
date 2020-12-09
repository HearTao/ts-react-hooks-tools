import type * as ts from 'typescript/lib/tsserverlibrary';
import {
    DependExpression,
    FunctionExpressionLike,
    HooksNameType,
    HooksReferenceNameType,
    JsxNames,
    Ternary
} from './types';
import {
    assertDef,
    first,
    getPackageNameOrNamespaceInNodeModules,
    isReactText,
    isUseCallback,
    isUseMemo,
    isUseRef,
    isUseSomething,
    isUseState,
    relativePathContainNodeModules,
    returnTrue,
    startsWithIgnoreCase
} from './helper';
import { Constants } from './constants';
import { LanguageServiceLogger } from './logger';

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

export function getGlobalJsxElementSymbol(
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
    return elementSymbol;
}

export function getGlobalJsxElementType(
    typescript: typeof ts,
    checker: ts.TypeChecker
) {
    const elementSymbol = getGlobalJsxElementSymbol(typescript, checker);
    return elementSymbol
        ? checker.getDeclaredTypeOfSymbol(elementSymbol)
        : undefined;
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

    const maybeFC = typescript.findAncestor(node.parent, parent => {
        if (isFunctionExpressionLike(typescript, parent)) {
            return (
                maybeCustomHooks(typescript, parent) ||
                isFunctionComponentLike(parent, checker, globalJsxElementType)
            );
        }
        if (typescript.isClassLike(parent)) {
            return 'quit';
        }
        return false;
    });
    return maybeFC ? Ternary.True : Ternary.False;
}

export function isInTagNameExpression(typescript: typeof ts, node: ts.Node) {
    let lastNode: ts.Node | undefined = undefined;
    return !!typescript.findAncestor(node, parent => {
        if (
            lastNode &&
            (typescript.isJsxOpeningElement(parent) ||
                typescript.isJsxClosingElement(parent)) &&
            typescript.isJsxTagNameExpression(lastNode) &&
            parent.tagName === lastNode
        ) {
            return true;
        }
        lastNode = parent;
        return false;
    });
}

export function isDefinitelyNotSupportedToken(
    typescript: typeof ts,
    node: ts.Node
) {
    switch (node.kind) {
        case typescript.SyntaxKind.JsxOpeningFragment:
        case typescript.SyntaxKind.JsxClosingFragment:
        case typescript.SyntaxKind.JsxText:
            return true;
        case typescript.SyntaxKind.Identifier:
        case typescript.SyntaxKind.ThisKeyword:
        case typescript.SyntaxKind.PropertyAccessExpression:
            return isInTagNameExpression(typescript, node);
        default:
            return false;
    }
}

export function functionExpressionLikeToExpression(
    typescript: typeof ts,
    func: FunctionExpressionLike
): [
    Exclude<FunctionExpressionLike, ts.FunctionDeclaration>,
    ts.Identifier | undefined
] {
    switch (func.kind) {
        case typescript.SyntaxKind.FunctionDeclaration:
            return [
                typescript.factory.createFunctionExpression(
                    func.modifiers,
                    func.asteriskToken,
                    func.name,
                    func.typeParameters,
                    func.parameters,
                    func.type,
                    func.body
                ),
                func.name
            ];
        default:
            return [func, undefined];
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

export function isDeclarationAssignedByReactHooks(
    typescript: typeof ts,
    declaration: ts.Declaration,
    pred = isUseSomething,
    hookCallPred: (initializer: ts.CallExpression) => boolean = returnTrue
) {
    if (
        typescript.isVariableDeclaration(declaration) &&
        declaration.initializer &&
        typescript.isCallExpression(declaration.initializer)
    ) {
        if (
            dummyCheckReactHooks(
                typescript,
                declaration.initializer.expression,
                pred
            ) &&
            hookCallPred(declaration.initializer)
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
    return isDeclarationAssignedByReactHooks(typescript, declaration, isUseRef);
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
            startsWithIgnoreCase(name.text, Constants.SetPrefix) &&
            isDeclarationAssignedByReactHooks(
                typescript,
                declaration.parent.parent,
                isUseState
            )
        );
    }
    return false;
}

export function isDeclarationAssignedByConstantsUseMemo(
    typescript: typeof ts,
    declaration: ts.Declaration
) {
    return isDeclarationAssignedByReactHooks(
        typescript,
        declaration,
        isUseMemo,
        hookCall => {
            if (hookCall.arguments.length === 2) {
                const secondArgument = hookCall.arguments[1];
                return (
                    typescript.isArrayLiteralExpression(secondArgument) &&
                    !secondArgument.elements.length
                );
            }
            return false;
        }
    );
}

export function isDeclarationAssignedByConstantsUseCallback(
    typescript: typeof ts,
    declaration: ts.Declaration
) {
    return isDeclarationAssignedByReactHooks(
        typescript,
        declaration,
        isUseCallback,
        hookCall => {
            if (hookCall.arguments.length === 2) {
                const secondArgument = hookCall.arguments[1];
                return (
                    typescript.isArrayLiteralExpression(secondArgument) &&
                    !secondArgument.elements.length
                );
            }
            return false;
        }
    );
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

export interface DepSymbolResolver {
    shouldSymbolDefinitelyBeIgnoreInDeps: (
        rawSymbol: ts.Symbol
    ) => boolean | undefined;
    alreadyDuplicated: (rawSymbol: ts.Symbol) => boolean;
}

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

    return {
        shouldSymbolDefinitelyBeIgnoreInDeps,
        alreadyDuplicated
    };

    function shouldSymbolDefinitelyBeIgnoreInDeps(rawSymbol: ts.Symbol) {
        check: if (!cached.has(rawSymbol)) {
            if (
                checker.isUndefinedSymbol(rawSymbol) ||
                checker.isArgumentsSymbol(rawSymbol)
            ) {
                cached.set(rawSymbol, true);
                break check;
            }

            const symbol = skipSymbolAlias(typescript, rawSymbol, checker);
            const valueDeclaration = symbol.valueDeclaration;
            if (!valueDeclaration) {
                cached.set(rawSymbol, false);
                break check;
            }

            const declFile = valueDeclaration.getSourceFile();
            if (declFile.isDeclarationFile) {
                cached.set(rawSymbol, true);
                break check;
            }

            const inTypeContext = isInTypeContext(typescript, valueDeclaration);
            if (inTypeContext) {
                cached.set(rawSymbol, false);
                break check;
            }

            if (declFile !== file) {
                cached.set(rawSymbol, true);
                break check;
            }

            if (typescript.rangeContainsRange(scope, valueDeclaration)) {
                cached.set(rawSymbol, true);
                break check;
            }

            if (
                additionalScope.some(s =>
                    typescript.rangeContainsRange(s, valueDeclaration)
                )
            ) {
                cached.set(rawSymbol, true);
                break check;
            }

            if (
                isDeclarationAssignedByUseRef(typescript, valueDeclaration) ||
                isDeclarationAssignedByUseState(typescript, valueDeclaration) ||
                isDeclarationAssignedByConstantsUseMemo(
                    typescript,
                    valueDeclaration
                ) ||
                isDeclarationAssignedByConstantsUseCallback(
                    typescript,
                    valueDeclaration
                )
            ) {
                cached.set(rawSymbol, true);
                break check;
            }

            if (
                isDeclarationDefinitelyConstants(typescript, valueDeclaration)
            ) {
                cached.set(rawSymbol, true);
                break check;
            }

            if (isTopLevelConstantDeclaration(typescript, valueDeclaration)) {
                cached.set(rawSymbol, true);
                break check;
            }

            cached.set(rawSymbol, false);
        }

        return cached.get(rawSymbol);
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

export function skipJsxTextToken(
    typescript: typeof ts,
    node: ts.Node,
    file: ts.SourceFile
) {
    if (typescript.isJsxText(node) && node.containsOnlyTriviaWhiteSpaces) {
        const nextToken = typescript.getTokenAtPosition(file, node.end);
        if (
            nextToken &&
            typescript.rangeContainsRange(node.parent, nextToken)
        ) {
            return nextToken;
        }
    }
    return node;
}

export function skipJsxExpression(
    typescript: typeof ts,
    node: ts.Node
): ts.Node {
    return (typescript.isJsxExpression(node) && node.expression) || node;
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

function alreadyWrappedInReactHooks(
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
        const dummyCheckResult = dummyCheckReactHooks(typescript, expression);
        const symbol = checker.getSymbolAtLocation(expression);
        if (!dummyCheckResult || !symbol) {
            return dummyCheckResult;
        }

        return dummyCheckResult && !!isReactHooks(typescript, symbol, checker);
    });

    return !!maybeHooks;
}

export function isReactHooks(
    typescript: typeof ts,
    symbol: ts.Symbol,
    checker: ts.TypeChecker
) {
    if (!symbol.valueDeclaration) {
        return Ternary.Maybe;
    }

    const globalJsxElementSymbol = getGlobalJsxElementSymbol(
        typescript,
        checker
    );
    if (!globalJsxElementSymbol) {
        return Ternary.Maybe;
    }

    const symbolDeclarationFileName = symbol.valueDeclaration.getSourceFile()
        .fileName;
    const symbolPackageName = getPackageNameOrNamespaceInNodeModules(
        symbolDeclarationFileName
    );
    if (!symbolPackageName) {
        return Ternary.False;
    }

    const inSamePackage = globalJsxElementSymbol.declarations.some(decl => {
        const fileName = decl.getSourceFile().fileName;
        if (fileName === symbolDeclarationFileName) {
            return true;
        }

        if (
            relativePathContainNodeModules(symbolDeclarationFileName, fileName)
        ) {
            return false;
        }

        const jsxElementPackageName = getPackageNameOrNamespaceInNodeModules(
            fileName
        );
        if (!jsxElementPackageName) {
            return false;
        }
        if (jsxElementPackageName === symbolPackageName) {
            return true;
        }
    });

    return inSamePackage ? Ternary.True : Ternary.False;
}

function alreadyContainsReactHooks(
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
            const dummyCheckResult = dummyCheckReactHooks(
                typescript,
                expression
            );
            const symbol = checker.getSymbolAtLocation(expression);
            if (!symbol)
                if (!symbol) {
                    maybeHooks ||= dummyCheckResult;
                    return dummyCheckResult;
                } else if (
                    dummyCheckResult &&
                    isReactHooks(typescript, symbol, checker)
                ) {
                    maybeHooks ||= true;
                    return true;
                }
        }
        typescript.forEachChild(child, visitor);
    }
}

export function alreadyWrappedOrContainsInReactHooks(
    typescript: typeof ts,
    node: ts.Node,
    checker: ts.TypeChecker
) {
    return (
        alreadyWrappedInReactHooks(typescript, node, checker) ||
        alreadyContainsReactHooks(typescript, node, checker)
    );
}

export function dummyCheckReactHooks(
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

export function skipSymbolAlias(
    typescript: typeof ts,
    symbol: ts.Symbol,
    checker: ts.TypeChecker
) {
    return symbol.flags & typescript.SymbolFlags.Alias
        ? checker.getAliasedSymbol(symbol)
        : symbol;
}

export function getHooksNameReferenceType(
    typescript: typeof ts,
    location: ts.Node,
    checker: ts.TypeChecker,
    hookName: string,
    isNewTrasnfromer: boolean
): HooksReferenceNameType | undefined {
    const meaning = typescript.SymbolFlags.Value | typescript.SymbolFlags.Alias;
    const identifierSymbol = checker.resolveName(
        hookName,
        location,
        meaning,
        false
    );
    const hasIdentifierReactHooksReference =
        identifierSymbol &&
        isReactHooks(
            typescript,
            skipSymbolAlias(typescript, identifierSymbol, checker),
            checker
        );
    if (isNewTrasnfromer || hasIdentifierReactHooksReference) {
        return {
            type: HooksNameType.useIdentifier,
            alreadyHasReference: !!hasIdentifierReactHooksReference
        };
    }

    const upperCaseSymbol = checker.resolveName(
        Constants.React,
        location,
        meaning,
        false
    );
    if (
        upperCaseSymbol &&
        isReactHooks(
            typescript,
            skipSymbolAlias(typescript, upperCaseSymbol, checker),
            checker
        )
    ) {
        return {
            type: HooksNameType.usePropertyAccess,
            name: Constants.React
        };
    }
    return undefined;
}

export function createHooksReference(
    typescript: typeof ts,
    sourceFile: ts.SourceFile,
    hooksReference: HooksReferenceNameType | undefined,
    hooksName: string
): [
    ts.Expression,
    ((textChanges: ts.textChanges.ChangeTracker) => void) | undefined
] {
    const factory = typescript.factory;

    if (!hooksReference) {
        return [
            factory.createPropertyAccessExpression(
                factory.createIdentifier(Constants.React),
                factory.createIdentifier(hooksName)
            ),
            undefined
        ];
    }

    if (hooksReference.type === HooksNameType.useIdentifier) {
        const postAction = hooksReference.alreadyHasReference
            ? undefined
            : (changeTracker: ts.textChanges.ChangeTracker) => {
                  findAndInsertReactImport(
                      typescript,
                      sourceFile,
                      hooksName,
                      changeTracker
                  );
              };
        return [factory.createIdentifier(hooksName), postAction];
    }

    return [
        factory.createPropertyAccessExpression(
            factory.createIdentifier(hooksReference.name),
            factory.createIdentifier(hooksName)
        ),
        undefined
    ];
}

export function findAndInsertReactImport(
    typescript: typeof ts,
    sourceFile: ts.SourceFile,
    hooksName: string,
    changeTracker: ts.textChanges.ChangeTracker
) {
    const importStmt = sourceFile.statements.find(stmt => {
        return (
            typescript.isImportDeclaration(stmt) &&
            typescript.isStringLiteral(stmt.moduleSpecifier) &&
            stmt.moduleSpecifier.text === Constants.ReactModule
        );
    });

    const reactImportDeclaration = importStmt as ts.ImportDeclaration;
    if (
        !reactImportDeclaration ||
        !reactImportDeclaration.importClause ||
        !reactImportDeclaration.importClause.namedBindings ||
        !typescript.isNamedImports(
            reactImportDeclaration.importClause.namedBindings
        )
    ) {
        changeTracker.insertNodeAtTopOfFile(
            sourceFile,
            generateImportReactDeclaration(typescript, hooksName),
            false
        );
        return;
    }

    changeTracker.replaceNode(
        sourceFile,
        reactImportDeclaration.importClause.namedBindings,
        insertNameIntoImportDeclaration(
            typescript,
            reactImportDeclaration.importClause.namedBindings,
            hooksName
        )
    );
}

export function insertNameIntoImportDeclaration(
    typescript: typeof ts,
    namedImports: ts.NamedImports,
    hooksName: string
): ts.NamedImports {
    const factory = typescript.factory;
    return factory.updateNamedImports(
        namedImports,
        namedImports.elements.concat(
            factory.createImportSpecifier(
                undefined,
                factory.createIdentifier(hooksName)
            )
        )
    );
}

export function generateImportReactDeclaration(
    typescript: typeof ts,
    hooksName: string
) {
    const factory = typescript.factory;
    return factory.createImportDeclaration(
        undefined,
        undefined,
        factory.createImportClause(
            false,
            undefined,

            factory.createNamedImports([
                factory.createImportSpecifier(
                    undefined,
                    factory.createIdentifier(hooksName)
                )
            ])
        ),
        factory.createStringLiteral(Constants.ReactModule)
    );
}

export function skipTriviaExpression(
    typescript: typeof ts,
    expression: ts.Node
) {
    switch (expression.kind) {
        case typescript.SyntaxKind.AsExpression:
        case typescript.SyntaxKind.ParenthesizedExpression:
            return (expression as ts.ParenthesizedExpression | ts.AsExpression)
                .expression;
        default:
            return expression;
    }
}

export function dummyDeDuplicateDeps(
    deps: DependExpression[]
): DependExpression[] {
    const dummyTextRecord = new Map<string, DependExpression>();

    deps.forEach(dep => {
        const text = dep.getText().trim();
        if (!dummyTextRecord.has(text)) {
            dummyTextRecord.set(text, dep);
        }
    });

    return Array.from(dummyTextRecord.values());
}

export function isDependExpression(
    typescript: typeof ts,
    expr: ts.Expression
): expr is DependExpression {
    return typescript.isIdentifier(expr) || typescript.isAccessExpression(expr);
}

export function shouldExpressionInDeps(
    typescript: typeof ts,
    expression: DependExpression,
    checker: ts.TypeChecker,
    resolver: DepSymbolResolver
) {
    switch (expression.kind) {
        case typescript.SyntaxKind.Identifier: {
            const identifier = expression as ts.Identifier;
            const symbol = checker.getSymbolAtLocation(identifier);
            if (symbol) {
                return shouldSymbolBeIgnore(symbol)
                    ? Ternary.False
                    : Ternary.True;
            }
            return Ternary.Maybe;
        }
        case typescript.SyntaxKind.PropertyAccessExpression:
        case typescript.SyntaxKind.ElementAccessExpression: {
            const accessExpression = expression as ts.AccessExpression;

            const symbol = checker.getSymbolAtLocation(accessExpression);
            if (symbol && shouldSymbolBeIgnore(symbol)) {
                return Ternary.False;
            }

            let topLevelAccessExpression: ts.Expression =
                accessExpression.expression;
            while (typescript.isAccessExpression(topLevelAccessExpression)) {
                topLevelAccessExpression = topLevelAccessExpression.expression;
            }
            const topLevelSymbol = checker.getSymbolAtLocation(
                topLevelAccessExpression
            );
            if (
                topLevelSymbol &&
                resolver.shouldSymbolDefinitelyBeIgnoreInDeps(topLevelSymbol)
            ) {
                return Ternary.False;
            }

            return Ternary.Maybe;
        }
    }

    function shouldSymbolBeIgnore(symbol: ts.Symbol) {
        return (
            resolver.alreadyDuplicated(symbol) ||
            resolver.shouldSymbolDefinitelyBeIgnoreInDeps(symbol)
        );
    }
}
