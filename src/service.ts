import type * as ts from 'typescript/lib/tsserverlibrary';

import { ICustomizedLanguageServie } from './decorator';
import { LanguageServiceLogger } from './logger';
import {
    refactorName,
    refactorDescriptions,
    wrapIntoUseCallbackActionName,
    wrapIntoUseCallbackActionDescription,
    wrapIntoUseMemoActionName,
    wrapIntoUseMemoActionDescription,
    Constants
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
    dummyDeDuplicateDeps,
    shouldExpressionInDeps
} from './utils';
import { isDef } from './helper';
import { ConfigManager } from './config';

export class CustomizedLanguageService implements ICustomizedLanguageServie {
    constructor(
        private readonly info: ts.server.PluginCreateInfo,
        private readonly typescript: typeof ts,
        private readonly logger: LanguageServiceLogger,
        private readonly configManager: ConfigManager
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

        const topLevelNode = skipTriviaExpression(
            this.typescript,
            skipJsxExpression(
                this.typescript,
                skipSingleValueDeclaration(this.typescript, rawTopLevelNode)
            )
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
            ? this.getOutsideReferences(
                  expression,
                  [],
                  file,
                  checker,
                  this.configManager.config.preferFullAccess
              )
            : [];
        const hooksReference = full
            ? getHooksNameReferenceType(
                  this.typescript,
                  expression,
                  checker,
                  'useMemo',
                  this.isNewJsxTransformer()
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
                  checker,
                  this.configManager.config.preferFullAccess
              )
            : [];
        const hooksReference = full
            ? getHooksNameReferenceType(
                  this.typescript,
                  func,
                  checker,
                  'useCallback',
                  this.isNewJsxTransformer()
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
                this.wrapIntoUseCallback(
                    func,
                    file,
                    deps,
                    hooksReference,
                    changeTracker
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
                this.wrapIntoUseMemo(
                    expression,
                    file,
                    deps,
                    hooksReference,
                    changeTracker
                );
            }
        );

        return {
            edits
        };
    }

    wrapIntoUseCallback(
        func: FunctionExpressionLike,
        file: ts.SourceFile,
        deps: DependExpression[],
        hooksReference: HooksReferenceNameType | undefined,
        changeTracker: ts.textChanges.ChangeTracker
    ) {
        const factory = this.typescript.factory;
        const [referenceExpression, postAction] = createHooksReference(
            this.typescript,
            file,
            hooksReference,
            Constants.UseCallback
        );

        const useCallbackCall = factory.createCallExpression(
            referenceExpression,
            undefined,
            [
                functionExpressionLikeToExpression(this.typescript, func),
                factory.createArrayLiteralExpression(
                    dummyDeDuplicateDeps(deps).map(
                        dep =>
                            cloneDeep(this.typescript, dep) as DependExpression
                    ),
                    false
                )
            ]
        );

        changeTracker.replaceNode(file, func, useCallbackCall);
        postAction?.(changeTracker);
    }

    wrapIntoUseMemo(
        expression: ts.Expression,
        file: ts.SourceFile,
        deps: DependExpression[],
        hooksReference: HooksReferenceNameType | undefined,
        changeTracker: ts.textChanges.ChangeTracker
    ) {
        const factory = this.typescript.factory;
        const [referenceExpression, postAction] = createHooksReference(
            this.typescript,
            file,
            hooksReference,
            Constants.UseMemo
        );

        const useMemoCall = factory.createCallExpression(
            referenceExpression,
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
        const finallyExpression = wrapIntoJsxExpressionIfNeed(
            this.typescript,
            expression,
            useMemoCall
        );

        changeTracker.replaceNode(file, expression, finallyExpression);
        postAction?.(changeTracker);
    }

    getRefactorContext(fileName: string): RefactorContext | undefined {
        if (!this.isValidJsxFlag()) {
            this.logger.log('Jsx options invalid');
            return undefined;
        }
        if (
            !this.typescript.fileExtensionIs(
                fileName,
                this.typescript.Extension.Tsx
            )
        ) {
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
            if (ts.isTypeNode(node)) {
                return;
            }

            switch (node.kind) {
                case ts.SyntaxKind.Identifier: {
                    const identifier = node as ts.Identifier;
                    logger.log('Found Identifier: ' + identifier.text);
                    if (
                        shouldExpressionInDeps(
                            ts,
                            identifier,
                            checker,
                            resolver
                        )
                    ) {
                        references.push(identifier);
                    }
                    return;
                }
                case ts.SyntaxKind.ElementAccessExpression:
                case ts.SyntaxKind.PropertyAccessExpression: {
                    const accessExpression = node as ts.PropertyAccessExpression;
                    logger.log(
                        'Found accessExpression: ' + accessExpression.getText()
                    );

                    if (preferFullAccess) {
                        if (
                            shouldExpressionInDeps(
                                ts,
                                accessExpression,
                                checker,
                                resolver
                            )
                        ) {
                            references.push(accessExpression);
                            return;
                        }
                    }
                    if (ts.isPropertyAccessExpression(accessExpression)) {
                        visitor(accessExpression.expression);
                    } else {
                        ts.forEachChild(accessExpression, visitor);
                    }
                    return;
                }
                default:
                    ts.forEachChild(node, visitor);
            }
        }
    }

    isValidJsxFlag() {
        const compilerOptions = this.info.languageServiceHost.getCompilationSettings();
        switch (compilerOptions.jsx) {
            case this.typescript.JsxEmit.React:
            case this.typescript.JsxEmit.ReactJSX:
            case this.typescript.JsxEmit.ReactJSXDev:
            case this.typescript.JsxEmit.ReactNative:
                return true;
            default:
                return false;
        }
    }
    isNewJsxTransformer() {
        const compilerOptions = this.info.languageServiceHost.getCompilationSettings();
        switch (compilerOptions.jsx) {
            case this.typescript.JsxEmit.ReactJSX:
            case this.typescript.JsxEmit.ReactJSXDev:
                return true;
            default:
                return false;
        }
    }
}
