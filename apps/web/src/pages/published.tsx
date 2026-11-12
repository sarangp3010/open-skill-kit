import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  bodySearchEntries,
  loadPublishedCatalog,
  type DiscoveryCatalog,
} from '@/lib/catalog';
import { CatalogPage } from './catalog';
export function PublishedPage() {
  const [catalog, setCatalog] = useState<DiscoveryCatalog>(),
    [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    loadPublishedCatalog(controller.signal)
      .then((value) =>
        // Defense in depth: only published entries, whatever the artifact or URL says.
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
  const searchEntries = useMemo(
    () => bodySearchEntries(catalog?.skills ?? []),
    [catalog],
  );
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
      <CatalogPage
        catalogOverride={catalog}
        searchEntries={searchEntries}
        publishedOnly
      />
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
