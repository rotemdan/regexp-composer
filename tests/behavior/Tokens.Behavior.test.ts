import { describe, test, expect } from 'vitest'
import * as R from '../../src/exports/Exports.ts'

const exactMatchCases = [
	{ token: R.anyChar, matching: ['a', '\n', '😀'], nonMatching: [''] },
	{ token: R.whitespace, matching: [' ', '\t', '\n'], nonMatching: ['a', ''] },
	{ token: R.nonWhitespace, matching: ['a', '1'], nonMatching: [' ', ''] },
	{ token: R.digit, matching: ['0', '9'], nonMatching: ['a', ''] },
	{ token: R.nonDigit, matching: ['a', ' '], nonMatching: ['5', ''] },
	{ token: R.formFeed, matching: ['\f'], nonMatching: ['a', ''] },
	{ token: R.lineFeed, matching: ['\n'], nonMatching: ['\r', ''] },
	{ token: R.carriageReturn, matching: ['\r'], nonMatching: ['\n', ''] },
	{ token: R.tab, matching: ['\t'], nonMatching: [' ', ''] },
	{ token: R.verticalTab, matching: ['\v'], nonMatching: [' ', ''] }
]

describe('single-character tokens', () => {
	for (const { token, matching, nonMatching } of exactMatchCases) {
		test(`the ${token.name} token matches exactly its own characters`, () => {
			const re = R.buildRegExp([R.inputStart, token, R.inputEnd])

			for (const input of matching) {
				expect(re.test(input), `${token.name} should match ${JSON.stringify(input)}`).toBe(true)
			}

			for (const input of nonMatching) {
				expect(re.test(input), `${token.name} should not match ${JSON.stringify(input)}`).toBe(false)
			}
		})
	}
})

describe('zero-width tokens', () => {
	test('inputStart matches only at the beginning', () => {
		expect(R.buildRegExp([R.inputStart, 'a']).test('ab')).toBe(true)
		expect(R.buildRegExp([R.inputStart, 'b']).test('ab')).toBe(false)
	})

	test('inputEnd matches only at the end', () => {
		expect(R.buildRegExp(['b', R.inputEnd]).test('ab')).toBe(true)
		expect(R.buildRegExp(['a', R.inputEnd]).test('ab')).toBe(false)
	})

	test('wordBoundary matches at word edges only', () => {
		expect(R.buildRegExp(R.wordBoundary).test('a')).toBe(true)
		expect(R.buildRegExp(R.wordBoundary).test(' ')).toBe(false)
		expect(R.buildRegExp(R.wordBoundary).test('')).toBe(false)
	})

	test('nonWordBoundary matches everywhere but word edges', () => {
		expect(R.buildRegExp(R.nonWordBoundary).test(' ')).toBe(true)
		expect(R.buildRegExp(R.nonWordBoundary).test('')).toBe(true)
		expect(R.buildRegExp(R.nonWordBoundary).test('a')).toBe(false)
	})
})
