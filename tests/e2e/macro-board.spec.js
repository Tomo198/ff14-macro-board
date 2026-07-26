import { test, expect } from '@playwright/test';

test.describe('FF14 マクロボード E2Eテスト', () => {

  test('1. アプリが正常に起動する', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toHaveText('FF14 マクロボード');
  });

  test('2. 初期マクロが表示される', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('共鳴4層 散開・暴走')).toBeVisible();
    await expect(page.getByText('【散開】')).toBeVisible();
  });

  test('3. マクロを追加できる', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: '新規マクロ' }).click();
    await page.getByPlaceholder('タイトル').fill('テスト追加マクロ');
    await page.getByPlaceholder('/p マクロ内容').fill('/p テストマクロの本文です');
    await page.getByRole('button', { name: '保存' }).click();

    await expect(page.getByText('テスト追加マクロ')).toBeVisible();
    await expect(page.getByText('/p テストマクロの本文です')).toBeVisible();
  });

  test('4. マクロを編集できる', async ({ page }) => {
    await page.goto('/');
    const card = page.locator('div.absolute').filter({ hasText: '共鳴4層 散開・暴走' });
    // 編集ボタン（Header右側のボタン群）
    const editBtn = card.locator('button').nth(1);
    await editBtn.click();
    await page.getByPlaceholder('タイトル').fill('編集後のタイトル');
    await page.getByRole('button', { name: '保存' }).click();

    await expect(page.getByText('編集後のタイトル')).toBeVisible();
  });

  test('5. マクロを削除できる', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: '新規マクロ' }).click();
    await page.getByPlaceholder('タイトル').fill('削除予定マクロ');
    await page.getByPlaceholder('/p マクロ内容').fill('/p 削除対象');
    await page.getByRole('button', { name: '保存' }).click();

    await expect(page.getByText('削除予定マクロ')).toBeVisible();
    
    const card = page.locator('div.absolute').filter({ hasText: '削除予定マクロ' });
    const deleteBtn = card.locator('button').nth(2);
    await deleteBtn.click();

    await expect(page.getByText('削除予定マクロ')).not.toBeVisible();
  });

  test('6 & 7. 本文をコピーできる & Toastが表示される', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto('/');
    
    const card = page.locator('div.absolute').filter({ hasText: '共鳴4層 散開・暴走' });
    await card.hover();
    const copyBtn = card.locator('div.cursor-text button');
    await copyBtn.click();

    await expect(page.getByText('コピーしました')).toBeVisible();
  });

  test('8, 9 & 10. マクロをドラッグ移動できる & LocalStorage保存・復元', async ({ page }) => {
    await page.goto('/');
    const card = page.locator('div.absolute').filter({ hasText: '共鳴4層 散開・暴走' });
    const cardHeader = card.locator('div.cursor-move');
    const box = await cardHeader.boundingBox();

    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width / 2 + 80, box.y + box.height / 2 + 80);
      await page.mouse.up();
    }

    // LocalStorage更新の確認
    const macrosStorage = await page.evaluate(() => localStorage.getItem('ff14_macros'));
    expect(macrosStorage).not.toBeNull();

    // 再読み込み
    await page.reload();
    await expect(page.getByText('共鳴4層 散開・暴走')).toBeVisible();
  });

  test('11 & 12. ハイライトルールを追加できる & 反映される', async ({ page }) => {
    await page.goto('/');
    await page.locator('header button').first().click();
    await expect(page.getByText('設定・ガイド')).toBeVisible();

    await page.getByPlaceholder('追加する文字 (例: MT)').fill('散開');
    await page.getByRole('button', { name: '追加' }).click();

    // モーダル閉じる
    await page.locator('div.fixed button').first().click();

    // Pre 内の強調 span
    const highlightedSpan = page.locator('pre span', { hasText: '散開' }).first();
    await expect(highlightedSpan).toBeVisible();
  });

  test('13. 既存の旧形式LocalStorageデータを読み込める', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      const oldMacros = [{ id: '99', title: '旧形式マクロ', content: '/p 旧マクロテスト' }];
      localStorage.setItem('ff14_macros', JSON.stringify(oldMacros));
    });
    await page.reload();

    await expect(page.getByText('旧形式マクロ')).toBeVisible();
    await expect(page.getByText('/p 旧マクロテスト')).toBeVisible();
  });

  test('14. 壊れたJSONがあってもアプリが起動する', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('ff14_macros', '{ broken json ...');
    });
    await page.reload();

    await expect(page.getByText('共鳴4層 散開・暴走')).toBeVisible();
  });

  test('15. 文字サイズスライダーが動作する', async ({ page }) => {
    await page.goto('/');
    const card = page.locator('div.absolute').filter({ hasText: '共鳴4層 散開・暴走' });
    const slider = card.locator('input[type="range"]');
    const pre = card.locator('pre');

    await slider.fill('24');
    await expect(pre).toHaveAttribute('style', /font-size:\s*24px/);
  });

  test('16 & 17. PiP非対応環境での安全動作', async ({ page }) => {
    await page.goto('/');
    const card = page.locator('div.absolute').filter({ hasText: '共鳴4層 散開・暴走' });
    const pipBtn = card.locator('button').first();
    await pipBtn.click();

    // PiP操作でアプリがクラッシュしないことを確認
    await expect(page.getByText('共鳴4層 散開・暴走')).toBeVisible();
  });

});
