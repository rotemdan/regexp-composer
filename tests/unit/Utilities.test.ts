import { describe, test, expect } from 'vitest'
import { escapeStringForRegExp, escapeCharForCharClass } from '../../src/regexp/Utilities.ts'

const escapedMetacharacters = [
	['.', '\\.'],
	['*', '\\*'],
	['+', '\\+'],
	['?', '\\?'],
	['^', '\\^'],
	['$', '\\$'],
	['{', '\\{'],
	['}', '\\}'],
	['(', '\\('],
	[')', '\\)'],
	['|', '\\|'],
	['[', '\\['],
	[']', '\\]'],
	['\\', '\\\\']
]

describe('escapeStringForRegExp', () => {
	test('escapes every metacharacter', () => {
		for (const [input, expected] of escapedMetacharacters) {
			expect(escapeStringForRegExp(input), `for ${JSON.stringify(input)}`).toBe(expected)
		}
	})

	test('leaves non-metacharacters unchanged', () => {
		for (const input of ['a', 'Z', '9', ' ', '_', ':', '/', '-', '😀', 'α']) {
			expect(escapeStringForRegExp(input), `for ${JSON.stringify(input)}`).toBe(input)
		}
	})

	test('returns the empty string for the empty input', () => {
		expect(escapeStringForRegExp('')).toBe('')
	})

	test('escapes metacharacters inside a longer string', () => {
		expect(escapeStringForRegExp('a.b*c(d)')).toBe('a\\.b\\*c\\(d\\)')
	})

	test('handles unicode text', () => {
		expect(escapeStringForRegExp('Cześć.')).toBe('Cześć\\.')
	})
})

describe('escapeCharForCharClass', () => {
	test('escapes the characters that are special inside a class', () => {
		expect(escapeCharForCharClass('-')).toBe('\\-')
		expect(escapeCharForCharClass(']')).toBe('\\]')
		expect(escapeCharForCharClass('^')).toBe('\\^')
		expect(escapeCharForCharClass('\\')).toBe('\\\\')
	})

	test('escapes the remaining metacharacters as well', () => {
		expect(escapeCharForCharClass('.')).toBe('\\.')
		expect(escapeCharForCharClass('$')).toBe('\\$')
	})

	test('leaves an ordinary character unchanged', () => {
		expect(escapeCharForCharClass('a')).toBe('a')
		expect(escapeCharForCharClass(' ')).toBe(' ')
	})
})
