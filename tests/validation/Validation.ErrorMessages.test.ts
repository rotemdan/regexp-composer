import { describe, test, expect } from 'vitest'
import * as R from '../../src/exports/Exports.ts'

const emptyRange = [] as unknown as R.RepeatedRange
const oversizedRange = [1, 2, 3] as unknown as R.RepeatedRange

describe('repeated error messages', () => {
	test('a non-finite count', () => {
		expect(() => R.repeated(NaN, 'a')).toThrow('Repeated count must be a finite number (got NaN)')
		expect(() => R.repeated(Infinity, 'a')).toThrow('Repeated count must be a finite number (got Infinity)')
	})

	test('an empty or oversized range', () => {
		expect(() => R.repeated(emptyRange, 'a')).toThrow('Range should either be [min] or [min, max]')
		expect(() => R.repeated(oversizedRange, 'a')).toThrow('Range should either be [min] or [min, max]')
	})

	test('a non-finite minimum', () => {
		expect(() => R.repeated([Infinity, 2], 'a')).toThrow('Repeated minCount is invalid: Infinity')
	})

	test('a non-finite maximum', () => {
		expect(() => R.repeated([2, NaN], 'a')).toThrow('Repeated maxCount is invalid: NaN')
	})

	test('negative bounds', () => {
		expect(() => R.repeated([-1, 5], 'a')).toThrow('Repeated counts must be non-negative (got [-1, 5])')
	})

	test('a minimum above the maximum', () => {
		expect(() => R.repeated([5, 2], 'a')).toThrow('Repeated range is invalid: minCount 5 is greater than maxCount 2')
	})
})

describe('repeatedNonGreedy error messages', () => {
	test('a non-finite count', () => {
		expect(() => R.repeatedNonGreedy(-Infinity, 'a')).toThrow('Repeated count must be a finite number (got -Infinity)')
	})

	test('an empty range', () => {
		expect(() => R.repeatedNonGreedy(emptyRange, 'a')).toThrow('Range should either be [min] or [min, max]')
	})

	test('a non-finite minimum', () => {
		expect(() => R.repeatedNonGreedy([NaN, 2], 'a')).toThrow('Repeated minCount is invalid: NaN')
	})

	test('a non-finite maximum', () => {
		expect(() => R.repeatedNonGreedy([2, -Infinity], 'a')).toThrow('Repeated maxCount is invalid: -Infinity')
	})

	test('negative bounds', () => {
		expect(() => R.repeatedNonGreedy([0, -1], 'a')).toThrow('Repeated counts must be non-negative (got [0, -1])')
	})

	test('a minimum above the maximum', () => {
		expect(() => R.repeatedNonGreedy([5, 2], 'a')).toThrow('Repeated range is invalid: minCount 5 is greater than maxCount 2')
	})
})

describe('codepoint error messages', () => {
	test('NaN', () => {
		expect(() => R.codepoint(NaN)).toThrow('Codepoint is to NaN')
	})

	test('an out-of-range integer', () => {
		expect(() => R.codepoint(-1)).toThrow('Codepoint -1 is outside the accepted range of 0 to 1,114,111 (inclusive)')
		expect(() => R.codepoint(1114112)).toThrow('Codepoint 1114112 is outside the accepted range of 0 to 1,114,111 (inclusive)')
	})

	test('a malformed hex string', () => {
		expect(() => R.codepoint('ZZ')).toThrow("Codepoint 'ZZ' is invalid. It can only include between 1 and 6 hexadecimal digits.")
	})

	test('a hex string outside the accepted range', () => {
		expect(() => R.codepoint('110000')).toThrow('Codepoint 1114112 is outside the accepted range of 0 to 1,114,111 (inclusive)')
	})
})

describe('range error messages', () => {
	test('a reversed codepoint range', () => {
		expect(() => R.codepointRange('5a', '41')).toThrow("Character range is invalid. Starting hex code '5A' has codepoint higher then ending hex code '41'.")
	})

	test('a multi-codepoint charRange start and end', () => {
		expect(() => R.charRange('ab', 'c')).toThrow("Character range is invalid. Starting character 'ab' must be a single Unicode codepoint.")
		expect(() => R.charRange('a', 'bc')).toThrow("Character range is invalid. Ending character 'bc' must be a single Unicode codepoint.")
	})

	test('a reversed charRange', () => {
		expect(() => R.charRange('z', 'a')).toThrow("Character range is invalid. Starting character 'z' has codepoint higher then ending character 'a'.")
	})
})

describe('capture name error messages', () => {
	test('an empty name', () => {
		expect(() => R.captureAs('', 'a')).toThrow('Capture group name cannot be empty')
	})

	test('an invalid name', () => {
		expect(() => R.captureAs('1abc', 'a')).toThrow("Capture group name '1abc' is invalid. It must match /^[A-Za-z][A-Za-z0-9]*$/")
	})
})

describe('sameAs error messages', () => {
	test('an empty name', () => {
		expect(() => R.sameAs('')).toThrow("'sameAs' capture group name cannot be empty")
	})

	test('an out-of-range index', () => {
		expect(() => R.sameAs(10)).toThrow("'sameAs' capture group index can only be between 1 and 9. Please use named groups for indexes 10 or higher (see the online documentation for more details about this restriction).")
	})

	test('a fractional index', () => {
		expect(() => R.sameAs(1.5)).toThrow("'sameAs' capture group index cannot be a fractional number.")
	})
})

describe('encoder error messages', () => {
	test('an unrecognized pattern node', () => {
		const unknownPattern = { type: 'bogus' } as unknown as R.PatternExpression
		expect(() => R.encodePattern(unknownPattern)).toThrow('Unrecognized pattern type: bogus')
	})

	test('a multi-codepoint string in a negated character class', () => {
		expect(() => R.encodePattern(R.notAnyOfChars('ab'))).toThrow('The string pattern ab is not a single codepoint and cannot be included in a negated character class.')
	})

	test('a non-class node in a negated character class', () => {
		expect(() => R.encodePattern(R.notAnyOfChars(R.anyChar))).toThrow('The pattern [object Object] is not a single codepoint or class token and cannot be included in a negated character class.')
	})
})

describe('static analysis error messages', () => {
	test('an unresolvable numeric backreference', () => {
		expect(() => R.isPatternOptional(R.sameAs(3))).toThrow("Couldn't resolve backreference to a capture group at index 3")
	})

	test('an unresolvable named backreference', () => {
		expect(() => R.isPatternOptional(R.sameAs('missing'))).toThrow("Couldn't resolve backreference to a named capture group called 'missing'")
	})

	test('an unrecognized pattern node', () => {
		const unknownPattern = { type: 'bogus' } as unknown as R.PatternExpression
		expect(() => R.isPatternOptional(unknownPattern)).toThrow('Unrecognized pattern type: [object Object]')
	})
})
