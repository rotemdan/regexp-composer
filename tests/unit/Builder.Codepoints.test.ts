import { describe, test, expect } from 'vitest'
import * as R from '../../src/exports/Exports.ts'

describe('codepoint', () => {
	test('a hex string produces a codepoint token', () => {
		expect(R.codepoint('41')).toEqual({ type: 'specialToken', name: 'codepoint', rawRegExp: '\\u{41}' })
	})

	test('an integer produces the same token as its hex form', () => {
		expect(R.codepoint(0x41)).toEqual(R.codepoint('41'))
	})

	test('hex input is normalized to lowercase', () => {
		expect(R.codepoint('4A').rawRegExp).toBe('\\u{4a}')
	})

	test('leading zeroes are preserved', () => {
		expect(R.codepoint('000041').rawRegExp).toBe('\\u{000041}')
	})

	test('the boundary codepoints are accepted', () => {
		expect(R.codepoint('0').rawRegExp).toBe('\\u{0}')
		expect(R.codepoint(1114111).rawRegExp).toBe('\\u{10ffff}')
	})

	test('the token is emitted verbatim, without range wrapping', () => {
		expect(R.encodePattern(R.codepoint('41'))).toBe('\\u{41}')
	})
})

describe('charRange', () => {
	test('a plain range keeps its endpoints verbatim', () => {
		expect(R.charRange('a', 'z')).toEqual({ type: 'specialToken', name: 'charRange', rawRegExp: 'a-z' })
	})

	test('encodePattern wraps the range in a character class', () => {
		expect(R.encodePattern(R.charRange('a', 'z'))).toBe('[a-z]')
	})

	test('the wrapping can be disabled', () => {
		expect(R.encodePattern(R.charRange('a', 'z'), false)).toBe('a-z')
	})

	test('an equal start and end is accepted', () => {
		expect(R.charRange('a', 'a').rawRegExp).toBe('a-a')
	})

	test('astral endpoints are accepted', () => {
		expect(R.charRange('😀', '😁').rawRegExp).toBe('😀-😁')
	})

	test('endpoints that are special inside a class are escaped', () => {
		expect(R.charRange('^', '^').rawRegExp).toBe('\\^-\\^')
		expect(R.charRange(']', ']').rawRegExp).toBe('\\]-\\]')
		expect(R.charRange('\\', '\\').rawRegExp).toBe('\\\\-\\\\')
		expect(R.charRange('-', '-').rawRegExp).toBe('\\--\\-')
		expect(R.charRange('-', 'a').rawRegExp).toBe('\\--a')
	})
})

describe('codepointRange', () => {
	test('hex endpoints are uppercased', () => {
		expect(R.codepointRange('41', '5a')).toEqual({ type: 'specialToken', name: 'codepointRange', rawRegExp: '\\u{41}-\\u{5A}' })
	})

	test('integer endpoints are equivalent to their hex form', () => {
		expect(R.codepointRange(0x41, 0x5a)).toEqual(R.codepointRange('41', '5a'))
	})

	test('mixed integer and hex endpoints are accepted', () => {
		expect(R.codepointRange(0x41, '5a')).toEqual(R.codepointRange('41', 0x5a))
	})

	test('encodePattern wraps the range in a character class', () => {
		expect(R.encodePattern(R.codepointRange('41', '5a'))).toBe('[\\u{41}-\\u{5A}]')
	})

	test('an equal start and end is accepted', () => {
		expect(R.codepointRange('41', '41').rawRegExp).toBe('\\u{41}-\\u{41}')
	})

	test('astral endpoints are accepted', () => {
		expect(R.codepointRange('1F600', '1F64F').rawRegExp).toBe('\\u{1F600}-\\u{1F64F}')
	})
})

describe('unicode properties', () => {
	test('a property without a value', () => {
		expect(R.unicodeProperty('Letter')).toEqual({ type: 'specialToken', name: 'unicodeProperty', rawRegExp: '\\p{Letter}' })
	})

	test('a property with a value', () => {
		expect(R.unicodeProperty('Script_Extensions', 'Gothic')).toEqual({ type: 'specialToken', name: 'unicodeProperty', rawRegExp: '\\p{Script_Extensions=Gothic}' })
	})

	test('a negated property without a value', () => {
		expect(R.notUnicodeProperty('Letter')).toEqual({ type: 'specialToken', name: 'notUnicodeProperty', rawRegExp: '\\P{Letter}' })
	})

	test('a negated property with a value', () => {
		expect(R.notUnicodeProperty('Script', 'Greek').rawRegExp).toBe('\\P{Script=Greek}')
	})
})
