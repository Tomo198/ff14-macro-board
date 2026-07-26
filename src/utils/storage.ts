import { Macro, HighlightRule } from '../types/macro';
import { CURRENT_SCHEMA_VERSION, StorageData } from '../types/storage';
import { sanitizeMacros, sanitizeRules } from './validation';

const STORAGE_KEY_CONTAINER = 'ff14_macro_board_data';
const STORAGE_KEY_MACROS_LEGACY = 'ff14_macros';
const STORAGE_KEY_RULES_LEGACY = 'ff14_rules';

export function loadStoredData(defaultMacros: Macro[], defaultRules: HighlightRule[]): StorageData {
  try {
    const legacyMacrosRaw = localStorage.getItem(STORAGE_KEY_MACROS_LEGACY);
    const legacyRulesRaw = localStorage.getItem(STORAGE_KEY_RULES_LEGACY);
    const containerRaw = localStorage.getItem(STORAGE_KEY_CONTAINER);

    // 旧個別キー（ff14_macros や ff14_rules）が存在する場合は旧キーの入力を優先して復元・マイグレーション
    if (legacyMacrosRaw !== null || legacyRulesRaw !== null) {
      let macros = defaultMacros;
      let rules = defaultRules;

      if (legacyMacrosRaw !== null) {
        try {
          macros = sanitizeMacros(JSON.parse(legacyMacrosRaw), defaultMacros);
        } catch {
          macros = defaultMacros;
        }
      }

      if (legacyRulesRaw !== null) {
        try {
          rules = sanitizeRules(JSON.parse(legacyRulesRaw), defaultRules);
        } catch {
          rules = defaultRules;
        }
      }

      return {
        schemaVersion: CURRENT_SCHEMA_VERSION,
        macros,
        rules,
      };
    }

    // 新形式コンテナデータ（ff14_macro_board_data）が存在する場合
    if (containerRaw !== null) {
      const parsed = JSON.parse(containerRaw);
      if (parsed && typeof parsed === 'object') {
        const macros = sanitizeMacros(parsed.macros, defaultMacros);
        const rules = sanitizeRules(parsed.rules, defaultRules);
        return {
          schemaVersion: typeof parsed.schemaVersion === 'number' ? parsed.schemaVersion : CURRENT_SCHEMA_VERSION,
          macros,
          rules,
        };
      }
    }

    return {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      macros: defaultMacros,
      rules: defaultRules,
    };
  } catch {
    return {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      macros: defaultMacros,
      rules: defaultRules,
    };
  }
}

export function saveStoredData(macros: Macro[], rules: HighlightRule[]): void {
  try {
    const data: StorageData = {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      macros,
      rules,
    };
    localStorage.setItem(STORAGE_KEY_CONTAINER, JSON.stringify(data));
    localStorage.setItem(STORAGE_KEY_MACROS_LEGACY, JSON.stringify(macros));
    localStorage.setItem(STORAGE_KEY_RULES_LEGACY, JSON.stringify(rules));
  } catch (err) {
    console.error('Failed to save to localStorage:', err);
  }
}
