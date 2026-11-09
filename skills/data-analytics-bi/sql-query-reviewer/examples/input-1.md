# PostgreSQL review: settled orders

Return every customer, including customers with zero qualifying orders. Sum an order's total once if it has at least one settled payment. `orders.total` is numeric and not null. The primary keys are customers.id and orders.id. orders.customer_id references customers.id, and payments.order_id references orders.id. Payments can have multiple rows per order. Review statically; do not connect to a database.

```sql
SELECT c.id, SUM(o.total) AS settled_order_total
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.id
LEFT JOIN payments p ON p.order_id = o.id
WHERE p.status = 'settled'
GROUP BY c.id
ORDER BY c.id;
```

Fictional fixture:

```json
{
  "customers": [{ "id": 1 }, { "id": 2 }],
  "orders": [
    { "id": 101, "customer_id": 1, "total": 100 },
    { "id": 102, "customer_id": 1, "total": 50 }
  ],
  "payments": [
    { "id": 301, "order_id": 101, "status": "settled" },
    { "id": 302, "order_id": 101, "status": "settled" },
    { "id": 303, "order_id": 102, "status": "pending" }
  ]
}
```
