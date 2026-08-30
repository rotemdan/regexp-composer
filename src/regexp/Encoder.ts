import { AnyOf, Capture, FollowedBy, NotAnyOfChars, NotFollowedBy, NotPrecededBy, OneOrMore, Pattern, Possibly, PrecededBy, Repeated, SameAs, ZeroOrMore } from './Types.js'
import { isString, isSingleCharOrClassTokenPattern, isArray } from './Predicates.js'

////////////////////////////////////////////////////////////////////////////////////////////////////
// Encoder functions
////////////////////////////////////////////////////////////////////////////////////////////////////
export function encodePattern(pattern: Pattern, wrapRangeTokens = true): string {
	if (isString(pattern)) {
		return escapeStringForRegExp(pattern)
	}

	if (isArray(pattern)) {
		return pattern.map(element => encodePattern(element)).join('')
	}

	switch (pattern.type) {
		case 'specialToken': {
			if (wrapRangeTokens && (pattern.name === 'charRange' || pattern.name === 'codepointRange')) {
				return `[${pattern.rawRegExp}]`
			} else {
				return pattern.rawRegExp
			}
		}

		case 'possibly': {
			return encodePattern_possibly(pattern)
		}

		case 'zeroOrMore': {
			return encodePattern_zeroOrMore(pattern)
		}

		case 'oneOrMore': {
			return encodePattern_oneOrMore(pattern)
		}

		case 'anyOf': {
			return encodePattern_anyOf(pattern)
		}

		case 'notAnyOfChars': {
			return encodePattern_notAnyOfChars(pattern)
		}

		case 'capture': {
			return encodePattern_capture(pattern)
		}

		case 'repeated': {
			return encodePattern_repeated(pattern)
		}

		case 'followedBy': {
			return encodePattern_followedBy(pattern)
		}

		case 'notFollowedBy': {
			return encodePattern_notFollowedBy(pattern)
		}

		case 'precededBy': {
			return encodePattern_precededBy(pattern)
		}

		case 'notPrecededBy': {
			return encodePattern_notPrecededBy(pattern)
		}

		case 'sameAs': {
			return encodePattern_sameAs(pattern)
		}

		default: {
			throw new Error(`Unrecognized pattern type: ${(pattern as any).type}`)
		}
	}
}

function encodePattern_anyOf(pattern: AnyOf): string {
	const members = pattern.members

	if (members.length === 0) {
		return ''
	}

	const patternGroups: Pattern[][] = [[]]

	for (const member of members) {
		const lastGroup = patternGroups[patternGroups.length - 1]

		if (lastGroup.length === 0 || isSingleCharOrClassTokenPattern(member) === isSingleCharOrClassTokenPattern(lastGroup[0])) {
			lastGroup.push(member)
		} else {
			patternGroups.push([member])
		}
	}

	const disjunctionMemberStrings: string[] = []

	for (const patternGroup of patternGroups) {
		if (patternGroup.length === 0) {
			continue
		}

		if (isSingleCharOrClassTokenPattern(patternGroup[0])) {
			const encodedPatternsGroup = patternGroup
				.map(member => encodePattern(member, false))
				.filter(value => value.length > 0)

			// Ensure `-` is correctly escaped, since it's inside a character class:
			for (let i = 0; i < encodedPatternsGroup.length; i++) {
				if (encodedPatternsGroup[i] === '-') {
					encodedPatternsGroup[i] = '\\-'
				}
			}

			if (encodedPatternsGroup.length > 0) {
				const charClassString = `[${encodedPatternsGroup.join('')}]`

				disjunctionMemberStrings.push(charClassString)
			}
		} else {
			const rawMemberStrings = patternGroup.map(member => encodePattern(member))
			const filteredMemberStrings = rawMemberStrings.filter(value => value.length > 0)

			if (filteredMemberStrings.length === 0 && patternGroup.length > 0) {
				// Every member of this run encoded to the empty string (e.g.
				// `possibly('')`, `zeroOrMore('')`, an empty-string literal, …).
				// This run still represents a valid alternative that matches the
				// empty string, so we must keep an empty alternative (and thus the
				// surrounding `|`) rather than silently dropping the branch and
				// changing the set of strings the pattern can match.
				disjunctionMemberStrings.push('')
			} else if (rawMemberStrings.some(value => value.length === 0)) {
				// This run is mixed: some members matched empty (e.g. `''`) and
				// some did not. The empty members represent an extra alternative
				// that matches the empty string, so we keep both the non-empty
				// alternatives and an additional empty alternative. Without this
				// the `|` that realizes the empty branch is dropped, changing
				// the language (e.g. `anyOf('a','')` would become `(?:a)` and
				// no longer match `""`).
				disjunctionMemberStrings.push(...filteredMemberStrings, '')
			} else {
				disjunctionMemberStrings.push(...filteredMemberStrings)
			}
		}
	}

	if (disjunctionMemberStrings.length === 0) {
		return ''
	}

	const disjunctionString = disjunctionMemberStrings.join('|')

	return `(?:${disjunctionString})`
}

function encodePattern_notAnyOfChars(pattern: NotAnyOfChars): string {
	const members = pattern.members

	if (members.length === 0) {
		return ''
	}

	const encodedElements: string[] = []

	for (const member of members) {
		if (!isSingleCharOrClassTokenPattern(member)) {
			if (isString(member)) {
				throw new Error(`The string pattern ${member} is not a single codepoint and cannot be included in a negated character class.`)
			}

			throw new Error(`The pattern ${member} is not a single codepoint or class token and cannot be included in a negated character class.`)
		}

		// A literal `-` must be escaped inside a character class, otherwise it is
		// interpreted as the range operator (e.g. `[^a-b]` would exclude `a`/`b` but
		// allow `-`).
		if (isString(member) && member === '-') {
			encodedElements.push('\\-')
		} else {
			encodedElements.push(encodePattern(member, false))
		}
	}

	return `[^${encodedElements.join('')}]`
}

function encodePattern_possibly(pattern: Possibly): string {
	const contentString = encodePattern(pattern.content)

	if (contentString === '') {
		return ''
	}

	if (isSingleCharOrClassTokenPattern(pattern.content)) {
		return `${contentString}?`
	} else {
		return `(?:${contentString})?`
	}
}

function encodePattern_zeroOrMore(pattern: ZeroOrMore): string {
	const contentString = encodePattern(pattern.content)

	if (contentString === '') {
		return ''
	}

	const greedySuffix = pattern.greedy ? '' : '?'

	if (isSingleCharOrClassTokenPattern(pattern.content)) {
		return `${contentString}*${greedySuffix}`
	} else {
		return `(?:${contentString})*${greedySuffix}`
	}
}

function encodePattern_oneOrMore(pattern: OneOrMore): string {
	const contentString = encodePattern(pattern.content)

	if (contentString === '') {
		return ''
	}

	const greedySuffix = pattern.greedy ? '' : '?'

	if (isSingleCharOrClassTokenPattern(pattern.content)) {
		return `${contentString}+${greedySuffix}`
	} else {
		return `(?:${contentString})+${greedySuffix}`
	}
}

function encodePattern_repeated(pattern: Repeated): string {
	const contentString = encodePattern(pattern.content)

	if (contentString === '') {
		return ''
	}

	const minCount = pattern.minCount
	const maxCount = pattern.maxCount

	let countString: string

	if (minCount === maxCount) {
		countString = `{${minCount}}`
	} else if (maxCount === Infinity) {
		countString = `{${minCount},}`
	} else {
		countString = `{${minCount},${maxCount}}`
	}

	const greedySuffix = pattern.greedy ? '' : '?'

	return `(?:${contentString})${countString}${greedySuffix}`
}

function encodePattern_precededBy(pattern: PrecededBy): string {
	const contentString = encodePattern(pattern.content)

	if (contentString === '') {
		return ''
	}

	return `(?<=${contentString})`
}

function encodePattern_notPrecededBy(pattern: NotPrecededBy): string {
	const contentString = encodePattern(pattern.content)

	if (contentString === '') {
		return ''
	}

	return `(?<!${contentString})`
}

function encodePattern_followedBy(pattern: FollowedBy): string {
	const contentString = encodePattern(pattern.content)

	if (contentString === '') {
		return ''
	}

	return `(?=${contentString})`
}

function encodePattern_notFollowedBy(pattern: NotFollowedBy): string {
	const contentString = encodePattern(pattern.content)

	if (contentString === '') {
		return ''
	}

	return `(?!${contentString})`
}

function encodePattern_capture(pattern: Capture): string {
	const contentString = encodePattern(pattern.content)

	if (pattern.name) {
		return `(?<${pattern.name}>${contentString})`
	} else {
		return `(${contentString})`
	}
}

function encodePattern_sameAs(pattern: SameAs): string {
	if (isString(pattern.captureGroupNameOrIndex)) {
		return `\\k<${pattern.captureGroupNameOrIndex}>`
	} else {
		return `(?:\\${pattern.captureGroupNameOrIndex})`
	}
}

////////////////////////////////////////////////////////////////////////////////////////////////////
// Utilities
////////////////////////////////////////////////////////////////////////////////////////////////////

function escapeStringForRegExp(str: string) {
	// MDN Reference: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_expressions#escaping
	// Note: `-` must be escaped in character classes,
	// but will error if escaped outside of them (not very good design).
	// It must be escaped separately when in a character class, like [\-]
	return str.replaceAll(
		/[.*+?^${}()|[\]\\]/g,
		'\\$&')
}
