import { useState, type Ref } from 'react';
import { Input } from '@/components/ui/card';

export function CatalogSearchInput({
  initialValue,
  navigationKey,
  restoreFromUrl,
  inputRef,
  onQueryChange,
}: {
  initialValue: string;
  navigationKey: string;
  restoreFromUrl: boolean;
  inputRef: Ref<HTMLInputElement>;
  onQueryChange: (value: string) => void;
}) {
  const [search, setSearch] = useState({ value: initialValue, navigationKey });
  // Acknowledge each navigation, but restore text only for external navigation.
  // Never reconcile keystrokes against the query of our own delayed URL writes.
  if (search.navigationKey !== navigationKey) {
    setSearch({
      value: restoreFromUrl ? initialValue : search.value,
      navigationKey,
    });
  }
  return (
    <Input
      ref={inputRef}
      id="catalog-search"
      type="search"
      value={search.value}
      onChange={(event) => {
        const next = event.currentTarget.value;
        setSearch((current) => ({ ...current, value: next }));
        onQueryChange(next);
      }}
      className="h-13 bg-card pr-4 pl-12"
      placeholder="Search skills, tasks, or keywords…"
    />
  );
}
