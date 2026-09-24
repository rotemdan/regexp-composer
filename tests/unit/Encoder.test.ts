import { describe, test, expect } from 'vitest'
import * as R from '../../src/exports/Exports.ts'

describe('encodePattern: literals and sequences', () => {
	test('string literal is escaped', () => {
		expect(R.encodePattern('a.b')).toBe('a\\.b')
		expect(R.encodePattern('a*b')).toBe('a\\*b')
	})

	test('empty string encodes to the empty pattern', () => {
		expect(R.encodePattern('')).toBe('')
	})

	test('array concatenates elements with no separator', () => {
		expect(R.encodePattern(['a', 'b', 'c'])).toBe('abc')
	})

	test('nested arrays concatenate through recursion', () => {
		expect(R.encodePattern([['a', 'b'], ['c']])).toBe('abc')
	})

	test('empty array encodes to the empty pattern', () => {
		expect(R.encodePattern([])).toBe('')
	})
})

describe('encodePattern: special tokens', () => {
	test('plain token emits its rawRegExp', () => {
		expect(R.encodePattern(R.inputStart)).toBe('^')
		expect(R.encodePattern(R.digit)).toBe('\\d')
	})

	test('range tokens are wrapped in a character class by default', () => {
		expect(R.encodePattern(R.charRange('a', 'z'))).toBe('[a-z]')
		expect(R.encodePattern(R.codepointRange('41', '5a'))).toBe('[\\u{41}-\\u{5A}]')
	})

	test('range tokens are emitted bare when wrapRangeTokens is false', () => {
		expect(R.encodePattern(R.charRange('a', 'z'), false)).toBe('a-z')
		expect(R.encodePattern(R.codepointRange('41', '5a'), false)).toBe('\\u{41}-\\u{5A}')
	})
})

describe('encodePattern: lookarounds', () => {
	test('positive lookbehind', () => {
		expect(R.encodePattern({ type: 'precededBy', content: 'a' } as any)).toBe('(?<=a)')
	})

	test('negative lookbehind', () => {
		expect(R.encodePattern({ type: 'notPrecededBy', content: 'a' } as any)).toBe('(?<!a)')
	})

	test('positive lookahead', () => {
		expect(R.encodePattern({ type: 'followedBy', content: 'a' } as any)).toBe('(?=a)')
	})

	test('negative lookahead', () => {
		expect(R.encodePattern({ type: 'notFollowedBy', content: 'a' } as any)).toBe('(?!a)')
	})

	test('empty lookarounds are elided', () => {
		expect(R.encodePattern({ type: 'precededBy', content: '' } as any)).toBe('')
		expect(R.encodePattern({ type: 'notPrecededBy', content: '' } as any)).toBe('')
		expect(R.encodePattern({ type: 'followedBy', content: '' } as any)).toBe('')
		expect(R.encodePattern({ type: 'notFollowedBy', content: '' } as any)).toBe('')
	})
})

describe('encodePattern: captures and backreferences', () => {
	test('unnamed capture', () => {
		expect(R.encodePattern(R.capture('ab'))).toBe('(ab)')
	})

	test('named capture', () => {
		expect(R.encodePattern(R.captureAs('group', 'ab'))).toBe('(?<group>ab)')
	})

	test('capture of empty content', () => {
		expect(R.encodePattern(R.capture(''))).toBe('()')
	})

	test('numeric backreference', () => {
		expect(R.encodePattern(R.sameAs(1))).toBe('(?:\\1)')
	})

	test('named backreference', () => {
		expect(R.encodePattern(R.sameAs('group'))).toBe('\\k<group>')
	})
})

describe('encodePattern: unknown nodes', () => {
	test('throws on an unrecognized type', () => {
		expect(() => R.encodePattern({ type: 'bogus' } as any)).toThrow('Unrecognized pattern type: bogus')
	})
})
