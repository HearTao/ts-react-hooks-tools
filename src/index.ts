import type * as ts from 'typescript/lib/tsserverlibrary'
import { ReactHooksPlugin } from "./plugin"
export = (mod: { typescript: typeof ts}) => new ReactHooksPlugin(mod.typescript)