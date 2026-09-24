import { describe, test, expect } from 'vitest'
import { isString, isNumber, isArray, isSingleUnicodeCodepoint, isSingleCharOrClassTokenExpression } from '../../src/regexp/Predicates.ts'
import * as R from '../../src/exports/Exports.ts'

describe('isString', () => {
	test('accepts strings, including the empty string', () => {
		expect(isString('')).toBe(true)
		expect(isString('a')).toBe(true)
	})

	test('rejects every non-string value', () => {
		expect(isString(5)).toBe(false)
		expect(isString(NaN)).toBe(false)
		expect(isString(true)).toBe(false)
		expect(isString(null)).toBe(false)
		expect(isString(undefined)).toBe(false)
		expect(isString([])).toBe(false)
		expect(isString({})).toBe(false)
	})
})

describe('isNumber', () => {
	test('accepts every number, including non-finite values', () => {
		expect(isNumber(0)).toBe(true)
		expect(isNumber(-1.5)).toBe(true)
		expect(isNumber(NaN)).toBe(true)
		expect(isNumber(Infinity)).toBe(true)
	})

	test('rejects every non-number value', () => {
		expect(isNumber('1')).toBe(false)
		expect(isNumber(true)).toBe(false)
		expect(isNumber(null)).toBe(false)
		expect(isNumber(undefined)).toBe(false)
		expect(isNumber([])).toBe(false)
		expect(isNumber({})).toBe(false)
	})
})

describe('isArray', () => {
	test('accepts arrays, including the empty array', () => {
		expect(isArray([])).toBe(true)
		expect(isArray([1])).toBe(true)
		expect(isArray(['a', R.digit])).toBe(true)
	})

	test('rejects every non-array value', () => {
		expect(isArray('a')).toBe(false)
		expect(isArray({})).toBe(false)
		expect(isArray(undefined)).toBe(false)
	})
})

describe('isSingleUnicodeCodepoint', () => {
	test('rejects the empty string', () => {
		expect(isSingleUnicodeCodepoint('')).toBe(false)
	})

	test('accepts a single ASCII character', () => {
		expect(isSingleUnicodeCodepoint('a')).toBe(true)
		expect(isSingleUnicodeCodepoint('\\')).toBe(true)
	})

	test('accepts a single astral character', () => {
		expect(isSingleUnicodeCodepoint('😀')).toBe(true)
	})

	test('rejects multi-character strings', () => {
		expect(isSingleUnicodeCodepoint('ab')).toBe(false)
		expect(isSingleUnicodeCodepoint('Cześć')).toBe(false)
	})

	test('rejects an astral character followed by another character', () => {
		expect(isSingleUnicodeCodepoint('😀a')).toBe(false)
	})

	test('rejects a combining sequence', () => {
		expect(isSingleUnicodeCodepoint('e\u0301')).toBe(false)
	})

	test('treats a lone surrogate as a single code unit', () => {
		expect(isSingleUnicodeCodepoint('\uD83D')).toBe(true)
	})
})

describe('isSingleCharOrClassTokenExpression', () => {
	test('accepts single codepoint strings', () => {
		expect(isSingleCharOrClassTokenExpression('a')).toBe(true)
		expect(isSingleCharOrClassTokenExpression('😀')).toBe(true)
	})

	test('rejects the empty string and multi-character strings', () => {
		expect(isSingleCharOrClassTokenExpression('')).toBe(false)
		expect(isSingleCharOrClassTokenExpression('ab')).toBe(false)
	})

	test('accepts class tokens', () => {
		expect(isSingleCharOrClassTokenExpression(R.digit)).toBe(true)
		expect(isSingleCharOrClassTokenExpression(R.whitespace)).toBe(true)
		expect(isSingleCharOrClassTokenExpression(R.nonDigit)).toBe(true)
		expect(isSingleCharOrClassTokenExpression(R.charRange('a', 'z'))).toBe(true)
		expect(isSingleCharOrClassTokenExpression(R.codepointRange('41', '5a'))).toBe(true)
		expect(isSingleCharOrClassTokenExpression(R.codepoint('41'))).toBe(true)
		expect(isSingleCharOrClassTokenExpression(R.unicodeProperty('Letter'))).toBe(true)
		expect(isSingleCharOrClassTokenExpression(R.notUnicodeProperty('Letter'))).toBe(true)
	})

	test('rejects metacharacter tokens', () => {
		expect(isSingleCharOrClassTokenExpression(R.inputStart)).toBe(false)
		expect(isSingleCharOrClassTokenExpression(R.inputEnd)).toBe(false)
		expect(isSingleCharOrClassTokenExpression(R.anyChar)).toBe(false)
		expect(isSingleCharOrClassTokenExpression(R.wordBoundary)).toBe(false)
		expect(isSingleCharOrClassTokenExpression(R.nonWordBoundary)).toBe(false)
	})

	test('rejects arrays and pattern nodes', () => {
		expect(isSingleCharOrClassTokenExpression([])).toBe(false)
		expect(isSingleCharOrClassTokenExpression(['a'])).toBe(false)
		expect(isSingleCharOrClassTokenExpression(R.possibly('a'))).toBe(false)
		expect(isSingleCharOrClassTokenExpression(R.capture('a'))).toBe(false)
		expect(isSingleCharOrClassTokenExpression(R.anyOf('a', 'b'))).toBe(false)
	})

	test('rejects values that are not pattern expressions at all', () => {
		const notAPattern = 5 as unknown as R.PatternExpression
		expect(isSingleCharOrClassTokenExpression(notAPattern)).toBe(false)
	})
})
