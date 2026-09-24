import { describe, test, expect } from 'vitest'
import * as R from '../../src/exports/Exports.ts'

describe('matches: condition placement', () => {
	test('except is a leading negative lookahead', () => {
		expect(R.encodePattern(R.matches('a', { except: 'b' }))).toBe('(?!b)a')
	})

	test('ifFollowedBy is a trailing positive lookahead', () => {
		expect(R.encodePattern(R.matches('a', { ifFollowedBy: 'b' }))).toBe('a(?=b)')
	})

	test('ifNotFollowedBy is a trailing negative lookahead', () => {
		expect(R.encodePattern(R.matches('a', { ifNotFollowedBy: 'b' }))).toBe('a(?!b)')
	})

	test('ifPrecededBy is a leading positive lookbehind', () => {
		expect(R.encodePattern(R.matches('a', { ifPrecededBy: 'b' }))).toBe('(?<=b)a')
	})

	test('ifNotPrecededBy is a leading negative lookbehind', () => {
		expect(R.encodePattern(R.matches('a', { ifNotPrecededBy: 'b' }))).toBe('(?<!b)a')
	})

	test('ifExtendsTo is a leading positive lookahead', () => {
		expect(R.encodePattern(R.matches('a', { ifExtendsTo: 'b' }))).toBe('(?=b)a')
	})

	test('ifExtendsBackTo is a trailing positive lookbehind', () => {
		expect(R.encodePattern(R.matches('a', { ifExtendsBackTo: 'b' }))).toBe('a(?<=b)')
	})

	test('ifNotExtendsBackTo is a trailing negative lookbehind', () => {
		expect(R.encodePattern(R.matches('a', { ifNotExtendsBackTo: 'b' }))).toBe('a(?<!b)')
	})
})

describe('matches: combinations and condition arrays', () => {
	test('a preceding and a following condition keep their placement', () => {
		expect(R.encodePattern(R.matches('a', { ifPrecededBy: 'b', ifFollowedBy: 'c' }))).toBe('(?<=b)a(?=c)')
	})

	test('except plus negative conditions are emitted in condition order', () => {
		const pattern = R.matches('a', { except: 'x', ifNotPrecededBy: 'b', ifNotFollowedBy: 'c' })
		expect(R.encodePattern(pattern)).toBe('(?!x)(?<!b)a(?!c)')
	})

	test('an array of conditions applies every condition', () => {
		const pattern = R.matches('a', [{ ifFollowedBy: 'b' }, { ifPrecededBy: 'c' }])
		expect(R.encodePattern(pattern)).toBe('(?<=c)a(?=b)')
	})

	test('an empty conditions object returns the content sequence', () => {
		const pattern = R.matches('a', {})
		expect(Array.isArray(pattern)).toBe(true)
		expect(R.encodePattern(pattern)).toBe('a')
	})
})
