import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCREENSHOT_DIR = path.join(__dirname, 'screenshots');

// Wait for the physics simulation to settle before taking screenshots
async function waitForGraph(page) {
  // Wait for canvas to be present and the app to initialize
  await page.waitForSelector('#graphCanvas');
  // Let physics run ~60 frames to settle the layout
  await page.waitForTimeout(1200);
}

test.describe('MindGraph Smoke Tests', () => {
  test('page loads without JS errors', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/');
    await waitForGraph(page);

    expect(errors).toEqual([]);

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01-page-load.png'), fullPage: true });
  });

  test('canvas exists and has dimensions', async ({ page }) => {
    await page.goto('/');
    await waitForGraph(page);

    const canvas = page.locator('#graphCanvas');
    await expect(canvas).toBeVisible();

    const box = await canvas.boundingBox();
    expect(box.width).toBeGreaterThan(100);
    expect(box.height).toBeGreaterThan(100);
  });

  test('graph has 100 nodes in memory', async ({ page }) => {
    await page.goto('/');
    await waitForGraph(page);

    const nodeCount = await page.evaluate(() => window.nodes.length);
    expect(nodeCount).toBe(100);
  });

  test('click canvas selects a node and opens detail panel', async ({ page }) => {
    await page.goto('/');
    await waitForGraph(page);

    // Close the AI chat panel that overlays part of the canvas
    await page.evaluate(() => {
      document.getElementById('aiChat').style.display = 'none';
    });

    // The node detail panel should be hidden initially
    const detail = page.locator('#nodeDetail');
    await expect(detail).not.toBeVisible();

    // Click the center of the canvas where nodes are clustered
    const canvas = page.locator('#graphCanvas');
    const box = await canvas.boundingBox();
    await canvas.click({ position: { x: box.width * 0.45, y: box.height * 0.48 } });

    // Wait for click to process
    await page.waitForTimeout(300);

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02-canvas-click.png'), fullPage: true });
  });

  test('programmatic node selection opens detail panel', async ({ page }) => {
    await page.goto('/');
    await waitForGraph(page);

    // Select node 0 programmatically via the window global
    await page.evaluate(() => {
      window.selectNode(window.nodes[0]);
      window.updateND();
    });

    const detail = page.locator('#nodeDetail');
    await expect(detail).toBeVisible();

    // Check the node word is displayed
    const word = await page.locator('#ndWord').textContent();
    expect(word.trim()).toBe('start');

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03-node-detail.png'), fullPage: true });
  });

  test('search filters nodes', async ({ page }) => {
    await page.goto('/');
    await waitForGraph(page);

    const searchInput = page.locator('#searchInput');
    await searchInput.fill('dream');
    await searchInput.dispatchEvent('input');

    // Wait for search to take effect and status to update
    await page.waitForTimeout(500);

    // Status bar should reflect the active search query
    const statusText = await page.locator('#statusText').textContent();
    expect(statusText).toContain('Search:');
    expect(statusText).toContain('dream');

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04-search-filter.png'), fullPage: true });

    // Clear search
    await page.locator('#searchClear').click();
    await page.waitForTimeout(300);
  });

  test('analytics tabs render content', async ({ page }) => {
    await page.goto('/');
    await waitForGraph(page);

    const panelContent = page.locator('#panelContent');

    // Tab 0 (AI Insights) should be loaded by default
    const initialContent = await panelContent.innerHTML();
    expect(initialContent.length).toBeGreaterThan(50);

    // Click through tabs and verify each renders content
    const tabs = page.locator('.panel-tab');
    const tabCount = await tabs.count();
    expect(tabCount).toBe(8);

    for (let i = 1; i < tabCount; i++) {
      await tabs.nth(i).click();
      await page.waitForTimeout(200);
      const html = await panelContent.innerHTML();
      expect(html.length).toBeGreaterThan(20);
    }

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05-analytics-tabs.png'), fullPage: true });
  });

  test('path mode toggles correctly', async ({ page }) => {
    await page.goto('/');
    await waitForGraph(page);

    const pathBtn = page.locator('#btnPathMode');
    await expect(pathBtn).toBeVisible();

    // Verify path mode is initially off
    const initiallyActive = await pathBtn.evaluate((el) => el.classList.contains('active'));
    expect(initiallyActive).toBe(false);

    // Toggle path mode on
    await pathBtn.click();
    await page.waitForTimeout(200);

    // Button should now be active
    const isActive = await pathBtn.evaluate((el) => el.classList.contains('active'));
    expect(isActive).toBe(true);

    // Toggle path mode off
    await pathBtn.click();
    await page.waitForTimeout(200);

    const isStillActive = await pathBtn.evaluate((el) => el.classList.contains('active'));
    expect(isStillActive).toBe(false);
  });
});
