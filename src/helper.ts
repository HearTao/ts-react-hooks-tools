import * as path from 'path';
import { Constants } from './constants';

export function isDef<T>(v: T | undefined | null): v is T {
    return v !== undefined && v !== null;
}

export function assertDef<T>(v: T | undefined | null): asserts v is T {
    if (!isDef(v)) {
        throw new Error('Must be defined');
    }
}

export function first<T>(v: readonly T[]): T {
    if (v.length === 0) {
        throw new Error('Index out of range');
    }
    return v[0];
}

export function getPackageNameOrNamespaceInNodeModules(filename: string) {
    if (!filename.includes(Constants.NodeModules)) {
        return undefined;
    }

    const paths = filename.split(path.sep);
    const firstNodeModulesIndex = paths.indexOf(Constants.NodeModules);
    const packageNames = paths.slice(firstNodeModulesIndex + 1);
    const [nameOrNamespace, maybeName] = packageNames;
    if (
        nameOrNamespace &&
        maybeName &&
        nameOrNamespace.startsWith(Constants.NamespacePrefix)
    ) {
        return [nameOrNamespace, maybeName].join(path.sep);
    }

    return nameOrNamespace;
}

export function relativePathContainNodeModules(from: string, to: string) {
    return path.relative(from, to).includes(Constants.NodeModules);
}

export function compareIgnoreCase(a: string, b: string) {
    return a.toLowerCase() === b.toLowerCase();
}

export function startsWithIgnoreCase(a: string, b: string) {
    return a.toLowerCase().startsWith(b.toLowerCase());
}

export function isReactText(s: string) {
    return compareIgnoreCase(s, Constants.React);
}

export function isUseSomething(s: string) {
    return startsWithIgnoreCase(s, Constants.UsePrefix);
}

export function isUseReducer(s: string) {
    return compareIgnoreCase(s, Constants.UseReducer);
}

export function isUseRef(s: string) {
    return compareIgnoreCase(s, Constants.UseRef);
}

export function isUseState(s: string) {
    return compareIgnoreCase(s, Constants.UseState);
}

export function isUseMemo(s: string) {
    return compareIgnoreCase(s, Constants.UseMemo);
}

export function isUseCallback(s: string) {
    return compareIgnoreCase(s, Constants.UseCallback);
}

export function returnTrue() {
    return true;
}

export function cast<T, U extends T>(v: T, cb: (a: T) => a is U): U {
    if (!cb(v)) {
        throw new Error('Invalid cast');
    }
    return v;
}

export function isStartWithSet(s: string) {
    return startsWithIgnoreCase(s, Constants.SetPrefix);
}
