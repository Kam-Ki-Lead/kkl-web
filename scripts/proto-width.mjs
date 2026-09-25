/**
 * Select the prototype's width tab and PROVE the stage frame took it.
 *
 * The width-tab label is rendered with padding whitespace, so Playwright's
 * `:text-is()` never matches it — every selection must go through the
 * trimmed-text fallback. Either way, the frame width is asserted afterwards:
 * the stage frame carries a 1px border, so its offsetWidth is the requested
 * width + 2. A run that measures or captures the wrong frame is worse than
 * no run, so this throws instead of returning.
 *
 * D-20: the pre-fix harness swallowed the failed `:text-is("390")` click and
 * silently measured the default 1440 frame for every "390" run.
 */
export async function selectProtoWidth(page, width) {
  await page.click(`button[aria-pressed]:text-is("${width}")`).catch(async () => {
    for (const t of await page.$$('button')) {
      if ((await t.textContent())?.trim() === String(width)) {
        await t.click();
        break;
      }
    }
  });
  await page.waitForTimeout(1000);
  const frameWidth = await page.evaluate(() => {
    const frame = document.querySelector('div[style*="transform:scale"], div[style*="transform: scale"]');
    return frame ? frame.offsetWidth : null;
  });
  if (frameWidth === null || Math.abs(frameWidth - width) > 3) {
    throw new Error(
      `prototype frame is ${frameWidth ?? 'not present'}px wide after selecting the ${width}px tab; ` +
        'refusing to measure or capture against the wrong frame',
    );
  }
}
