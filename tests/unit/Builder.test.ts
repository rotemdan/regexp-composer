import { describe, test, expect } from 'vitest'
import * as R from '../../src/exports/Exports.ts'

describe('buildRegExp', () => {
	test('returns a RegExp built from the encoded pattern', () => {
		const re = R.buildRegExp(['a', '.', 'b'])
		expect(re).toBeInstanceOf(RegExp)
		expect(re.source).toBe('a\\.b')
	})

	test('a plain string is escaped', () => {
		expect(R.buildRegExp('a+b').source).toBe('a\\+b')
	})

	test('an option override keeps the other defaults', () => {
		const re = R.buildRegExp('a', { ignoreCase: true })
		expect(re.ignoreCase).toBe(true)
		expect(re.global).toBe(false)
		expect(re.sticky).toBe(false)
		expect(re.hasIndices).toBe(true)
	})
})

describe('special token constants', () => {
	const tokenCases = [
		{ token: R.inputStart, name: 'inputStart', rawRegExp: '^' },
		{ token: R.inputEnd, name: 'inputEnd', rawRegExp: '$' },
		{ token: R.anyChar, name: 'anyChar', rawRegExp: '.' },
		{ token: R.whitespace, name: 'whitespace', rawRegExp: '\\s' },
		{ token: R.nonWhitespace, name: 'nonWhitespace', rawRegExp: '\\S' },
		{ token: R.digit, name: 'digit', rawRegExp: '\\d' },
		{ token: R.nonDigit, name: 'nonDigit', rawRegExp: '\\D' },
		{ token: R.wordBoundary, name: 'wordBoundary', rawRegExp: '\\b' },
		{ token: R.nonWordBoundary, name: 'nonWordBoundary', rawRegExp: '\\B' },
		{ token: R.formFeed, name: 'formFeed', rawRegExp: '\\f' },
		{ token: R.lineFeed, name: 'lineFeed', rawRegExp: '\\n' },
		{ token: R.carriageReturn, name: 'carriageReturn', rawRegExp: '\\r' },
		{ token: R.tab, name: 'tab', rawRegExp: '\\t' },
		{ token: R.verticalTab, name: 'verticalTab', rawRegExp: '\\v' }
	]

	for (const { token, name, rawRegExp } of tokenCases) {
		test(`${name} has the expected shape and encoding`, () => {
			expect(token).toEqual({ type: 'specialToken', name, rawRegExp })
			expect(R.encodePattern(token)).toBe(rawRegExp)
		})
	}
})

describe('newLine', () => {
	test('is a sequence of an optional carriage return and a line feed', () => {
		expect(R.encodePattern(R.newLine)).toBe('\\r?\\n')
	})

	test('matches LF and CRLF but not CR alone', () => {
		const re = R.buildRegExp([R.inputStart, R.newLine, R.inputEnd])
		expect(re.test('\n')).toBe(true)
		expect(re.test('\r\n')).toBe(true)
		expect(re.test('\r')).toBe(false)
		expect(re.test('\n\n')).toBe(false)
	})
})
