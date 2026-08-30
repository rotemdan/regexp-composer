import { describe, test, expect } from 'vitest'
import * as R from '../src/exports/Exports.ts'

/**
 * These tests are deliberately adversarial: they enumerate combinations the
 * original suite and ad-hoc usage never exercised. Any failure here = a real bug.
 */

function matchesEmpty(p: any) { return R.buildRegExp(p).test('') }

// Exhaustively check isPatternOptional vs engine for every composable shape
describe('hunter: isPatternOptional vs engine — exhaustive combos', () => {
	const bases: any[] = ['', 'a', 'ab', '😀', R.inputStart, R.inputEnd, R.digit, R.charRange('a', 'z'), R.codepoint('41')]

	const wraps: ((p: any) => any)[] = [
		p => R.possibly(p),
		p => R.zeroOrMore(p),
		p => R.oneOrMore(p),
		p => R.repeated(0, p),
		p => R.repeated(2, p),
		p => ({ type: 'precededBy', content: p } as any),
		p => ({ type: 'notPrecededBy', content: p } as any),
		p => ({ type: 'followedBy', content: p } as any),
		p => ({ type: 'notFollowedBy', content: p } as any),
	]

	for (const b of bases) {
		for (const wrap of wraps) {
			const label = `${JSON.stringify(b).slice(0,20)} -> ${wrap.name || 'wrap'}`
			test(label, () => {
				const pat = wrap(b)
				expect(R.isPatternOptional(pat)).toBe(matchesEmpty(pat))
				// and wrapped again
				expect(R.isPatternOptional(R.possibly(pat))).toBe(matchesEmpty(R.possibly(pat)))
				expect(R.isPatternOptional(R.oneOrMore(pat))).toBe(matchesEmpty(R.oneOrMore(pat)))
			})
		}
	}

	test('deeply nested lookarounds', () => {
		const deep: any = { type: 'notFollowedBy', content: { type: 'notPrecededBy', content: 'a' } as any }
		expect(R.isPatternOptional(deep)).toBe(matchesEmpty(deep))
		expect(R.isPatternOptional(R.oneOrMore(deep))).toBe(matchesEmpty(R.oneOrMore(deep)))
	})

	test('empty lookaround stacked with quantifier', () => {
		const p: any = { type: 'notFollowedBy', content: '' }
		expect(R.isPatternOptional(R.repeated(0, p))).toBe(matchesEmpty(R.repeated(0, p)))
		expect(R.isPatternOptional(R.repeated(1, p))).toBe(matchesEmpty(R.repeated(1, p)))
	})
})

describe('hunter: encodePattern — illegal inputs', () => {
	test('charRange with surrogate-pair vs two-codepoint string', () => {
		// "e\u0301" is e + combining accent = 2 codepoints, length 2 — must reject
		expect(() => R.charRange('e\u0301', 'z')).toThrow()
	})

	test('codepointRange rejects out-of-range hex even when 1-6 digits', () => {
		expect(() => R.codepointRange('110000', '110001')).toThrow() // > 10FFFF
		expect(() => R.codepoint('110000')).toThrow()
	})

	test('notAnyOfChars rejects non-class / multi-char patterns', () => {
		// anyChar / inputStart / \b / \B are all metacharacter tokens — not class tokens
		expect(() => R.buildRegExp(R.notAnyOfChars(R.anyChar as any))).toThrow()
		expect(() => R.buildRegExp(R.notAnyOfChars(R.inputStart as any))).toThrow()
		expect(() => R.buildRegExp(R.notAnyOfChars(R.wordBoundary as any))).toThrow()
		expect(() => R.buildRegExp(R.notAnyOfChars(R.nonWordBoundary as any))).toThrow()
		// genuine class tokens like \d / \w are accepted
		expect(() => R.buildRegExp(R.notAnyOfChars(R.digit as any))).not.toThrow()
		expect(R.encodePattern(R.notAnyOfChars(R.digit))).toBe('[^\\d]')
	})

	test('repeated with fractional count is truncated (Math.trunc) — verify intent', () => {
		// Library truncates; ensure it doesn't silently accept Infinity as count
		expect(() => R.repeated(3.9, 'a')).not.toThrow()
		expect(R.encodePattern(R.repeated(3.9, 'a'))).toBe('(?:a){3}')
		expect(() => R.repeated([1.9, 3.9], 'a')).not.toThrow()
		expect(R.encodePattern(R.repeated([1.9, 3.9], 'a'))).toBe('(?:a){1,3}')
	})
})

describe('hunter: capture / sameAs isPatternOptional with nesting', () => {
	test('sameAs inside optional capture', () => {
		// group 1 is optional, so sameAs(1) should be optional too
		const pat: any = [R.capture(R.possibly('x')), R.capture(R.sameAs(1))] // second capture wraps the backref
		expect(R.isPatternOptional(pat)).toBe(matchesEmpty(pat))
	})

	test('named capture sameAs forward ref throws only when evaluated', () => {
		// sameAs('g') before captureAs('g', ...) — not reachable if short-circuited
		const unreachable: any = ['a', R.sameAs('g')] // 'a' non-optional so sequence fails before sameAs
		expect(R.isPatternOptional(unreachable)).toBe(false) // no throw, correct short-circuit
		// anyOf is now validated eagerly, so even when an optional member is present the stray ref is surfaced
		expect(() => R.isPatternOptional(R.anyOf(R.sameAs('g'), R.possibly('')))).toThrow(/named capture group/)
		expect(() => R.isPatternOptional(R.anyOf(R.possibly(''), R.sameAs('g')))).toThrow(/named capture group/)
	})
})
