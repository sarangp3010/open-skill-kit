# Expected component proposal

The parent owns request state and data; the component has no duplicated local email state. The parent provides a unique idPrefix for each instance. Browser email validity is not a server validation guarantee.

```tsx
type EmailFormProps = {
  idPrefix: string;
  email: string;
  pending: boolean;
  error?: string;
  onEmailChange: (value: string) => void;
  onSubmit: () => void;
};

export function EmailForm({
  idPrefix,
  email,
  pending,
  error,
  onEmailChange,
  onSubmit,
}: EmailFormProps) {
  const emailId = `${idPrefix}-email`;
  const errorId = `${idPrefix}-error`;
  return (
    <form
      aria-busy={pending}
      onSubmit={(event) => {
        event.preventDefault();
        if (!pending) onSubmit();
      }}
    >
      <label htmlFor={emailId}>Email</label>
      <input
        id={emailId}
        type="email"
        required
        value={email}
        onChange={(event) => onEmailChange(event.target.value)}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
      />
      {error && (
        <p id={errorId} role="alert">
          {error}
        </p>
      )}
      <button type="submit" disabled={pending}>
        {pending ? 'Sending…' : 'Send'}
      </button>
    </form>
  );
}
```

Proposed checks, not run: label focuses the unique input; editing reports the new value; valid submission invokes the callback once; pending disables the button and guards submit intent; error text is associated with the field. No network request, browser rendering or runtime test is claimed.
