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
import { MemoryRouter } from 'react-router-dom';
import { resolve } from 'node:path';
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
import { generateCatalog } from '../packages/catalog-indexer/src/index';
import type { DiscoveryCatalog } from '../packages/skill-schema/src/index';
let catalog: DiscoveryCatalog;
beforeAll(async () => {
  catalog = (await generateCatalog(resolve('skills'))).catalog;
});
beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({ ok: true, json: async () => catalog })),
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
    expect(
      await screen.findByRole('link', {
        name: catalog.skills[0].title,
      }),
    ).toBeInTheDocument();
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
        .mockResolvedValue({ ok: true, json: async () => catalog }),
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
  expect(screen.getAllByText(/Quality 90\/100/)).toHaveLength(matches.length);
  expect(screen.getByLabelText('Minimum quality score')).toHaveValue('90');
  expect(screen.getByLabelText('Installation platform')).toHaveValue('codex');
  await user.selectOptions(
    screen.getByLabelText('Test evidence'),
    'recorded-pass',
  );
  expect(
    await screen.findByRole('heading', { name: 'No skills found' }),
  ).toBeInTheDocument();
  expect(screen.queryByText(/^Verified$/i)).toBeNull();
});

it('explains quality points and distinguishes documented installation from absent test evidence', async () => {
  const user = userEvent.setup();
  const skill = catalog.skills[0];
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
  const evidence = assessEvaluationArtifact(artifact, skill);
  const { rerender } = render(
    <EvaluationDetails skill={{ ...skill, evaluations: [evidence] }} />,
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
