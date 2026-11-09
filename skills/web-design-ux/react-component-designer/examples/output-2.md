# Expected component proposal

Use a button for the toggle and the hidden attribute for the controlled panel. The parent owns open state and supplies a stable unique panelId. A dialog/focus trap is unnecessary for inline disclosure.

```tsx
import type { ReactNode } from 'react';

type FAQProps = {
  title: string;
  panelId: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
};

export function FAQ({ title, panelId, open, onToggle, children }: FAQProps) {
  return (
    <section>
      <h3>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={onToggle}
        >
          {title}
        </button>
      </h3>
      <div id={panelId} hidden={!open}>
        {children}
      </div>
    </section>
  );
}
```

Choose a heading level appropriate to the consuming page; h3 here is an integration assumption. Proposed checks: Enter/Space toggles via the button, aria-expanded reflects the parent value, and collapsed content is hidden. These are not executed browser or screen-reader results. No persistence or network behavior was added.
