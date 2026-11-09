# Failure report: missing row

Expected `findRow(rows, "b")` to find the second row. Actual report: it returns null. Static analysis only.

```js
function findRow(rows, id) {
  for (let i = 0; i < rows.length - 1; i++) {
    if (rows[i].id === id) return rows[i];
  }
  return null;
}
```

Data: `[ { "id": "a" }, { "id": "b" } ]`. Looking up a succeeds. No executed trace is supplied.
