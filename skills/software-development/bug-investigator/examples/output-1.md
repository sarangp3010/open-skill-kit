# Expected investigation

**Observation:** the user reports b is missing while a succeeds. **Contract:** inspect every row and return the matching row or null. No execution was performed.

**Code-supported explanation:** with two rows, `i < rows.length - 1` permits i = 0 but not i = 1. The final row is never inspected. This explains why a succeeds and b falls through to null. A one-row array would also never be inspected.

**Competing hypothesis:** a type mismatch in id could also cause a miss in general, but both supplied IDs are matching strings, so it is not needed to explain this example.

**Correction to consider:** iterate while `i < rows.length`; keep the existing return behavior.

**Proposed checks, not run:** empty rows → null; one row with a → a; two rows with b → b; absent c → null. These isolate loop coverage from matching semantics. The explanation is supported by static code, not a claimed reproduced runtime result.
