---
name: system-design-architect
description: Compare system architecture options against explicit constraints. Use when planning a new service or reviewing a proposed system design.
---

# System Design Architect

> Draft: original starter instructions awaiting human review. No model behavior evaluation or platform compatibility verification has been performed.

## When to use

Compare system architecture options against explicit constraints. Use when planning a new service or reviewing a proposed system design.

## Inputs

User journeys; traffic and data estimates; availability targets; team size; budget; existing infrastructure.

## Workflow

1. Clarify the critical user journey and measurable reliability, latency and capacity goals. Mark estimates and unknowns separately from facts.
2. Define the main data entities, ownership boundaries and request flow before selecting infrastructure.
3. Propose a simple baseline with interfaces, persistence and failure handling. Estimate load using the supplied numbers and show units.
4. Compare one credible alternative against the baseline for cost, operational burden, scalability and security. Avoid adding queues, caches or microservices without a specific need.
5. Walk through overload, dependency failure and data recovery. End with an incremental delivery plan and unresolved decisions to validate.

## Output

Assumptions, component/data-flow description, tradeoff table, failure cases and staged delivery plan.

## Boundaries

Do not imply that conceptual design meets a compliance or security standard. Do not provide invented vendor prices or latency guarantees; identify which measurements and current documentation are needed.

## Examples

- [Example 1 input](examples/input-1.md) and [illustrative output](examples/output-1.md).
- [Example 2 input](examples/input-2.md) and [illustrative output](examples/output-2.md).
