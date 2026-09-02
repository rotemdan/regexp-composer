import { AnyOf, Capture, FollowedBy, NotAnyOfChars, NotFollowedBy, NotPrecededBy, OneOrMore, PatternExpression, Possibly, PrecededBy, Repeated, SameAs, ZeroOrMore } from './Types.js'
import { isString, isSingleCharOrClassTokenExpression, isArray } from './Predicates.js'
import { escapeStringForRegExp } from './Utilities.js'

////////////////////////////////////////////////////////////////////////////////////////////////////
// Encoder functions
////////////////////////////////////////////////////////////////////////////////////////////////////
export function encodePattern(patternExpression: PatternExpression, wrapRangeTokens = true): string {
	if (isString(patternExpression)) {
		return escapeStringForRegExp(patternExpression)
	}

	if (isArray(patternExpression)) {
		return patternExpression.map(element => encodePattern(element)).join('')
	}

	switch (patternExpression.type) {
		case 'specialToken': {
			if (wrapRangeTokens && (patternExpression.name === 'charRange' || patternExpression.name === 'codepointRange')) {
				return `[${patternExpression.rawRegExp}]`
			} else {
				return patternExpression.rawRegExp
			}
		}

		case 'possibly': {
			return encodePossibly(patternExpression)
		}

		case 'zeroOrMore': {
			return encodeZeroOrMore(patternExpression)
		}

		case 'oneOrMore': {
			return encodeOneOrMore(patternExpression)
		}

		case 'anyOf': {
			return encodeAnyOf(patternExpression)
		}

		case 'notAnyOfChars': {
			return encodeMotAnyOfChars(patternExpression)
		}

		case 'capture': {
			return encodeCapture(patternExpression)
		}

		case 'repeated': {
			return encodeRepeated(patternExpression)
		}

		case 'followedBy': {
			return encodeFollowedBy(patternExpression)
		}

		case 'notFollowedBy': {
			return encodeNotFollowedBy(patternExpression)
		}

		case 'precededBy': {
			return encodePrecededBy(patternExpression)
		}

		case 'notPrecededBy': {
			return encodePattern_notPrecededBy(patternExpression)
		}

		case 'sameAs': {
			return encodeSameAs(patternExpression)
		}

		default: {
			throw new Error(`Unrecognized pattern type: ${(patternExpression as any).type}`)
		}
	}
}

function encodeAnyOf(node: AnyOf): string {
	const members = node.members

	if (members.length === 0) {
		return ''
	}

	const patternGroups: PatternExpression[][] = [[]]

	for (const member of members) {
		const lastGroup = patternGroups[patternGroups.length - 1]

		if (lastGroup.length === 0 || isSingleCharOrClassTokenExpression(member) === isSingleCharOrClassTokenExpression(lastGroup[0])) {
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

		if (isSingleCharOrClassTokenExpression(patternGroup[0])) {
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

function encodeMotAnyOfChars(node: NotAnyOfChars): string {
	const members = node.members

	if (members.length === 0) {
		return ''
	}

	const encodedElements: string[] = []

	for (const member of members) {
		if (!isSingleCharOrClassTokenExpression(member)) {
			if (isString(member)) {
				throw new Error(`The string pattern ${member} is not a single codepoint and cannot be included in a negated character class.`)
			}

			throw new Error(`The pattern ${member} is not a single codepoint or class token and cannot be included in a negated character class.`)
		}

		// A literal `-` must be escaped inside a character class, otherwise it is
		// interpreted as the range operator (e.g. `[^a-b]` would exclude `a`/`b` but
		// allow `-`).
		if (member === '-') {
			encodedElements.push('\\-')
		} else {
			encodedElements.push(encodePattern(member, false))
		}
	}

	return `[^${encodedElements.join('')}]`
}

function encodePossibly(node: Possibly): string {
	const contentString = encodePattern(node.content)

	if (contentString === '') {
		return ''
	}

	if (isSingleCharOrClassTokenExpression(node.content)) {
		return `${contentString}?`
	} else {
		return `(?:${contentString})?`
	}
}

function encodeZeroOrMore(node: ZeroOrMore): string {
	const contentString = encodePattern(node.content)

	if (contentString === '') {
		return ''
	}

	const greedySuffix = node.greedy ? '' : '?'

	if (isSingleCharOrClassTokenExpression(node.content)) {
		return `${contentString}*${greedySuffix}`
	} else {
		return `(?:${contentString})*${greedySuffix}`
	}
}

function encodeOneOrMore(node: OneOrMore): string {
	const contentString = encodePattern(node.content)

	if (contentString === '') {
		return ''
	}

	const greedySuffix = node.greedy ? '' : '?'

	if (isSingleCharOrClassTokenExpression(node.content)) {
		return `${contentString}+${greedySuffix}`
	} else {
		return `(?:${contentString})+${greedySuffix}`
	}
}

function encodeRepeated(node: Repeated): string {
	const contentString = encodePattern(node.content)

	if (contentString === '') {
		return ''
	}

	const minCount = node.minCount
	const maxCount = node.maxCount

	let countString: string

	if (minCount === maxCount) {
		countString = `{${minCount}}`
	} else if (maxCount === Infinity) {
		countString = `{${minCount},}`
	} else {
		countString = `{${minCount},${maxCount}}`
	}

	const greedySuffix = node.greedy ? '' : '?'

	return `(?:${contentString})${countString}${greedySuffix}`
}

function encodePrecededBy(node: PrecededBy): string {
	const contentString = encodePattern(node.content)

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

function encodeFollowedBy(node: FollowedBy): string {
	const contentString = encodePattern(node.content)

	if (contentString === '') {
		return ''
	}

	return `(?=${contentString})`
}

function encodeNotFollowedBy(node: NotFollowedBy): string {
	const contentString = encodePattern(node.content)

	if (contentString === '') {
		return ''
	}

	return `(?!${contentString})`
}

function encodeCapture(node: Capture): string {
	const contentString = encodePattern(node.content)

	if (node.name) {
		return `(?<${node.name}>${contentString})`
	} else {
		return `(${contentString})`
	}
}

function encodeSameAs(node: SameAs): string {
	if (isString(node.captureGroupNameOrIndex)) {
		return `\\k<${node.captureGroupNameOrIndex}>`
	} else {
		return `(?:\\${node.captureGroupNameOrIndex})`
	}
}
