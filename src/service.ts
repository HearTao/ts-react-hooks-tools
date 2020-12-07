import type * as ts from 'typescript/lib/tsserverlibrary';

import { ICustomizedLanguageServie } from './decorator';
import { LanguageServiceLogger } from './logger';
import {
    refactorName,
    refactorDescriptions,
    wrapIntoUseCallbackActionName,
    wrapIntoUseCallbackActionDescription,
    wrapIntoUseMemoActionName,
    wrapIntoUseMemoActionDescription
} from './constants';
import {
    DependExpression,
    FunctionExpressionLike,
    HooksReferenceNameType,
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
    createDepSymbolResolver,
    cloneDeep,
    skipSingleValueDeclaration,
    isExpression,
    wrapIntoJsxExpressionIfNeed,
    alreadyWrappedOrContainsInReactHooks,
    skipJsxExpression,
    isInFunctionComponent,
    skipJsxTextToken,
    isDefinitelyNotSupportedToken,
    getHooksNameReferenceType,
    createHooksReference,
    skipTriviaExpression,
    dummyDeDuplicateDeps
} from './utils';
import { isDef } from './helper';

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
        if (!isDef(endPosition)) {
            this.logger.log('Cannot find endPosition');
            return [];
        }

        const context = this.getRefactorContext(fileName);
        if (!context) {
            this.logger.log('Cannot refactor context');
            return [];
        }
        const { file, program } = context;

        const info = this.getInfo(
            startPosition,
            endPosition,
            file,
            program,
            false
        );
        if (!info) {
            this.logger.log('Empty info');
            return [];
        }

        if (info.kind === RefactorKind.useCallback) {
            return [
                {
                    name: refactorName,
                    description: refactorDescriptions,
                    actions: [
                        {
                            name: wrapIntoUseCallbackActionName,
                            description: wrapIntoUseCallbackActionDescription
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
        if (!isDef(endPosition)) {
            this.logger.log('Cannot find endPosition');
            return undefined;
        }

        const context = this.getRefactorContext(fileName);
        if (!context) {
            this.logger.log('Cannot refactor context');
            return undefined;
        }
        const { file, program } = context;

        const info = this.getInfo(
            startPosition,
            endPosition,
            file,
            program,
            true
        );
        if (!info) {
            this.logger.log('Empty info');
            return undefined;
        }

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
            actionName === wrapIntoUseCallbackActionName
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

        this.logger.log('Unknown action');
        return undefined;
    }

    getInfo(
        startPosition: number,
        endPosition: number,
        file: ts.SourceFile,
        program: ts.Program,
        full: boolean
    ): Info | undefined {
        const ts = this.typescript;

        const startToken = skipJsxTextToken(
            ts,
            ts.getTokenAtPosition(file, startPosition),
            file
        );
        const rawTopLevelNode = findTopLevelNodeInSelection(
            ts,
            startToken,
            startPosition,
            endPosition,
            file
        );
        if (!rawTopLevelNode) {
            this.logger.log('Cannot find rawTopLevelNode');
            return undefined;
        }

        const topLevelNode = skipJsxExpression(
            this.typescript,
            skipSingleValueDeclaration(this.typescript, rawTopLevelNode)
        );

        if (isDefinitelyNotSupportedToken(ts, topLevelNode)) {
            this.logger.log(
                'topLevelNode definitely not supported: ' + topLevelNode.kind
            );
            return undefined;
        }
        if (ts.isPartOfTypeQuery(topLevelNode)) {
            this.logger.log('Cannot work inside type query');
            return undefined;
        }

        const checker = program.getTypeChecker();
        if (alreadyWrappedOrContainsInReactHooks(ts, topLevelNode, checker)) {
            this.logger.log('Already has hooks');
            return undefined;
        }
        if (!isInFunctionComponent(ts, topLevelNode, checker)) {
            this.logger.log('Not in function component');
            return undefined;
        }

        this.logger.log('TopLevelKind: ' + topLevelNode.kind);
        if (isFunctionExpressionLike(ts, topLevelNode)) {
            return this.getInfoFromFunctionExpressionLike(
                topLevelNode,
                file,
                checker,
                full
            );
        }

        if (isExpression(ts, topLevelNode)) {
            return this.getInfoFromUniversalExpression(
                topLevelNode,
                file,
                checker,
                full
            );
        }

        this.logger.log('No actions');
        return undefined;
    }

    getInfoFromUniversalExpression(
        expression: ts.Expression,
        file: ts.SourceFile,
        checker: ts.TypeChecker,
        full: boolean
    ): Info {
        const deps = full
            ? this.getOutsideReferences(expression, [], file, checker)
            : [];
        const hooksReference = full
            ? getHooksNameReferenceType(
                  this.typescript,
                  expression,
                  checker,
                  'useMemo'
              )
            : undefined;
        this.logger.log('Universal Deps: ' + deps.length);
        this.logger.log('hooksReference: ' + JSON.stringify(hooksReference));
        return {
            kind: RefactorKind.useMemo,
            expression,
            deps,
            hooksReference
        };
    }

    getInfoFromFunctionExpressionLike(
        func: FunctionExpressionLike,
        file: ts.SourceFile,
        checker: ts.TypeChecker,
        full: boolean
    ): Info {
        const deps = full
            ? this.getOutsideReferences(
                  func.body,
                  func.parameters,
                  file,
                  checker
              )
            : [];
        const hooksReference = full
            ? getHooksNameReferenceType(
                  this.typescript,
                  func,
                  checker,
                  'useCallback'
              )
            : undefined;
        this.logger.log('Function Deps: ' + deps.length);
        this.logger.log('hooksReference: ' + JSON.stringify(hooksReference));
        return {
            kind: RefactorKind.useCallback,
            func,
            deps,
            hooksReference
        };
    }

    getEditsForConvertUseCallback(
        info: UseCallbackInfo,
        file: ts.SourceFile,
        textChangesContext: ts.textChanges.TextChangesContext
    ): ts.RefactorEditInfo {
        const { deps, func, hooksReference } = info;

        const edits = this.typescript.textChanges.ChangeTracker.with(
            textChangesContext,
            changeTracker => {
                changeTracker.replaceNode(
                    file,
                    func,
                    this.wrapIntoUseCallback(func, deps, hooksReference)
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
        const { deps, expression, hooksReference } = info;

        const edits = this.typescript.textChanges.ChangeTracker.with(
            textChangesContext,
            changeTracker => {
                changeTracker.replaceNode(
                    file,
                    expression,
                    this.wrapIntoUseMemo(expression, deps, hooksReference)
                );
            }
        );

        return {
            edits
        };
    }

    wrapIntoUseCallback(
        expression: FunctionExpressionLike,
        deps: DependExpression[],
        hooksReference: HooksReferenceNameType | undefined
    ) {
        const factory = this.typescript.factory;

        const useCallbackCall = factory.createCallExpression(
            createHooksReference(
                this.typescript,
                hooksReference,
                'useCallback'
            ),
            undefined,
            [
                functionExpressionLikeToExpression(this.typescript, expression),
                factory.createArrayLiteralExpression(
                    dummyDeDuplicateDeps(deps).map(
                        dep =>
                            cloneDeep(this.typescript, dep) as DependExpression
                    ),
                    false
                )
            ]
        );
        return useCallbackCall;
    }

    wrapIntoUseMemo(
        expression: ts.Expression,
        deps: DependExpression[],
        hooksReference: HooksReferenceNameType | undefined
    ) {
        const factory = this.typescript.factory;

        const useMemoCall = factory.createCallExpression(
            createHooksReference(this.typescript, hooksReference, 'useMemo'),
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
                    dummyDeDuplicateDeps(deps).map(
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
            this.logger.log('Jsx options invalid');
            return undefined;
        }
        if (!ts.fileExtensionIs(fileName, ts.Extension.Tsx)) {
            this.logger.log('Not in tsx');
            return undefined;
        }

        const program = this.info.languageService.getProgram();
        if (!program) {
            this.logger.log('Cannot find program');
            return undefined;
        }

        const file = program.getSourceFile(fileName);
        if (!file) {
            this.logger.log('Cannot find source file');
            return undefined;
        }

        return {
            file,
            program
        };
    }

    getOutsideReferences(
        scope: ts.Node,
        additionalScope: readonly ts.Node[],
        file: ts.SourceFile,
        checker: ts.TypeChecker,
        preferFullAccess: boolean = true
    ) {
        const ts = this.typescript;
        const logger = this.logger;
        const references: DependExpression[] = [];
        const resolver = createDepSymbolResolver(
            ts,
            scope,
            additionalScope,
            file,
            checker
        );

        visitor(scope);
        return references;

        function visitor(node: ts.Node) {
            switch (node.kind) {
                case ts.SyntaxKind.Identifier: {
                    const identifier = node as ts.Identifier;
                    logger.log('Found Identifier: ' + identifier.text);

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
                    const accessExpression = skipTriviaExpression(ts, node) as
                        | ts.ElementAccessExpression
                        | ts.PropertyAccessExpression;
                    logger.log(
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
                            if (
                                ts.isPropertyAccessExpression(accessExpression)
                            ) {
                                references.push(accessExpression);
                                return;
                            }
                        }
                    }

                    if (ts.isPropertyAccessExpression(accessExpression)) {
                        visitor(accessExpression.expression);
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
