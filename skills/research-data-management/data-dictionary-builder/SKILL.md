---
name: data-dictionary-builder
description: Build a research data dictionary from supplied tables and study notes; use when researchers need explicit variable definitions, units, missingness and provenance.
---

# Research Data Dictionary Builder

> Draft: original instructions with fictional examples. Independent domain review and real agent execution are pending.

## When to use

Build a research data dictionary from supplied tables and study notes; use when researchers need explicit variable definitions, units, missingness and provenance. Keep the task limited to the supplied records and the requester’s intended decision.

## Inputs

Column names and deidentified sample rows; study protocol excerpts; units, coding and missing-value conventions; collection version; sharing/consent restrictions.

## Workflow

1. Identify dataset version, unit of observation and row identifiers from supplied documentation. Do not assume one row is one participant when repeated measurements or joins may exist.

2. Inventory each column with observed storage type and proposed semantic role. Distinguish a type observed in sample values from a definition confirmed by the protocol.

3. Add units, allowed codes and missing-value meaning only where supplied. Separate zero, blank, not collected and special codes; unresolved conventions must remain unknown.

4. Document joins, derived variables and transformations with source/version references. Do not invent a derivation formula or silently normalize a raw measurement.

5. Flag direct/quasi-identifiers and unusual combinations for the responsible privacy reviewer. Deidentified examples do not establish that a full dataset is anonymous or shareable.

6. Return a dictionary and validation questions, with confirmed versus inferred fields marked separately. Do not alter the dataset or approve sharing; request researcher sign-off on unresolved semantics.

## Output

- Dataset/row-unit context.
- variable table (name, type, meaning, unit, codes, missingness, source, confidence).
- relationships/derivations.
- privacy flags.
- unresolved questions.

## Boundaries

Not scientific validation, ethics approval, anonymization certification or permission to release participant data. Do not infer clinical meaning from variable names. Use only authorized, deidentified sample data in shared working documents.

## Examples

- [Routine case input](examples/input-1.md) and [illustrative output](examples/output-1.md).
- [Missing or conflicting evidence input](examples/input-2.md) and [illustrative output](examples/output-2.md).

The examples are authored illustrations, not captured assistant outputs. The package’s [behavior cases](tests/cases.json) define review expectations; they do not record completed agent tests. Offline replay definitions live outside the portable package in the repository evaluation framework.
