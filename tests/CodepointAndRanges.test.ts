import { describe, test, expect } from 'vitest'
import * as R from '../src/exports/Exports.ts'

describe('codepoint / charRange / codepointRange', () => {
	test('codepoint hex vs integer agree', () => {
		expect(R.encodePattern(R.codepoint('41'))).toBe('\\u{41}')
		expect(R.encodePattern(R.codepoint(0x41))).toBe('\\u{41}')
	})

	test('charRange dash escaping', () => {
		// single-char '-' is escaped inside the char class, regardless of position
		expect(R.encodePattern(R.charRange('-', '-'))).toBe('[\\--\\-]')
		expect(R.encodePattern(R.charRange('-', 'a'))).toBe('[\\--a]')
		expect(R.encodePattern(R.charRange('a', 'a'))).toBe('[a-a]')
	})

	test('codepointRange hex normalization', () => {
		expect(R.encodePattern(R.codepointRange('41', '5a'))).toBe('[\\u{41}-\\u{5A}]')
		expect(R.encodePattern(R.codepointRange('41', '5A'))).toBe(R.encodePattern(R.codepointRange(0x41, 0x5a)))
	})

	test('isSingleUnicodeCodepoint via public API (charRange)', () => {
		expect(() => R.charRange('ab', 'c')).toThrow()
		expect(() => R.charRange('😀', '😀')).not.toThrow() // single codepoint (surrogate pair)
		expect(() => R.charRange('a', 'ab')).toThrow()
	})

	test('emoji single-codepoint path (quantifier)', () => {
		// "😀" is length 2 in JS but one codepoint — should stay bare with *?+?
		expect(R.encodePattern(R.possibly('😀'))).toBe('😀?')
		expect(R.encodePattern(R.oneOrMore('😀'))).toBe('😀+')
	})
})
