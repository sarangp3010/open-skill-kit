// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { createRef } from 'react';
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { resolve } from 'node:path';
import { readFile } from 'node:fs/promises';
import { sectorsSchema } from '../packages/skill-schema/src/index';
import { App } from '../apps/web/src/App';
import {
  TrustDetails,
  TrustSummary,
} from '../apps/web/src/components/skill-trust';
import {
  assessCompatibility,
  packageDigest,
} from '../packages/catalog-indexer/src/index';
import { validateSkill } from '../packages/skill-validator/src/index';
import { CatalogSearchInput } from '../apps/web/src/components/catalog-search-input';
import { MarkdownViewer } from '../apps/web/src/components/markdown-viewer';
import {
  generateCatalog,
  webArtifacts,
} from '../packages/catalog-indexer/src/index';
import {
  CATALOG_UPDATED,
  PAGE_SIZE,
  clearCatalogRequests,
  selectSkills,
} from '../apps/web/src/lib/catalog';
import type { DiscoveryCatalog } from '../packages/skill-schema/src/index';
let catalog: DiscoveryCatalog;
let served: Map<string, string>;
// Serves generated browser artifacts by URL. published.json deliberately
// returns the draft-containing catalog to prove the published view filters it.
function respond(input: RequestInfo | URL) {
  const path = new URL(String(input), 'http://localhost').pathname.slice(1);
  if (served.has(path))
    return { ok: true, json: async () => JSON.parse(served.get(path)!) };
  if (path === 'catalog.json' || path === 'published.json')
    return { ok: true, json: async () => catalog };
  return { ok: false, json: async () => ({}) };
}
beforeAll(async () => {
  catalog = (
    await generateCatalog(
      resolve('skills'),
      sectorsSchema.parse(
        JSON.parse(await readFile(resolve('catalog/sectors.json'), 'utf8')),
      ),
    )
  ).catalog;
  served = new Map(
    webArtifacts(JSON.stringify(catalog, null, 2) + '\n').artifacts,
  );
});
beforeEach(() => {
  clearCatalogRequests();
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => respond(input)),
  );
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  });
  window.scrollTo = vi.fn();
  localStorage.clear();
  document.documentElement.classList.remove('dark');
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
/** Finds a result card link by title, clicking Load more until it is shown. */
async function revealSkillLink(title: string) {
  await screen.findAllByRole('article');
  for (;;) {
    const link = screen.queryByRole('link', { name: title });
    if (link) return link;
    const more = screen.queryByRole('button', { name: 'Load more skills' });
    if (!more) throw new Error(`${title} is not among the results`);
    await userEvent.click(more);
  }
}
function app(path = '/') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}
describe('generated-catalog marketplace', () => {
  it('renders the landing page from generated data', async () => {
    app();
    expect(
      await screen.findByRole('heading', { name: /better work starts/i }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Search for a skill')).toBeInTheDocument();
    expect(screen.getAllByText('Draft · preview').length).toBeGreaterThan(0);
  });
  it('loads query parameters, filters results and displays a resettable empty state', async () => {
    app('/skills?q=does-not-match');
    expect(
      await screen.findByRole('heading', { name: 'No skills found' }),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Reset search' }));
    expect(await revealSkillLink(catalog.skills[0].title)).toBeInTheDocument();
    await userEvent.type(
      screen.getByLabelText('Search skills'),
      catalog.skills[0].title,
    );
    expect(screen.getByLabelText('Search skills')).toHaveValue(
      catalog.skills[0].title,
    );
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('1 skill'),
    );
    await userEvent.selectOptions(
      screen.getByLabelText('Sector'),
      catalog.skills[0].sector,
    );
    expect(
      screen.getByRole('link', { name: catalog.skills[0].title }),
    ).toBeInTheDocument();
  });
  it('navigates to data-driven detail and selects an example preview', async () => {
    const skill = catalog.skills[0];
    app(`/skills/${skill.sector}/${skill.slug}`);
    expect(
      await screen.findByRole('heading', { name: skill.title, level: 1 }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Download ZIP' }),
    ).toBeInTheDocument();
    await userEvent.selectOptions(
      screen.getByLabelText('Preview file'),
      skill.examples[0],
    );
    expect(screen.getByLabelText('Preview file')).toHaveValue(
      skill.examples[0],
    );
    expect(
      screen.getByRole('link', { name: 'View source on GitHub' }),
    ).toHaveAttribute('href', expect.stringContaining(skill.sourcePath));
  });
  it('supports theme selection and browser preference persistence', async () => {
    app();
    await screen.findByRole('heading', { name: /better work starts/i });
    await userEvent.selectOptions(screen.getByLabelText('Color theme'), 'dark');
    expect(document.documentElement).toHaveClass('dark');
    expect(localStorage.getItem('osk-theme')).toBe('dark');
    await userEvent.selectOptions(
      screen.getByLabelText('Color theme'),
      'light',
    );
    expect(document.documentElement).not.toHaveClass('dark');
  });
  it('provides an accessible loading status', () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise(() => {})),
    );
    app();
    expect(screen.getByRole('status')).toHaveTextContent(
      'Loading the skill library',
    );
  });
  it('provides retry for a failed catalog fetch', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockRejectedValueOnce(new Error('Network unavailable'))
        .mockImplementation(async (input: RequestInfo | URL) => respond(input)),
    );
    app();
    expect(
      await screen.findByRole('heading', { name: 'The library couldn’t load' }),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(
      await screen.findByRole('heading', { name: /better work starts/i }),
    ).toBeInTheDocument();
  });
  it('fails safely on malformed JSON contracts', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ skills: [{ id: '../bad' }] }),
      })),
    );
    app();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'invalid format',
    );
  });
  it('handles unknown skill URLs', async () => {
    app('/skills/unknown/missing');
    expect(
      await screen.findByRole('heading', { name: 'Skill not found' }),
    ).toBeInTheDocument();
  });
  it('blocks untrusted HTML, javascript links and remote images in previews', () => {
    const { container } = render(
      <MarkdownViewer
        source={
          '<script>alert(1)</script>\n\n[unsafe](javascript:alert(1))\n\n![sample](https://example.org/tracker.png)\n\n[safe](https://example.org)'
        }
        files={{}}
      />,
    );
    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('a[href^="javascript:"]')).toBeNull();
    expect(screen.getByRole('link', { name: 'safe' })).toHaveAttribute(
      'rel',
      'noopener noreferrer',
    );
  });
});

it('keeps newer keystrokes and the caret when an older URL render arrives', async () => {
  const user = userEvent.setup();
  const onQueryChange = vi.fn();
  const inputRef = createRef<HTMLInputElement>();
  const view = render(
    <CatalogSearchInput
      initialValue=""
      navigationKey="initial"
      restoreFromUrl={false}
      inputRef={inputRef}
      onQueryChange={onQueryChange}
    />,
  );
  const search = screen.getByRole('searchbox');
  await user.click(search);
  await user.keyboard('Prompt');
  view.rerender(
    <CatalogSearchInput
      initialValue="Pr"
      navigationKey="delayed-replacement"
      restoreFromUrl={false}
      inputRef={inputRef}
      onQueryChange={onQueryChange}
    />,
  );
  expect(search).toHaveValue('Prompt');
  expect(search).toHaveFocus();
  await user.keyboard(' Evaluator');
  expect(search).toHaveValue('Prompt Evaluator');
  expect(onQueryChange).toHaveBeenLastCalledWith('Prompt Evaluator');
  view.rerender(
    <CatalogSearchInput
      initialValue=""
      navigationKey="back-to-empty"
      restoreFromUrl={true}
      inputRef={inputRef}
      onQueryChange={onQueryChange}
    />,
  );
  expect(search).toHaveValue('');
});

it('restores a native POP even if all intermediate router renders were cancelled', async () => {
  const user = userEvent.setup();
  const inputRef = createRef<HTMLInputElement>();
  const previousUrl = window.location.href;
  window.history.replaceState(null, '', '/skills');
  try {
    render(
      <CatalogSearchInput
        initialValue=""
        navigationKey="initial-render"
        restoreFromUrl={true}
        inputRef={inputRef}
        onQueryChange={vi.fn()}
      />,
    );
    const search = screen.getByRole('searchbox');
    await user.click(search);
    await user.keyboard('code');
    expect(search).toHaveValue('code');
    // No rerender: POP returns to the same location props React already has.
    act(() => window.dispatchEvent(new PopStateEvent('popstate')));
    expect(search).toHaveValue('');
    expect(search).toHaveFocus();
  } finally {
    window.history.replaceState(null, '', previousUrl);
  }
});

it('shows copyable platform and scope instructions for the generated skill without claiming publication', async () => {
  const user = userEvent.setup();
  const clipboard = vi
    .spyOn(navigator.clipboard, 'writeText')
    .mockResolvedValue();
  try {
    const skill = catalog.skills[0];
    app(`/skills/${skill.sector}/${skill.slug}`);
    await screen.findByRole('heading', { name: skill.title, level: 1 });
    const command = screen.getByLabelText('Installation command');
    expect(command).toHaveTextContent(
      `pnpm cli install ${skill.id} --platform codex`,
    );
    expect(command).toHaveTextContent('--allow-draft');
    expect(
      screen.getByText(/CLI is not published to npm yet/),
    ).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Platform'), 'gemini-cli');
    expect(command).toHaveTextContent('--platform gemini-cli --scope project');
    await user.selectOptions(
      screen.getByLabelText('Installation scope'),
      'global',
    );
    expect(command).toHaveTextContent('--scope global');
    expect(command).not.toHaveTextContent('--project-dir');
    expect(
      screen.getByText(`~/.gemini/skills/${skill.slug}`),
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole('button', { name: 'Copy preview command' }),
    );
    expect(clipboard).toHaveBeenLastCalledWith(
      expect.stringContaining('--dry-run'),
    );
    await user.click(
      screen.getByRole('button', { name: 'Copy install command' }),
    );
    expect(clipboard).toHaveBeenLastCalledWith(command.textContent);
    clipboard.mockRejectedValue(new Error('Denied'));
    await user.click(
      screen.getByRole('button', { name: 'Copy install command' }),
    );
    expect(
      screen.getByText(/Clipboard unavailable. Select and copy the command/),
    ).toBeInTheDocument();
  } finally {
    clipboard.mockRestore();
  }
});

it('shows generated quality and validation on cards and applies quality/trust filters', async () => {
  const user = userEvent.setup();
  app(
    '/skills?quality=90&platform=codex&validation=passed&status=draft&sort=quality',
  );
  await screen.findByRole('heading', { name: 'Find your next skill.' });
  const matches = catalog.skills.filter((skill) => skill.quality!.score >= 90);
  expect(screen.getByRole('status')).toHaveTextContent(
    `${matches.length} skills`,
  );
  // Results are paged; reveal every page before counting each rendered card.
  while (screen.queryByRole('button', { name: 'Load more skills' }))
    await user.click(screen.getByRole('button', { name: 'Load more skills' }));
  for (const score of new Set(matches.map((skill) => skill.quality!.score))) {
    expect(
      screen.getAllByText(`Quality ${score}/100 · structural`),
    ).toHaveLength(
      matches.filter((skill) => skill.quality!.score === score).length,
    );
  }
  expect(screen.getByLabelText('Minimum quality score')).toHaveValue('90');
  expect(screen.getByLabelText('Installation platform')).toHaveValue('codex');
  // Zero-result options are disabled; a shared URL can still request one.
  const recordedPass = screen.getByRole('option', {
    name: 'Recorded pass (0)',
  });
  expect(recordedPass).toBeDisabled();
  cleanup();
  app(
    '/skills?quality=90&platform=codex&validation=passed&status=draft&sort=quality&testing=recorded-pass',
  );
  expect(
    await screen.findByRole('heading', { name: 'No skills found' }),
  ).toBeInTheDocument();
  expect(screen.getByLabelText('Test evidence')).toHaveValue('recorded-pass');
  expect(
    screen.getByRole('option', { name: 'Recorded pass (0)' }),
  ).toBeEnabled();
  expect(screen.queryByText(/^Verified$/i)).toBeNull();
});

it('explains quality points and distinguishes documented installation from absent test evidence', async () => {
  const user = userEvent.setup();
  const skill = catalog.skills.find((item) =>
    item.quality?.checks.some(
      (check) => check.id === 'discovery-metadata' && check.status === 'warn',
    ),
  )!;
  app(`/skills/${skill.sector}/${skill.slug}`);
  await screen.findByRole('heading', { name: skill.title, level: 1 });
  await user.click(
    screen.getByText(`Explain quality score (${skill.quality!.score}/100)`),
  );
  expect(
    screen.getByText('discovery-metadata: warn · 0/10'),
  ).toBeInTheDocument();
  expect(screen.getByText(/not independent verification/)).toBeInTheDocument();
  expect(
    screen.getAllByText('Test evidence: No completed test evidence.'),
  ).toHaveLength(4);
  expect(screen.queryByText(/^Verified$/i)).toBeNull();
});

it('displays contributor-recorded completed evidence safely without creating a verified label', async () => {
  const user = userEvent.setup();
  const original = catalog.skills[0];
  const files = { ...original.files };
  const evidencePath = 'tests/evidence/codex.txt';
  const run = {
    platform: 'codex',
    platformVersion: 'synthetic-ui-fixture',
    runner: 'Fixture runner',
    completedAt: '2026-11-10T10:00:00Z',
    outcome: 'passed',
    packageDigest: '',
    evidencePath,
  };
  files[evidencePath] =
    'Completed synthetic UI test artifact. <script>bad()</script>';
  run.packageDigest = packageDigest(files);
  files['tests/platform-results.json'] = JSON.stringify({
    schemaVersion: 1,
    runs: [run],
  });
  const derived = validateSkill(files, original.id, {
    profile: 'catalog',
  }).skill!;
  const skill = { ...derived, compatibility: assessCompatibility(derived) };
  const { container } = render(<TrustDetails skill={skill} />);
  expect(screen.getByText('Test evidence: Recorded pass.')).toBeInTheDocument();
  await user.click(screen.getByText(`Recorded passed · ${run.completedAt}`));
  expect(screen.getByLabelText('codex test evidence')).toHaveTextContent(
    '<script>bad()</script>',
  );
  expect(container.querySelector('script')).toBeNull();
  expect(screen.queryByText(/^Verified$/i)).toBeNull();
});

it('shows unassessed states for older catalog entries without trust reports', () => {
  const old = { ...catalog.skills[0] };
  delete old.quality;
  delete old.validation;
  delete old.compatibility;
  render(<TrustSummary skill={old} />);
  expect(screen.getByText('Quality not assessed')).toBeInTheDocument();
  expect(screen.getByText('Validation not assessed')).toBeInTheDocument();
  expect(screen.getByText('Testing not assessed')).toBeInTheDocument();
});

it('explains fixture evidence and hides stale scores without promoting compatibility', async () => {
  const { EvaluationDetails } =
    await import('../apps/web/src/components/skill-evaluations');
  const { readEvaluationReports, assessEvaluationArtifact } =
    await import('../packages/catalog-indexer/src/index');
  const skill = catalog.skills.find(
    (item) => item.id === 'software-development/code-reviewer',
  )!;
  const artifact = (
    await readEvaluationReports(resolve('evaluations/reports'))
  )[0];
  const historicalSkill = {
    ...skill,
    files: Object.fromEntries(
      Object.entries(skill.files).filter(([path]) => path !== 'LICENSE.txt'),
    ),
  };
  const evidence = assessEvaluationArtifact(artifact, historicalSkill);
  const { rerender } = render(
    <EvaluationDetails
      skill={{ ...historicalSkill, evaluations: [evidence] }}
    />,
  );
  expect(
    screen.getByText('Offline fixture replay · not agent performance'),
  ).toBeInTheDocument();
  expect(screen.getByText(/Baseline assertions: 100/)).toBeInTheDocument();
  expect(screen.queryByText(/^Verified$/i)).not.toBeInTheDocument();
  rerender(
    <EvaluationDetails
      skill={{
        ...skill,
        evaluations: [
          {
            ...evidence,
            verification: 'stale',
            baselineScore: null,
            assistedScore: null,
            delta: null,
            issues: ['Package changed'],
          },
        ],
      }}
    />,
  );
  expect(
    screen.queryByText(/Baseline assertions: 100/),
  ).not.toBeInTheDocument();
  expect(screen.getByText(/Comparison unscored/)).toBeInTheDocument();
  expect(screen.getByText('Package changed')).toBeInTheDocument();
});

it('shows broad sectors and planned specialties without duplicate legacy navigation', async () => {
  app('/sectors');
  await screen.findByRole('heading', { name: 'Explore the sectors.' });
  expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(20);
  expect(
    screen.getByRole('link', { name: 'Technology & Data' }),
  ).toHaveAttribute('href', '/sectors/technology');
  expect(
    screen.queryByRole('link', { name: 'Software Engineering' }),
  ).not.toBeInTheDocument();
  const planned = screen.getByRole('link', {
    name: 'Healthcare Evidence Organization',
  });
  expect(planned.closest('li')).toHaveTextContent('Planned');
  await userEvent.click(planned);
  expect(
    await screen.findByText(
      'Planned collection · no skill packages available yet.',
    ),
  ).toBeInTheDocument();
  expect(
    screen.getByRole('heading', { name: 'No skills found' }),
  ).toBeInTheDocument();
});

it('composes broad-sector selection with specialty filters and keeps typed input', async () => {
  app('/skills?sort=za');
  await screen.findByRole('heading', { name: 'Find your next skill.' });
  await userEvent.selectOptions(
    screen.getByLabelText('Broad sector'),
    'technology',
  );
  await userEvent.click(
    screen.getByRole('button', { name: /Software Development/ }),
  );
  const search = screen.getByLabelText('Search skills');
  await userEvent.type(search, 'review');
  expect(search).toHaveValue('review');
  expect(screen.getByLabelText('Broad sector')).toHaveValue('technology');
  expect(screen.getByLabelText('Sort by')).toHaveValue('za');
  await userEvent.selectOptions(
    screen.getByLabelText('Broad sector'),
    'finance',
  );
  expect(search).toHaveValue('review');
  expect(
    screen.queryByRole('link', { name: 'Code Reviewer' }),
  ).not.toBeInTheDocument();
});

it('takes visitors from Submit a skill to a complete read-only contribution workflow', async () => {
  app('/');
  await userEvent.click(
    await screen.findByRole('link', { name: 'Submit a skill' }),
  );
  await screen.findByRole('heading', { name: 'Share a workflow that helps.' });
  expect(
    screen.getByLabelText('Contribution validation commands'),
  ).toHaveTextContent('pnpm contributions:check');
  expect(
    screen.getByRole('link', { name: 'Open a pull request on GitHub' }),
  ).toHaveAttribute(
    'href',
    'https://github.com/sarangp3010/open-skill-kit/compare',
  );
  expect(
    screen.getByRole('link', { name: 'Get the complete skill template' }),
  ).toHaveAttribute('href', expect.stringContaining('/templates/skill'));
  await waitFor(() =>
    expect(document.title).toBe('Submit a skill — Open Skill Kit'),
  );
  expect(document.head.querySelectorAll('link[rel="canonical"]')).toHaveLength(
    1,
  );
  expect(document.head.querySelectorAll('#page-structured-data')).toHaveLength(
    1,
  );
});

it('keeps declared authors separate from current and stale maintainer attribution', async () => {
  const { ContributorAttribution } =
    await import('../apps/web/src/components/contributor-attribution');
  const original = catalog.skills[0];
  const { rerender } = render(<ContributorAttribution skill={original} />);
  expect(screen.getByText(/Declared author:/)).toBeInTheDocument();
  expect(
    screen.getByText('No maintainer-reviewed attribution recorded.'),
  ).toBeInTheDocument();
  const attribution = {
    status: 'current' as const,
    record: {
      skillId: original.id,
      displayName: 'Synthetic Contributor <script>bad()</script>',
      githubUsername: 'synthetic-contributor',
      reviewedBy: 'synthetic-reviewer',
      reviewedAt: '2026-11-10T12:00:00Z',
      reviewUrl: 'https://github.com/sarangp3010/open-skill-kit/pull/1',
      packageDigest: '0'.repeat(64),
      evidencePath: 'docs/attributions/synthetic.md',
      evidenceDigest: '0'.repeat(64),
    },
  };
  rerender(<ContributorAttribution skill={{ ...original, attribution }} />);
  expect(
    screen.getByRole('link', { name: attribution.record.displayName }),
  ).toHaveAttribute('href', 'https://github.com/synthetic-contributor');
  expect(document.body.querySelector('script')).toBeNull();
  expect(
    screen.getByText(/This record is not independent identity verification/),
  ).toBeInTheDocument();
  rerender(
    <ContributorAttribution
      skill={{ ...original, attribution: { ...attribution, status: 'stale' } }}
    />,
  );
  expect(screen.getByText(/needs re-review/)).toBeInTheDocument();
  expect(
    screen.queryByRole('link', { name: attribution.record.displayName }),
  ).not.toBeInTheDocument();
});

it('provides generated installation onboarding without requiring an account', async () => {
  app('/docs');
  await screen.findByRole('heading', {
    name: `Install a catalog example: ${catalog.skills[0].title}`,
  });
  expect(screen.getByLabelText('Installation command')).toHaveTextContent(
    catalog.skills[0].id,
  );
  expect(
    screen.getByText(
      /Browsing, local validation and downloads need no account/,
    ),
  ).toBeInTheDocument();
  await waitFor(() =>
    expect(
      document.head
        .querySelector('meta[name="description"]')
        ?.getAttribute('content'),
    ).toContain('Codex'),
  );
});

it('lets contributors edit and validate a proposal without a catalog write or publication action', async () => {
  app('/create');
  await screen.findByRole('heading', { name: 'Create a skill proposal' });
  const slug = screen.getByLabelText('Skill name');
  await userEvent.clear(slug);
  await userEvent.type(slug, 'browser-proposal-test');
  await userEvent.click(screen.getByRole('button', { name: 'Apply identity' }));
  await userEvent.click(
    screen.getByRole('button', { name: 'Validate proposal' }),
  );
  expect(
    screen.getByRole('region', { name: 'Proposal validation' }),
  ).toHaveTextContent('Validation passed');
  await userEvent.click(
    screen.getByRole('button', { name: 'Submit Skill for review' }),
  );
  expect(
    screen.getByRole('region', { name: 'Submission review guide' }),
  ).toHaveTextContent('not submitted or published');
  expect(
    screen.getByRole('link', { name: 'Open GitHub pull request page' }),
  ).toHaveAttribute(
    'href',
    'https://github.com/sarangp3010/open-skill-kit/compare',
  );
  expect(
    catalog.skills.some((skill) => skill.slug === 'browser-proposal-test'),
  ).toBe(false);
});

it('keeps the published view empty rather than falling back to source drafts', async () => {
  app('/published?status=draft');
  await screen.findByRole('heading', { name: 'Published skills' });
  expect(
    screen.getByRole('heading', { name: 'No skills have been published yet' }),
  ).toBeInTheDocument();
  expect(screen.queryAllByText('Draft · preview')).toHaveLength(0);
  expect(
    screen.queryByRole('link', { name: catalog.skills[0].title }),
  ).not.toBeInTheDocument();
  expect(
    screen.getByText(
      /Only maintainer-approved, merged publications appear here/,
    ),
  ).toBeInTheDocument();
});

describe('fast catalog loading', () => {
  const fetched = () =>
    vi
      .mocked(fetch)
      .mock.calls.map(([input]) =>
        new URL(String(input), 'http://localhost').pathname.slice(1),
      );
  const byTitle = () =>
    [...catalog.skills].sort(
      (a, b) =>
        a.title.localeCompare(b.title, 'en') || a.id.localeCompare(b.id, 'en'),
    );
  function serve(overrides: Record<string, () => unknown>) {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const path = new URL(String(input), 'http://localhost').pathname.slice(
          1,
        );
        return overrides[path]
          ? (overrides[path]() as Awaited<ReturnType<typeof respond>>)
          : respond(input);
      }),
    );
  }

  it('loads only the lightweight index on start and full-text search once while typing', async () => {
    const user = userEvent.setup();
    app('/skills');
    await screen.findByRole('heading', { name: 'Find your next skill.' });
    expect(fetched()).toEqual(['data/index.json']);
    await user.type(screen.getByLabelText('Search skills'), 'review');
    const expected = selectSkills(catalog, { query: 'review' }).length;
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(
        `${expected} ${expected === 1 ? 'skill' : 'skills'} matching “review”`,
      ),
    );
    expect(
      fetched().filter((path) => path === 'data/search.json'),
    ).toHaveLength(1);
    expect(fetched()).not.toContain('catalog.json');
    expect(fetched().some((path) => path.startsWith('data/skills/'))).toBe(
      false,
    );
  });

  it('pages results with Load more and moves focus to the first new result', async () => {
    const user = userEvent.setup();
    // Precondition: the library spans more than one page.
    expect(catalog.skills.length).toBeGreaterThan(PAGE_SIZE);
    app('/skills');
    await screen.findByRole('heading', { name: 'Find your next skill.' });
    expect(screen.getByRole('status')).toHaveTextContent(
      `${catalog.skills.length} skills · showing ${PAGE_SIZE}`,
    );
    expect(screen.getAllByRole('article')).toHaveLength(PAGE_SIZE);
    await user.click(screen.getByRole('button', { name: 'Load more skills' }));
    const twoPages = Math.min(catalog.skills.length, PAGE_SIZE * 2);
    expect(screen.getAllByRole('article')).toHaveLength(twoPages);
    if (twoPages === catalog.skills.length) {
      expect(
        screen.queryByRole('button', { name: 'Load more skills' }),
      ).not.toBeInTheDocument();
      expect(screen.getByRole('status')).not.toHaveTextContent('showing');
    }
    expect(
      screen.getByRole('link', { name: byTitle()[PAGE_SIZE].title }),
    ).toHaveFocus();
    // Changing a filter returns to the first page.
    await user.selectOptions(screen.getByLabelText('Sort by'), 'za');
    expect(screen.getAllByRole('article')).toHaveLength(PAGE_SIZE);
  });

  it('restores the loaded page count from the URL', async () => {
    app('/skills?page=2');
    await screen.findByRole('heading', { name: 'Find your next skill.' });
    expect(screen.getAllByRole('article')).toHaveLength(
      Math.min(catalog.skills.length, PAGE_SIZE * 2),
    );
  });

  it('reports full-text search failures with retry and never mixes mismatched data', async () => {
    const user = userEvent.setup();
    let failures = 1;
    serve({
      'data/search.json': () =>
        failures-- > 0
          ? { ok: false, json: async () => ({}) }
          : respond('/data/search.json'),
    });
    app('/skills?q=review');
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Full-text search could not be loaded.',
    );
    expect(screen.queryAllByRole('article')).toHaveLength(0);
    await user.click(screen.getByRole('button', { name: 'Try search again' }));
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('matching “review”'),
    );
    cleanup();
    clearCatalogRequests();
    const search = JSON.parse(served.get('data/search.json')!);
    serve({
      'data/search.json': () => ({
        ok: true,
        json: async () => ({ ...search, catalogDigest: 'f'.repeat(64) }),
      }),
    });
    app('/skills?q=review');
    expect(await screen.findByRole('alert')).toHaveTextContent(CATALOG_UPDATED);
    expect(
      screen.getByRole('button', { name: 'Reload page' }),
    ).toBeInTheDocument();
    expect(screen.queryAllByRole('article')).toHaveLength(0);
  });

  it('loads details only for the visited skill and recovers from failures', async () => {
    const user = userEvent.setup();
    const skill = catalog.skills[0];
    const path = `data/skills/${skill.sector}/${skill.slug}.json`;
    let failures = 1;
    serve({
      [path]: () =>
        failures-- > 0
          ? { ok: false, json: async () => ({}) }
          : respond(`/${path}`),
    });
    app(`/skills/${skill.sector}/${skill.slug}`);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The skill details could not be loaded.',
    );
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(
      await screen.findByRole('heading', { name: skill.title, level: 1 }),
    ).toBeInTheDocument();
    expect(fetched().filter((item) => item.startsWith('data/skills/'))).toEqual(
      [path, path],
    );
    expect(fetched()).not.toContain('catalog.json');
  });

  it('rejects detail data from a different catalog build', async () => {
    const skill = catalog.skills[0];
    const path = `data/skills/${skill.sector}/${skill.slug}.json`;
    const detail = JSON.parse(served.get(path)!);
    serve({
      [path]: () => ({
        ok: true,
        json: async () => ({ ...detail, catalogDigest: '0'.repeat(64) }),
      }),
    });
    app(`/skills/${skill.sector}/${skill.slug}`);
    expect(await screen.findByRole('alert')).toHaveTextContent(CATALOG_UPDATED);
    expect(
      screen.queryByRole('button', { name: 'Download ZIP' }),
    ).not.toBeInTheDocument();
  });

  it('ignores a late detail response after navigating to another skill', async () => {
    const [first, second] = catalog.skills;
    const firstPath = `data/skills/${first.sector}/${first.slug}.json`;
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => (release = resolve));
    serve({
      [firstPath]: async () => {
        await gate;
        return respond(`/${firstPath}`);
      },
    });
    let go: (path: string) => void = () => undefined;
    function Navigator() {
      go = useNavigate();
      return null;
    }
    render(
      <MemoryRouter initialEntries={[`/skills/${first.sector}/${first.slug}`]}>
        <Navigator />
        <App />
      </MemoryRouter>,
    );
    expect(await screen.findByText(`Loading ${first.title}…`)).toHaveAttribute(
      'role',
      'status',
    );
    act(() => go(`/skills/${second.sector}/${second.slug}`));
    expect(
      await screen.findByRole('heading', { name: second.title, level: 1 }),
    ).toBeInTheDocument();
    await act(async () => {
      release();
      await gate;
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(
      screen.getByRole('heading', { name: second.title, level: 1 }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: first.title, level: 1 }),
    ).not.toBeInTheDocument();
  });

  it('opens package-relative example links in the preview', async () => {
    const user = userEvent.setup();
    const skill = catalog.skills[0];
    const path = `data/skills/${skill.sector}/${skill.slug}.json`;
    const detail = JSON.parse(served.get(path)!);
    const [input, output] = skill.examples;
    const relative = output.split('/').pop()!;
    detail.skill.files[input] += `\n\n[Compare with the output](${relative})\n`;
    serve({ [path]: () => ({ ok: true, json: async () => detail }) });
    app(`/skills/${skill.sector}/${skill.slug}`);
    await screen.findByRole('heading', { name: skill.title, level: 1 });
    await user.click(
      screen.getByRole('button', { name: 'Compare with the output' }),
    );
    expect(screen.getByLabelText('Preview file')).toHaveValue(output);
    expect(screen.getByLabelText('Preview file')).toHaveFocus();
  });

  it('gives each viewer unique heading anchors and scrolls within its own document', async () => {
    const user = userEvent.setup();
    const source = '[Jump to steps](#steps)\n\n## Steps\n\nDo the work.';
    render(
      <>
        <MarkdownViewer source={source} files={{}} />
        <MarkdownViewer source={source} files={{}} />
      </>,
    );
    const headings = screen.getAllByRole('heading', { name: 'Steps' });
    expect(headings[0].id).not.toBe(headings[1].id);
    expect(headings[0].id).toMatch(/-steps$/);
    const links = screen.getAllByRole('link', { name: 'Jump to steps' });
    expect(links[0]).toHaveAttribute('href', `#${headings[0].id}`);
    await user.click(links[1]);
    expect(headings[1]).toHaveFocus();
  });

  it('shows filter counts with active filters and disables zero-result options', async () => {
    app('/skills?q=invoice');
    const drafts = selectSkills(catalog, { query: 'invoice' }).length;
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('matching'),
    );
    expect(
      screen.getByRole('option', { name: `Draft (${drafts})` }),
    ).toBeEnabled();
    expect(
      screen.getByRole('option', { name: 'Published (0)' }),
    ).toBeDisabled();
    expect(
      screen.getByRole('button', { name: /All skills/ }),
    ).toHaveTextContent(String(drafts));
    const planned = catalog.sectors.find(
      (sector) => !sector.parent && !sector.aliasOf && !sector.skillCount,
    );
    if (planned)
      expect(
        screen.getByRole('button', { name: new RegExp(planned.title) }),
      ).toBeDisabled();
  });

  it('keeps published filters and reset on the published page without drafts', async () => {
    const user = userEvent.setup();
    const [approved, ...drafts] = catalog.skills;
    serve({
      'published.json': () => ({
        ok: true,
        json: async () => ({
          ...catalog,
          skills: [
            {
              ...approved,
              title: 'Synthetic published fixture',
              status: 'published',
            },
            ...drafts,
          ],
        }),
      }),
    });
    app('/published?q=does-not-match');
    expect(
      await screen.findByRole('heading', { name: 'No skills found' }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Reset search' }));
    expect(
      await screen.findByRole('link', { name: 'Synthetic published fixture' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Published skills' }),
    ).toBeInTheDocument();
    expect(screen.queryAllByText('Draft · preview')).toHaveLength(0);
    expect(
      screen.queryByRole('link', { name: drafts[0].title }),
    ).not.toBeInTheDocument();
    expect(fetched()).not.toContain('data/search.json');
  });
});
