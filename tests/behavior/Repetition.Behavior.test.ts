import { describe, test, expect } from 'vitest'
import * as R from '../../src/exports/Exports.ts'

describe('quantifier matching behavior', () => {
	test('possibly matches empty and the full content but not a partial', () => {
		const re = R.buildRegExp([R.inputStart, R.possibly('ab'), R.inputEnd])
		expect(re.test('')).toBe(true)
		expect(re.test('ab')).toBe(true)
		expect(re.test('a')).toBe(false)
		expect(re.test('b')).toBe(false)
	})

	test('zeroOrMore repeats the whole content', () => {
		const re = R.buildRegExp([R.inputStart, R.zeroOrMore('ab'), R.inputEnd])
		expect(re.test('')).toBe(true)
		expect(re.test('abab')).toBe(true)
		expect(re.test('a')).toBe(false)
	})

	test('oneOrMore requires at least one occurrence', () => {
		const re = R.buildRegExp([R.inputStart, R.oneOrMore('ab'), R.inputEnd])
		expect(re.test('ab')).toBe(true)
		expect(re.test('abab')).toBe(true)
		expect(re.test('')).toBe(false)
		expect(re.test('a')).toBe(false)
	})

	test('non-greedy repetition stops at the first match', () => {
		expect(R.buildRegExp(R.oneOrMoreNonGreedy(R.anyChar)).exec('abc')?.[0]).toBe('a')
		expect(R.buildRegExp(R.zeroOrMoreNonGreedy(R.anyChar)).exec('abc')?.[0]).toBe('')
	})

	test('repeated enforces the count range', () => {
		const re = R.buildRegExp([R.inputStart, R.repeated([2, 4], 'a'), R.inputEnd])
		expect(re.test('a')).toBe(false)
		expect(re.test('aa')).toBe(true)
		expect(re.test('aaaa')).toBe(true)
		expect(re.test('aaaaa')).toBe(false)
	})

	test('non-greedy repeated takes the fewest occurrences', () => {
		expect(R.buildRegExp(R.repeatedNonGreedy([1, 3], 'a')).exec('aaa')?.[0]).toBe('a')
	})

	test('quantifying the empty string is a no-op', () => {
		const re = R.buildRegExp([R.inputStart, R.zeroOrMore(''), R.inputEnd])
		expect(re.test('')).toBe(true)
	})
})
