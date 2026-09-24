import { describe, test, expect } from 'vitest'
import * as R from '../../src/exports/Exports.ts'

describe('matches condition behavior', () => {
	test('except excludes the exact pattern', () => {
		const re = R.buildRegExp([R.inputStart, R.matches(R.oneOrMore(R.charRange('0', '9')), { except: '23' })])
		expect(re.test('12344')).toBe(true)
		expect(re.test('23')).toBe(false)
	})

	test('ifFollowedBy requires the following pattern', () => {
		expect(R.buildRegExp(R.matches('a', { ifFollowedBy: 'b' })).test('ab')).toBe(true)
		expect(R.buildRegExp(R.matches('a', { ifFollowedBy: 'b' })).test('ac')).toBe(false)
	})

	test('ifNotFollowedBy rejects the following pattern', () => {
		expect(R.buildRegExp(R.matches('a', { ifNotFollowedBy: 'b' })).test('ac')).toBe(true)
		expect(R.buildRegExp([R.matches('a', { ifNotFollowedBy: 'b' }), R.inputEnd]).test('ab')).toBe(false)
	})

	test('ifPrecededBy requires the preceding pattern', () => {
		expect(R.buildRegExp(R.matches('b', { ifPrecededBy: 'a' })).test('ab')).toBe(true)
		expect(R.buildRegExp(R.matches('b', { ifPrecededBy: 'a' })).test('cb')).toBe(false)
	})

	test('ifNotPrecededBy rejects the preceding pattern', () => {
		expect(R.buildRegExp(R.matches('b', { ifNotPrecededBy: 'a' })).test('cb')).toBe(true)
		expect(R.buildRegExp(R.matches('b', { ifNotPrecededBy: 'a' })).exec('ab')).toBeNull()
	})

	test('ifExtendsTo checks a lookahead placed before the pattern', () => {
		const re = R.buildRegExp(R.matches('a', { ifExtendsTo: 'ab' }))
		expect(re.test('ab')).toBe(true)
		expect(re.test('ac')).toBe(false)
	})

	test('ifExtendsBackTo checks a lookbehind placed after the pattern', () => {
		const re = R.buildRegExp(R.matches('ab', { ifExtendsBackTo: 'b' }))
		expect(re.source).toBe('ab(?<=b)')
		expect(re.test('xab')).toBe(true)
		expect(re.test('xa')).toBe(false)
	})

	test('ifExtendsBackTo constrains the content suffix, not the surrounding context', () => {
		// The lookbehind sits after the content, so the position it inspects is the
		// end of the match itself. The content therefore has to end with the
		// condition pattern, and a preceding context cannot satisfy it.
		const re = R.buildRegExp(R.matches(R.oneOrMore(R.anyChar), { ifExtendsBackTo: 'b' }))
		expect(re.source).toBe('(?:.)+(?<=b)')
		expect(re.exec('axb')?.[0]).toBe('axb')
		expect(re.exec('axc')).toBeNull()
	})

	test('ifNotExtendsBackTo rejects a match whose suffix equals the condition', () => {
		const re = R.buildRegExp(R.matches(R.oneOrMore(R.anyChar), { ifNotExtendsBackTo: 'b' }))
		expect(re.source).toBe('(?:.)+(?<!b)')
		expect(re.exec('axc')?.[0]).toBe('axc')
		expect(re.exec('axb')?.[0]).toBe('ax')
	})

	test('the README combined conditions example', () => {
		const pattern = [
			R.inputStart,
			R.matches(R.oneOrMore(R.unicodeProperty('Letter')), {
				except: R.anyOf('Cat', 'Dog'),
				ifNotPrecededBy: R.charRange('0', '9'),
				ifNotFollowedBy: R.anyOf('?', '!')
			}),
			R.inputEnd
		]
		const re = R.buildRegExp(pattern)
		expect(re.test('asdf')).toBe(true)
		expect(re.test('hello')).toBe(true)
		expect(re.test('Cat')).toBe(false)
		expect(re.test('Dog')).toBe(false)
		expect(re.test('hello?')).toBe(false)
		expect(re.test('hello!')).toBe(false)
	})

	test('a variable-length lookbehind is accepted', () => {
		const re = R.buildRegExp(R.matches(R.digit, { ifPrecededBy: R.anyOf('a', 'bb') }))
		expect(re.source).toContain('(?<=')
		expect(re.test('a5')).toBe(true)
		expect(re.test('bb5')).toBe(true)
		expect(re.test('b5')).toBe(false)
	})

	test('a lookbehind and a lookahead combine around the content', () => {
		// Unanchored, the pattern is satisfiable: the lookbehind inspects the
		// position of the digit, the lookahead the position after it.
		const re = R.buildRegExp(R.matches(R.digit, { ifPrecededBy: 'a', ifFollowedBy: 'z' }))
		expect(re.source).toBe('(?<=a)\\d(?=z)')
		expect(re.test('a1z')).toBe(true)
		expect(re.test('b1z')).toBe(false)
		expect(re.test('a12z')).toBe(false)
	})

	test('anchoring a pattern with a lookbehind condition yields an unmatchable regex', () => {
		// Documented consequence of the encoding: `^` pins the match at index 0,
		// where a lookbehind can never be satisfied, and the encoder performs no
		// analysis of that combination.
		const re = R.buildRegExp([R.inputStart, R.matches(R.digit, { ifPrecededBy: 'a' }), R.inputEnd])
		expect(re.source).toBe('^(?<=a)\\d$')
		expect(re.test('a5')).toBe(false)
	})
})
