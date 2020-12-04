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

    interface NodeFactory {
        cloneNode<T extends Node | undefined>(node: T): T;
    }
}
