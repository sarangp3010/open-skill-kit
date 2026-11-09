# PostgreSQL static review: bounded tenant ticket list

Schema: `tickets(id integer primary key, tenant_id integer not null, created_at timestamptz not null)`.

Contract: the server binds the authenticated tenant ID to $1, uses UTC start/end parameters for a half-open window, and validates $4 as an integer from 1 to 100. Return a stable timestamp/id ordering. No plan, row counts or index definitions are supplied. Do not run queries or add indexes.

```sql
SELECT id, created_at
FROM tickets
WHERE tenant_id = $1
  AND created_at >= $2
  AND created_at < $3
ORDER BY created_at, id
LIMIT $4;
```
