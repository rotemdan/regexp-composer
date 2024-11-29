# Regular expression composer

An easy-to-use TypeScript / JavaScript regular expression builder library designed to simplify the writing of regular expressions, in a composable, function-oriented style that's significantly more readable and less error-prone than standard regular expression syntax.

* Produces standard JavaScript regular expressions
* Supports all regular expression patterns accepted by the JavaScript engine
* Supports all JavaScript runtimes (browsers, Node.js, Deno, Bun)
* Designed as Unicode aware, from the ground up. Unicode mode enabled and required
* Patterns are created using functions and can be composed and embedded on multiple regular expressions
* Automatically escapes special characters
* Automatically wraps complex patterns with non-capturing groups (`(?:pattern)`)
* Accepts codepoints as integers, in addition to hexadecimal strings (converts as needed)
* Unifies disjunctions (like `hello|world`) and character class patterns (like `[Va-zX]`) to a single `anyOf` pattern, where they can be freely mixed
* Special tokens are expressed as safer constants like `inputStart` (`^`), `inputEnd` (`$`), `anyChar` (`*`) and `lineFeed` (`\n`)
* Ensures character and codepoint ranges are valid. Will error on `charRange('z', 'a')` or `codepointRange('a4', 'a1')`
* Fast and lightweight
* Full TypeScript type checking
* No dependencies

## Basic usage

Install package:
```sh
npm install regexp-composer
```

Build and use a simple regular expression
```ts
import { buildRegExp, possibly, inputStart } from 'regexp-composer'

// Build regExp object
const regExp = buildRegExp([inputStart, 'Hello world.', possibly(' How are you?')])

// Use it
regExp.test('Hello world.') // returns true
regExp.test('Hello world!') // returns false
regExp.test(' Hello world.') // returns false
regExp.test('Hello world. How are you?') // returns true
```

You can also encode a pattern to a RegExp source string, without compiling it to a RegExp object, using `encodePattern`:

```ts
import { encodePattern, possibly, inputStart } from 'regexp-composer'

// Build regexp
const regExpSource = encodePattern([inputStart, 'Hello world.', possibly(' How are you?')])

console.log(regExpSource) // Prints '^Hello world\.(?: How are you\?)?'
```

## Example patterns

Match the string `'Hello world.'`:

```ts
'Hello world.'
```
(note characters like `.` within strings are always taken as literals and will be automatically escaped if needed)

Encodes to:
```
Hello world\.
```

Match the string `'Hello world.'`, optionally followed by `' How are you?'`:
```ts
['Hello world.', possibly(' How are you?')]
```

Encodes to:
```
Hello world\.(?: How are you\?)?
```
(note `(?: )` is a non-capturing group inserted to wrap the optional pattern)

Match a sequence of one or more English characters or digits:

```ts
oneOrMore(anyOf(charRange('a', 'z'), charRange('A', 'Z'), charRange('0', '9')))
```

Encodes to:
```
[a-zA-Z0-9]+
```

Match a phone number, like `+23 (555) 432-1234`:

```ts
// The `digit` pattern is reused several times in `phoneNumberPattern`:
const digit = charRange('0', '9')

const phoneNumberPattern = [
	possibly(['+', captureAs('countryCode', repeated([1, 3], digit)), oneOrMore(' ')]),
	possibly(['(', captureAs('areaCode', repeated(3, digit)), ')', oneOrMore(' ')]),
	captureAs('localNumber', [
		repeated(3, digit),
		possibly(anyOf('-', ' ')),
		repeated(4, digit),
	])
]
```

Encodes to:
```
(?:\+(?<countryCode>(?:[0-9]){1,3}) +)?(?:\((?<areaCode>(?:[0-9]){3})\) +)?(?<localNumber>(?:[0-9]){3}(?:(?:[- ]))?(?:[0-9]){4})
```

# Pattern reference

## String and character literals

String and character literals are represented as simple strings, like:

```
'Hello'
'Cześć'
'こんにちは'
'X'
'嗨'
```

## Sequence of patterns

A sequence of patterns is written as an array:

```ts
[pattern1, pattern2, pattern3, ...]
```

## Optional

### `possibly(pattern)`

Accept if given pattern is matched, or skip if not.

Encodes to `pattern?` or `(?:pattern)?`.

## Choice

###  `anyOf(patterns)`

Accepts the **first pattern** that is matched in the pattern list, or fails if no pattern match.

Patterns can be both single character (like `'x'` or `charRange('a', 'z')` or multi-character, (like `oneOrMore('Hello')`).

Encodes to `(?:pattern1|pattern2|pattern3|...)`.

For efficiency, consecutive single-character patterns are grouped when encoded. For example:

```ts
anyOf('V', 'B', 'hello', oneOrMore('bye'), 'good', charRange('a', 'z'), lineFeed, 'world')
```
Encodes to:
```
(?:[vb]|hello|(?:bye)+|good|[a-z\n]|world)
```

### `notAnyOfChars(singleCharPatterns)`

Accepts any character except characters that match the given list of **single character patterns**.

Encodes to `[^singleCharPatterns]`.

For example:
```ts
notAnyOfChars('V', 'B', charRange('a', 'z'), lineFeed, codepointRange(5234, 5312), unicodeProperty('Punctuation'))
```

Encodes to `[^VBa-z\n\u{1472}-\u{14c0}\p{Punctuation}]`.

#### Negating a choice of multi-character patterns

`notAnyOfChars` only works on single character patterns. Negating a set of multi-character patterns, like `NOT('cat', 'dog', 'elephant')`, requires knowing the length, or additional criterions, for a successful positive match (otherwise, how would the RegExp engine know what to match?).

To achieve this, you can use a form of conditional matching, like `matches(pattern, { except: excludedPattern })`, described in a later section:

```ts
matches(oneOrMore(unicodeProperty('Letter')), { except: anyOf('cat', 'dog', 'elephant') })
```

This provides enough information for the RegExp engine to know which patterns to accept, and which to exclude.

## Repetition

### `zeroOrMore(pattern)`

Accepts the given pattern, repeated zero or more times.

Encodes to `pattern*` or `(?:pattern)*`.

### `zeroOrMoreNonGreedy(pattern)`

Accepts the given pattern, repeated zero or more times. Non-greedy.

Encodes to `pattern*?` or `(?:pattern)*?`.

### `oneOrMore(pattern)`

Accepts the given pattern, repeated one or more times.

Encodes to `pattern+` or `(?:pattern)+`.

### `oneOrMoreNonGreedy(pattern)`

Accepts the given pattern, repeated one or more times. Non-greedy.

Encodes to `pattern+?` or `(?:pattern)+?`.

### `repeated(count, pattern)`

Accepts the given pattern, only if repeated exactly `count` times.

Encodes to `(?:pattern){count}`.

### `repeated([min, max?], pattern)`

Accepts the given pattern, repeated between `min` and `max` times.

When `max` is not given, it default to `Infinity`.

Encodes to `(?:pattern){min,max}`, or `(?:pattern){min,}` when `max` is not given or set to `Infinity`.

### `repeatedNonGreedy([min, max?], pattern)`

Accepts the given pattern, repeated between `min` and `max` times. Non-greedy.

When `max` is not given, it default to `Infinity`.

Encodes to `(?:pattern){min,max}?`, or `(?:pattern){min,}?` when `max` is not given or set to `Infinity`.

## Single character patterns

### `codepoint(hexCode)`

Accepts a single character with the given Unicode codepoint, provided as a hexadecimal string.

Encodes to `\u{hexCode}`.

### `codepoint(integerCode)`

Accepts a single character with the given Unicode codepoint, provided as an integer.

`integerCode` is converted to a Hex-valued string when encoded.

Encodes to `\u{hexCode}`.

### `charRange(startChar, endChar)`

Accepts a single character within the given character range.

Encodes to `[startChar-endChar]`.

### `codepointRange(startHexCode, endHexCode)`

Accepts a single character within the given Unicode codepoint range.

`startHexCode` and `endHexCode` should be provided as hexadecimal strings.

Encodes to `[\u{startHexCode}-\u{endHexCode}]`.

### `codepointRange(startIntegerCode, endIntegerCode)`

Accepts any character within given Unicode codepoint range.

`startIntegerCode` and `endIntegerCode` are converted to a hexadecimal valued strings when encoded.

Encodes to `[\u{startHexCode}-\u{endHexCode}]`.

### `unicodeProperty(propertyName)`

Accepts a character matching the given Unicode property name.

Encodes to `\p{propertyName}`.

### `unicodeProperty(propertyName, value)`

Accepts a character matching the given Unicode property name and value.

Encodes to `\p{propertyName=value}`.

### `notUnicodeProperty(property)`

Accepts any character that doesn't match the given Unicode property.

Encodes to `\P{property}]`.

### `notUnicodeProperty(property, value)`

Accepts any character that doesn't match the given Unicode property and value.

Encodes to `\P{property=value}`.

## Grouping

### `capture(pattern)`

Captures an unnamed group.

Encodes to `(pattern)`

### `captureAs(name, pattern)`

Captures a named group.

Encodes to `(?<name>pattern)`.

## Backreferences

### `sameAs(groupIndex)`

Matches a pattern to a previous unnamed capturing group.

`groupIndex` must be an integer between `1` and `99`.

Encodes to `(?:\groupIndex)`.

### `sameAs(groupName)`

Matches a pattern to a previous named capturing group.

`groupName` must be a string.

Encodes to `\k<groupName>`

## Conditional matching

These patterns provide a simplified approach to express various lookahead and lookbehind patterns.

### `matches(pattern, { ifFollowedBy: followingPattern })`

Matches a pattern, with the condition that it is followed by a second pattern.

Encodes to `pattern(?=followingPattern)`.

(positive lookahead positioned after the pattern)

### `matches(pattern, { ifNotFollowedBy: followingPattern })`

Matches a pattern, with the condition that it is not followed by a second pattern.

Encodes to `pattern(?!followingPattern)`.

(negative lookahead positioned after the pattern).

### `matches(pattern, { ifPrecededBy: precedingPattern })`

Matches a pattern, with the condition that it is preceded by a second pattern.

Encodes to `(?<=precedingPattern)pattern`.

(positive lookbehind positioned before the pattern).

### `matches(pattern, { ifNotPrecededBy: precedingPattern })`

Matches a pattern, with the condition that it is not preceded by a second pattern.

Encodes to `(?<!precedingPattern)pattern`.

(negative lookbehind positioned before the pattern).

### `matches(pattern, { ifExtendsTo: extendedPattern })`

Matches a pattern, with the condition that it extends to a second pattern.

Encodes to `(?=followingPattern)pattern`.

(positive lookahead positioned before the pattern).

### `matches(pattern, { except: excludedPattern })`

Matches a pattern, with the condition that it doesn't extend to a second pattern (effectively excluding it).

Encodes to `(?!excludedPattern)pattern`.

(negative lookahead positioned before the pattern).

#### Example:

```ts
matches(
	oneOrMore(unicodeProperty('Letter')), {
	except: anyOf('V', 'hello', charRange('a', 'z'))
})
```
matches any sequence of letters of length 1 or more, with the exception of the single uppercase letter `V`, the string `hello`, or a single lowercase letter between `a` and `z`.


### `matches(pattern, { ifExtendsBackTo: backwardExtendedPattern })`

Matches a pattern, with the condition that it extends backward to a second pattern.

Encodes to `pattern(?<=precedingPattern)`.

(positive lookbehind positioned after the pattern).

### `matches(pattern, { ifNotExtendsBackTo: backwardExtendedPattern })`

Matches a pattern, with the condition that it doesn't extend backward to a second pattern.

Encodes to `pattern(?<!precedingPattern)`.

(negative lookbehind positioned after the pattern).

### Combining multiple conditions

Conditions can be combined. For example:

```ts
matches(
	oneOrMore(unicodeProperty('Letter')), {
	except: anyOf('Cat', 'Dog'),
	ifNotPrecededBy: charRange('0', '9'),
	ifNotFollowedBy: anyOf('?', '!')
})
```

Means that any sequence of Unicode letters would be matched, given **all** of these conditions are met:
* It is not 'Cat' or 'Dog'
* It is not preceded by a digit
* It is not followed by a question mark or exclamation mark

### Including multiple conditions of the same kind

Although not likely to be frequently used, the RegExp engine does allow to define multiple lookahead or lookbehind patterns, producing a form of intersection (conjunction) between the conditions. You can achieve that by passing an array of condition objects as the second argument to `matches`:

```ts
matches(
	oneOrMore(unicodeProperty('Letter')),
	[
		{ ifPrecededBy: unicodeProperty('Letter') },
		{ ifPrecededBy: unicodeProperty('Script_Extensions', 'Gothic') }
		{ ifFollowedBy: unicodeProperty('Letter') },
		{ ifFollowedBy: unicodeProperty('Script_Extensions', 'Greek') },
	]
)
```

## Special token patterns

* `inputStart`: `^`
* `inputEnd`: `$`
* `anyChar`: `.`
* `whitespace`: `\s`
* `nonWhitespace`: `\S`
* `digit`: `\d`
* `nonDigit`: `\D`
* `wordBoundary`: `\b`
* `nonWordBoundary`: `\B`
* `formFeed`: `\f`
* `carriageReturn`: `\r`
* `lineFeed`: `\n`
* `tab`: `\t`
* `verticalTab`: `\v`


#### Word character tokens

The word character tokens `\w` and `\W` are not directly supported because they are not consistently Unicode-aware (they are only Unicode aware when the `ignoreCase` flag is enabled).

To get consistent results, you can use:

* `anyOf(charRange('a', 'z'), charRange('A', 'Z'), charRange('0', '9'))` for English word characters
* `anyOf(unicodeProperty('Letter'), unicodeProperty('Mark'), unicodeProperty('Number'))` for Unicode (multilingual) word characters

## Options for `buildRegExp`

**Customizable flags**:
* `global`: enables the [`g` flag](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/global) when constructing the RegExp
* `hasIndices`: enables the [`d` flag](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/hasIndices) when constructing the RegExp
* `ignoreCase`: enables the [`i` flag](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/ignoreCase) when constructing the RegExp
* `sticky`: enables the [`y` flag](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/sticky) when constructing the RegExp

**Non-customizable flags**:
* `multiline`: the [`m` flag](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/multiline), enabling matching of `inputStart` (`^`) tokens to line start, is **always disabled** in the builder, to ensure clear and consistent semantics for `inputStart`
* `dotAll`: the [`s` flag](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/dotAll), causing the `anyChar` (`*`) token to match all tokens, including newlines, is **always enabled** in the builder, to ensure clear and consistent semantics for `anyChar`
* `unicode`: the [`u` flag](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/unicode), enabling Unicode support, is **always enabled** in the builder, as it is required by the patterns `codepoint`, `codepointRange`, `unicodeProperty` and `notUnicodeProperty`
* `unicodeSets`: the [`v` flag](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/unicodeSets), enabling Unicode set support, like `\p{Script_Extensions=Greek}&&\p{Letter}`, is currently **always disabled** (it cannot be enabled at the same time when `u` is enabled), but is likely to become used in the future

If you still want to override the non-customizable flags (risking unexpected errors and confusing behavior) you can encode the pattern to a RegExp source string using `encodePattern`, and compile the resulting string using the `RegExp` constructor, with any set of flags, like `new RegExp(encodePattern(...), flags)`.

## Future

* [Unicode sets](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/unicodeSets), using the `v` flag, would enable things like intersections of Unicode properties, like `unicodeProperties('Letter', ['Script_Extensions', 'Greek'])`
* [Case sensitivity assertion](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Regular_expressions/Modifier), could allow to selectively describe patterns that are interpreted in a case-sensitive or case-insensitive way. For example `[caseInsensitive('Hello'), ' world']` would match "Hello world", "HELLO world", "hello world", "hEllO world", etc.

## License

MIT
