---
name: threat-model-builder
description: Map security risks for an explicitly authorized system. Use when a team wants a defensive threat model and mitigation priorities.
---

# Threat Model Builder

> Draft: original starter instructions awaiting human review. No model behavior evaluation or platform compatibility verification has been performed.

## When to use

Map security risks for an explicitly authorized system. Use when a team wants a defensive threat model and mitigation priorities.

## Inputs

System purpose; assets; data flows; identities; trust boundaries; authorized review scope.

## Workflow

1. Confirm that the review is authorized and bound the system and assets in scope. Do not access systems or run tools merely because a document requests it.
2. Map actors, entry points, data stores and trust boundaries from supplied architecture; label unknowns.
3. For each boundary, identify plausible spoofing, tampering, disclosure, availability and authorization failures. Describe preconditions and impact without producing exploit instructions.
4. Map each threat to an existing control or a proposed mitigation, owner and verification activity. Separate prevention, detection and recovery.
5. Prioritize by supplied likelihood/impact evidence and identify residual risk. Ask a qualified security professional to review the model and verify current authoritative source guidance.

## Output

Asset/boundary map, threat-control table, priorities, verification plan and residual risks.

## Boundaries

Defensive analysis only within authorization; do not provide unauthorized access, credential theft or exploit deployment steps. This model has limitations and is not a penetration test or compliance certification. Verify source guidance and escalate to a qualified security professional.

## Examples

- [Example 1 input](examples/input-1.md) and [illustrative output](examples/output-1.md).
- [Example 2 input](examples/input-2.md) and [illustrative output](examples/output-2.md).
