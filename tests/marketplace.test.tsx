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
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { resolve } from 'node:path';
import { App } from '../apps/web/src/App';
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
