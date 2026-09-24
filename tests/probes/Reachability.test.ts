import { describe, test, expect } from 'vitest'
import * as R from '../../src/exports/Exports.ts'
import { isSingleUnicodeCodepoint } from '../../src/regexp/Predicates.ts'

// Purpose: determine the reachability status of the four branches that the
// descriptive analysis classified as apparently unreachable, and record the
// invariants that make them unreachable.
//
// Findings:
// * `encodeAnyOf`'s empty-group `continue` is unreachable, because a group is
//   only ever created by pushing a member into it, so no empty group can exist.
// * `encodeAnyOf`'s `encodedPatternsGroup.length > 0` guard is unreachable,
//   because every member that is eligible for a character-class run (a single
//   codepoint string or a class token) escapes to a non-empty string.
// * `encodeAnyOf`'s trailing empty return is unreachable for the same reason,
//   since every class run contributes at least one non-empty alternative.
// * `isSingleUnicodeCodepoint`'s trailing `return false` is unreachable,
//   because a non-empty input always returns from the first loop iteration.
//
// The assertions below pin the invariants behind those conclusions. If any of
// them ever fails, the corresponding branch has become reachable and the input
// that reaches it belongs in `tests/unit/Encoder.AnyOf.test.ts` or
// `tests/unit/Predicates.test.ts`.

describe('reachability of the encodeAnyOf branch set', () => {
	test('a class-eligible member always encodes to a non-empty string', () => {
		const classEligibleMembers = [
			'a', 'Z', '0', '😀', '-', ']', '^', '\\',
			R.digit,
			R.whitespace,
			R.charRange('a', 'z'),
			R.charRange('a', 'a'),
			R.codepointRange('41', '5a'),
			R.unicodeProperty('Letter')
		]

		for (const member of classEligibleMembers) {
			expect(R.encodePattern(member, false).length).toBeGreaterThan(0)
		}
	})

	test('an empty member is never class-eligible, so an all-empty run keeps an empty alternative', () => {
		expect(R.encodePattern(R.anyOf(''))).toBe('(?:)')
		expect(R.encodePattern(R.anyOf(R.possibly('')))).toBe('(?:)')
		expect(R.encodePattern(R.anyOf('a', ''))).toBe('(?:[a]|)')
	})

	test('a non-empty member list always produces at least one alternative', () => {
		const memberLists = [
			['a'],
			[''],
			[R.possibly('')],
			['a', ''],
			['a', R.possibly('')],
			[R.anyChar, R.inputStart],
			['hello', 'world'],
			[R.charRange('a', 'z')],
			[R.digit, R.unicodeProperty('Letter')]
		]

		for (const members of memberLists) {
			expect(R.encodePattern(R.anyOf(...members)).length).toBeGreaterThan(0)
		}
	})
})

describe('reachability of the isSingleUnicodeCodepoint fall-through', () => {
	test('agrees with codepoint counting for every input shape', () => {
		const inputs = ['', 'a', 'Z', '9', 'ab', 'a😀', '😀', '😀a', 'e\u0301', 'Cześć', '\uD83D', '\uDE00']

		for (const input of inputs) {
			expect(isSingleUnicodeCodepoint(input), `for ${JSON.stringify(input)}`).toBe([...input].length === 1)
		}
	})
})
