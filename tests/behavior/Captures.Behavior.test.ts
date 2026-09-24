import { describe, test, expect } from 'vitest'
import * as R from '../../src/exports/Exports.ts'

describe('capture and backreference behavior', () => {
	test('unnamed capture and numeric backreference', () => {
		const re = R.buildRegExp([R.capture('ab'), R.sameAs(1)])
		expect(re.test('abab')).toBe(true)
		expect(re.test('abac')).toBe(false)
	})

	test('named capture and named backreference', () => {
		const re = R.buildRegExp([R.captureAs('g', 'ab'), R.sameAs('g')])
		expect(re.test('abab')).toBe(true)
		expect(re.exec('abab')?.groups?.g).toBe('ab')
	})

	test('a numeric backreference adjacent to a digit is not read as a multi-digit reference', () => {
		const re = R.buildRegExp([R.capture('a'), R.sameAs(1), '2'])
		expect(re.test('aa2')).toBe(true)
		expect(re.test('ab2')).toBe(false)
	})

	test('nested captures receive sequential indices', () => {
		const re = R.buildRegExp([R.capture(R.anyOf(R.capture('a'), R.capture('b')))])
		const match = 'a'.match(re)!
		expect(match[1]).toBe('a')
		expect(match[2]).toBe('a')
		expect(match[3]).toBeUndefined()
	})

	test('a forward numeric reference matches the empty string', () => {
		const re = R.buildRegExp([R.sameAs(1), R.capture('a')])
		expect(re.test('a')).toBe(true)
	})
})
