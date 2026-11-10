import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { loadCatalog, type DiscoveryCatalog } from '@/lib/catalog';
import { CatalogPage } from './catalog';
export function PublishedPage() {
  const [catalog, setCatalog] = useState<DiscoveryCatalog>(),
    [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    loadCatalog(controller.signal, 'published.json')
      .then((value) =>
        setCatalog({
          ...value,
          skills: value.skills.filter((skill) => skill.status === 'published'),
        }),
      )
      .catch((error) => {
        if (!controller.signal.aborted)
          setError(
            error instanceof Error
              ? error.message
              : 'Published catalog unavailable',
          );
      });
    return () => controller.abort();
  }, []);
  if (error)
    return (
      <div className="container-shell py-16" role="alert">
        Published catalog unavailable. {error}
      </div>
    );
  if (!catalog)
    return (
      <p className="container-shell py-16" role="status">
        Loading approved publications…
      </p>
    );
  return (
    <>
      <CatalogPage catalogOverride={catalog} publishedOnly />
      <p className="container-shell pb-10 text-sm text-muted-foreground">
        Only maintainer-approved, merged publications appear here.{' '}
        <Link className="text-link" to="/skills">
          Browse the separate draft/source library
        </Link>
        .
      </p>
    </>
  );
}
