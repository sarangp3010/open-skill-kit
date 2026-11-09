# Review request: inclusive age range

Static review. `eligible(age)` must return true for ages 18 through 65, inclusive. Assume age has already been validated as an integer. Do not redesign validation.

```js
function eligible(age) {
  return age >= 18 && age <= 65;
}
```
