import { describe, test, expect } from 'vitest'
import * as R from '../../src/exports/Exports.ts'

describe('codepoint matching', () => {
	test('an astral codepoint matches only itself', () => {
		const re = R.buildRegExp([R.inputStart, R.codepoint('1F600'), R.inputEnd])
		expect(re.test('😀')).toBe(true)
		expect(re.test('a')).toBe(false)
		expect(re.test('')).toBe(false)
	})

	test('a BMP codepoint matches only itself', () => {
		const re = R.buildRegExp([R.inputStart, R.codepoint('41'), R.inputEnd])
		expect(re.test('A')).toBe(true)
		expect(re.test('B')).toBe(false)
	})
})

describe('range matching', () => {
	test('a literal range covers its endpoints and excludes its neighbors', () => {
		const re = R.buildRegExp([R.inputStart, R.charRange('a', 'c'), R.inputEnd])
		expect(re.test('a')).toBe(true)
		expect(re.test('c')).toBe(true)
		expect(re.test('d')).toBe(false)
		expect(re.test('A')).toBe(false)
		expect(re.test('')).toBe(false)
	})

	test('a range with astral endpoints', () => {
		const re = R.buildRegExp([R.inputStart, R.charRange('😀', '😁'), R.inputEnd])
		expect(re.test('😀')).toBe(true)
		expect(re.test('😁')).toBe(true)
		expect(re.test('a')).toBe(false)
	})

	test('a codepoint range', () => {
		const re = R.buildRegExp([R.inputStart, R.codepointRange('1F600', '1F64F'), R.inputEnd])
		expect(re.test('😀')).toBe(true)
		expect(re.test('🚀')).toBe(false)
	})
})

describe('unicode property matching', () => {
	test('a property with a value', () => {
		const re = R.buildRegExp([R.inputStart, R.unicodeProperty('Script', 'Greek'), R.inputEnd])
		expect(re.test('α')).toBe(true)
		expect(re.test('a')).toBe(false)
	})

	test('a property without a value', () => {
		const re = R.buildRegExp([R.inputStart, R.unicodeProperty('Letter'), R.inputEnd])
		expect(re.test('a')).toBe(true)
		expect(re.test('1')).toBe(false)
	})

	test('a negated property', () => {
		const re = R.buildRegExp([R.inputStart, R.notUnicodeProperty('Letter'), R.inputEnd])
		expect(re.test('1')).toBe(true)
		expect(re.test('a')).toBe(false)
	})
})
