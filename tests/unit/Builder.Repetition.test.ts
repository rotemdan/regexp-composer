import { describe, test, expect } from 'vitest'
import * as R from '../../src/exports/Exports.ts'

describe('possibly', () => {
	test('produces a possibly node', () => {
		expect(R.possibly('a')).toEqual({ type: 'possibly', content: 'a' })
	})
})

describe('zeroOrMore', () => {
	test('produces a greedy node', () => {
		expect(R.zeroOrMore('a')).toEqual({ type: 'zeroOrMore', content: 'a', greedy: true })
	})

	test('the non-greedy form only differs in the greedy flag', () => {
		expect(R.zeroOrMoreNonGreedy('a')).toEqual({ type: 'zeroOrMore', content: 'a', greedy: false })
	})
})

describe('oneOrMore', () => {
	test('produces a greedy node', () => {
		expect(R.oneOrMore('a')).toEqual({ type: 'oneOrMore', content: 'a', greedy: true })
	})

	test('the non-greedy form only differs in the greedy flag', () => {
		expect(R.oneOrMoreNonGreedy('a')).toEqual({ type: 'oneOrMore', content: 'a', greedy: false })
	})
})

describe('repeated', () => {
	test('a count becomes a closed range', () => {
		expect(R.repeated(3, 'a')).toEqual({ type: 'repeated', minCount: 3, maxCount: 3, content: 'a', greedy: true })
	})

	test('a single-element range is open ended', () => {
		expect(R.repeated([2], 'a')).toEqual({ type: 'repeated', minCount: 2, maxCount: Infinity, content: 'a', greedy: true })
	})

	test('a two-element range keeps both bounds', () => {
		expect(R.repeated([2, 5], 'a')).toEqual({ type: 'repeated', minCount: 2, maxCount: 5, content: 'a', greedy: true })
	})

	test('a fractional count is truncated', () => {
		expect(R.repeated(3.9, 'a')).toEqual({ type: 'repeated', minCount: 3, maxCount: 3, content: 'a', greedy: true })
	})

	test('a fractional range is truncated on both bounds', () => {
		expect(R.repeated([1.9, 3.9], 'a')).toEqual({ type: 'repeated', minCount: 1, maxCount: 3, content: 'a', greedy: true })
	})

	test('the non-greedy form only differs in the greedy flag', () => {
		expect(R.repeatedNonGreedy(3, 'a')).toEqual({ type: 'repeated', minCount: 3, maxCount: 3, content: 'a', greedy: false })
		expect(R.repeatedNonGreedy([2, 5], 'a')).toEqual({ type: 'repeated', minCount: 2, maxCount: 5, content: 'a', greedy: false })
	})
})
