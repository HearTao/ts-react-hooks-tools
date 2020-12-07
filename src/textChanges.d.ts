import 'typescript/lib/tsserverlibrary';

declare module 'typescript/lib/tsserverlibrary' {
    export namespace formatting {
        export interface FormatContext {
            readonly options: FormatCodeSettings;
            readonly getRules: unknown;
        }

        function getFormatContext(options: FormatCodeSettings): FormatContext;
    }

    export namespace textChanges {
        export interface TextChangesContext {
            host: LanguageServiceHost;
            formatContext: formatting.FormatContext;
            preferences: UserPreferences;
        }

        export interface ConfigurableStart {
            leadingTriviaOption?: LeadingTriviaOption;
        }

        export interface ConfigurableEnd {
            trailingTriviaOption?: TrailingTriviaOption;
        }

        export interface InsertNodeOptions {
            /**
             * Text to be inserted before the new node
             */
            prefix?: string;
            /**
             * Text to be inserted after the new node
             */
            suffix?: string;
            /**
             * Text of inserted node will be formatted with this indentation, otherwise indentation will be inferred from the old node
             */
            indentation?: number;
            /**
             * Text of inserted node will be formatted with this delta, otherwise delta will be inferred from the new node kind
             */
            delta?: number;
            /**
             * Do not trim leading white spaces in the edit range
             */
            preserveLeadingWhitespace?: boolean;
        }

        export enum LeadingTriviaOption {
            /** Exclude all leading trivia (use getStart()) */
            Exclude = 0,
            /** Include leading trivia and,
             * if there are no line breaks between the node and the previous token,
             * include all trivia between the node and the previous token
             */
            IncludeAll = 1,
            /**
             * Include attached JSDoc comments
             */
            JSDoc = 2,
            /**
             * Only delete trivia on the same line as getStart().
             * Used to avoid deleting leading comments
             */
            StartLine = 3
        }

        export enum TrailingTriviaOption {
            /** Exclude all trailing trivia (use getEnd()) */
            Exclude = 0,
            /** Include trailing trivia */
            Include = 1
        }

        export interface ConfigurableStartEnd
            extends ConfigurableStart,
                ConfigurableEnd {}

        export interface ChangeNodeOptions
            extends ConfigurableStartEnd,
                InsertNodeOptions {}

        export function applyChanges(
            text: string,
            changes: readonly TextChange[]
        ): string;

        export class ChangeTracker {
            public static with(
                context: TextChangesContext,
                cb: (tracker: ChangeTracker) => void
            ): FileTextChanges[];

            public replaceNode(
                sourceFile: SourceFile,
                oldNode: Node,
                newNode: Node,
                options?: ChangeNodeOptions
            ): void;

            public deleteNodeRange(
                sourceFile: SourceFile,
                startNode: Node,
                endNode: Node,
                options?: ConfigurableStartEnd
            ): void;

            public delete(
                sourceFile: SourceFile,
                node: Node | NodeArray<TypeParameterDeclaration>
            ): void;

            public finishDeleteDeclarations(): void;

            public insertNodeAtTopOfFile(
                sourceFile: SourceFile,
                newNode: Statement,
                blankLineBetween: boolean
            ): void;

            public insertNodeBefore(
                sourceFile: SourceFile,
                before: Node,
                newNode: Node
            ): void;
        }
    }
}
