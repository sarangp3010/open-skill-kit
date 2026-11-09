# Example 1: output

Baseline: one web service and a relational database. Use a transaction and a uniqueness constraint to prevent overlapping reservations for a resource/time slot. A separate queue and cache are not justified by 100 bookings/day. Unknowns: booking overlap rules, identity provider and recovery objective.
