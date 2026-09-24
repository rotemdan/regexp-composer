import { describe, test, expect } from 'vitest'
import * as R from '../../src/exports/Exports.ts'

describe('encodeAnyOf: grouping', () => {
	test('empty member list encodes to empty', () => {
		expect(R.encodePattern(R.anyOf())).toBe('')
	})

	test('single class member is wrapped in a character class', () => {
		expect(R.encodePattern(R.anyOf('a'))).toBe('(?:[a])')
	})

	test('single non-class member is wrapped in a group', () => {
		expect(R.encodePattern(R.anyOf('hello'))).toBe('(?:hello)')
	})

	test('contiguous single-character members collapse into one class', () => {
		expect(R.encodePattern(R.anyOf('a', 'b', 'c'))).toBe('(?:[abc])')
		expect(R.encodePattern(R.anyOf('a', R.digit, 'b'))).toBe('(?:[a\\db])')
	})

	test('class and non-class runs are separated', () => {
		expect(R.encodePattern(R.anyOf('a', 'b', 'hello', 'c'))).toBe('(?:[ab]|hello|[c])')
	})

	test('array members are treated as non-class alternatives', () => {
		expect(R.encodePattern(R.anyOf(['a', 'b'], 'c'))).toBe('(?:ab|[c])')
	})

	test('nested anyOf is treated as a non-class alternative', () => {
		expect(R.encodePattern(R.anyOf(R.anyOf('a', 'b'), 'c'))).toBe('(?:(?:[ab])|[c])')
	})
})

describe('encodeAnyOf: class-token classification', () => {
	test('class tokens are grouped into a character class', () => {
		expect(R.encodePattern(R.anyOf(R.digit, R.charRange('a', 'z')))).toBe('(?:[\\da-z])')
		expect(R.encodePattern(R.anyOf(R.codepointRange('41', '5A')))).toBe('(?:[\\u{41}-\\u{5A}])')
		expect(R.encodePattern(R.anyOf(R.unicodeProperty('Letter')))).toBe('(?:[\\p{Letter}])')
	})

	test('astral single codepoints are grouped like any single character', () => {
		expect(R.encodePattern(R.anyOf('😀', 'a'))).toBe('(?:[😀a])')
	})

	test('metacharacter tokens are not treated as class tokens', () => {
		expect(R.encodePattern(R.anyOf(R.anyChar))).toBe('(?:.)')
		expect(R.encodePattern(R.anyOf(R.anyChar, R.inputStart))).toBe('(?:.|^)')
		expect(R.encodePattern(R.anyOf(R.inputStart, 'a'))).toBe('(?:^|[a])')
	})
})

describe('encodeAnyOf: dash handling', () => {
	test('a literal dash inside a class is escaped', () => {
		expect(R.encodePattern(R.anyOf('a', '-', 'b'))).toBe('(?:[a\\-b])')
	})
})

describe('encodeAnyOf: empty alternatives', () => {
	test('empty string member preserves an empty alternative', () => {
		expect(R.encodePattern(R.anyOf('a', ''))).toBe('(?:[a]|)')
	})

	test('elided member preserves an empty alternative', () => {
		expect(R.encodePattern(R.anyOf('a', R.possibly('')))).toBe('(?:[a]|)')
	})

	test('interleaved class members around an empty member keep it', () => {
		expect(R.encodePattern(R.anyOf('a', '', 'b'))).toBe('(?:[a]||[b])')
	})

	test('mixed run with an empty member keeps both the non-empty and empty alternatives', () => {
		expect(R.encodePattern(R.anyOf('a', 'hello', ''))).toBe('(?:[a]|hello|)')
	})

	test('all-empty non-class run collapses to a single empty alternative', () => {
		expect(R.encodePattern(R.anyOf(R.possibly(''), R.possibly('')))).toBe('(?:)')
	})
})
