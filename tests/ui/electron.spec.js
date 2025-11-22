const { _electron: electron, expect, test } = require('@playwright/test');

async function launchElectron(overrides = {}) {
  return electron.launch({
    args: ['.', '--disable-dev-shm-usage', '--no-sandbox'],
    env: {
      ...process.env,
      ELECTRON_DISABLE_SANDBOX: 'true',
      ...overrides,
    },
  });
}

test.describe('electron headless interactions', () => {
  test('login flow unhides workspace', async () => {
    const electronApp = await launchElectron({ ELECTRUSS_HEADLESS: 'true' });

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

  test('preload exposes limited metadata API', async () => {
    const electronApp = await launchElectron({ ELECTRUSS_HEADLESS: 'true' });
    const page = await electronApp.firstWindow();

    const metadata = await page.evaluate(() => {
      return window.electruss.app.getMetadata();
    });

    expect(metadata.headless).toBe(true);
    expect(metadata.devToolsEnabled).toBe(false);

    await electronApp.close();
  });

  test('devtools are enabled only when explicitly requested', async () => {
    const electronApp = await launchElectron({
      ELECTRUSS_ENABLE_DEVTOOLS: 'true',
      ELECTRUSS_HEADLESS: 'false',
    });

    await electronApp.firstWindow();

    const windowState = await electronApp.evaluate(
      async ({ BrowserWindow }) => {
        const appWindow = BrowserWindow.getAllWindows()[0];
        const devToolsOpened = await new Promise((resolve) => {
          if (appWindow.webContents.isDevToolsOpened()) {
            resolve(true);
            return;
          }

          const timeout = setTimeout(() => {
            resolve(appWindow.webContents.isDevToolsOpened());
          }, 1000);

          appWindow.webContents.once('devtools-opened', () => {
            clearTimeout(timeout);
            resolve(true);
          });
        });

        return {
          devToolsAllowed:
            appWindow.webContents.getLastWebPreferences().devTools,
          devToolsOpened,
        };
      }
    );

    expect(windowState.devToolsAllowed).toBe(true);
    expect(windowState.devToolsOpened).toBe(true);

    await electronApp.close();
  });
});
