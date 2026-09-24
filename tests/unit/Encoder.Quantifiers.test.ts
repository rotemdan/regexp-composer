import { describe, test, expect } from 'vitest'
import * as R from '../../src/exports/Exports.ts'

describe('encodePossibly', () => {
	test('single character stays bare', () => {
		expect(R.encodePattern(R.possibly('a'))).toBe('a?')
	})

	test('astral single codepoint stays bare', () => {
		expect(R.encodePattern(R.possibly('😀'))).toBe('😀?')
	})

	test('class token stays bare', () => {
		expect(R.encodePattern(R.possibly(R.digit))).toBe('\\d?')
	})

	test('multi-character content is grouped', () => {
		expect(R.encodePattern(R.possibly('ab'))).toBe('(?:ab)?')
	})

	test('empty content is elided', () => {
		expect(R.encodePattern(R.possibly(''))).toBe('')
	})
})

describe('encodeZeroOrMore', () => {
	test('single character stays bare', () => {
		expect(R.encodePattern(R.zeroOrMore('a'))).toBe('a*')
	})

	test('multi-character content is grouped', () => {
		expect(R.encodePattern(R.zeroOrMore('ab'))).toBe('(?:ab)*')
	})

	test('non-greedy single character', () => {
		expect(R.encodePattern(R.zeroOrMoreNonGreedy('a'))).toBe('a*?')
	})

	test('non-greedy multi-character content is grouped', () => {
		expect(R.encodePattern(R.zeroOrMoreNonGreedy('ab'))).toBe('(?:ab)*?')
	})

	test('empty content is elided', () => {
		expect(R.encodePattern(R.zeroOrMore(''))).toBe('')
		expect(R.encodePattern(R.zeroOrMoreNonGreedy(''))).toBe('')
	})
})

describe('encodeOneOrMore', () => {
	test('single character stays bare', () => {
		expect(R.encodePattern(R.oneOrMore('a'))).toBe('a+')
	})

	test('multi-character content is grouped', () => {
		expect(R.encodePattern(R.oneOrMore('ab'))).toBe('(?:ab)+')
	})

	test('non-greedy single character', () => {
		expect(R.encodePattern(R.oneOrMoreNonGreedy('a'))).toBe('a+?')
	})

	test('non-greedy multi-character content is grouped', () => {
		expect(R.encodePattern(R.oneOrMoreNonGreedy('ab'))).toBe('(?:ab)+?')
	})

	test('empty content is elided', () => {
		expect(R.encodePattern(R.oneOrMore(''))).toBe('')
		expect(R.encodePattern(R.oneOrMoreNonGreedy(''))).toBe('')
	})
})

describe('encodeRepeated', () => {
	test('exact count', () => {
		expect(R.encodePattern(R.repeated(3, 'a'))).toBe('(?:a){3}')
		expect(R.encodePattern(R.repeated(3, R.digit))).toBe('(?:\\d){3}')
	})

	test('bounded range', () => {
		expect(R.encodePattern(R.repeated([2, 5], 'a'))).toBe('(?:a){2,5}')
	})

	test('open-ended range', () => {
		expect(R.encodePattern(R.repeated([2], 'a'))).toBe('(?:a){2,}')
	})

	test('non-greedy exact count', () => {
		expect(R.encodePattern(R.repeatedNonGreedy(3, 'a'))).toBe('(?:a){3}?')
	})

	test('non-greedy bounded range', () => {
		expect(R.encodePattern(R.repeatedNonGreedy([2, 5], 'a'))).toBe('(?:a){2,5}?')
	})

	test('non-greedy open-ended range', () => {
		expect(R.encodePattern(R.repeatedNonGreedy([2], 'a'))).toBe('(?:a){2,}?')
	})

	test('empty content is elided', () => {
		expect(R.encodePattern(R.repeated(3, ''))).toBe('')
		expect(R.encodePattern(R.repeatedNonGreedy(3, ''))).toBe('')
		expect(R.encodePattern(R.repeated([2, 5], ''))).toBe('')
	})
})
