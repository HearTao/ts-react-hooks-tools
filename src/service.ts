import type * as ts from 'typescript/lib/tsserverlibrary';

import { ICustomizedLanguageServie } from './decorator';
import { LanguageServiceLogger } from './logger';
import {
    refactorName,
    refactorDescriptions,
    wrapIntoUseContextActionName,
    wrapIntoUseContextActionDescription,
    wrapIntoUseMemoActionName,
    wrapIntoUseMemoActionDescription
} from './constants';
import {
    DependExpression,
    FunctionExpressionLike,
    Info,
    RefactorContext,
    RefactorKind,
    UseCallbackInfo,
    UseMemoInfo
} from './types';
import {
    findTopLevelNodeInSelection,
    isFunctionExpressionLike,
    functionExpressionLikeToExpression,
    getRangeOfPositionOrRange,
    isDef,
    createDepSymbolResolver,
    cloneDeep,
    skipSingleValueDeclaration,
    isExpression,
    wrapIntoJsxExpressionIfNeed,
    alreadyWrappedOrContainsInHooks,
    isInFunctionComponent
} from './utils';

export class CustomizedLanguageService implements ICustomizedLanguageServie {
    constructor(
        private readonly info: ts.server.PluginCreateInfo,
        private readonly typescript: typeof ts,
        private readonly logger: LanguageServiceLogger
    ) {}

    getApplicableRefactors(
        fileName: string,
        positionOrRange: number | ts.TextRange,
        preferences: ts.UserPreferences | undefined,
        triggerReason?: ts.RefactorTriggerReason
    ): ts.ApplicableRefactorInfo[] {
        const [startPosition, endPosition] = getRangeOfPositionOrRange(
            positionOrRange
        );
        if (!isDef(endPosition)) return [];

        const context = this.getRefactorContext(fileName);
        if (!context) return [];
        const { file, program } = context;

        const info = this.getInfo(startPosition, endPosition, file, program);
        if (!info) return [];

        if (info.kind === RefactorKind.useCallback) {
            return [
                {
                    name: refactorName,
                    description: refactorDescriptions,
                    actions: [
                        {
                            name: wrapIntoUseContextActionName,
                            description: wrapIntoUseContextActionDescription
                        }
                    ]
                }
            ];
        }
        if (info.kind === RefactorKind.useMemo) {
            return [
                {
                    name: refactorName,
                    description: refactorDescriptions,
                    actions: [
                        {
                            name: wrapIntoUseMemoActionName,
                            description: wrapIntoUseMemoActionDescription
                        }
                    ]
                }
            ];
        }
        return [];
    }

    getEditsForRefactor(
        fileName: string,
        formatOptions: ts.FormatCodeSettings,
        positionOrRange: number | ts.TextRange,
        refactorName: string,
        actionName: string,
        preferences: ts.UserPreferences | undefined
    ) {
        const [startPosition, endPosition] = getRangeOfPositionOrRange(
            positionOrRange
        );
        if (!isDef(endPosition)) return undefined;

        const context = this.getRefactorContext(fileName);
        if (!context) return undefined;
        const { file, program } = context;

        const info = this.getInfo(startPosition, endPosition, file, program);
        if (!info) return undefined;

        const formatContext = this.typescript.formatting.getFormatContext(
            formatOptions
        );
        const textChangesContext: ts.textChanges.TextChangesContext = {
            formatContext,
            host: this.info.languageServiceHost,
            preferences: preferences || {}
        };
        if (
            info.kind === RefactorKind.useCallback &&
            actionName === wrapIntoUseContextActionName
        ) {
            return this.getEditsForConvertUseCallback(
                info,
                file,
                textChangesContext
            );
        }
        if (
            info.kind === RefactorKind.useMemo &&
            actionName === wrapIntoUseMemoActionName
        ) {
            return this.getEditsForConvertUseMemo(
                info,
                file,
                textChangesContext
            );
        }

        return undefined;
    }

    getInfo(
        startPosition: number,
        endPosition: number,
        file: ts.SourceFile,
        program: ts.Program
    ): Info | undefined {
        const ts = this.typescript;

        const startToken = ts.getTokenAtPosition(file, startPosition);
        const rawTopLevelNode = findTopLevelNodeInSelection(
            ts,
            startToken,
            startPosition,
            endPosition,
            file
        );
        if (!rawTopLevelNode) return undefined;

        const topLevelNode = skipSingleValueDeclaration(
            this.typescript,
            rawTopLevelNode
        );

        if (ts.isPartOfTypeQuery(topLevelNode)) return undefined;

        const checker = program.getTypeChecker();
        if (alreadyWrappedOrContainsInHooks(ts, topLevelNode, checker)) {
            this.logger?.log('Already has hooks');
            return undefined;
        }
        if (!isInFunctionComponent(ts, topLevelNode, checker)) return undefined;

        this.logger?.log('TopLevelKind: ' + topLevelNode.kind);
        if (isFunctionExpressionLike(ts, topLevelNode)) {
            return this.getInfoFromFunctionExpressionLike(
                topLevelNode,
                file,
                checker
            );
        }

        if (isExpression(ts, topLevelNode)) {
            return this.getInfoFromUniversalExpression(
                topLevelNode,
                file,
                checker
            );
        }

        return undefined;
    }

    getInfoFromUniversalExpression(
        expression: ts.Expression,
        file: ts.SourceFile,
        checker: ts.TypeChecker
    ): Info {
        const deps = this.getOutsideReferences(expression, file, checker);
        this.logger?.log('Universal Deps: ' + deps.length);
        return {
            kind: RefactorKind.useMemo,
            expression,
            deps
        };
    }

    getInfoFromFunctionExpressionLike(
        func: FunctionExpressionLike,
        file: ts.SourceFile,
        checker: ts.TypeChecker
    ): Info {
        const deps = this.getOutsideReferences(func.body, file, checker);
        this.logger?.log('Function Deps: ' + deps.length);
        return {
            kind: RefactorKind.useCallback,
            func,
            deps
        };
    }

    getEditsForConvertUseCallback(
        info: UseCallbackInfo,
        file: ts.SourceFile,
        textChangesContext: ts.textChanges.TextChangesContext
    ): ts.RefactorEditInfo {
        const { deps, func } = info;

        const edits = this.typescript.textChanges.ChangeTracker.with(
            textChangesContext,
            changeTracker => {
                changeTracker.replaceNode(
                    file,
                    func,
                    this.wrapIntoUseCallback(func, deps)
                );
            }
        );

        return {
            edits
        };
    }

    getEditsForConvertUseMemo(
        info: UseMemoInfo,
        file: ts.SourceFile,
        textChangesContext: ts.textChanges.TextChangesContext
    ): ts.RefactorEditInfo {
        const { deps, expression } = info;

        const edits = this.typescript.textChanges.ChangeTracker.with(
            textChangesContext,
            changeTracker => {
                changeTracker.replaceNode(
                    file,
                    expression,
                    this.wrapIntoUseMemo(expression, deps)
                );
            }
        );

        return {
            edits
        };
    }

    wrapIntoUseCallback(
        expression: FunctionExpressionLike,
        deps: DependExpression[]
    ) {
        const factory = this.typescript.factory;

        const useCallbackCall = factory.createCallExpression(
            factory.createPropertyAccessExpression(
                factory.createIdentifier('React'),
                factory.createIdentifier('useCallback')
            ),
            undefined,
            [
                functionExpressionLikeToExpression(this.typescript, expression),
                factory.createArrayLiteralExpression(
                    deps.map(
                        dep =>
                            cloneDeep(this.typescript, dep) as DependExpression
                    ),
                    false
                )
            ]
        );
        return useCallbackCall;
    }

    wrapIntoUseMemo(expression: ts.Expression, deps: DependExpression[]) {
        const factory = this.typescript.factory;

        const useMemoCall = factory.createCallExpression(
            factory.createPropertyAccessExpression(
                factory.createIdentifier('React'),
                factory.createIdentifier('useMemo')
            ),
            undefined,
            [
                factory.createArrowFunction(
                    undefined,
                    undefined,
                    [],
                    undefined,
                    undefined,
                    expression
                ),
                factory.createArrayLiteralExpression(
                    deps.map(
                        dep =>
                            cloneDeep(this.typescript, dep) as DependExpression
                    ),
                    false
                )
            ]
        );
        return wrapIntoJsxExpressionIfNeed(
            this.typescript,
            expression,
            useMemoCall
        );
    }

    getRefactorContext(fileName: string): RefactorContext | undefined {
        const ts = this.typescript;

        const compilerOptions = this.info.languageServiceHost.getCompilationSettings();
        if (!this.isValidJsxFlag(compilerOptions.jsx)) {
            return undefined;
        }
        if (!ts.fileExtensionIs(fileName, ts.Extension.Tsx)) {
            return undefined;
        }

        const program = this.info.languageService.getProgram();
        if (!program) return undefined;

        const file = program.getSourceFile(fileName);
        if (!file) return undefined;

        return {
            file,
            program
        };
    }

    getOutsideReferences(
        scope: ts.Node,
        file: ts.SourceFile,
        checker: ts.TypeChecker,
        preferFullAccess: boolean = true
    ) {
        const ts = this.typescript;
        const logger = this.logger;
        const references: DependExpression[] = [];
        const resolver = createDepSymbolResolver(ts, scope, file);

        visitor(scope);
        return references;

        function visitor(node: ts.Node) {
            switch (node.kind) {
                case ts.SyntaxKind.Identifier: {
                    const identifier = node as ts.Identifier;
                    logger?.log('Found Identifier: ' + identifier.text);

                    const symbol = checker.getSymbolAtLocation(node);
                    if (
                        !symbol ||
                        (!resolver.alreadyDuplicated(symbol) &&
                            !resolver.shouldSymbolDefinitelyBeIgnoreInDeps(
                                symbol
                            ))
                    ) {
                        references.push(identifier);
                    }
                    return;
                }
                case ts.SyntaxKind.ElementAccessExpression:
                case ts.SyntaxKind.PropertyAccessExpression: {
                    const accessExpression = node as
                        | ts.ElementAccessExpression
                        | ts.PropertyAccessExpression;
                    logger?.log(
                        'Found accessExpression: ' + accessExpression.getText()
                    );

                    if (preferFullAccess) {
                        const symbol = checker.getSymbolAtLocation(
                            accessExpression
                        );
                        if (
                            !symbol ||
                            (!resolver.alreadyDuplicated(symbol) &&
                                !resolver.shouldSymbolDefinitelyBeIgnoreInDeps(
                                    symbol
                                ))
                        ) {
                            references.push(accessExpression);
                        }
                        return;
                    }

                    if (ts.isPropertyAccessExpression(accessExpression)) {
                        ts.forEachChild(accessExpression.expression, visitor);
                    } else {
                        ts.forEachChild(node, visitor);
                    }
                    return;
                }
                default:
                    ts.forEachChild(node, visitor);
            }
        }
    }

    isValidJsxFlag(jsx?: ts.JsxEmit) {
        const ts = this.typescript;

        switch (jsx) {
            case ts.JsxEmit.React:
            case ts.JsxEmit.ReactJSX:
            case ts.JsxEmit.ReactJSXDev:
            case ts.JsxEmit.ReactNative:
                return true;
            default:
                return false;
        }
    }
}
