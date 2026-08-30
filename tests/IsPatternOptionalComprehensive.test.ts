import { describe, test, expect } from 'vitest'
import * as R from '../src/exports/Exports.ts'

// Generate a bunch of patterns programmatically and assert agreement
describe('isPatternOptional agrees with engine on generated patterns', () => {
	const leafTokens: any[] = [
		'a', '', 'ab', '😀',
		R.inputStart, R.inputEnd, R.anyChar, R.digit, R.whitespace,
		R.charRange('a', 'z'), R.codepointRange('41', '5A'),
		R.codepoint('41'), R.unicodeProperty('Letter'),
		R.notAnyOfChars('a', 'b'),
	]

	// precededBy / notPrecededBy / followedBy / notFollowedBy are internal helpers
	// (not exported) — we exercise them as raw pattern objects, same as
	// isPatternOptional's own suite does. They are what `matches({ ... })` builds.
	const lookarounds: any[] = [
		{ type: 'precededBy', content: 'a' } as any,
		{ type: 'notPrecededBy', content: 'a' } as any,
		{ type: 'followedBy', content: 'a' } as any,
		{ type: 'notFollowedBy', content: 'a' } as any,
		{ type: 'precededBy', content: '' } as any,
		{ type: 'notPrecededBy', content: '' } as any,
		{ type: 'followedBy', content: '' } as any,
		{ type: 'notFollowedBy', content: '' } as any,
		{ type: 'notFollowedBy', content: R.possibly('') } as any,
		{ type: 'notFollowedBy', content: R.zeroOrMore('a') } as any,
	]

	test('leaf tokens', () => {
		for (const tok of leafTokens) expectOptionalMatchesEngine(tok, `leaf ${String(tok?.name ?? JSON.stringify(tok).slice(0,50))}`)
	})

	test('quantified leaves', () => {
		for (const tok of leafTokens) {
			expectOptionalMatchesEngine(R.possibly(tok), 'possibly')
			expectOptionalMatchesEngine(R.zeroOrMore(tok), 'zeroOrMore')
			expectOptionalMatchesEngine(R.zeroOrMoreNonGreedy(tok), 'zeroOrMoreNonGreedy')
			expectOptionalMatchesEngine(R.oneOrMore(tok), 'oneOrMore')
			expectOptionalMatchesEngine(R.oneOrMoreNonGreedy(tok), 'oneOrMoreNonGreedy')
			expectOptionalMatchesEngine(R.repeated(0, tok), 'repeated 0')
			expectOptionalMatchesEngine(R.repeated(2, tok), 'repeated 2')
			expectOptionalMatchesEngine(R.repeated([0, 3], tok), 'repeated [0,3]')
			expectOptionalMatchesEngine(R.repeated([1, 3], tok), 'repeated [1,3]')
		}
	})

	test('quantified multi-char strings (the former bug)', () => {
		for (const s of ['ab', 'hello', '😀😀']) {
			expectOptionalMatchesEngine(R.possibly(s), `possibly ${s}`)
			expectOptionalMatchesEngine(R.zeroOrMore(s), `zeroOrMore ${s}`)
			expectOptionalMatchesEngine(R.oneOrMore(s), `oneOrMore ${s}`)
		}
	})

	test('lookarounds', () => {
		for (const la of lookarounds) expectOptionalMatchesEngine(la, la.type)
	})

	test('quantified lookarounds', () => {
		const cases: any[] = [
			R.oneOrMore({ type: 'notFollowedBy', content: 'a' } as any),
			R.oneOrMore({ type: 'notPrecededBy', content: 'a' } as any),
			R.zeroOrMore({ type: 'followedBy', content: 'a' } as any),
			R.possibly({ type: 'notFollowedBy', content: '' } as any),
		]
		for (const c of cases) expectOptionalMatchesEngine(c, 'quantified lookaround')
	})

	test('sequences', () => {
		expectOptionalMatchesEngine(['a', 'b'], '["a","b"]')
		expectOptionalMatchesEngine(['', ''], '["",""]')
		expectOptionalMatchesEngine([R.possibly('a'), 'b'], '[possibly a, b]')
		expectOptionalMatchesEngine([{ type: 'notFollowedBy', content: 'a' } as any, ''] as any, '[notFollowedBy a, ""]')
		expectOptionalMatchesEngine([R.inputStart, R.possibly('a')], '[inputStart, possibly a]')
	})

	test('anyOf comprehensive', () => {
		const cases: any[] = [
			R.anyOf('a', 'b'),
			R.anyOf('a', ''),
			R.anyOf('', ''),
			R.anyOf('a', R.possibly('')),
			R.anyOf('a', R.zeroOrMore('')),
			R.anyOf(R.possibly('a'), R.oneOrMore('b')),
			R.anyOf('a', R.inputStart),
			R.anyOf(R.inputStart, R.inputEnd),
			R.anyOf('a', R.digit, R.charRange('0', '9')),
		]
		for (const c of cases) expectOptionalMatchesEngine(c, 'anyOf')
	})

	test('captures and sameAs', () => {
		expectOptionalMatchesEngine(R.capture('a'), 'capture a')
		expectOptionalMatchesEngine(R.capture(R.possibly('a')), 'capture possibly a')
		expectOptionalMatchesEngine([R.capture(R.possibly('x')), R.sameAs(1)] as any, 'capture + sameAs 1')
		expectOptionalMatchesEngine([R.capture('a'), R.sameAs(1)] as any, 'capture a + sameAs 1 (non-optional)')
		expectOptionalMatchesEngine(R.captureAs('g', R.possibly('a')), 'captureAs optional')
	})

	test('nested anyOf + repeated', () => {
		expectOptionalMatchesEngine(R.repeated(0, R.anyOf('a', 'b')), 'repeated 0 anyOf')
		expectOptionalMatchesEngine(R.repeated(1, R.anyOf('', 'a')), 'repeated 1 anyOf with empty')
	})
})

function matchesEmpty(pattern: any): boolean {
	return R.buildRegExp(pattern).test('')
}

function expectOptionalMatchesEngine(pattern: any, label?: string) {
	const viaEngine = matchesEmpty(pattern)
	const viaPredicate = R.isPatternOptional(pattern)
	if (viaPredicate !== viaEngine) {
		// Surface the actual source for debugging
		const src = (() => {
			try { return R.encodePattern(pattern) } catch { return '<encode error>' }
		})()
		throw new Error(
			`isPatternOptional mismatch${label ? ` (${label})` : ''}: predicate=${viaPredicate} engine=${viaEngine} src=${src} pattern=${JSON.stringify(pattern).slice(0, 400)}`
		)
	}
	expect(viaPredicate).toBe(viaEngine)
}
