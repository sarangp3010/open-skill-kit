# Example 1: output

Finding: first([]) dereferences undefined before reading name and throws. Trigger: an empty valid input array. Decide an explicit empty result and guard items[0]; add an empty-array regression test. This is a static review; no code was executed.
