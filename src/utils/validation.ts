import { z } from 'zod';
import { Macro, HighlightRule } from '../types/macro';

export const macroSchema = z.object({
  id: z.coerce.string().catch(() => Date.now().toString() + Math.random().toString(36).substring(2, 5)),
  title: z.coerce.string().catch('無題マクロ'),
  content: z.coerce.string().catch(''),
  x: z.number().catch(40),
  y: z.number().catch(40),
  zIndex: z.number().catch(10),
});

export const ruleSchema = z.object({
  id: z.coerce.string().catch(() => Date.now().toString()),
  keyword: z.coerce.string().catch(''),
  color: z.coerce.string().catch('#3b82f6'),
});

export function sanitizeMacros(raw: unknown, defaultMacros: Macro[]): Macro[] {
  if (!Array.isArray(raw)) {
    return defaultMacros;
  }
  const result: Macro[] = [];
  const seenIds = new Set<string>();

  raw.forEach((item, index) => {
    if (item && typeof item === 'object') {
      const parsed = macroSchema.safeParse(item);
      if (parsed.success) {
        let macro = parsed.data;
        // IDが重複していたら補正
        if (seenIds.has(macro.id)) {
          macro = { ...macro, id: `${macro.id}_${index}` };
        }
        seenIds.add(macro.id);

        // 座標の数値判定と補正
        if (typeof macro.x !== 'number' || isNaN(macro.x)) macro.x = 40 + (index * 30);
        if (typeof macro.y !== 'number' || isNaN(macro.y)) macro.y = 40 + (index * 30);
        if (typeof macro.zIndex !== 'number' || isNaN(macro.zIndex)) macro.zIndex = 10 + index;

        result.push(macro);
      }
    }
  });

  return result.length > 0 ? result : defaultMacros;
}

export function sanitizeRules(raw: unknown, defaultRules: HighlightRule[]): HighlightRule[] {
  if (!Array.isArray(raw)) {
    return defaultRules;
  }
  const result: HighlightRule[] = [];
  const seenIds = new Set<string>();

  raw.forEach((item, index) => {
    if (item && typeof item === 'object') {
      const parsed = ruleSchema.safeParse(item);
      if (parsed.success) {
        let rule = parsed.data;
        if (seenIds.has(rule.id)) {
          rule = { ...rule, id: `${rule.id}_${index}` };
        }
        seenIds.add(rule.id);
        result.push(rule);
      }
    }
  });

  return result;
}
