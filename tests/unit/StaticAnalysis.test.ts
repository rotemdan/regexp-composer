import { describe, test, expect } from 'vitest'
import * as R from '../../src/exports/Exports.ts'

describe('isPatternOptional: literals and sequences', () => {
	test('the empty string is optional', () => {
		expect(R.isPatternOptional('')).toBe(true)
	})

	test('a non-empty literal is not optional', () => {
		expect(R.isPatternOptional('a')).toBe(false)
	})

	test('an empty array is optional', () => {
		expect(R.isPatternOptional([])).toBe(true)
	})

	test('an array of optional elements is optional', () => {
		expect(R.isPatternOptional(['', ''])).toBe(true)
	})

	test('an array with a non-optional element is not optional', () => {
		expect(R.isPatternOptional(['', 'a'])).toBe(false)
	})

	test('an array stops at its first non-optional element', () => {
		// The trailing backreference is unresolvable and would throw if the array
		// evaluation reached it, so this also pins the short-circuit order.
		expect(R.isPatternOptional(['a', R.sameAs(1)])).toBe(false)
	})
})

describe('isPatternOptional: special tokens', () => {
	const optionalTokens = [R.inputStart, R.inputEnd, R.nonWordBoundary]

	const nonOptionalTokens = [
		R.anyChar,
		R.whitespace,
		R.nonWhitespace,
		R.digit,
		R.nonDigit,
		R.wordBoundary,
		R.formFeed,
		R.lineFeed,
		R.carriageReturn,
		R.tab,
		R.verticalTab
	]

	for (const token of optionalTokens) {
		test(`the ${token.name} token is optional`, () => {
			expect(R.isPatternOptional(token)).toBe(R.buildRegExp(token).test(''))
			expect(R.isPatternOptional(token)).toBe(true)
		})
	}

	for (const token of nonOptionalTokens) {
		test(`the ${token.name} token is not optional`, () => {
			expect(R.isPatternOptional(token)).toBe(R.buildRegExp(token).test(''))
			expect(R.isPatternOptional(token)).toBe(false)
		})
	}

	test('a zero-member notAnyOfChars is optional', () => {
		expect(R.isPatternOptional(R.notAnyOfChars())).toBe(true)
	})

	test('a populated notAnyOfChars is not optional', () => {
		expect(R.isPatternOptional(R.notAnyOfChars('a'))).toBe(false)
	})
})

describe('isPatternOptional: quantifiers', () => {
	test('possibly is optional regardless of its content', () => {
		expect(R.isPatternOptional(R.possibly('a'))).toBe(true)
		expect(R.isPatternOptional(R.possibly('ab'))).toBe(true)
	})

	test('zeroOrMore is optional regardless of its content', () => {
		expect(R.isPatternOptional(R.zeroOrMore('a'))).toBe(true)
		expect(R.isPatternOptional(R.zeroOrMore(R.digit))).toBe(true)
	})

	test('oneOrMore follows its content', () => {
		expect(R.isPatternOptional(R.oneOrMore(''))).toBe(true)
		expect(R.isPatternOptional(R.oneOrMore('a'))).toBe(false)
	})

	test('repeated with a minimum of zero is optional', () => {
		expect(R.isPatternOptional(R.repeated(0, 'a'))).toBe(true)
		expect(R.isPatternOptional(R.repeated([0, 3], 'a'))).toBe(true)
	})

	test('repeated with a minimum above zero follows its content', () => {
		expect(R.isPatternOptional(R.repeated(2, ''))).toBe(true)
		expect(R.isPatternOptional(R.repeated(2, 'a'))).toBe(false)
	})

	test('repeatedNonGreedy uses the same rules', () => {
		expect(R.isPatternOptional(R.repeatedNonGreedy([0, 2], 'a'))).toBe(true)
		expect(R.isPatternOptional(R.repeatedNonGreedy(2, 'a'))).toBe(false)
	})

	test('possibly and zeroOrMore do not surface an unresolvable content', () => {
		expect(R.isPatternOptional(R.possibly(R.sameAs(1)))).toBe(true)
		expect(R.isPatternOptional(R.zeroOrMore(R.sameAs(1)))).toBe(true)
	})
})

describe('isPatternOptional: captures and backreferences', () => {
	test('a capture follows its content', () => {
		expect(R.isPatternOptional(R.capture(''))).toBe(true)
		expect(R.isPatternOptional(R.capture('a'))).toBe(false)
	})

	test('a named capture follows its content', () => {
		expect(R.isPatternOptional(R.captureAs('group', ''))).toBe(true)
		expect(R.isPatternOptional(R.captureAs('group', 'a'))).toBe(false)
	})

	test('an unresolved numeric backreference throws', () => {
		expect(() => R.isPatternOptional(R.sameAs(1))).toThrow(`Couldn't resolve backreference to a capture group at index 1`)
	})

	test('an unresolved named backreference throws', () => {
		expect(() => R.isPatternOptional(R.sameAs('group'))).toThrow(`Couldn't resolve backreference to a named capture group called 'group'`)
	})

	test('a numeric backreference resolves to its capture group', () => {
		expect(R.isPatternOptional([R.capture(''), R.sameAs(1)])).toBe(true)
	})

	test('a named backreference resolves to its capture group', () => {
		expect(R.isPatternOptional([R.captureAs('group', ''), R.sameAs('group')])).toBe(true)
	})

	test('a backreference to a non-optional group resolves to false', () => {
		expect(R.isPatternOptional(R.anyOf(R.capture('a'), R.sameAs(1)))).toBe(false)
		expect(R.isPatternOptional(R.anyOf(R.captureAs('group', 'a'), R.sameAs('group')))).toBe(false)
	})

	test('capture groups are indexed in document order', () => {
		expect(R.isPatternOptional([R.capture([R.capture('')]), R.sameAs(2)])).toBe(true)
	})
})

describe('isPatternOptional: anyOf', () => {
	test('is optional when any member is optional', () => {
		expect(R.isPatternOptional(R.anyOf('', 'a'))).toBe(true)
		expect(R.isPatternOptional(R.anyOf('a', R.possibly('b')))).toBe(true)
	})

	test('is not optional when no member is optional', () => {
		expect(R.isPatternOptional(R.anyOf('a', 'b'))).toBe(false)
	})

	test('a zero-member anyOf is optional, matching the empty pattern encoding', () => {
		expect(R.buildRegExp(R.anyOf()).test('')).toBe(true)
		expect(R.isPatternOptional(R.anyOf())).toBe(true)
	})
})

describe('isPatternOptional: lookarounds', () => {
	test('precededBy and followedBy follow their content', () => {
		expect(R.isPatternOptional({ type: 'precededBy', content: '' })).toBe(true)
		expect(R.isPatternOptional({ type: 'precededBy', content: 'a' })).toBe(false)
		expect(R.isPatternOptional({ type: 'followedBy', content: '' })).toBe(true)
		expect(R.isPatternOptional({ type: 'followedBy', content: 'a' })).toBe(false)
	})

	test('an empty negative lookaround is elided and therefore optional', () => {
		expect(R.isPatternOptional({ type: 'notPrecededBy', content: '' })).toBe(true)
		expect(R.isPatternOptional({ type: 'notFollowedBy', content: '' })).toBe(true)
	})

	test('a negative lookaround is optional when its content is not', () => {
		expect(R.isPatternOptional({ type: 'notPrecededBy', content: 'a' })).toBe(true)
		expect(R.isPatternOptional({ type: 'notFollowedBy', content: 'a' })).toBe(true)
	})

	test('a negative lookaround with optional content is not optional', () => {
		expect(R.isPatternOptional({ type: 'notPrecededBy', content: R.zeroOrMore('a') })).toBe(false)
		expect(R.isPatternOptional({ type: 'notFollowedBy', content: R.possibly('b') })).toBe(false)
	})
})

describe('isPatternOptional: unknown nodes', () => {
	test('an unrecognized type throws', () => {
		const unknownPattern = { type: 'bogus' } as unknown as R.PatternExpression
		expect(() => R.isPatternOptional(unknownPattern)).toThrow('Unrecognized pattern type: [object Object]')
	})
})
