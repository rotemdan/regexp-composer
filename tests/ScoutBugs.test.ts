import { describe, expect, test } from 'vitest'
import * as R from '../src/exports/Exports.ts'

////////////////////////////////////////////////////////////////////////////////////////////////////
// Builder / Encoder correctness scout
////////////////////////////////////////////////////////////////////////////////////////////////////

describe('Character ranges', () => {
	test('Basic range works', () => {
		const re = R.buildRegExp([R.oneOrMore(R.charRange('a', 'z'))])
		expect(re.source).toBe('[a-z]+')
		expect(re.test('hello')).toBe(true)
		expect(re.test('HELLO')).toBe(false)
	})

	test(`Range starting with '^' must be escaped (it is the negation operator inside a class)`, () => {
		// charRange('^', 'a') is a valid range: codepoints 0x5E..0x61
		const re = R.buildRegExp([R.oneOrMore(R.charRange('^', 'a'))])
		// Must NOT produce [^-a] (a negated class that excludes '^','_','`','a' and allows anything else)
		expect(re.source).not.toContain('[^-')
		expect(re.test('^')).toBe(true)
		expect(re.test('_')).toBe(true)
		expect(re.test('`')).toBe(true)
		expect(re.test('a')).toBe(true)
		expect(re.test('b')).toBe(false)
		expect(re.test(']')).toBe(false)
	})

	test(`Range starting with ']' must be escaped (closes the class)`, () => {
		// ']' is 0x5D, so [']'-a] range 0x5D..0x61
		const re = R.buildRegExp([R.charRange(']', 'a')])
		expect(re.test(']')).toBe(true)
		expect(re.test('^')).toBe(true)
		expect(re.test('_')).toBe(true)
		expect(re.test('`')).toBe(true)
		expect(re.test('a')).toBe(true)
		expect(re.test('b')).toBe(false)
	})

	test(`Range ending with '\\' must be escaped`, () => {
		// '\' is 0x5C, after '9' (0x39)
		const re = R.buildRegExp([R.charRange('9', '\\')])
		expect(re.test(':')).toBe(true)
		expect(re.test('\\')).toBe(true)
		expect(re.test('9')).toBe(true)
		expect(re.test('8')).toBe(false)
	})

	test('Invalid range (start > end) is rejected', () => {
		expect(() => R.buildRegExp([R.charRange('z', 'a')])).toThrow()
	})

	test('Multi-codepoint strings rejected', () => {
		expect(() => R.charRange('ab', 'z')).toThrow()
		expect(() => R.charRange('a', 'zz')).toThrow()
	})
})

describe('Numeric backreferences (sameAs with index)', () => {
	test(`A numeric backreference followed by a literal digit must not be parsed as a multi-digit backreference`, () => {
		// Naive encoding yields "(a)\12" which the engine treats as backref \12.
		const re = R.buildRegExp([R.capture('a'), R.sameAs(1), '2'])
		expect(re.test('aa2')).toBe(true)
		expect(re.test('ab2')).toBe(false)
	})

	test('Numeric backreference alone works', () => {
		const re = R.buildRegExp([R.capture(R.charRange('a', 'c')), R.sameAs(1)])
		expect(re.test('bb')).toBe(true)
		expect(re.test('bc')).toBe(false)
	})

	test(`Referencing an undefined capture group (forward reference) does not throw`, () => {
		// JS resolves numeric backreferences at runtime; a forward reference
		// matches the empty string rather than erroring. Document current behavior.
		const re = R.buildRegExp([R.sameAs(1), R.capture('a')])
		expect(re.test('a')).toBe(true)
	})
})

describe('Quantifiers', () => {
	test('repeated exact count', () => {
		const re = R.buildRegExp([R.repeated(3, R.digit)])
		expect(re.source).toBe('(?:\\d){3}')
		expect(re.test('123')).toBe(true)
		expect(re.test('1234')).toBe(true)
		expect(re.test('12')).toBe(false)
	})

	test('repeated range', () => {
		const re = R.buildRegExp([R.inputStart, R.repeated([2, 4], 'a'), R.inputEnd])
		expect(re.test('a')).toBe(false)
		expect(re.test('aa')).toBe(true)
		expect(re.test('aaa')).toBe(true)
		expect(re.test('aaaa')).toBe(true)
		expect(re.test('aaaaa')).toBe(false)
	})

	test('repeated open-ended range', () => {
		const re = R.buildRegExp([R.inputStart, R.repeated([2], 'a'), R.inputEnd])
		expect(re.test('a')).toBe(false)
		expect(re.test('aa')).toBe(true)
		expect(re.test('aaaa')).toBe(true)
	})

	test('repeated non-greedy', () => {
		const re = R.buildRegExp([R.oneOrMoreNonGreedy(R.digit), '!'])
		expect('12345!'.match(re)?.[0]).toBe('12345!')
	})

	test('invalid repeat bounds are rejected', () => {
		expect(() => R.repeated(3.7, 'a')).not.toThrow() // truncated
		expect(() => R.repeated([-1, 2], 'a')).toThrow()
		expect(() => R.repeated([5, 2], 'a')).toThrow()
		expect(() => R.repeated(Infinity, 'a')).toThrow()
		expect(() => R.repeated(NaN, 'a')).toThrow()
		expect(() => R.repeatedNonGreedy([5, 2], 'a')).toThrow()
	})

	test('quantifying the empty string is a no-op', () => {
		expect(R.encodePattern(R.zeroOrMore(''))).toBe('')
		expect(R.encodePattern(R.oneOrMore(''))).toBe('')
		expect(R.encodePattern(R.possibly(''))).toBe('')
	})
})

describe('anyOf', () => {
	test('single-character members are merged into a character class', () => {
		expect(R.encodePattern(R.anyOf('a', 'b', 'c'))).toContain('[abc]')
	})

	test('multi-character members become a proper disjunction', () => {
		const re = R.buildRegExp([R.anyOf('ab', 'cd')])
		expect(re.test('ab')).toBe(true)
		expect(re.test('cd')).toBe(true)
		expect(re.test('ac')).toBe(false)
	})

	test('a literal dash as a member matches a dash', () => {
		const re = R.buildRegExp([R.oneOrMore(R.anyOf('a', '-', 'b'))])
		expect(re.test('a-b')).toBe(true)
	})

	test('empty-string member preserves an empty alternative', () => {
		const re = R.buildRegExp([R.inputStart, R.anyOf('ab', ''), R.inputEnd])
		expect(re.test('ab')).toBe(true)
		expect(re.test('')).toBe(true)
		expect(re.test('cd')).toBe(false)
	})

	test('nested anyOf and special tokens mix correctly', () => {
		const re = R.buildRegExp([R.oneOrMore(R.anyOf(R.digit, R.charRange('a', 'f')))])
		expect(re.test('deadbeef')).toBe(true)
		expect(re.test('0123')).toBe(true)
		expect(re.test('xyz')).toBe(false)
	})
})

describe('notAnyOfChars', () => {
	test('matches a single char that is not any of the members', () => {
		const re = R.buildRegExp([R.inputStart, R.notAnyOfChars('a', 'b'), R.inputEnd])
		expect(re.source).toBe('^[^ab]$')
		expect(re.test('x')).toBe(true)
		expect(re.test('a')).toBe(false)
		expect(re.test('b')).toBe(false)
	})

	test('dash member is escaped so it does not create a range', () => {
		const re = R.buildRegExp([R.oneOrMore(R.notAnyOfChars('a', '-', 'z'))])
		expect(re.test('m')).toBe(true)
		expect(re.test('-')).toBe(false)
	})

	test('multi-codepoint member throws', () => {
		expect(() => R.buildRegExp([R.notAnyOfChars('ab')])).toThrow()
	})
})

describe('Lookarounds (via matches())', () => {
	test('variable-length lookbehind is allowed (ES2018+)', () => {
		const re = R.buildRegExp([R.matches(R.digit, { ifPrecededBy: R.anyOf('a', 'bb') })])
		expect(re.source).toContain('(?<=')
		expect(re.test('a5')).toBe(true)
		expect(re.test('bb5')).toBe(true)
		expect(re.test('b5')).toBe(false)
	})

	test('lookbehind and lookahead combine', () => {
		// Unanchored, the pattern is satisfiable: the lookbehind checks at the
		// digit's position (seeing 'a'), the lookahead after it (seeing 'z').
		const re = R.buildRegExp([R.matches(R.digit, { ifPrecededBy: 'a', ifFollowedBy: 'z' })])
		expect(re.source).toBe('(?<=a)\\d(?=z)')
		expect(re.test('a1z')).toBe(true)
		expect(re.test('b1z')).toBe(false)
		expect(re.test('a12z')).toBe(false) // '1' fails the lookahead, '2' fails the lookbehind
	})

	test('anchoring a pattern with a lookbehind condition yields an unsatisfiable regex', () => {
		// Documenting a footgun: `^` pins the match at index 0, where a lookbehind
		// can never be satisfied (nothing precedes index 0). The encoder performs
		// no analysis here, so the built regex silently matches nothing.
		const re = R.buildRegExp([R.inputStart, R.matches(R.digit, { ifPrecededBy: 'a' }), R.inputEnd])
		expect(re.source).toBe('^(?<=a)\\d$')
		expect(re.test('a5')).toBe(false) // provably unmatchable in any engine
	})

	test('negative lookahead via matches()', () => {
		const re = R.buildRegExp([R.inputStart, R.matches(R.anyChar, { ifNotFollowedBy: 'a' }), R.inputEnd])
		expect(re.test('b')).toBe(true)
		expect(re.test('ab')).toBe(false)
	})
})

describe('captures and references', () => {
	test('named capture + sameAs by name', () => {
		const re = R.buildRegExp([R.captureAs('dup', R.oneOrMore(R.wordBoundary === undefined ? 'a' : R.charRange('a', 'z'))), '-', R.sameAs('dup')])
		expect(re.test('abc-abc')).toBe(true)
		expect(re.test('abc-abd')).toBe(false)
	})

	test('nested captures get correct indices', () => {
		// NOTE: a nested array member is a *sequence*, so alternatives must be
		// passed as separate anyOf() members:
		const re = R.buildRegExp([R.capture(R.anyOf(R.capture('a'), R.capture('b')))])
		const m = 'a'.match(re)!
		expect(m[1]).toBe('a')
		expect(m[2]).toBe('a')
		expect(m[3]).toBeUndefined()
	})
})

describe('codepoints', () => {
	test('codepoint as number and hex string are equal', () => {
		expect(R.encodePattern(R.codepoint(0x1f600))).toBe('\\u{1f600}')
		expect(R.encodePattern(R.codepoint('1F600'))).toBe('\\u{1f600}')
	})

	test('codepoint matches astral char', () => {
		const re = R.buildRegExp([R.codepoint('1F600')])
		expect(re.test('😀')).toBe(true)
		expect(re.test('😀'.slice(0, 1) + 'a')).toBe(false)
	})

	test('codepoint out of range throws', () => {
		expect(() => R.codepoint(0x110000)).toThrow()
		expect(() => R.codepoint(-1)).toThrow()
		expect(() => R.codepoint('110000')).toThrow()
		expect(() => R.codepoint('zz')).toThrow()
		expect(() => R.codepoint('')).toThrow()
	})

	test('codepointRange', () => {
		const re = R.buildRegExp([R.codepointRange('1F600', '1F64F')])
		expect(re.test('😀')).toBe(true)
		expect(re.test('a')).toBe(false)
		expect(() => R.buildRegExp([R.codepointRange('FF', 'AA')])).toThrow()
	})
})

describe('unicode properties', () => {
	test('property without value', () => {
		const re = R.buildRegExp([R.oneOrMore(R.unicodeProperty('Script', 'Greek'))])
		expect(re.test('αβγ')).toBe(true)
	})

	test('negated property', () => {
		const re = R.buildRegExp([R.oneOrMore(R.notUnicodeProperty('Script', 'Greek'))])
		expect(re.test('abc')).toBe(true)
		expect(re.test('α')).toBe(false)
	})
})

describe('matches() conditions', () => {
	test('ifPrecededBy / ifNotPrecededBy', () => {
		const re = R.buildRegExp([R.oneOrMore(R.matches(R.digit, { ifPrecededBy: 'a' }))])
		expect(re.test('x')).toBe(false)
		const re2 = R.buildRegExp([R.inputStart, R.matches(R.digit, { ifPrecededBy: 'a' }), R.inputEnd])
		expect(re2.test('a5')).toBe(false) // the digit lookahead must be satisfied *at* the digit
		const re3 = R.buildRegExp([R.matches(R.digit, { ifPrecededBy: 'a' })])
		expect(re3.test('a5')).toBe(true)
		expect(re3.test('b5')).toBe(false)
	})

	test('ifExtendsTo places its lookahead before the pattern (per README)', () => {
		// Documented encoding: "(?=followingPattern)pattern"
		const re = R.buildRegExp([R.matches(R.digit, { ifExtendsTo: 'px' })])
		expect(re.source).toBe('(?=px)\\d')
		// The two conditions conflict here ('px' vs a digit at the same position),
		// so nothing can ever match:
		expect(re.test('px5')).toBe(false)
	})
})

describe('anchors and whitespace tokens', () => {
	test('newLine pattern matches \\n and \\r\\n', () => {
		const re = R.buildRegExp([R.newLine])
		expect(re.source).toBe('\\r?\\n')
		expect(re.test('\n')).toBe(true)
		expect(re.test('\r\n')).toBe(true)
		expect(re.test('\r')).toBe(false)
	})

	test('word boundary', () => {
		// Letters followed by a word boundary. Note `a+`-style quantifiers only
		// span their own character: `\b` is checked at the boundary between the
		// last letter and whatever follows, so 'hello123' never matches (a letter
		// is followed by a digit — both word chars — at every iteration).
		const re = R.buildRegExp([R.oneOrMore(R.charRange('a', 'z')), R.wordBoundary])
		expect(re.test('hello')).toBe(true)
		expect(re.test('hello!')).toBe(true)
		expect(re.test('hello123')).toBe(false)
	})

	test('whitespace / digits / word chars', () => {
		expect(R.buildRegExp([R.oneOrMore(R.whitespace)]).test('  ')).toBe(true)
		expect(R.buildRegExp([R.oneOrMore(R.nonWhitespace)]).test('  x')).toBe(true)
		expect(R.buildRegExp([R.inputStart, R.oneOrMore(R.nonWhitespace), R.inputEnd]).test('  ')).toBe(false)
		expect(R.buildRegExp([R.oneOrMore(R.digit)]).test('123')).toBe(true)
	})
})

describe('isPatternOptional', () => {
	test('sanity', () => {
		expect(R.isPatternOptional(R.possibly('a'))).toBe(true)
		expect(R.isPatternOptional(R.zeroOrMore('a'))).toBe(true)
		expect(R.isPatternOptional(R.oneOrMore('a'))).toBe(false)
		expect(R.isPatternOptional(R.repeated([0, 1], 'a'))).toBe(true)
		expect(R.isPatternOptional(R.repeated([1, 2], 'a'))).toBe(false)
		expect(R.isPatternOptional(R.anyOf('a', R.possibly('b')))).toBe(true)
		expect(R.isPatternOptional(R.anyOf('a', 'b'))).toBe(false)
		expect(R.isPatternOptional(R.notAnyOfChars('a'))).toBe(false)
	})

	test('sameAs resolves named and indexed groups', () => {
		expect(R.isPatternOptional([R.capture(R.possibly('a')), R.sameAs(1)])).toBe(true)
		expect(R.isPatternOptional([R.captureAs('g', 'a'), R.sameAs('g')])).toBe(false)
		expect(() => R.isPatternOptional([R.sameAs(1)])).toThrow()
	})
})

describe('escaping of string literals', () => {
	test('all metacharacters are escaped and match literally', () => {
		const metachars = '.*+?^${}()|[]\\/'
		for (const ch of metachars) {
			const re = R.buildRegExp([ch])
			expect(re.test(ch), `char ${JSON.stringify(ch)}`).toBe(true)
		}
	})
})
