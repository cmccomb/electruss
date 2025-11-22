const { test, expect } = require('@playwright/test');

test.describe('browser renderer flows', () => {
  test('completes login and toggles edge mode', async ({ page, baseURL }) => {
    await page.goto(baseURL);

    await page.getByLabel('Team Number').fill('1');
    await page.getByLabel('Participant Number').fill('2');
    await page.getByLabel('Experiment Code').fill('A');
    const loginButton = page.locator('#login-modal-apply');
    await expect(loginButton).toBeVisible();
    await loginButton.click();

    await expect(page.locator('#all')).not.toHaveClass(/d-none/);

    const addEdgeButton = page.locator('#add-edge');
    await addEdgeButton.click();
    await expect(addEdgeButton).toHaveClass(/active/);
    await addEdgeButton.click();
    await expect(addEdgeButton).not.toHaveClass(/active/);
  });
});
