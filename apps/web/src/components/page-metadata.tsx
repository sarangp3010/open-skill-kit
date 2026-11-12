import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import type { BrowseCatalog } from '@/lib/catalog';
import { applyMetadata, pageMetadata } from '@/lib/site-metadata';
export function PageMetadata({ catalog }: { catalog: BrowseCatalog }) {
  const { pathname } = useLocation();
  useEffect(() => {
    applyMetadata(
      pageMetadata(
        catalog,
        pathname,
        import.meta.env.VITE_SITE_URL || undefined,
      ),
    );
  }, [catalog, pathname]);
  return null;
}
