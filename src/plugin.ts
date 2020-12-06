import type * as ts from 'typescript/lib/tsserverlibrary';
import { LanguageServiceLogger } from './logger';
import { TemplateLanguageServiceProxy } from './decorator';
import { CustomizedLanguageService } from './service';

export class ReactHooksPlugin {
    private logger?: LanguageServiceLogger;

    constructor(private readonly typescript: typeof ts) {}

    create(info: ts.server.PluginCreateInfo) {
        this.logger = new LanguageServiceLogger(info);

        this.logger.log("I'm getting set up now!");

        return new TemplateLanguageServiceProxy(
            new CustomizedLanguageService(info, this.typescript, this.logger)
        ).decorate(info.languageService);
    }
}
