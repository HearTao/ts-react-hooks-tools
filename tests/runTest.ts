import * as path from 'path';

import { runTests } from 'vscode-test';

async function main() {
    try {
        // The folder containing the Extension Manifest package.json
        // Passed to `--extensionDevelopmentPath`
        const extensionDevelopmentPath = path.resolve(__dirname, '../plugin');

        // The path to the extension test script
        // Passed to --extensionTestsPath
        const classicExtensionTestsPath = path.resolve(
            __dirname,
            './suite/classic'
        );

        // Download VS Code, unzip it and run the integration test
        await runTests({
            extensionDevelopmentPath,
            extensionTestsPath: classicExtensionTestsPath,
            launchArgs: [path.resolve(__dirname, './project')]
        });

        const modernExtensionTestsPath = path.resolve(
            __dirname,
            './suite/modern'
        );

        // Download VS Code, unzip it and run the integration test
        await runTests({
            extensionDevelopmentPath,
            extensionTestsPath: modernExtensionTestsPath,
            launchArgs: [path.resolve(__dirname, './project-newjsx')]
        });
    } catch (err) {
        console.error('Failed to run tests');
        console.error(err);
        process.exit(1);
    }
}

main();
