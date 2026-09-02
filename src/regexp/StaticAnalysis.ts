import { buildRegExp } from './Builder.js'
import { encodePattern } from './Encoder.js'
import { PatternExpression } from './Types.js'
import { isArray, isNumber, isString } from './Predicates.js'

////////////////////////////////////////////////////////////////////////////////////////////////////
// Static analysis
////////////////////////////////////////////////////////////////////////////////////////////////////

// Analyzes if a pattern expression is optional by recursively inspecting its subpatterns
export function isPatternOptional(patternExpression: PatternExpression): boolean {
	const captureGroupLookup: boolean[] = []
	const namedCaptureGroupLookup = new Map<string, boolean>()

	function isOptional(patternExpression: PatternExpression): boolean {
		if (isString(patternExpression)) {
			// The empty string pattern is the empty regex, which matches the empty
			// string and is therefore optional. Any non-empty literal never
			// matches the empty string.
			return patternExpression.length === 0
		}

		if (isArray(patternExpression)) {
			for (const element of patternExpression) {
				if (!isOptional(element)) {
					return false
				}
			}

			return true
		}

		if (patternExpression.type === 'specialToken' || patternExpression.type === 'notAnyOfChars') {
			// A leaf token matches the empty string iff the regex it compiles to
			// matches "". The library's contract for "optional" is exactly
			// `buildRegExp(pattern).test('')` (see the suite's sanity checks), so
			// we delegate to the engine rather than guessing. Empirically the
			// special tokens whose `.test('')` is true are `^` (inputStart),
			// `$` (inputEnd) and `\B` (nonWordBoundary) — note that `\b` is
			// zero-width yet does NOT match the empty string, while `[^…]` and
			// character classes never do.
			return buildRegExp(patternExpression).test('')
		}

		if (patternExpression.type === 'possibly' || patternExpression.type === 'zeroOrMore') {
			return true
		}

		if (patternExpression.type === 'oneOrMore' ||
			patternExpression.type === 'precededBy' ||
			patternExpression.type === 'followedBy') {

			return isOptional(patternExpression.content)
		}

		if (patternExpression.type === 'notPrecededBy' ||
			patternExpression.type === 'notFollowedBy') {

			// An empty lookaround is elided by the encoder (it emits ""), so it
			// matches the empty string regardless of logical negation. Otherwise
			// a negative lookaround matches "" iff its content does NOT.
			if (encodePattern(patternExpression.content) === '') {
				return true
			}

			return !isOptional(patternExpression.content)
		}

		if (patternExpression.type === 'repeated') {
			// A repetition with a minimum count of 0 always matches the empty string
			// (zero occurrences), regardless of whether its content can.
			if (patternExpression.minCount === 0) {
				return true
			}

			return isOptional(patternExpression.content)
		}

		if (patternExpression.type === 'capture') {
			// Reserve the slot in pre-order so that the numeric index matches the
			// capture group numbering produced by the regex engine (which counts
			// opening parentheses in document order).
			captureGroupLookup.push(false)
			const groupIndex = captureGroupLookup.length - 1

			const isGroupOptional = isOptional(patternExpression.content)

			captureGroupLookup[groupIndex] = isGroupOptional

			if (patternExpression.name) {
				namedCaptureGroupLookup.set(patternExpression.name, isGroupOptional)
			}

			return isGroupOptional
		}

		if (patternExpression.type === 'anyOf') {
			// A disjunction matches the empty string if ANY of its alternatives can
			// (at least one member is optional), not only when all of them are.
			// Evaluate all members eagerly so an invalid back-reference is never
			// hidden by short-circuiting on a preceding optional member.
			let anyOptional = false
			for (const member of patternExpression.members) {
				if (isOptional(member)) {
					anyOptional = true
				}
			}

			return anyOptional
		}

		if (patternExpression.type === 'sameAs') {
			const nameOrIndex = patternExpression.captureGroupNameOrIndex

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

		throw new Error(`Unrecognized pattern type: ${patternExpression}`)
	}

	return isOptional(patternExpression)
}
