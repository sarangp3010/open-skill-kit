import { useOutletContext } from 'react-router-dom';
import type { DiscoveryCatalog } from './catalog';
export function useLibrary() {
  return useOutletContext<DiscoveryCatalog>();
}
