import { test, expect } from 'vitest'
import fs from 'fs'

import * as R from '../../src/exports/Exports.ts'

// Agents: use this to run temporary tests, and any file output to `./out`

const baseOutPath = 'tests/scratchpad/out/'

// ---------------------------------------------------------------------------
// Reported-style identity bug: a pattern object that is *structurally* an
// `inputEnd` token but is NOT the same object reference as R.inputEnd (as would
// happen if the tree were built by a different module instance) must still be
// emitted as the `$` anchor, not wrapped in a character class.
// ---------------------------------------------------------------------------
test('structural classification: foreign-instance anchor is not wrapped in []', () => {
	const foreignInputEnd = { type: 'specialToken', name: 'inputEnd', rawRegExp: '$' } as any
	const pattern = R.anyOf(R.newLine, foreignInputEnd)

	const re = R.buildRegExp(pattern as any)
	fs.writeFileSync(baseOutPath + 'cross-instance', re.source)

	// Must be the anchor `$`, NOT the character class `[$]`.
	expect(re.source).toBe('(?:\\r?\\n|$)')
	expect(re.source).not.toContain('[$]')

	// Behavioral proof: a literal `$` in the middle of the string must NOT be
	// treated as a matched character. With the broken `[$]` class, `exec` would
	// return the literal '$'; with the anchor it returns the empty end-of-input.
	const m = re.exec('a$b')
	expect(m ? m[0] : null).toBe('')
})

// ---------------------------------------------------------------------------
// #2: a literal `-` passed to notAnyOfChars must be escaped, otherwise it is
// interpreted as a range operator (`[^a-b]` would allow `-`).
// ---------------------------------------------------------------------------
test('literal dash in notAnyOfChars is escaped', () => {
	const re = R.buildRegExp(R.notAnyOfChars('a', '-', 'b'))
	fs.writeFileSync(baseOutPath + 'negated-dash', re.source)

	expect(re.source).toBe('[^a\\-b]')
	expect(re.test('-')).toBe(false)
	expect(re.test('a')).toBe(false)
	expect(re.test('b')).toBe(false)
	expect(re.test('c')).toBe(true)
})

// ---------------------------------------------------------------------------
// #3: numeric `sameAs` resolution inside `isPatternOptional` must be 1-based and
// pre-order. Previously it threw on a reference to the very first group.
// NOTE: `possibly`/`zeroOrMore` short-circuit, so we use top-level optional
// captures to ensure every referenced group is actually registered.
// ---------------------------------------------------------------------------
test('isPatternOptional resolves numeric sameAs (group 1) without throwing', () => {
	const pattern = [R.capture(R.possibly('x')), R.sameAs(1)] as any

	expect(() => R.isPatternOptional(pattern)).not.toThrow()
	expect(R.isPatternOptional(pattern)).toBe(true)
})

test('isPatternOptional resolves nested numeric sameAs (group 2) without throwing', () => {
	const group2 = R.capture(R.possibly('y')) // group 2
	const group1 = R.capture(R.possibly('x')) // group 1
	const pattern = [group1, group2, R.sameAs(2)] as any

	expect(() => R.isPatternOptional(pattern)).not.toThrow()
	expect(R.isPatternOptional(pattern)).toBe(true)
})

// ---------------------------------------------------------------------------
// #4: `anyOf` is optional iff ANY member is optional (a disjunction matches the
// empty string if at least one alternative can). The implementation used
// `every` semantics, so it wrongly returned false here.
// ---------------------------------------------------------------------------
test('isPatternOptional: anyOf is optional if any member is optional', () => {
	const pattern = R.anyOf('x', R.possibly('y'))

	// Sanity check via the actually generated regex: `(?:x|y?)` DOES match "".
	expect(R.buildRegExp(pattern).test('')).toBe(true)
	expect(R.isPatternOptional(pattern)).toBe(true)
})

// ---------------------------------------------------------------------------
// #5: `repeated({min:0,...})` always matches the empty string (zero occurrences),
// so it is optional regardless of its content. The implementation ignored the
// min count and just deferred to its content.
// ---------------------------------------------------------------------------
test('isPatternOptional: repeated with min count 0 is optional', () => {
	const pattern = R.repeated([0, 3], 'x')

	// Sanity check via the actually generated regex: `x{0,3}` DOES match "".
	expect(R.buildRegExp(pattern).test('')).toBe(true)
	expect(R.isPatternOptional(pattern)).toBe(true)
})

// ---------------------------------------------------------------------------
// #6 (encoder): `anyOf` must NOT drop an alternative that matches the empty
// string. `anyOf('a', possibly(''))` means "a OR nothing", so the generated
// regex must match "". The implementation filtered out the empty alternative,
// producing `(?:[a])` which does NOT match "".
// ---------------------------------------------------------------------------
test('encoder: anyOf with optional-empty member matches empty', () => {
	const pattern = R.anyOf('a', R.possibly(''))
	const re = R.buildRegExp(pattern)
	fs.writeFileSync(baseOutPath + 'anyof-optional-empty', re.source)

	expect(re.source).not.toBe('(?:[a])')
	expect(re.test('')).toBe(true)
})

// ---------------------------------------------------------------------------
// #6b (encoder): an explicit empty-string alternative must also be preserved.
// `anyOf('a', '')` means "a OR nothing".
// ---------------------------------------------------------------------------
test('encoder: anyOf with empty-string member matches empty', () => {
	const pattern = R.anyOf('a', '')
	const re = R.buildRegExp(pattern)
	fs.writeFileSync(baseOutPath + 'anyof-empty-string', re.source)

	expect(re.source).not.toBe('(?:[a])')
	expect(re.test('')).toBe(true)
})

// ---------------------------------------------------------------------------
// #7 (utility): `isPatternOptional` treats the empty string `''` as a pattern
// that cannot match the empty string. But `''` *is* the empty regex and DOES
// match "". So `isPatternOptional('')` must be true.
// ---------------------------------------------------------------------------
test('isPatternOptional: empty string pattern is optional', () => {
	expect(R.buildRegExp('').test('')).toBe(true)
	expect(R.isPatternOptional('')).toBe(true)
})

// ---------------------------------------------------------------------------
// #7b (utility): with #7 fixed, a disjunction containing an empty alternative
// must be reported optional.
// ---------------------------------------------------------------------------
test('isPatternOptional: anyOf with empty member is optional', () => {
	expect(R.isPatternOptional(R.anyOf('a', ''))).toBe(true)
})

// ---------------------------------------------------------------------------
// Controls: make sure the fixes don't over-correct.
// ---------------------------------------------------------------------------
test('control: anyOf("a","b") does NOT match empty', () => {
	expect(R.buildRegExp(R.anyOf('a', 'b')).test('')).toBe(false)
})

test('control: isPatternOptional(anyOf("a","b")) is false', () => {
	expect(R.isPatternOptional(R.anyOf('a', 'b'))).toBe(false)
})

// ---------------------------------------------------------------------------
// Special-token / anchor optionality: `isPatternOptional` must agree with
// `buildRegExp(P).test('')` for every leaf token. Empirically the tokens that
// match the empty string are `^` (inputStart), `$` (inputEnd) and `\b`
// (wordBoundary). `\B` (nonWordBoundary) is also zero-width but does NOT match
// "". Everything else requires at least one character.
// ---------------------------------------------------------------------------
const specialTokenCases: [string, any][] = [
	['inputStart', R.inputStart],
	['inputEnd', R.inputEnd],
	['anyChar', R.anyChar],
	['whitespace', R.whitespace],
	['nonWhitespace', R.nonWhitespace],
	['digit', R.digit],
	['nonDigit', R.nonDigit],
	['wordBoundary', R.wordBoundary],
	['nonWordBoundary', R.nonWordBoundary],
	['formFeed', R.formFeed],
	['lineFeed', R.lineFeed],
	['carriageReturn', R.carriageReturn],
	['tab', R.tab],
	['verticalTab', R.verticalTab],
	['unicodeProperty', R.unicodeProperty('Letter')],
	['notUnicodeProperty', R.notUnicodeProperty('Letter')],
]

for (const [name, token] of specialTokenCases) {
	test(`isPatternOptional agrees with .test('') for special token: ${name}`, () => {
		const matchesEmpty = R.buildRegExp(token).test('')
		expect(R.isPatternOptional(token)).toBe(matchesEmpty)
	})
}

test('isPatternOptional: inputStart (^) is optional', () => {
	expect(R.isPatternOptional(R.inputStart)).toBe(true)
	expect(R.buildRegExp(R.inputStart).test('')).toBe(true)
})

test('isPatternOptional: inputEnd ($) is optional', () => {
	expect(R.isPatternOptional(R.inputEnd)).toBe(true)
	expect(R.buildRegExp(R.inputEnd).test('')).toBe(true)
})

test('isPatternOptional: wordBoundary (\\b) is NOT optional', () => {
	expect(R.isPatternOptional(R.wordBoundary)).toBe(false)
	expect(R.buildRegExp(R.wordBoundary).test('')).toBe(false)
})

test('isPatternOptional: nonWordBoundary (\\B) IS optional', () => {
	expect(R.isPatternOptional(R.nonWordBoundary)).toBe(true)
	expect(R.buildRegExp(R.nonWordBoundary).test('')).toBe(true)
})

test('isPatternOptional: anyOf("a", inputStart) is now consistent (optional)', () => {
	// The generated regex `(?:a|^)` matches "", so isPatternOptional must too.
	expect(R.buildRegExp(R.anyOf('a', R.inputStart)).test('')).toBe(true)
	expect(R.isPatternOptional(R.anyOf('a', R.inputStart))).toBe(true)
})

test('isPatternOptional: notAnyOfChars never matches empty', () => {
	expect(R.isPatternOptional(R.notAnyOfChars('a'))).toBe(false)
	expect(R.buildRegExp(R.notAnyOfChars('a')).test('')).toBe(false)
})

