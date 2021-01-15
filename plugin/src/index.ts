import * as vscode from 'vscode';

const typeScriptExtensionId = 'vscode.typescript-language-features';
const pluginId = 'ts-react-hooks-tools';
const configurationSection = 'trht';

interface SynchronizedConfiguration {
    preferFullAccess?: boolean;
    preferImmutableCall?: boolean;
    preferConstantCall?: boolean;
}

export async function activate(context: vscode.ExtensionContext) {
    const extension = vscode.extensions.getExtension(typeScriptExtensionId);
    if (!extension) {
        return;
    }

    await extension.activate();
    if (!extension.exports || !extension.exports.getAPI) {
        return;
    }
    const api = extension.exports.getAPI(0);
    if (!api) {
        return;
    }

    vscode.workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration(configurationSection)) {
            synchronizeConfiguration(api);
        }
    }, undefined, context.subscriptions);

    synchronizeConfiguration(api);
}

function synchronizeConfiguration(api: any) {
    api.configurePlugin(pluginId, getConfiguration());
}

function getConfiguration(): SynchronizedConfiguration {
    const config = vscode.workspace.getConfiguration(configurationSection);
    const outConfig: SynchronizedConfiguration = {};

    withConfigValue(config, outConfig, 'preferFullAccess');
    withConfigValue(config, outConfig, 'preferImmutableCall');
    withConfigValue(config, outConfig, 'preferConstantCall');

    return outConfig;
}

function withConfigValue<C, K extends Extract<keyof C, string>>(
    config: vscode.WorkspaceConfiguration,
    outConfig: C,
    key: K,
): void {
    const configSetting = config.inspect<C[K]>(key);
    if (!configSetting) {
        return;
    }

    // Make sure the user has actually set the value.
    // VS Code will return the default values instead of `undefined`, even if user has not don't set anything.
    if (typeof configSetting.globalValue === 'undefined'
        && typeof configSetting.workspaceFolderValue === 'undefined'
        && typeof configSetting.workspaceValue === 'undefined'
    ) {
        return;
    }

    const value = config.get<vscode.WorkspaceConfiguration[K] | undefined>(key, undefined);
    if (typeof value !== 'undefined') {
        (outConfig as any)[key] = value;
    }
}