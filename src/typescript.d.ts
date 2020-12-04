import 'typescript/lib/tsserverlibrary';

declare module 'typescript/lib/tsserverlibrary' {
    export function fileExtensionIs(path: string, extension: string): boolean;
    export function getTokenAtPosition(
        sourceFile: SourceFile,
        position: number
    ): Node;
    export function startEndContainsRange(
        start: number,
        end: number,
        range: TextRange
    ): boolean;
    export function rangeContainsRange(r1: TextRange, r2: TextRange): boolean;
    export function skipTrivia(
        text: string,
        pos: number,
        stopAfterLineBreak?: boolean,
        stopAtComments?: boolean
    ): number;
    export function isExpressionNode(node: Node): boolean;
    export function skipParentheses(node: Expression): Expression;
    export function skipParentheses(node: Node): Node;
    export function isPartOfTypeQuery(node: Node): boolean;
    export function createSymbolTable(symbols?: readonly Symbol[]): SymbolTable;
    interface TypeChecker {
        getExportsOfModule(moduleSymbol: Symbol): Symbol[];
        isTypeAssignableTo(source: Type, target: Type): boolean;
        getMergedSymbol(symbol: Symbol): Symbol;
        getMergedSymbol(symbol: Symbol | undefined): Symbol | undefined;
        getMergedSymbol(symbol: Symbol | undefined): Symbol | undefined;
        resolveName(
            name: string,
            location: Node | undefined,
            meaning: SymbolFlags,
            excludeGlobals: boolean
        ): Symbol | undefined;
    }

    interface NodeFactory {
        cloneNode<T extends Node | undefined>(node: T): T;
    }
}
