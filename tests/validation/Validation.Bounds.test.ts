import { describe, test, expect } from 'vitest'
import * as R from '../../src/exports/Exports.ts'

// The range-length guards exist for malformed input that the type system
// normally prevents, so those arguments are cast in the calls below.
const emptyRange = [] as unknown as R.RepeatedRange
const oversizedRange = [1, 2, 3] as unknown as R.RepeatedRange

describe('repeated bounds', () => {
	test('a non-finite count is rejected', () => {
		expect(() => R.repeated(NaN, 'a')).toThrow()
		expect(() => R.repeated(Infinity, 'a')).toThrow()
		expect(() => R.repeated(-Infinity, 'a')).toThrow()
	})

	test('an empty or oversized range is rejected', () => {
		expect(() => R.repeated(emptyRange, 'a')).toThrow()
		expect(() => R.repeated(oversizedRange, 'a')).toThrow()
	})

	test('negative bounds are rejected', () => {
		expect(() => R.repeated([-1, 5], 'a')).toThrow()
		expect(() => R.repeated([0, -1], 'a')).toThrow()
	})

	test('a non-finite minimum is rejected', () => {
		expect(() => R.repeated([Infinity, 2], 'a')).toThrow()
		expect(() => R.repeated([NaN, 2], 'a')).toThrow()
	})

	test('a non-finite maximum is rejected', () => {
		expect(() => R.repeated([2, NaN], 'a')).toThrow()
		expect(() => R.repeated([2, -Infinity], 'a')).toThrow()
	})

	test('a minimum above the maximum is rejected', () => {
		expect(() => R.repeated([5, 2], 'a')).toThrow()
	})
})

describe('repeatedNonGreedy bounds', () => {
	test('a non-finite count is rejected', () => {
		expect(() => R.repeatedNonGreedy(NaN, 'a')).toThrow()
		expect(() => R.repeatedNonGreedy(Infinity, 'a')).toThrow()
	})

	test('an empty or oversized range is rejected', () => {
		expect(() => R.repeatedNonGreedy(emptyRange, 'a')).toThrow()
		expect(() => R.repeatedNonGreedy(oversizedRange, 'a')).toThrow()
	})

	test('negative bounds are rejected', () => {
		expect(() => R.repeatedNonGreedy([-1, 5], 'a')).toThrow()
		expect(() => R.repeatedNonGreedy([0, -1], 'a')).toThrow()
	})

	test('a non-finite minimum is rejected', () => {
		expect(() => R.repeatedNonGreedy([NaN, 2], 'a')).toThrow()
	})

	test('a non-finite maximum is rejected', () => {
		expect(() => R.repeatedNonGreedy([2, -Infinity], 'a')).toThrow()
	})

	test('a minimum above the maximum is rejected', () => {
		expect(() => R.repeatedNonGreedy([5, 2], 'a')).toThrow()
	})
})

describe('codepoint validation', () => {
	test('NaN is rejected', () => {
		expect(() => R.codepoint(NaN)).toThrow()
	})

	test('out-of-range integers are rejected', () => {
		expect(() => R.codepoint(-1)).toThrow()
		expect(() => R.codepoint(1114112)).toThrow()
	})

	test('malformed hex is rejected', () => {
		expect(() => R.codepoint('ZZ')).toThrow()
		expect(() => R.codepoint('0x41')).toThrow()
		expect(() => R.codepoint('1234567')).toThrow()
		expect(() => R.codepoint('')).toThrow()
	})

	test('a hex value outside the accepted range is rejected', () => {
		expect(() => R.codepoint('110000')).toThrow()
	})
})

describe('codepointRange validation', () => {
	test('malformed hex is rejected for either endpoint', () => {
		expect(() => R.codepointRange('ZZ', '41')).toThrow()
		expect(() => R.codepointRange('41', 'ZZ')).toThrow()
	})

	test('reversed bounds are rejected', () => {
		expect(() => R.codepointRange('5a', '41')).toThrow()
	})

	test('out-of-range numeric bounds are rejected', () => {
		expect(() => R.codepointRange(-1, 5)).toThrow()
		expect(() => R.codepointRange(5, 1114112)).toThrow()
	})
})

describe('charRange validation', () => {
	test('a multi-codepoint start is rejected', () => {
		expect(() => R.charRange('ab', 'c')).toThrow()
		expect(() => R.charRange('e\u0301', 'z')).toThrow()
	})

	test('a multi-codepoint end is rejected', () => {
		expect(() => R.charRange('a', 'bc')).toThrow()
	})

	test('an empty start is rejected', () => {
		expect(() => R.charRange('', 'a')).toThrow()
	})

	test('an empty end is rejected', () => {
		expect(() => R.charRange('a', '')).toThrow()
	})

	test('reversed bounds are rejected', () => {
		expect(() => R.charRange('z', 'a')).toThrow()
	})
})

describe('notAnyOfChars validation', () => {
	test('a multi-codepoint member is rejected', () => {
		expect(() => R.encodePattern(R.notAnyOfChars('ab'))).toThrow()
	})

	test('every metacharacter token is rejected', () => {
		expect(() => R.encodePattern(R.notAnyOfChars(R.anyChar))).toThrow()
		expect(() => R.encodePattern(R.notAnyOfChars(R.inputStart))).toThrow()
		expect(() => R.encodePattern(R.notAnyOfChars(R.inputEnd))).toThrow()
		expect(() => R.encodePattern(R.notAnyOfChars(R.wordBoundary))).toThrow()
		expect(() => R.encodePattern(R.notAnyOfChars(R.nonWordBoundary))).toThrow()
	})

	test('a class token is accepted', () => {
		expect(() => R.encodePattern(R.notAnyOfChars(R.digit))).not.toThrow()
	})
})

describe('captureAs validation', () => {
	test('an empty name is rejected', () => {
		expect(() => R.captureAs('', 'a')).toThrow()
	})

	test('a name that does not start with a letter is rejected', () => {
		expect(() => R.captureAs('1abc', 'a')).toThrow()
	})

	test('a name with a non-alphanumeric character is rejected', () => {
		expect(() => R.captureAs('a b', 'a')).toThrow()
		expect(() => R.captureAs('a_b', 'a')).toThrow()
	})
})

describe('sameAs validation', () => {
	test('an empty name is rejected', () => {
		expect(() => R.sameAs('')).toThrow()
	})

	test('an out-of-range index is rejected', () => {
		expect(() => R.sameAs(0)).toThrow()
		expect(() => R.sameAs(10)).toThrow()
	})

	test('a fractional index is rejected', () => {
		expect(() => R.sameAs(1.5)).toThrow()
	})

	test('a value that is neither a string nor a number is not validated', () => {
		// Unhandled condition: such a value passes both validation branches and
		// is accepted as-is.
		const invalidValue = true as unknown as number
		expect(() => R.sameAs(invalidValue)).not.toThrow()
		expect(R.sameAs(invalidValue)).toEqual({ type: 'sameAs', captureGroupNameOrIndex: true })
	})
})
