import { SynchronizedConfiguration } from './types';

export class ConfigManager {
    constructor(public config: SynchronizedConfiguration) {}

    update(config: SynchronizedConfiguration) {
        this.config = config;
    }
}
