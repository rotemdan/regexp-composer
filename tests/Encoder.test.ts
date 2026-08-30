import { describe, test, expect } from 'vitest'
import * as R from '../src/exports/Exports.ts'

// ── Basic encoding ──────────────────────────────────────────────────────────

describe('encodePattern / buildRegExp — basics', () => {
	test('string literal is escaped', () => {
		expect(R.encodePattern('a.b')).toBe('a\\.b')
		expect(R.encodePattern('a*b')).toBe('a\\*b')
	})

	test('sequence is concatenation', () => {
		expect(R.encodePattern(['ab', 'cd'])).toBe('ab cd'.replace(' ', '') /* sanity: no separator */)
		expect(R.encodePattern(['a', 'b', 'c'])).toBe('abc')
	})

	test('anyOf char class vs alternation', () => {
		// single-char members are grouped into a character class
		expect(R.encodePattern(R.anyOf('a', 'b', R.charRange('0', '9')))).toBe('(?:[ab0-9])')
		// multi-char forces alternation
		expect(R.encodePattern(R.anyOf('a', 'hello'))).toBe('(?:[a]|hello)')
	})

	test('notAnyOfChars', () => {
		expect(R.encodePattern(R.notAnyOfChars('a', 'b'))).toBe('[^ab]')
	})

	test('repeated', () => {
		expect(R.encodePattern(R.repeated(3, 'a'))).toBe('(?:a){3}')
		expect(R.encodePattern(R.repeated([2, 5], 'a'))).toBe('(?:a){2,5}')
		expect(R.encodePattern(R.repeated([2], 'a'))).toBe('(?:a){2,}')
	})
})

// ── Regression: quantifier wrapping (the isStringOrClassToken bug) ──────────

describe('regression: possibly / zeroOrMore / oneOrMore wrapping', () => {
	test.each([
		['possibly single char is bare suffix', R.possibly('a'), 'a?'],
		['possibly multi-char is grouped', R.possibly('ab'), '(?:ab)?'],
		['zeroOrMore single char', R.zeroOrMore('a'), 'a*'],
		['zeroOrMore multi-char is grouped', R.zeroOrMore('ab'), '(?:ab)*'],
		['oneOrMore single char', R.oneOrMore('a'), 'a+'],
		['oneOrMore multi-char is grouped', R.oneOrMore('ab'), '(?:ab)+'],
		// non-greedy variants
		['zeroOrMoreNonGreedy multi-char', R.zeroOrMoreNonGreedy('ab'), '(?:ab)*?'],
		['oneOrMoreNonGreedy multi-char', R.oneOrMoreNonGreedy('ab'), '(?:ab)+?'],
		// class tokens stay bare (correct optimization)
		['possibly class token stays bare', R.possibly(R.digit), '\\d?'],
	])('%s', (_label, pattern, expected) => {
		expect(R.encodePattern(pattern as any)).toBe(expected)
	})

	test('behavioral: possibly("ab") must NOT match "a" alone', () => {
		const re = R.buildRegExp([R.inputStart, R.possibly('ab'), R.inputEnd])
		expect(re.test('')).toBe(true)
		expect(re.test('ab')).toBe(true)
		expect(re.test('a')).toBe(false)  // would be true if emitted as ab?
		expect(re.test('b')).toBe(false)
	})

	test('behavioral: oneOrMore("ab") repeats the whole string', () => {
		const re = R.buildRegExp([R.inputStart, R.oneOrMore('ab'), R.inputEnd])
		expect(re.test('ab')).toBe(true)
		expect(re.test('abab')).toBe(true)
		expect(re.test('a')).toBe(false)
		expect(re.test('abb')).toBe(false)
	})
})

// ── Regression: anyOf empty-alternative preservation ────────────────────────

describe('regression: anyOf empty-alternative preservation', () => {
	test('anyOf with possibly("") preserves empty alternative', () => {
		const re = R.buildRegExp(R.anyOf('a', R.possibly('')))
		expect(re.test('')).toBe(true)
		expect(re.source).not.toBe('(?:[a])')
	})

	test('anyOf with "" preserves empty alternative', () => {
		const re = R.buildRegExp(R.anyOf('a', ''))
		expect(re.test('')).toBe(true)
		expect(re.source).not.toBe('(?:[a])')
	})

	test('anyOf mixed batch with empty string still matches non-empty', () => {
		const re = R.buildRegExp(R.anyOf('a', '', 'b'))
		expect(re.test('')).toBe(true)
		expect(re.test('a')).toBe(true)
		expect(re.test('b')).toBe(true)
	})
})

// ── Regression: notAnyOfChars dash escaping ─────────────────────────────────

describe('regression: notAnyOfChars / anyOf dash escaping', () => {
	test('literal "-" inside notAnyOfChars is escaped', () => {
		const re = R.buildRegExp(R.notAnyOfChars('a', '-', 'b'))
		expect(re.source).toBe('[^a\\-b]')
		expect(re.test('-')).toBe(false)
		expect(re.test('c')).toBe(true)
	})

	test('literal "-" inside anyOf char class is escaped', () => {
		const re = R.buildRegExp(R.anyOf('a', '-', 'b'))
		expect(re.source).toContain('\\-')
		expect(re.test('-')).toBe(true)
	})
})

// ── Regression: structural classification (cross-instance anchors) ───────────

describe('regression: foreign-instance anchor classification', () => {
	test('foreign inputEnd is anchor, not char class', () => {
		const foreign = { type: 'specialToken', name: 'inputEnd', rawRegExp: '$' } as any
		const re = R.buildRegExp(R.anyOf(R.newLine, foreign) as any)
		expect(re.source).toBe('(?:\\r?\\n|$)')
		expect(re.exec('a$b')?.[0]).toBe('')
	})
})
