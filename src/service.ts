import type * as ts from 'typescript/lib/tsserverlibrary'

import { ICustomizedLanguageServie } from './decorator'
import { LanguageServiceLogger } from "./logger"
import { DependExpression, FunctionExpressionLike, Info, RefactorContext, RefactorKind } from "./types";
import { findTopLevelNodeInSelection, isFunctionExpressionLike, functionExpressionLikeToExpression, getRangeOfPositionOrRange, isDef, createDepSymbolResolver, cloneDeep } from "./utils"

export class CustomizedLanguageService implements ICustomizedLanguageServie {
    constructor(
        private readonly info: ts.server.PluginCreateInfo,
        private readonly typescript: typeof ts,
        private readonly logger: LanguageServiceLogger
    ) {

    }

    getApplicableRefactors(fileName: string, positionOrRange: number | ts.TextRange, preferences: ts.UserPreferences | undefined, triggerReason?: ts.RefactorTriggerReason): ts.ApplicableRefactorInfo[] {
        const [startPosition, endPosition] = getRangeOfPositionOrRange(positionOrRange);
        if (!isDef(endPosition)) return []

        const context = this.getRefactorContext(fileName);
        if (!context) return []
        const { file, program } = context

        const info = this.getInfo(startPosition, endPosition, file, program)
        if (!info) return []

        if (info.kind === RefactorKind.useCallback) {
            return [{
                name: 'React hooks refactor',
                description: 'React hooks refactor',
                actions: [{
                    name: 'Wrap into React.useCallback',
                    description: 'Wrap into React.useCallback'
                }]
            }]
        }
        return []
    }

    getEditsForRefactor(fileName: string, formatOptions: ts.FormatCodeSettings, positionOrRange: number | ts.TextRange, refactorName: string, actionName: string, preferences: ts.UserPreferences | undefined) {
        const [startPosition, endPosition] = getRangeOfPositionOrRange(positionOrRange);
        if (!isDef(endPosition)) return undefined

        const context = this.getRefactorContext(fileName);
        if (!context) return undefined
        const { file, program } = context

        const info = this.getInfo(startPosition, endPosition, file, program)
        if (!info) return undefined

        const formatContext = this.typescript.formatting.getFormatContext(formatOptions);
        const textChangesContext: ts.textChanges.TextChangesContext = {
            formatContext,
            host: this.info.languageServiceHost,
            preferences: {}
        }
        if (info.kind === RefactorKind.useCallback && actionName === 'Wrap into React.useCallback') {
            return this.getEditsForConvertUseCallback(info, file, textChangesContext)
        }

        return undefined
    }

    getInfo(startPosition: number, endPosition: number, file: ts.SourceFile, program: ts.Program): Info | undefined {
        const ts = this.typescript;

        const startToken = ts.getTokenAtPosition(file, startPosition);
        const topLevelNode = findTopLevelNodeInSelection(ts, startToken, startPosition, endPosition, file);
        if (!topLevelNode) return undefined;

        const checker = program.getTypeChecker();
        if (isFunctionExpressionLike(ts, topLevelNode)) {
            return this.getInfoFromFunctionExpressionLike(topLevelNode, file, checker);
        }

        return undefined;
    }

    getInfoFromFunctionExpressionLike(func: FunctionExpressionLike, file: ts.SourceFile, checker: ts.TypeChecker): Info | undefined {
        const deps = this.getOutsideReferences(func.body, file, checker);
        this.logger?.log("Deps: " + deps.length)
        return {
            kind: RefactorKind.useCallback,
            func,
            deps
        }
    }

    getEditsForConvertUseCallback(info: Info, file: ts.SourceFile, textChangesContext: ts.textChanges.TextChangesContext): ts.RefactorEditInfo {
        const { deps, func } = info

        const edits = this.typescript.textChanges.ChangeTracker.with(textChangesContext, changeTracker => {
            changeTracker.replaceNode(
                file,
                func,
                this.wrapIntoUseCallback(func, deps)
            )
        })

        return {
            edits
        }
    }

    wrapIntoUseCallback(expression: FunctionExpressionLike, deps: DependExpression[]) {
        const factory = this.typescript.factory;

        const useCallback = factory.createCallExpression(
            factory.createPropertyAccessExpression(
                factory.createIdentifier("React"),
                factory.createIdentifier("useCallback")
            ),
            undefined,
            [
                functionExpressionLikeToExpression(this.typescript, expression),
                factory.createArrayLiteralExpression(
                    deps.map(dep => cloneDeep(this.typescript, dep) as DependExpression),
                    false
                )
            ]
        )
        return useCallback
    }

    getRefactorContext(fileName: string): RefactorContext | undefined {
        const ts = this.typescript;

        const compilerOptions = this.info.languageServiceHost.getCompilationSettings();
        if (!this.isValidJsxFlag(compilerOptions.jsx)) {
            return undefined
        }
        if (!ts.fileExtensionIs(fileName, ts.Extension.Tsx)) {
            return undefined
        }

        const program = this.info.languageService.getProgram();
        if (!program) return undefined

        const file = program.getSourceFile(fileName);
        if (!file) return undefined

        return {
            file,
            program
        }
    }

    getOutsideReferences(scope: ts.Node, file: ts.SourceFile, checker: ts.TypeChecker, preferFullAccess: boolean = true) {
        const ts = this.typescript;
        const logger = this.logger;
        const references: DependExpression[] = [];
        const resolver = createDepSymbolResolver(ts, scope, file);
    
        ts.forEachChild(scope, visitor);
        return references;
    
        function visitor (node: ts.Node) {
            switch (node.kind) {
                case ts.SyntaxKind.Identifier: {
                    const identifier = node as ts.Identifier;
                    logger?.log("Found Identifier: " + identifier.text)

                    const symbol = checker.getSymbolAtLocation(node);
                    if (!symbol || !resolver.shouldSymbolDefinitelyBeIgnoreInDeps(symbol)) {
                        references.push(identifier);
                    }
                    return
                }
                    
                case ts.SyntaxKind.ElementAccessExpression:
                case ts.SyntaxKind.PropertyAccessExpression: {
                    const accessExpression = node as ts.ElementAccessExpression | ts.PropertyAccessExpression;
                    logger?.log("Found accessExpression: " + accessExpression.getText())

                    if (preferFullAccess) {
                        const symbol = checker.getSymbolAtLocation(accessExpression);
                        if (!symbol || !resolver.shouldSymbolDefinitelyBeIgnoreInDeps(symbol)) {
                            references.push(accessExpression);
                        }
                        return
                    }
    
                    if (ts.isPropertyAccessExpression(accessExpression)) {
                        ts.forEachChild(accessExpression.expression, visitor);
                    } else {
                        ts.forEachChild(node, visitor)
                    }
                    return
                }
                    
                default:
                    ts.forEachChild(node, visitor)
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
                return true
            default:
                return false;
        }
    }
}
