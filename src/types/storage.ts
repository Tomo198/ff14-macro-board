import { Macro, HighlightRule } from './macro';

export const CURRENT_SCHEMA_VERSION = 1;

export interface StorageData {
  schemaVersion: number;
  macros: Macro[];
  rules: HighlightRule[];
}
