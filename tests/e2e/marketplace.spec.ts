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
/** Finds a result card link by exact title, using Load more until it is shown. */
async function revealSkillLink(
  page: import('@playwright/test').Page,
  title: string,
) {
  const cards = page.getByRole('article');
  const link = page.getByRole('link', { name: title, exact: true });
  const more = page.getByRole('button', { name: 'Load more skills' });
  await expect(cards.first()).toBeVisible();
  while (!(await link.count())) {
    if (!(await more.count()))
      throw new Error(`${title} is not in the results`);
    const shown = await cards.count();
    await more.click();
    await expect(cards).not.toHaveCount(shown);
  }
  return link;
}

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
  // Zero-result options are disabled; a shared URL can still request one.
  await expect(
    page.getByRole('option', { name: 'Recorded pass (0)' }),
  ).toBeDisabled();
  await page.goto(
    '/skills?quality=90&platform=codex&validation=passed&status=draft&sort=quality&testing=recorded-pass',
  );
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
  await (await revealSkillLink(page, warningSkill.title)).click();
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
  await expect(section.getByText(/Evidence check: stale/)).toBeVisible();
  await expect(section.getByText(/Difference: 0 points/)).toHaveCount(0);
  await expect(
    section.getByText(/Tested skill package has changed since evaluation/),
  ).toBeVisible();
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
  // Finance has no "shipment" match, so its option is disabled; request it by URL.
  await expect(
    page.getByRole('option', { name: 'Finance & Accounting (0)' }),
  ).toBeDisabled();
  await page.goto('/skills?sort=za&q=shipment&industry=finance');
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

test('contributor onboarding stays accessible on mobile and does not submit anything automatically', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Submit a skill', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Share a workflow that helps.' }),
  ).toBeVisible();
  await expect(page).toHaveTitle('Submit a skill — Open Skill Kit');
  await expect(
    page.getByLabel('Contribution validation commands'),
  ).toContainText('pnpm validate:all');
  await expect(
    page.getByRole('link', { name: 'Open a pull request on GitHub' }),
  ).toHaveAttribute(
    'href',
    'https://github.com/sarangp3010/open-skill-kit/compare',
  );
  await page.setViewportSize({ width: 320, height: 740 });
  for (const path of ['/contribute', '/docs', '/sectors']) {
    await page.goto(path);
    await expect(page.locator('main h1')).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    for (const theme of ['light', 'dark']) {
      await page.getByLabel('Color theme').selectOption(theme);
      await page.evaluate(async () => {
        await Promise.all(
          document
            .getAnimations()
            .map((animation) => animation.finished.catch(() => undefined)),
        );
      });
      const result = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
        .analyze();
      expect(result.violations).toEqual([]);
    }
  }
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await page
    .getByRole('navigation', { name: 'Mobile navigation' })
    .getByRole('link', { name: 'Contribute', exact: true })
    .click();
  await expect(page).toHaveURL(/\/contribute$/);
  await expect(page.getByRole('dialog')).toBeHidden();
});

test('route metadata follows navigation, query canonicalization, planned pages and unknown routes', async ({
  page,
}) => {
  await page.goto('/skills?q=invoice');
  await expect(page).toHaveTitle('Browse AI skills — Open Skill Kit');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    'https://sarangp3010.github.io/open-skill-kit/skills/',
  );
  const target = catalog.skills.find(
    (item) =>
      item.id === 'accounting-operations/invoice-reconciliation-assistant',
  )!;
  await page.getByRole('link', { name: target.title, exact: true }).click();
  await expect(page).toHaveTitle(`${target.title} — Open Skill Kit`);
  await expect(page.locator('meta[property="og:url"]')).toHaveAttribute(
    'content',
    `https://sarangp3010.github.io/open-skill-kit/skills/${target.id}/`,
  );
  const structured = JSON.parse(
    (await page.locator('#page-structured-data').textContent())!,
  );
  expect(structured.creativeWorkStatus).toBe('draft');
  expect(structured).not.toHaveProperty('aggregateRating');
  expect(structured).not.toHaveProperty('author');
  await expect(
    page.getByRole('region', { name: 'Contributor attribution' }),
  ).toContainText('No maintainer-reviewed attribution recorded.');
  await page.goBack();
  await expect(page).toHaveTitle('Browse AI skills — Open Skill Kit');
  await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
  await page.goto('/sectors/healthcare-research');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    'content',
    'noindex, follow',
  );
  await page.goto('/sectors/software-engineering');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    'https://sarangp3010.github.io/open-skill-kit/sectors/software-development/',
  );
  await page.goto('/this-page-does-not-exist');
  await expect(page).toHaveTitle('Page not found — Open Skill Kit');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    'content',
    'noindex, nofollow',
  );
});

test('browser proposals validate, preview and export while publication remains moderated', async ({
  page,
}) => {
  const writes: string[] = [];
  page.on('request', (request) => {
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method()))
      writes.push(request.url());
  });
  await page.goto('/create');
  await expect(
    page.getByRole('heading', { name: 'Create a skill proposal' }),
  ).toBeVisible();
  await page
    .getByLabel('Skill name', { exact: true })
    .fill('community-note-proposal');
  await page.getByRole('button', { name: 'Apply identity' }).click();
  await page.getByRole('button', { name: 'Validate proposal' }).click();
  const validation = page.getByRole('region', { name: 'Proposal validation' });
  await expect(validation).toContainText('Validation passed');
  const text = page.getByLabel('File contents');
  const original = await text.inputValue();
  await text.fill(original + '\n[Broken reference](references/missing.md)\n');
  await expect(
    page.getByRole('button', { name: 'Export proposal ZIP' }),
  ).toBeDisabled();
  await page.getByRole('button', { name: 'Validate proposal' }).click();
  await expect(validation).toContainText('missing.md');
  await text.fill(original);
  await page.getByLabel('New supporting file path').fill('../escape.md');
  await page.getByRole('button', { name: 'Add file', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Unsafe or reserved');
  await page.getByLabel('New supporting file path').fill('references/notes.md');
  await page.getByRole('button', { name: 'Add file', exact: true }).click();
  await text.fill(
    '# Authored notes\n\nFictional material for the proposed workflow.',
  );
  await page
    .getByLabel('Package file', { exact: true })
    .selectOption('metadata.json');
  const metadata = JSON.parse(await text.inputValue());
  await text.fill(JSON.stringify({ ...metadata, status: 'published' }));
  await expect(
    page.getByRole('button', { name: 'Submit Skill for review' }),
  ).toBeDisabled();
  await text.fill(JSON.stringify({ ...metadata, status: 'draft' }));
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export proposal ZIP' }).click();
  const download = await downloadPromise;
  const files = unzipSync(await readFile((await download.path())!));
  expect(
    JSON.parse(strFromU8(files['community-note-proposal/submission.json'])),
  ).toEqual({ schemaVersion: 1, operation: 'new' });
  expect(strFromU8(files['community-note-proposal/SKILL.md'])).toContain(
    'name: community-note-proposal',
  );
  expect(
    strFromU8(files['community-note-proposal/references/notes.md']),
  ).toContain('Fictional material');
  await page.getByRole('button', { name: 'Submit Skill for review' }).click();
  await expect(
    page.getByRole('region', { name: 'Submission review guide' }),
  ).toContainText('not submitted or published');
  await expect(
    page.getByRole('link', { name: 'Open GitHub pull request page' }),
  ).toHaveAttribute(
    'href',
    'https://github.com/sarangp3010/open-skill-kit/compare',
  );
  await page.setViewportSize({ width: 320, height: 740 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(results.violations).toEqual([]);
  expect(writes).toEqual([]);
});

test('published catalog excludes drafts and update proposals bind to their source', async ({
  page,
}) => {
  await page.goto('/published');
  await expect(
    page.getByRole('heading', { name: 'Published skills' }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'No skills have been published yet' }),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: skill.title, exact: true }),
  ).toHaveCount(0);
  await page.goto(`/create?skill=${encodeURIComponent(skill.id)}`);
  await page
    .getByRole('button', { name: `Load ${skill.title} as an update proposal` })
    .click();
  await expect(
    page.getByText(
      `Proposal: update · ${skill.id} · publication unavailable in browser`,
    ),
  ).toBeVisible();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export proposal ZIP' }).click();
  const files = unzipSync(
    await readFile((await (await downloadPromise).path())!),
  );
  const request = JSON.parse(strFromU8(files[`${skill.slug}/submission.json`]));
  expect(request.operation).toBe('update');
  expect(request.basePackageDigest).toMatch(/^[a-f0-9]{64}$/);
});

const dataRequests = (page: import('@playwright/test').Page) => {
  const paths: string[] = [];
  page.on('request', (request) => {
    const { pathname } = new URL(request.url());
    if (
      pathname.startsWith('/data/') ||
      /^\/(catalog|published)\.json$/.test(pathname)
    )
      paths.push(pathname);
  });
  return paths;
};

test('initial browsing loads only the lightweight index; search and details load on demand', async ({
  page,
}) => {
  const requests = dataRequests(page);
  const index = page.waitForResponse((response) =>
    response.url().endsWith('/data/index.json'),
  );
  await page.goto('/skills');
  expect((await (await index).body()).byteLength).toBeLessThanOrEqual(150_000);
  await expect(page.getByRole('status')).toContainText(
    `${catalog.skills.length} skills`,
  );
  // Development StrictMode may repeat the start-up effect; only the index loads.
  expect([...new Set(requests)]).toEqual(['/data/index.json']);
  await page.getByLabel('Search skills').pressSequentially('review');
  await expect(page.getByRole('status')).toContainText('matching “review”');
  expect(requests.filter((path) => path === '/data/search.json')).toHaveLength(
    1,
  );
  const first = page.getByRole('article').first().getByRole('link');
  const title = (await first.textContent())!.trim();
  const target = catalog.skills.find((item) => item.title === title)!;
  await first.click();
  await expect(
    page.getByRole('heading', { name: target.title, level: 1 }),
  ).toBeVisible();
  expect(requests.filter((path) => path.startsWith('/data/skills/'))).toEqual([
    `/data/skills/${target.sector}/${target.slug}.json`,
  ]);
  expect(requests).not.toContain('/catalog.json');
});

test('Load more pages results, survives reload and moves focus to new results', async ({
  page,
}) => {
  const sorted = [...catalog.skills].sort(
    (a, b) =>
      a.title.localeCompare(b.title, 'en') || a.id.localeCompare(b.id, 'en'),
  );
  await page.goto('/skills');
  const cards = page.getByRole('article');
  await expect(cards.first()).toBeVisible();
  // Derive the page size from the UI rather than assuming a constant.
  const pageSize = await cards.count();
  expect(sorted.length).toBeGreaterThan(pageSize);
  await expect(page.getByRole('status')).toContainText(
    `${catalog.skills.length} skills · showing ${pageSize}`,
  );
  await expect(
    page.getByRole('link', { name: sorted[pageSize - 1].title, exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: sorted[pageSize].title, exact: true }),
  ).toHaveCount(0);
  await page.getByRole('button', { name: 'Load more skills' }).click();
  await expect(cards).toHaveCount(Math.min(sorted.length, pageSize * 2));
  await expect(
    page.getByRole('link', { name: sorted[pageSize].title, exact: true }),
  ).toBeFocused();
  await expect
    .poll(() => new URL(page.url()).searchParams.get('page'))
    .toBe('2');
  await page.reload();
  await expect(cards).toHaveCount(Math.min(sorted.length, pageSize * 2));
  if (sorted.length <= pageSize * 2)
    await expect(
      page.getByRole('button', { name: 'Load more skills' }),
    ).toHaveCount(0);
});

test('published view stays published-only with a clear empty state', async ({
  page,
}) => {
  const requests = dataRequests(page);
  await page.goto('/published?status=draft&q=review');
  await expect(
    page.getByRole('heading', { name: 'No skills have been published yet' }),
  ).toBeVisible();
  await expect(page.getByRole('article')).toHaveCount(0);
  await expect(page.getByText('Draft · preview')).toHaveCount(0);
  await page.getByRole('button', { name: 'Clear filters' }).click();
  await expect(page).toHaveURL(/\/published$/);
  await expect(
    page.getByRole('heading', { name: 'No skills have been published yet' }),
  ).toBeVisible();
  expect(requests).not.toContain('/data/search.json');
});

test('accessibility of paged results and the published empty state in both themes', async ({
  page,
}) => {
  for (const theme of ['light', 'dark'])
    for (const path of ['/skills?page=2&q=review', '/published']) {
      await page.goto(path);
      await expect(page.locator('main h1').first()).toBeVisible();
      if (path.startsWith('/skills'))
        await expect(page.getByRole('status')).toContainText('matching');
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
          context: `${theme} ${path}`,
          nodes: violation.nodes.map((node) => node.target),
        })),
      ).toEqual([]);
    }
});
