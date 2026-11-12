import { useOutletContext } from 'react-router-dom';
import type { CatalogIndex } from './catalog';
export function useLibrary() {
  return useOutletContext<CatalogIndex>();
}
