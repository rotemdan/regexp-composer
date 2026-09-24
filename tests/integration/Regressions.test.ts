import { describe, test, expect } from 'vitest'
import * as R from '../../src/exports/Exports.ts'

// Each block guards a defect that was found and fixed earlier in the project's
// history. Only contracts that span more than one feature live here, so that
// every fix keeps a single guarding test. Regression cases that belong to one
// feature are asserted next to it, for example the empty-alternative contract in
// `tests/behavior/AnyOf.Behavior.test.ts` and the adjacent-digit backreference
// contract in `tests/behavior/Captures.Behavior.test.ts`.

describe('regression: character range escaping', () => {
	test('a range that starts with a caret is not emitted as a negation', () => {
		const re = R.buildRegExp([R.oneOrMore(R.charRange('^', 'a'))])

		expect(re.source).not.toContain('[^-')
		expect(re.test('^')).toBe(true)
		expect(re.test('_')).toBe(true)
		expect(re.test('`')).toBe(true)
		expect(re.test('a')).toBe(true)
		expect(re.test('b')).toBe(false)
		expect(re.test(']')).toBe(false)
	})

	test('a range that starts with a closing bracket is not terminated early', () => {
		const re = R.buildRegExp([R.inputStart, R.charRange(']', 'a'), R.inputEnd])

		expect(re.test(']')).toBe(true)
		expect(re.test('^')).toBe(true)
		expect(re.test('a')).toBe(true)
		expect(re.test('b')).toBe(false)
	})

	test('a range that ends with a backslash does not escape the closing bracket', () => {
		const re = R.buildRegExp([R.inputStart, R.charRange('9', '\\'), R.inputEnd])

		expect(re.test('9')).toBe(true)
		expect(re.test(':')).toBe(true)
		expect(re.test('\\')).toBe(true)
		expect(re.test('8')).toBe(false)
	})

	test('a range that starts with a dash is not read as a range operator', () => {
		const re = R.buildRegExp([R.inputStart, R.charRange('-', '9'), R.inputEnd])

		expect(re.test('-')).toBe(true)
		expect(re.test('.')).toBe(true)
		expect(re.test('9')).toBe(true)
		expect(re.test(':')).toBe(false)
	})
})

describe('regression: structural anchor classification', () => {
	test('a foreign token instance that is structurally an inputEnd is emitted as an anchor', () => {
		const foreignInputEnd = { type: 'specialToken', name: 'inputEnd', rawRegExp: '$' } as unknown as R.PatternExpression
		const re = R.buildRegExp(R.anyOf(R.newLine, foreignInputEnd))

		expect(re.source).toBe('(?:\\r?\\n|$)')
		expect(re.source).not.toContain('[$]')
		expect(re.exec('a$b')?.[0]).toBe('')
	})
})

describe('regression: dash members in negated classes', () => {
	test('a dash member does not open a character range', () => {
		const re = R.buildRegExp([R.oneOrMore(R.notAnyOfChars('a', '-', 'z'))])

		expect(re.test('m')).toBe(true)
		expect(re.test('-')).toBe(false)
		expect(re.test('a')).toBe(false)
		expect(re.test('z')).toBe(false)
	})
})
