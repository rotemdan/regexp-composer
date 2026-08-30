import { describe, test, expect } from 'vitest'
import * as R from '../src/exports/Exports.ts'

// Helper: ground truth — what the engine actually does on ""

function matchesEmpty(pattern: any): boolean {
	return R.buildRegExp(pattern).test('')
}

// ── Basic contract ──────────────────────────────────────────────────────────

describe('isPatternOptional — basic contract', () => {
	test('empty string is optional', () => {
		expect(R.isPatternOptional('')).toBe(true)
		expect(matchesEmpty('')).toBe(true)
	})

	test('non-empty literal is not optional', () => {
		expect(R.isPatternOptional('a')).toBe(false)
	})

	test('empty sequence is optional', () => {
		expect(R.isPatternOptional([])).toBe(true)
	})

	test('sequence is optional iff all elements are', () => {
		expect(R.isPatternOptional(['', ''] as any)).toBe(true)
		expect(R.isPatternOptional(['a', ''] as any)).toBe(false)
	})
})

// ── anyOf: ANY-member semantics ─────────────────────────────────────────────

describe('isPatternOptional — anyOf', () => {
	test('anyOf with one optional member is optional', () => {
		expect(matchesEmpty(R.anyOf('x', R.possibly('y')))).toBe(true)
		expect(R.isPatternOptional(R.anyOf('x', R.possibly('y')))).toBe(true)
	})

	test('anyOf with no optional member is not optional', () => {
		expect(R.isPatternOptional(R.anyOf('a', 'b'))).toBe(false)
	})

	test('anyOf with empty-string member is optional', () => {
		expect(R.isPatternOptional(R.anyOf('a', ''))).toBe(true)
	})
})

// ── repeated: minCount 0 ────────────────────────────────────────────────────

describe('isPatternOptional — repeated', () => {
	test('minCount 0 is always optional', () => {
		expect(matchesEmpty(R.repeated([0, 3], 'x'))).toBe(true)
		expect(R.isPatternOptional(R.repeated([0, 3], 'x'))).toBe(true)
	})

	test('repeated([0], "x") is optional', () => {
		expect(R.isPatternOptional(R.repeated([0], 'x'))).toBe(true)
	})

	test('repeated(1, "x") is not optional when content is not', () => {
		expect(R.isPatternOptional(R.repeated(1, 'x'))).toBe(false)
	})
})

// ── Negative lookarounds: negated optionality ───────────────────────────────

describe('isPatternOptional — negative lookarounds', () => {
	test('notFollowedBy("") is optional (empty lookaround is elided)', () => {
		// The encoder elides an empty lookaround: (?! ) -> ""  (see
		// encodePattern_notFollowedBy). The engine therefore treats it as
		// optional even though logically (?! ) would not match.
		// isPatternOptional must stay consistent with what actually gets
		// compiled — i.e. buildRegExp(node).test("").
		const node: any = { type: 'notFollowedBy', content: '' }
		expect(matchesEmpty(node)).toBe(true)
		expect(R.isPatternOptional(node)).toBe(true)
	})

	test('notFollowedBy("x") IS optional', () => {
		const node: any = { type: 'notFollowedBy', content: 'x' }
		expect(matchesEmpty(node)).toBe(true)
		expect(R.isPatternOptional(node)).toBe(true)
	})
})

// ── sameAs: capture index resolution ────────────────────────────────────────

describe('isPatternOptional — sameAs numeric index', () => {
	test('sameAs(1) resolves without throwing', () => {
		const pattern = [R.capture(R.possibly('x')), R.sameAs(1)] as any
		expect(() => R.isPatternOptional(pattern)).not.toThrow()
		expect(R.isPatternOptional(pattern)).toBe(true)
	})

	test('sameAs(2) resolves in correct pre-order', () => {
		const pattern = [R.capture(R.possibly('x')), R.capture(R.possibly('y')), R.sameAs(2)] as any
		expect(R.isPatternOptional(pattern)).toBe(true)
	})
})

// ── Special tokens: must agree with engine ──────────────────────────────────

describe('isPatternOptional — special tokens agree with engine', () => {
	const cases: [string, any][] = [
		['inputStart', R.inputStart],
		['inputEnd', R.inputEnd],
		['anyChar', R.anyChar],
		['whitespace', R.whitespace],
		['nonWhitespace', R.nonWhitespace],
		['digit', R.digit],
		['nonDigit', R.nonDigit],
		['wordBoundary', R.wordBoundary],
		['nonWordBoundary', R.nonWordBoundary],
		['formFeed', R.formFeed],
		['lineFeed', R.lineFeed],
		['carriageReturn', R.carriageReturn],
		['tab', R.tab],
		['verticalTab', R.verticalTab],
		['unicodeProperty', R.unicodeProperty('Letter')],
		['notUnicodeProperty', R.notUnicodeProperty('Letter')],
	]

	for (const [name, token] of cases) {
		test(`${name} agrees with buildRegExp(...).test("")`, () => {
			expect(R.isPatternOptional(token)).toBe(matchesEmpty(token))
		})
	}

	test('notAnyOfChars never matches empty', () => {
		expect(R.isPatternOptional(R.notAnyOfChars('a'))).toBe(false)
	})
})
