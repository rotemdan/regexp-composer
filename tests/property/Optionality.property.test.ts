import { describe, test, expect } from 'vitest'
import * as R from '../../src/exports/Exports.ts'
import { leafPatterns, patternSpace, wrapperFactories, describePattern } from './PatternSpace.ts'

// Purpose: assert agreement between `isPatternOptional` and the compiled engine.
// The engine is the ground truth: a pattern is optional if and only if
// `buildRegExp(pattern)` matches the empty string, which is the contract
// documented in the `StaticAnalysis` source.

const anyOfLeaves: R.PatternExpression[] = ['', 'a', R.possibly('a'), R.zeroOrMore('a'), R.anyChar, R.inputStart, R.possibly('')]

const lookaroundTypes = ['precededBy', 'notPrecededBy', 'followedBy', 'notFollowedBy']

const lookaroundContents: R.PatternExpression[] = ['', 'a', R.possibly('a'), R.zeroOrMore('a')]

describe('optionality agreement over the generated pattern space', () => {
	test('the predicate agrees with the engine across the pattern space', () => {
		for (const pattern of patternSpace) {
			expectOptionalMatchesEngine(pattern)
		}
	})

	test('the predicate agrees for every wrapper and leaf combination', () => {
		for (const [wrapperName, wrap] of wrapperFactories) {
			for (const leaf of leafPatterns) {
				expectOptionalMatchesEngine(wrap(leaf), `${wrapperName} of ${describePattern(leaf)}`)
			}
		}
	})

	test('the predicate agrees for double wrapping', () => {
		for (const leaf of leafPatterns) {
			for (const doubleWrap of [R.possibly(leaf), R.oneOrMore(leaf), R.repeated(0, leaf), R.repeated(2, leaf)]) {
				expectOptionalMatchesEngine(doubleWrap, `double wrapping of ${describePattern(leaf)}`)
			}
		}
	})

	test('the predicate agrees for anyOf combinations of any two members', () => {
		for (let firstIndex = 0; firstIndex < anyOfLeaves.length; firstIndex++) {
			for (let secondIndex = firstIndex + 1; secondIndex < anyOfLeaves.length; secondIndex++) {
				const pattern = R.anyOf(anyOfLeaves[firstIndex], anyOfLeaves[secondIndex])
				expectOptionalMatchesEngine(pattern)
			}
		}
	})

	test('the predicate agrees for lookarounds, including empty content', () => {
		for (const type of lookaroundTypes) {
			for (const content of lookaroundContents) {
				const pattern = { type, content } as unknown as R.PatternExpression
				expectOptionalMatchesEngine(pattern, `${type} of ${describePattern(content)}`)
			}
		}
	})

	test('the predicate agrees for captures and backreferences', () => {
		const patterns: R.PatternExpression[] = [
			R.capture('a'),
			R.capture(''),
			R.capture(R.possibly('a')),
			R.captureAs('group', R.possibly('a')),
			[R.capture('a'), R.sameAs(1)],
			[R.capture(''), R.sameAs(1)],
			[R.captureAs('group', ''), R.sameAs('group')],
			[R.capture(R.possibly('x')), R.sameAs(1)],
			[R.capture(R.possibly('x')), R.capture(R.possibly('y')), R.sameAs(2)],
			[R.capture('a'), R.capture('b'), R.sameAs(2)],
			[R.anyOf(R.capture('a'), R.capture('b')), R.sameAs(1)],
			[R.capture([R.capture('')]), R.sameAs(2)]
		]

		for (const pattern of patterns) {
			expectOptionalMatchesEngine(pattern)
		}
	})

	test('the predicate agrees for sequences', () => {
		const patterns: R.PatternExpression[] = [
			[],
			['', ''],
			['a', ''],
			[R.possibly('a'), 'b'],
			[R.inputStart, R.possibly('a')],
			[R.inputStart, R.inputEnd],
			[R.possibly('a'), R.possibly('b')]
		]

		for (const pattern of patterns) {
			expectOptionalMatchesEngine(pattern)
		}
	})
})

// Known divergence, guarded on purpose. `anyOf` with zero members encodes to
// the empty pattern, which matches the empty string, while `isPatternOptional`
// reports `false` for it. The two public entry points therefore disagree for
// this input. The test is left failing as proof of the divergence instead of
// being weakened, see task 3 in `work/tasks.md`.
test('known divergence: a zero-member anyOf is optional in the engine but not in the predicate', () => {
	expect(R.buildRegExp(R.anyOf()).test('')).toBe(true)
	expect(R.isPatternOptional(R.anyOf())).toBe(true)
})

function matchesEmpty(pattern: R.PatternExpression): boolean {
	return R.buildRegExp(pattern).test('')
}

function expectOptionalMatchesEngine(pattern: R.PatternExpression, label?: string): void {
	const viaEngine = matchesEmpty(pattern)
	const viaPredicate = R.isPatternOptional(pattern)

	expect(viaPredicate, label ?? describePattern(pattern)).toBe(viaEngine)
}
