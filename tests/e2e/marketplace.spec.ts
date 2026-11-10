import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFile } from 'node:fs/promises';
import { discoveryCatalogSchema } from '../../packages/skill-schema/src/index';
import { unzipSync, strFromU8 } from 'fflate';
const catalog = discoveryCatalogSchema.parse(
  JSON.parse(
    await readFile(
      new URL('../../catalog/catalog.json', import.meta.url),
      'utf8',
    ),
  ),
);
const skill = catalog.skills[0];

test('search, URL filters, detail and a complete ZIP download', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await page.getByLabel('Search for a skill').fill(skill.title);
  await page.getByRole('button', { name: 'Explore', exact: true }).click();
  await expect(page).toHaveURL(/\/skills\?q=/);
  await expect(
    page.getByRole('link', { name: skill.title, exact: true }),
  ).toBeVisible();
  await page.getByLabel('Sort by').selectOption('za');
  await expect(page).toHaveURL(/sort=za/);
  await page.reload();
  await expect(page.getByLabel('Sort by')).toHaveValue('za');
  await page.getByRole('link', { name: skill.title, exact: true }).click();
  await expect(
    page.getByRole('heading', { name: skill.title, level: 1 }),
  ).toBeVisible();
  await page.getByLabel('Preview file').selectOption(skill.examples[0]);
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download ZIP' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe(`${skill.slug}.zip`);
  const path = await download.path();
  const entries = unzipSync(await readFile(path!));
  expect(strFromU8(entries[`${skill.slug}/SKILL.md`])).toBe(
    skill.files['SKILL.md'],
  );
  expect(Object.keys(entries)).toHaveLength(Object.keys(skill.files).length);
  await page.goBack();
  await expect(page.getByLabel('Sort by')).toHaveValue('za');
  expect(errors).toEqual([]);
});

test('light and dark accessibility on landing, catalog and detail', async ({
  page,
}) => {
  for (const theme of ['light', 'dark']) {
    for (const path of [
      '/',
      '/skills',
      `/skills/${skill.sector}/${skill.slug}`,
    ]) {
      await page.goto(path);
      await expect(page.locator('main h1').first()).toBeVisible();
      await page.getByLabel('Color theme').selectOption(theme);
      await page.evaluate(async () => {
        await Promise.all(
          document
            .getAnimations()
            .map((animation) => animation.finished.catch(() => undefined)),
        );
      });
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
        .analyze();
      expect(
        results.violations.map((violation) => ({
          id: violation.id,
          impact: violation.impact,
          context: `${theme} ${path}`,
          nodes: violation.nodes.map((node) => node.target),
        })),
      ).toEqual([]);
    }
  }
});

test('320px navigation, focus management and overflow', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto('/');
  await expect(page.locator('main h1')).toBeVisible();
  for (const path of [
    '/',
    '/skills',
    `/skills/${skill.sector}/${skill.slug}`,
  ]) {
    await page.goto(path);
    await expect(page.locator('main h1').first()).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(
    page.getByRole('button', { name: 'Open navigation' }),
  ).toBeFocused();
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await page
    .getByRole('navigation', { name: 'Mobile navigation' })
    .getByRole('link', { name: 'Explore skills' })
    .click();
  await expect(page).toHaveURL(/\/skills$/);
  await expect(page.getByRole('dialog')).toBeHidden();
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(results.violations).toEqual([]);
});

test('keyboard search and detail navigation', async ({ page }) => {
  await page.goto('/skills');
  const search = page.getByLabel('Search skills');
  await search.focus();
  await page.keyboard.type(skill.title);
  await expect(search).toHaveValue(skill.title);
  await expect(page.getByRole('status')).toContainText('1 skill matching');
  const link = page.getByRole('link', { name: skill.title, exact: true });
  await expect(link).toBeVisible();
  let reached = false;
  for (let count = 0; count < 12; count++) {
    await page.keyboard.press('Tab');
    if (await link.evaluate((element) => element === document.activeElement)) {
      reached = true;
      break;
    }
  }
  expect(reached).toBe(true);
  await page.keyboard.press('Enter');
  await expect(
    page.getByRole('heading', { name: skill.title, level: 1 }),
  ).toBeVisible();
  const downloadButton = page.getByRole('button', { name: 'Download ZIP' });
  let downloadReached = false;
  for (let count = 0; count < 40; count++) {
    await page.keyboard.press('Tab');
    if (
      await downloadButton.evaluate(
        (element) => element === document.activeElement,
      )
    ) {
      downloadReached = true;
      break;
    }
  }
  expect(downloadReached).toBe(true);
  const keyboardDownload = page.waitForEvent('download');
  await page.keyboard.press('Enter');
  expect((await keyboardDownload).suggestedFilename()).toBe(
    `${skill.slug}.zip`,
  );
});

test('theme persistence, system preference and empty search', async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/skills');
  await expect(page.locator('html')).toHaveClass('dark');
  await page.getByLabel('Color theme').selectOption('light');
  await page.reload();
  await expect(page.locator('html')).not.toHaveClass('dark');
  await page.getByLabel('Search skills').fill('nothing-should-match-this');
  await expect(
    page.getByRole('heading', { name: 'No skills found' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Reset search' }).click();
  await expect(
    page.getByRole('link', { name: skill.title, exact: true }),
  ).toBeVisible();
});

test('rapid typing survives delayed URL renders and same-page history', async ({
  page,
  context,
}) => {
  test.setTimeout(60_000);
  const cdp = await context.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 6 });
  await page.goto('/skills?capability=text-only&sort=za');
  const search = page.getByLabel('Search skills');
  await search.focus();
  // No typing delay: this reproduces the CI input/URL transition race.
  await page.keyboard.type(skill.title);
  await expect(search).toHaveValue(skill.title);
  await expect(search).toBeFocused();
  await expect
    .poll(() => new URL(page.url()).searchParams.get('q'))
    .toBe(skill.title);
  await expect(page.getByRole('status')).toContainText('1 skill matching');
  await expect(page.getByLabel('Capability')).toHaveValue('text-only');
  await expect(page.getByLabel('Sort by')).toHaveValue('za');

  // Make a separate history entry, then replace its query using real keystrokes.
  await page.getByLabel('Sort by').selectOption('az');
  await expect
    .poll(() => new URL(page.url()).searchParams.get('sort'))
    .toBe('az');
  await search.focus();
  await page.keyboard.press('ControlOrMeta+A');
  await page.keyboard.type('code');
  await expect(search).toHaveValue('code');
  await expect
    .poll(() => new URL(page.url()).searchParams.get('q'))
    .toBe('code');
  await expect(page.getByLabel('Capability')).toHaveValue('text-only');

  await page.goBack();
  await expect(search).toHaveValue(skill.title);
  await expect(page.getByLabel('Sort by')).toHaveValue('za');
  await expect(page.getByLabel('Capability')).toHaveValue('text-only');
  await page.goForward();
  await expect(search).toHaveValue('code');
  await expect(page.getByLabel('Sort by')).toHaveValue('az');
  await page.reload();
  await expect(search).toHaveValue('code');
  await expect(page.getByLabel('Capability')).toHaveValue('text-only');
  await expect(page.getByLabel('Sort by')).toHaveValue('az');
});

test('history restores an initially empty search after filtering and typing', async ({
  page,
  context,
}) => {
  test.setTimeout(60_000);
  const cdp = await context.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 12 });
  await page.goto('/skills');
  const search = page.getByLabel('Search skills');
  await page.getByLabel('Sort by').selectOption('za');
  await search.focus();
  await page.keyboard.type('code');
  await expect(search).toHaveValue('code');
  await expect
    .poll(() => new URL(page.url()).searchParams.get('q'))
    .toBe('code');
  await page.goBack();
  await expect(search).toHaveValue('');
  await expect(page.getByLabel('Sort by')).toHaveValue('az');
  await page.goForward();
  await expect(search).toHaveValue('code');
  await expect(page.getByLabel('Sort by')).toHaveValue('za');
});

test('platform installation instructions stay copyable across scopes', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto(`/skills/${skill.sector}/${skill.slug}`);
  const command = page.getByLabel('Installation command');
  await expect(command).toContainText(`install ${skill.id} --platform codex`);
  await page
    .getByLabel('Platform', { exact: true })
    .selectOption('claude-code');
  await expect(command).toContainText('--platform claude-code --scope project');
  await page.getByLabel('Installation scope').selectOption('global');
  await expect(command).toContainText('--scope global');
  await expect(command).not.toContainText('--project-dir');
  await expect(
    page.getByText(`~/.claude/skills/${skill.slug}`, { exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Copy preview command' }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    `${await command.textContent()} --dry-run`,
  );
  await page.getByRole('button', { name: 'Copy install command' }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    await command.textContent(),
  );
});

test('quality filters persist in URLs and details explain structural scores without verification claims', async ({
  page,
}) => {
  const qualified = catalog.skills.filter(
    (item) => (item.quality?.score ?? 0) >= 90,
  );
  expect(qualified.length).toBeGreaterThan(0);
  const warningSkill = qualified.find((item) =>
    item.quality?.checks.some(
      (check) => check.id === 'discovery-metadata' && check.status === 'warn',
    ),
  )!;
  expect(warningSkill).toBeDefined();
  await page.goto(
    '/skills?quality=90&platform=codex&validation=passed&status=draft&sort=quality',
  );
  await expect(page.getByRole('status')).toContainText(
    `${qualified.length} skills`,
  );
  await expect(page.getByLabel('Minimum quality score')).toHaveValue('90');
  await page.getByLabel('Test evidence').selectOption('recorded-pass');
  await expect(
    page.getByRole('heading', { name: 'No skills found' }),
  ).toBeVisible();
  await expect
    .poll(() => new URL(page.url()).searchParams.get('testing'))
    .toBe('recorded-pass');
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'No skills found' }),
  ).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('status')).toContainText(
    `${qualified.length} skills`,
  );
  await expect(page.getByLabel('Installation platform')).toHaveValue('codex');
  await page
    .getByRole('link', { name: warningSkill.title, exact: true })
    .click();
  await page
    .getByText(`Explain quality score (${warningSkill.quality!.score}/100)`)
    .click();
  await expect(page.getByText('discovery-metadata: warn · 0/10')).toBeVisible();
  await expect(
    page.getByText('Test evidence: No completed test evidence.'),
  ).toHaveCount(4);
  await expect(page.getByText(/^Verified$/i)).toHaveCount(0);
});

test('fixture evaluation evidence stays separate from measured agent performance', async ({
  page,
}) => {
  const evaluated = catalog.skills.find((item) =>
    item.evaluations?.some((report) => report.mode === 'fixture'),
  )!;
  expect(evaluated).toBeDefined();
  await page.goto(`/skills/${evaluated.sector}/${evaluated.slug}`);
  const section = page.getByRole('region', { name: 'Evaluation evidence' });
  await expect(
    section.getByText('Offline fixture replay · not agent performance'),
  ).toBeVisible();
  await expect(section.getByText(/Evidence check: reproduced/)).toBeVisible();
  await expect(section.getByText(/Difference: 0 points/)).toBeVisible();
  await expect(
    page.getByText('Test evidence: No completed test evidence.'),
  ).toHaveCount(4);
  await section.getByText('Inspect report provenance').click();
  await expect(
    section.getByRole('link', { name: /Source report:/ }),
  ).toHaveAttribute(
    'href',
    /evaluations\/reports\/code-reviewer-fixture.json$/,
  );
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(results.violations).toEqual([]);
});

test('broad sectors, specialties and planned routes preserve search and history', async ({
  page,
}) => {
  await page.goto('/skills?sort=za');
  const search = page.getByLabel('Search skills');
  await page
    .getByLabel('Broad sector')
    .selectOption('transportation-logistics');
  await page
    .getByRole('button', { name: /Freight & Warehouse Logistics/ })
    .click();
  await search.focus();
  await page.keyboard.type('shipment');
  await expect(search).toHaveValue('shipment');
  await expect(page.getByRole('status')).toContainText('1 skill matching');
  await expect(
    page.getByRole('link', {
      name: 'Shipment Exception Organizer',
      exact: true,
    }),
  ).toBeVisible();
  await page.getByLabel('Broad sector').selectOption('finance');
  await expect(page).toHaveURL(/industry=finance/);
  await expect(
    page.getByRole('heading', { name: 'No skills found' }),
  ).toBeVisible();
  await page.goBack();
  await expect(page.getByLabel('Broad sector')).toHaveValue(
    'transportation-logistics',
  );
  await expect(search).toHaveValue('shipment');
  await expect(page.getByLabel('Sort by')).toHaveValue('za');
  await page.reload();
  await expect(
    page.getByRole('link', {
      name: 'Shipment Exception Organizer',
      exact: true,
    }),
  ).toBeVisible();
  await page.goto('/sectors');
  await expect(page.getByRole('heading', { level: 2 })).toHaveCount(20);
  await page
    .getByRole('link', {
      name: 'Healthcare Evidence Organization',
      exact: true,
    })
    .click();
  await expect(
    page.getByText('Planned collection · no skill packages available yet.'),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Download ZIP' })).toHaveCount(
    0,
  );
  await page.setViewportSize({ width: 320, height: 740 });
  await expect(page.getByLabel('Broad sector')).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test('legacy collection URLs and new skill packages remain accessible', async ({
  page,
}) => {
  await page.goto('/sectors/software-engineering');
  await expect(
    page.getByRole('link', { name: 'Code Review Expert', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Code Reviewer', exact: true }),
  ).toBeVisible();
  await page.goto(
    '/skills/accounting-operations/invoice-reconciliation-assistant',
  );
  await expect(
    page.getByRole('heading', {
      level: 1,
      name: 'Invoice Reconciliation Assistant',
    }),
  ).toBeVisible();
  await page.getByLabel('Preview file').selectOption('examples/output-1.md');
  await expect(
    page
      .getByRole('region', { name: 'Package preview' })
      .getByText(/Invoiced extension:/),
  ).toBeVisible();
  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(result.violations).toEqual([]);
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download ZIP' }).click();
  const download = await downloadPromise;
  const files = unzipSync(await readFile((await download.path())!));
  const source = catalog.skills.find(
    (item) =>
      item.id === 'accounting-operations/invoice-reconciliation-assistant',
  )!;
  expect(Object.keys(files)).toHaveLength(Object.keys(source.files).length);
  expect(strFromU8(files[`${source.slug}/SKILL.md`])).toBe(
    source.files['SKILL.md'],
  );
});
