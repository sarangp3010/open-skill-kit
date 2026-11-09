# Expected SQL review

Result grain: one row per customer. Each qualifying order contributes its total once; customers with none must still appear.

Two correctness findings:

- Line 4 can multiply one order by its payment count. Order 101 has two settled payments, so its total contributes twice.
- Line 5 removes rows whose payment status is NULL, dropping customer 2 despite the required zero-qualifying-order result.

Use an existence condition within the order join rather than joining all payment rows:

```sql
SELECT c.id, COALESCE(SUM(o.total), 0) AS settled_order_total
FROM customers c
LEFT JOIN orders o
  ON o.customer_id = c.id
  AND EXISTS (
    SELECT 1
    FROM payments p
    WHERE p.order_id = o.id AND p.status = 'settled'
  )
GROUP BY c.id
ORDER BY c.id;
```

Manually derived results for the fictional fixture, not executed database output:

```json
{
  "originalRows": [{ "id": 1, "settled_order_total": 200 }],
  "correctRows": [
    { "id": 1, "settled_order_total": 100 },
    { "id": 2, "settled_order_total": 0 }
  ]
}
```

Order 102 is excluded because its only payment is pending. Proposed regressions cover two settled payments, no payment, no orders and equal-valued distinct orders. SUM(DISTINCT o.total) would incorrectly collapse equal-valued legitimate orders; it is not the fix. No query, plan or speed measurement was executed.
