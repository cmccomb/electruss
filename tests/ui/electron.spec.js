const { _electron: electron, expect, test } = require('@playwright/test');

test.describe('electron headless interactions', () => {
  test('login flow unhides workspace', async () => {
    const electronApp = await electron.launch({
      args: ['.', '--disable-dev-shm-usage', '--no-sandbox'],
      env: {
        ...process.env,
        ELECTRUSS_HEADLESS: 'true',
        ELECTRON_DISABLE_SANDBOX: 'true',
      },
    });

    const page = await electronApp.firstWindow();
    const loginButton = page.locator('#login-modal-apply');
    await expect(loginButton).toBeVisible();

    await page.fill('#team-number', '1');
    await page.fill('#participant-number', '2');
    await page.fill('#experiment-code', 'B');
    await page.click('#login-modal-apply');

    await expect(page.locator('#all')).not.toHaveClass(/d-none/);

    await electronApp.close();
  });
});
