import { test, expect } from '@playwright/test';

test.describe('Phase 2 LocalStorage 安全化テスト', () => {

  test.describe('Toast 競合修正検証試験', () => {
    test('1秒以内に複数回Toastを発火した場合、タイマーが再設定され最新のToastが維持される', async ({ page, context }) => {
      await context.grantPermissions(['clipboard-read', 'clipboard-write']);
      await page.goto('/');

      const card = page.locator('div.absolute').filter({ hasText: '共鳴4層 散開・暴走' });
      await card.hover();
      const copyBtn = card.locator('div.cursor-text button');

      // 1回目のクリック
      await copyBtn.click();
      await expect(page.getByText('コピーしました')).toBeVisible();

      // 3秒待機後、2回目のクリック (1回目のタイマー残り1秒時点)
      await page.waitForTimeout(3000);
      await copyBtn.click();

      // さらに1.5秒待機 (通算4.5秒時点：タイマーがリセットされていれば2回目の発火から1.5秒しか経過していないので表示継続中)
      await page.waitForTimeout(1500);

      // 前のタイマーに影響されず、現在も表示が継続していること
      await expect(page.getByText('コピーしました')).toBeVisible();
    });
  });

  test.describe('LocalStorage ff14_macros 異常データ安全化試験', () => {

    test('ケース1: 正常な配列', async ({ page }) => {
      await page.goto('/');
      await page.evaluate(() => {
        localStorage.clear();
        localStorage.setItem('ff14_macros', JSON.stringify([{ id: 'm1', title: 'テスト', content: '本文', x: 50, y: 50, zIndex: 10 }]));
      });
      await page.reload();
      await expect(page.getByText('テスト')).toBeVisible();
    });

    test('ケース2: JSONとして壊れた文字列', async ({ page }) => {
      await page.goto('/');
      await page.evaluate(() => {
        localStorage.clear();
        localStorage.setItem('ff14_macros', '{ broken json ...');
      });
      await page.reload();
      await expect(page.getByText('共鳴4層 散開・暴走')).toBeVisible();
    });

    test('ケース3: オブジェクトであり配列ではないデータ（白画面化防止検証）', async ({ page }) => {
      await page.goto('/');
      await page.evaluate(() => {
        localStorage.clear();
        localStorage.setItem('ff14_macros', JSON.stringify({ id: 'm1', title: 'オブジェクト型' }));
      });
      await page.reload();
      await expect(page.getByText('共鳴4層 散開・暴走')).toBeVisible();
    });

    test('ケース4: xが文字列', async ({ page }) => {
      await page.goto('/');
      await page.evaluate(() => {
        localStorage.clear();
        localStorage.setItem('ff14_macros', JSON.stringify([{ id: 'm1', title: 'x文字列', content: '本文', x: 'invalid_x', y: 50, zIndex: 10 }]));
      });
      await page.reload();
      await expect(page.getByText('x文字列')).toBeVisible();
    });

    test('ケース5: x, y, zIndexがnull', async ({ page }) => {
      await page.goto('/');
      await page.evaluate(() => {
        localStorage.clear();
        localStorage.setItem('ff14_macros', JSON.stringify([{ id: 'm1', title: 'null座標', content: '本文', x: null, y: null, zIndex: null }]));
      });
      await page.reload();
      await expect(page.getByText('null座標')).toBeVisible();
    });

    test('ケース6: contentが数値（白画面化防止検証）', async ({ page }) => {
      await page.goto('/');
      await page.evaluate(() => {
        localStorage.clear();
        localStorage.setItem('ff14_macros', JSON.stringify([{ id: 'm1', title: '数値content', content: 12345, x: 50, y: 50, zIndex: 10 }]));
      });
      await page.reload();
      await expect(page.getByText('数値content')).toBeVisible();
    });

    test('ケース7: titleが存在しない', async ({ page }) => {
      await page.goto('/');
      await page.evaluate(() => {
        localStorage.clear();
        localStorage.setItem('ff14_macros', JSON.stringify([{ id: 'm1', content: '本文のみ', x: 50, y: 50, zIndex: 10 }]));
      });
      await page.reload();
      await expect(page.getByText('本文のみ')).toBeVisible();
    });

    test('ケース8: idが重複している', async ({ page }) => {
      await page.goto('/');
      await page.evaluate(() => {
        localStorage.clear();
        localStorage.setItem('ff14_macros', JSON.stringify([
          { id: 'dup1', title: '重複1', content: '本文1', x: 50, y: 50, zIndex: 10 },
          { id: 'dup1', title: '重複2', content: '本文2', x: 100, y: 100, zIndex: 11 }
        ]));
      });
      await page.reload();
      await expect(page.getByText('重複1')).toBeVisible();
      await expect(page.getByText('重複2')).toBeVisible();
    });

    test('ケース9: 極端に大きな座標', async ({ page }) => {
      await page.goto('/');
      await page.evaluate(() => {
        localStorage.clear();
        localStorage.setItem('ff14_macros', JSON.stringify([{ id: 'm1', title: '巨大座標', content: '本文', x: 999999, y: 999999, zIndex: 10 }]));
      });
      await page.reload();
      await expect(page.getByText('巨大座標')).toBeAttached();
    });

    test('ケース10: schemaVersion付き新フォーマットの読み込みと保存', async ({ page }) => {
      await page.goto('/');
      await page.evaluate(() => {
        localStorage.clear();
        const newData = {
          schemaVersion: 1,
          macros: [{ id: 'schema_m1', title: 'スキーマ1', content: '本文1', x: 50, y: 50, zIndex: 10 }],
          rules: [{ id: 'r1', keyword: 'MT', color: '#ef4444' }]
        };
        localStorage.setItem('ff14_macro_board_data', JSON.stringify(newData));
      });
      await page.reload();
      await expect(page.getByText('スキーマ1')).toBeVisible();

      const stored = await page.evaluate(() => localStorage.getItem('ff14_macro_board_data'));
      expect(stored).not.toBeNull();
      const parsed = JSON.parse(stored);
      expect(parsed.schemaVersion).toBe(1);
    });

  });

  test.describe('LocalStorage ff14_rules 異常データ試験', () => {
    test('正規表現特殊文字 (.*+?^${}()|[\]\\) のテスト', async ({ page }) => {
      await page.goto('/');
      await page.evaluate(() => {
        localStorage.clear();
        localStorage.setItem('ff14_rules', JSON.stringify([
          { id: 'r1', keyword: '[散開]', color: '#ef4444' }
        ]));
      });
      await page.reload();
      await expect(page.getByText('共鳴4層 散開・暴走')).toBeVisible();
    });
  });

});
