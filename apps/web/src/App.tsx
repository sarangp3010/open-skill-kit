import {
  Component,
  lazy,
  Suspense,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { Route, Routes } from 'react-router-dom';
import { loadCatalog } from '@/lib/catalog';
import { Layout, type CatalogState } from '@/components/layout';
import { HomePage } from '@/pages/home';
import { CatalogPage } from '@/pages/catalog';
const SkillDetailPage = lazy(() =>
  import('@/pages/skill-detail').then((module) => ({
    default: module.SkillDetailPage,
  })),
);
import {
  AboutPage,
  ContributePage,
  DocsPage,
  NotFoundPage,
  SectorsPage,
} from '@/pages/information';
class ErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <main className="container-shell py-20">
        <h1 className="text-3xl font-semibold">
          This page couldn’t be displayed
        </h1>
        <p className="mt-4 text-muted-foreground">
          Reload the page to try again.
        </p>
        <button
          className="text-link mt-6"
          onClick={() => window.location.reload()}
        >
          Reload page
        </button>
      </main>
    ) : (
      this.props.children
    );
  }
}
export function App() {
  const [state, setState] = useState<CatalogState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    loadCatalog(controller.signal)
      .then((catalog) => setState({ status: 'ready', catalog }))
      .catch((error: unknown) => {
        if (!controller.signal.aborted)
          setState({
            status: 'error',
            message:
              error instanceof Error
                ? error.message
                : 'Please try again in a moment.',
          });
      });
    return () => controller.abort();
  }, [attempt]);
  function retry() {
    setState({ status: 'loading' });
    setAttempt((value) => value + 1);
  }
  return (
    <ErrorBoundary>
      <Routes>
        <Route element={<Layout state={state} retry={retry} />}>
          <Route index element={<HomePage />} />
          <Route path="skills" element={<CatalogPage />} />
          <Route
            path="skills/:sector/:slug"
            element={
              <Suspense
                fallback={
                  <div className="container-shell py-20" role="status">
                    Opening skill preview…
                  </div>
                }
              >
                <SkillDetailPage />
              </Suspense>
            }
          />
          <Route path="sectors" element={<SectorsPage />} />
          <Route path="sectors/:sector" element={<CatalogPage />} />
          <Route path="docs" element={<DocsPage />} />
          <Route path="contribute" element={<ContributePage />} />
          <Route path="about" element={<AboutPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </ErrorBoundary>
  );
}
