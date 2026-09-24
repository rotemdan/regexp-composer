import { describe, test, expect } from 'vitest'
import * as R from '../../src/exports/Exports.ts'

describe('anyOf matching behavior', () => {
	test('matches any of its alternatives', () => {
		const re = R.buildRegExp(R.anyOf('a', 'b', 'hello'))
		expect(re.test('a')).toBe(true)
		expect(re.test('hello')).toBe(true)
		expect(re.test('c')).toBe(false)
	})

	test('single-character alternatives unify into a class', () => {
		const re = R.buildRegExp(R.anyOf('a', 'b', 'c'))
		expect(re.test('b')).toBe(true)
		expect(re.test('d')).toBe(false)
	})

	test('the first matching alternative wins at a position', () => {
		expect(R.buildRegExp(R.anyOf('ab', 'a')).exec('ab')?.[0]).toBe('ab')
	})

	test('an empty alternative matches the empty string', () => {
		const re = R.buildRegExp([R.inputStart, R.anyOf('ab', ''), R.inputEnd])
		expect(re.test('')).toBe(true)
		expect(re.test('ab')).toBe(true)
		expect(re.test('cd')).toBe(false)
	})

	test('nested anyOf matches the inner alternatives', () => {
		const re = R.buildRegExp(R.anyOf(R.anyOf('a', 'b'), 'c'))
		expect(re.test('a')).toBe(true)
		expect(re.test('c')).toBe(true)
	})

	test('a literal dash member matches a dash', () => {
		const re = R.buildRegExp(R.oneOrMore(R.anyOf('a', '-', 'b')))
		expect(re.test('a-b')).toBe(true)
	})

	test('metacharacter tokens keep their semantics inside anyOf', () => {
		const re = R.buildRegExp(R.anyOf(R.anyChar, 'a'))
		expect(re.test('a')).toBe(true)
		expect(re.test('\n')).toBe(true)
	})
})
