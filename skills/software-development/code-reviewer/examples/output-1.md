# Expected review

## Summary

Static review of the supplied three-line `pricing.js` snippet; no files were accessed and no tests were run.

## Finding

**Medium — omitted discount produces NaN (`pricing.js:2`).** For `total(10, 2)`, discount is undefined. Subtracting it from 1 produces NaN, so the return value violates the documented omitted-discount-as-zero contract. Use an explicit default of zero, preserving the treatment of a supplied zero discount. Confirm how null should be handled before normalizing it as well.

## Proposed tests — not run

- Omitted discount: `total(10, 2)` should equal 20.
- Explicit zero: `total(10, 2, 0)` should equal 20.
- Supplied 0.1: `total(10, 2, 0.1)` should equal 18, with the project's monetary rounding convention considered separately.

Unknown: input validation and currency rounding are outside the supplied contract.
