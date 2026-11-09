# Review request: optional discount

Review only `pricing.js`. The API contract says omitted discount means zero; quantities are positive integers. Static review only.

```js
export function total(unitPrice, quantity, discount) {
  return unitPrice * quantity * (1 - discount);
}
```

The three-line snippet starts at line 1. Callers may call `total(10, 2)`.
