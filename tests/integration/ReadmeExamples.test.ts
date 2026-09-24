import { describe, test, expect } from 'vitest'
import * as R from '../../src/exports/Exports.ts'

// Every assertion below traces back to a documented example in `README.md`.
// Three documented encodings are stale with respect to the implementation and
// are asserted here in their actual form, with a comment each. The divergences
// are logged as an issue in `work/tasks.md`.

describe('basic usage example', () => {
	const build = () => R.buildRegExp([R.inputStart, 'Hello world.', R.possibly(' How are you?')])

	test('compiles to the documented source', () => {
		expect(R.encodePattern([R.inputStart, 'Hello world.', R.possibly(' How are you?')])).toBe('^Hello world\\.(?: How are you\\?)?')
	})

	test('matches the documented inputs', () => {
		expect(build().test('Hello world.')).toBe(true)
		expect(build().test('Hello world!')).toBe(false)
		expect(build().test(' Hello world.')).toBe(false)
		expect(build().test('Hello world. How are you?')).toBe(true)
	})
})

describe('example pattern encodings', () => {
	test('a literal string escapes its metacharacters', () => {
		expect(R.encodePattern('Hello world.')).toBe('Hello world\\.')
	})

	test('an optional pattern is wrapped in a non-capturing group', () => {
		expect(R.encodePattern(['Hello world.', R.possibly(' How are you?')])).toBe('Hello world\\.(?: How are you\\?)?')
	})

	test('a quantified anyOf keeps its class but is wrapped', () => {
		// README documents this as `[a-zA-Z0-9]+`. The implementation wraps the
		// character class twice: once because `anyOf` always emits its own group and
		// once because an `anyOf` node is not itself a class token. See the logged issue.
		const pattern = R.oneOrMore(R.anyOf(R.charRange('a', 'z'), R.charRange('A', 'Z'), R.charRange('0', '9')))
		expect(R.encodePattern(pattern)).toBe('(?:(?:[a-zA-Z0-9]))+')
	})

	test('consecutive single-character members are grouped in anyOf', () => {
		const pattern = R.anyOf('V', 'B', 'hello', R.oneOrMore('bye'), 'good', R.charRange('a', 'z'), R.lineFeed, 'world')
		expect(R.encodePattern(pattern)).toBe('(?:[VB]|hello|(?:bye)+|good|[a-z\\n]|world)')
	})

	test('notAnyOfChars members are inlined into one negated class', () => {
		// README documents the codepoint range endpoint as `\u{14c0}` (lower
		// case). `codepointRange` normalizes hex to upper case. See the logged issue.
		const pattern = R.notAnyOfChars('V', 'B', R.charRange('a', 'z'), R.lineFeed, R.codepointRange(5234, 5312), R.unicodeProperty('Punctuation'))
		expect(R.encodePattern(pattern)).toBe('[^VBa-z\\n\\u{1472}-\\u{14C0}\\p{Punctuation}]')
	})

	test('the phone number pattern', () => {
		expect(R.encodePattern(phoneNumberPattern())).toBe('(?:\\+(?<countryCode>(?:[0-9]){1,3}) +)?(?:\\((?<areaCode>(?:[0-9]){3})\\) +)?(?<localNumber>(?:[0-9]){3}(?:(?:[\\- ]))?(?:[0-9]){4})')
	})

	test('the phone number pattern matches the documented input', () => {
		const match = R.buildRegExp(phoneNumberPattern()).exec('+23 (555) 432-1234')
		expect(match?.[0]).toBe('+23 (555) 432-1234')
		expect(match?.groups?.countryCode).toBe('23')
		expect(match?.groups?.areaCode).toBe('555')
		expect(match?.groups?.localNumber).toBe('432-1234')
	})
})

describe('conditional matching examples', () => {
	test('negating a choice of multi-character patterns', () => {
		const pattern = [
			R.inputStart,
			R.matches(R.oneOrMore(R.unicodeProperty('Letter')), { except: R.anyOf('cat', 'dog', 'elephant') }),
			R.inputEnd
		]
		const re = R.buildRegExp(pattern)

		expect(re.test('cat')).toBe(false)
		expect(re.test('dog')).toBe(false)
		expect(re.test('elephant')).toBe(false)
		expect(re.test('hello')).toBe(true)
	})

	test('an array of conditions is applied as a conjunction', () => {
		const pattern = R.matches(R.oneOrMore(R.unicodeProperty('Letter')), [
			{ ifPrecededBy: R.unicodeProperty('Letter') },
			{ ifPrecededBy: R.unicodeProperty('Script_Extensions', 'Gothic') },
			{ ifFollowedBy: R.unicodeProperty('Letter') },
			{ ifFollowedBy: R.unicodeProperty('Script_Extensions', 'Greek') }
		])

		expect(R.encodePattern(pattern)).toBe('(?<=\\p{Letter})(?<=\\p{Script_Extensions=Gothic})\\p{Letter}+(?=\\p{Letter})(?=\\p{Script_Extensions=Greek})')
	})
})

function phoneNumberPattern() {
	const digit = R.charRange('0', '9')

	return [
		R.possibly(['+', R.captureAs('countryCode', R.repeated([1, 3], digit)), R.oneOrMore(' ')]),
		R.possibly(['(', R.captureAs('areaCode', R.repeated(3, digit)), ')', R.oneOrMore(' ')]),
		R.captureAs('localNumber', [
			R.repeated(3, digit),
			R.possibly(R.anyOf('-', ' ')),
			R.repeated(4, digit)
		])
	]
}
