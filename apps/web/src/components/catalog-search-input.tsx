import { useLayoutEffect, useState, type RefObject } from 'react';
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
  inputRef: RefObject<HTMLInputElement | null>;
  onQueryChange: (value: string) => void;
}) {
  const [value, setValue] = useState(initialValue);
  // Keystrokes stay local and urgent. Only committed external navigation
  // restores controlled state; router render retries cannot reset the input.
  useLayoutEffect(() => {
    if (restoreFromUrl) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Synchronize committed external navigation, never our own typing replacements.
      setValue(initialValue);
    }
  }, [initialValue, navigationKey, restoreFromUrl, inputRef]);
  useLayoutEffect(() => {
    // POP can cancel every pending router render and return to the same rendered
    // location. Observe the event itself even when URL props have not changed.
    const restore = () =>
      setValue(new URLSearchParams(window.location.search).get('q') ?? '');
    window.addEventListener('popstate', restore);
    return () => window.removeEventListener('popstate', restore);
  }, []);
  return (
    <Input
      ref={inputRef}
      id="catalog-search"
      type="search"
      value={value}
      onChange={(event) => {
        const next = event.currentTarget.value;
        setValue(next);
        onQueryChange(next);
      }}
      className="h-13 bg-card pr-4 pl-12"
      placeholder="Search skills, tasks, or keywords…"
    />
  );
}
