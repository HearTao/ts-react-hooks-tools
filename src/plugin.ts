import type * as ts from 'typescript/lib/tsserverlibrary';
import { LanguageServiceLogger } from './logger';
import { TemplateLanguageServiceProxy } from './decorator';
import { CustomizedLanguageService } from './service';
import { SynchronizedConfiguration } from './types';
import { ConfigManager } from './config';

export class ReactHooksPlugin {
    private logger?: LanguageServiceLogger;
    private configManager?: ConfigManager;

    constructor(private readonly typescript: typeof ts) {}

    create(info: ts.server.PluginCreateInfo) {
        const config: SynchronizedConfiguration = info.config ?? {};
        this.logger = new LanguageServiceLogger(info);
        this.configManager = new ConfigManager(config);
        this.logger.log('create config: ' + JSON.stringify(config));

        return new TemplateLanguageServiceProxy(
            new CustomizedLanguageService(
                info,
                this.typescript,
                this.logger,
                this.configManager
            )
        ).decorate(info.languageService);
    }
    onConfigurationChanged(config: SynchronizedConfiguration) {
        this.logger?.log('update config: ' + JSON.stringify(config));
        this.configManager?.update(config);
    }
}
