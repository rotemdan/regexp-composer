import { buildRegExp } from './Builder.js'
import { encodePattern } from './Encoder.js'
import { Pattern } from './Types.js'
import { isArray, isNumber, isString } from './Predicates.js'

////////////////////////////////////////////////////////////////////////////////////////////////////
// Static analysis
////////////////////////////////////////////////////////////////////////////////////////////////////

// Analyzes if a pattern is optional by recursively inspecting its subpatterns
export function isPatternOptional(pattern: Pattern): boolean {
	const captureGroupLookup: boolean[] = []
	const namedCaptureGroupLookup = new Map<string, boolean>()

	function isOptional(pattern: Pattern): boolean {
		if (isString(pattern)) {
			// The empty string pattern is the empty regex, which matches the empty
			// string and is therefore optional. Any non-empty literal never
			// matches the empty string.
			return pattern.length === 0
		}

		if (isArray(pattern)) {
			for (const element of pattern) {
				if (!isOptional(element)) {
					return false
				}
			}

			return true
		}

		if (pattern.type === 'specialToken' || pattern.type === 'notAnyOfChars') {
			// A leaf token matches the empty string iff the regex it compiles to
			// matches "". The library's contract for "optional" is exactly
			// `buildRegExp(pattern).test('')` (see the suite's sanity checks), so
			// we delegate to the engine rather than guessing. Empirically the
			// special tokens whose `.test('')` is true are `^` (inputStart),
			// `$` (inputEnd) and `\B` (nonWordBoundary) — note that `\b` is
			// zero-width yet does NOT match the empty string, while `[^…]` and
			// character classes never do.
			return buildRegExp(pattern).test('')
		}

		if (pattern.type === 'possibly' || pattern.type === 'zeroOrMore') {
			return true
		}

		if (pattern.type === 'oneOrMore' ||
			pattern.type === 'precededBy' ||
			pattern.type === 'followedBy') {

			return isOptional(pattern.content)
		}

		if (pattern.type === 'notPrecededBy' ||
			pattern.type === 'notFollowedBy') {

			// An empty lookaround is elided by the encoder (it emits ""), so it
			// matches the empty string regardless of logical negation. Otherwise
			// a negative lookaround matches "" iff its content does NOT.
			if (encodePattern(pattern.content) === '') {
				return true
			}

			return !isOptional(pattern.content)
		}

		if (pattern.type === 'repeated') {
			// A repetition with a minimum count of 0 always matches the empty string
			// (zero occurrences), regardless of whether its content can.
			if (pattern.minCount === 0) {
				return true
			}

			return isOptional(pattern.content)
		}

		if (pattern.type === 'capture') {
			// Reserve the slot in pre-order so that the numeric index matches the
			// capture group numbering produced by the regex engine (which counts
			// opening parentheses in document order).
			captureGroupLookup.push(false)
			const groupIndex = captureGroupLookup.length - 1

			const isGroupOptional = isOptional(pattern.content)

			captureGroupLookup[groupIndex] = isGroupOptional

			if (pattern.name) {
				namedCaptureGroupLookup.set(pattern.name, isGroupOptional)
			}

			return isGroupOptional
		}

		if (pattern.type === 'anyOf') {
			// A disjunction matches the empty string if ANY of its alternatives can
			// (at least one member is optional), not only when all of them are.
			// Evaluate all members eagerly so an invalid back-reference is never
			// hidden by short-circuiting on a preceding optional member.
			let anyOptional = false
			for (const member of pattern.members) {
				if (isOptional(member)) {
					anyOptional = true
				}
			}

			return anyOptional
		}

		if (pattern.type === 'sameAs') {
			const nameOrIndex = pattern.captureGroupNameOrIndex

			if (isNumber(nameOrIndex)) {
				// Capture group indices are 1-based, while the lookup array is 0-based.
				const lookupResult = captureGroupLookup[nameOrIndex - 1]

				if (lookupResult === undefined) {
					throw new Error(`Couldn't resolve backreference to a capture group at index ${nameOrIndex}`)
				}

				return lookupResult
			} else {
				const lookupResult = namedCaptureGroupLookup.get(nameOrIndex)

				if (lookupResult === undefined) {
					throw new Error(`Couldn't resolve backreference to a named capture group called '${nameOrIndex}'`)
				}

				return lookupResult
			}
		}

		throw new Error(`Unrecognized pattern type: ${pattern}`)
	}

	return isOptional(pattern)
}
