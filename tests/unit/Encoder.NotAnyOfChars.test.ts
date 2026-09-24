import { describe, test, expect } from 'vitest'
import * as R from '../../src/exports/Exports.ts'

describe('encodeNotAnyOfChars', () => {
	test('empty member list encodes to empty', () => {
		expect(R.encodePattern(R.notAnyOfChars())).toBe('')
	})

	test('single-character members form a negated class', () => {
		expect(R.encodePattern(R.notAnyOfChars('a', 'b'))).toBe('[^ab]')
	})

	test('class tokens are accepted', () => {
		expect(R.encodePattern(R.notAnyOfChars(R.digit))).toBe('[^\\d]')
		expect(R.encodePattern(R.notAnyOfChars(R.charRange('a', 'z')))).toBe('[^a-z]')
		expect(R.encodePattern(R.notAnyOfChars(R.unicodeProperty('Punctuation')))).toBe('[^\\p{Punctuation}]')
	})

	test('a literal dash is escaped', () => {
		expect(R.encodePattern(R.notAnyOfChars('a', '-', 'b'))).toBe('[^a\\-b]')
	})

	test('multi-codepoint string members are rejected', () => {
		expect(() => R.encodePattern(R.notAnyOfChars('ab'))).toThrow('The string pattern ab is not a single codepoint')
	})

	test('non-class node members are rejected', () => {
		expect(() => R.encodePattern(R.notAnyOfChars(R.anyChar))).toThrow('is not a single codepoint or class token')
		expect(() => R.encodePattern(R.notAnyOfChars(R.anyOf('a', 'b')))).toThrow('is not a single codepoint or class token')
	})
})
