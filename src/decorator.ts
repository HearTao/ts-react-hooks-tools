import type * as ts from 'typescript/lib/tsserverlibrary';

type LanguageServiceMethodWrapper<K extends keyof ts.LanguageService> = (
    delegate: ts.LanguageService[K],
    info?: ts.server.PluginCreateInfo
) => ts.LanguageService[K];

export interface ICustomizedLanguageServie {
    getApplicableRefactors: ts.LanguageService['getApplicableRefactors'];
    getEditsForRefactor: ts.LanguageService['getEditsForRefactor'];
}

export class TemplateLanguageServiceProxy {
    private readonly _wrappers: Array<{
        name: keyof ts.LanguageService;
        wrapper: LanguageServiceMethodWrapper<any>;
    }> = [];

    constructor(
        private readonly customizedLanguageServie: ICustomizedLanguageServie
    ) {
        this.tryAdaptGetApplicableRefactors();
        this.tryAdaptGetEditsForRefactor();
    }

    decorate(languageService: ts.LanguageService) {
        const intercept: Partial<ts.LanguageService> = Object.create(null);

        for (const { name, wrapper } of this._wrappers) {
            (intercept[name] as any) = wrapper(
                languageService[name]!.bind(languageService)
            );
        }

        languageService.getApplicableRefactors;

        return new Proxy(languageService, {
            get: (target: any, property: string | symbol) => {
                return (intercept as any)[property] || target[property];
            }
        });
    }

    private tryAdaptGetApplicableRefactors() {
        this.wrap(
            'getApplicableRefactors',
            delegate => (
                fileName: string,
                positionOrRange: number | ts.TextRange,
                preferences: ts.UserPreferences | undefined,
                triggerReason?: ts.RefactorTriggerReason
            ) => {
                const original = delegate(
                    fileName,
                    positionOrRange,
                    preferences,
                    triggerReason
                );
                const customized = this.customizedLanguageServie.getApplicableRefactors(
                    fileName,
                    positionOrRange,
                    preferences,
                    triggerReason
                );
                return original.concat(customized);
            }
        );
    }

    private tryAdaptGetEditsForRefactor() {
        this.wrap(
            'getEditsForRefactor',
            delegate => (
                fileName: string,
                formatOptions: ts.FormatCodeSettings,
                positionOrRange: number | ts.TextRange,
                refactorName: string,
                actionName: string,
                preferences: ts.UserPreferences | undefined
            ) => {
                const result = this.customizedLanguageServie.getEditsForRefactor(
                    fileName,
                    formatOptions,
                    positionOrRange,
                    refactorName,
                    actionName,
                    preferences
                );
                if (result) {
                    return result;
                }

                return delegate(
                    fileName,
                    formatOptions,
                    positionOrRange,
                    refactorName,
                    actionName,
                    preferences
                );
            }
        );
    }
    private wrap<K extends keyof ts.LanguageService>(
        name: K,
        wrapper: LanguageServiceMethodWrapper<K>
    ) {
        this._wrappers.push({ name, wrapper });
        return this;
    }
}
