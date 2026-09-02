import { encodePattern } from '../regexp/Encoder.js'
import { Possibly, ZeroOrMore, OneOrMore, Repeated, RepeatedRange, PrecededBy, NotPrecededBy, FollowedBy, NotFollowedBy, AnyOf, NotAnyOfChars, Capture, SameAs, SpecialToken, PatternExpression, PatternNode } from './Types.js'
import { isString, isNumber, isSingleUnicodeCodepoint } from './Predicates.js'
import { escapeCharForCharClass } from './Utilities.js'

////////////////////////////////////////////////////////////////////////////////////////////////////
// Main builder function
////////////////////////////////////////////////////////////////////////////////////////////////////
export function buildRegExp(patternExpression: PatternExpression, buildOptions?: Partial<BuildOptions>): RegExp {
	const options: BuildOptions = { ...defaultBuildOptions, ...buildOptions }

	const regExpString = encodePattern(patternExpression)
	const regExpFlagsString = getRegExpFlagsForOptions(options)

	return new RegExp(regExpString, regExpFlagsString)
}

////////////////////////////////////////////////////////////////////////////////////////////////////
// AST building functions
////////////////////////////////////////////////////////////////////////////////////////////////////
export function possibly(content: Possibly['content']): Possibly {
	return {
		type: 'possibly',
		content,
	}
}

export function zeroOrMore(content: ZeroOrMore['content']): ZeroOrMore {
	return {
		type: 'zeroOrMore',
		content,
		greedy: true
	}
}

export function zeroOrMoreNonGreedy(content: ZeroOrMore['content']): ZeroOrMore {
	return {
		type: 'zeroOrMore',
		content,
		greedy: false
	}
}

export function oneOrMore(content: OneOrMore['content']): OneOrMore {
	return {
		type: 'oneOrMore',
		content,
		greedy: true
	}
}

export function oneOrMoreNonGreedy(content: OneOrMore['content']): OneOrMore {
	return {
		type: 'oneOrMore',
		content,
		greedy: false
	}
}

export function repeated(count: number, content: Repeated['content']): Repeated
export function repeated(range: RepeatedRange, content: Repeated['content']): Repeated
export function repeated(countOrRange: number | RepeatedRange, content: Repeated['content']): Repeated {
	let minCount: number
	let maxCount: number

	if (typeof countOrRange === 'number') {
		const count = countOrRange

		if (!Number.isFinite(count)) {
			throw new Error(`Repeated count must be a finite number (got ${count})`)
		}

		minCount = Math.trunc(count)
		maxCount = Math.trunc(count)
	} else {
		const range = countOrRange

		if (range.length as number === 0 || range.length > 2) {
			throw new Error(`Range should either be [min] or [min, max]`)
		}

		minCount = Math.trunc(range[0] as number)
		maxCount = range[1] === undefined ? Infinity : Math.trunc(range[1] as number)
	}

	assertValidRepeatBounds(minCount, maxCount)

	return {
		type: 'repeated',
		minCount,
		maxCount,
		content,
		greedy: true
	}
}

export function repeatedNonGreedy(count: number, content: Repeated['content']): Repeated
export function repeatedNonGreedy(range: RepeatedRange, content: Repeated['content']): Repeated
export function repeatedNonGreedy(countOrRange: number | RepeatedRange, content: Repeated['content']): Repeated {
	let minCount: number
	let maxCount: number

	if (typeof countOrRange === 'number') {
		if (!Number.isFinite(countOrRange)) {
			throw new Error(`Repeated count must be a finite number (got ${countOrRange})`)
		}

		minCount = Math.trunc(countOrRange)
		maxCount = Math.trunc(countOrRange)
	} else {
		const range = countOrRange

		if (range.length as number === 0 || range.length > 2) {
			throw new Error(`Range should either be [min] or [min, max]`)
		}

		minCount = Math.trunc(range[0] as number)
		maxCount = range[1] === undefined ? Infinity : Math.trunc(range[1] as number)
	}

	assertValidRepeatBounds(minCount, maxCount)

	return {
		type: 'repeated',
		minCount,
		maxCount,
		content,
		greedy: false
	}
}

export function anyOf(...members: AnyOf['members']): AnyOf {
	return {
		type: 'anyOf',
		members: members
	}
}

export function notAnyOfChars(...members: NotAnyOfChars['members']): NotAnyOfChars {
	return {
		type: 'notAnyOfChars',
		members: members
	}
}

export function capture(content: Capture['content']): Capture {
	return {
		type: 'capture',
		name: undefined,
		content,
	}
}

export function captureAs(name: string, content: Capture['content']): Capture {
	if (name.length === 0) {
		throw new Error(`Capture group name cannot be empty`)
	}

	if (!/^[A-Za-z][A-Za-z0-9]*$/.test(name)) {
		throw new Error(`Capture group name '${name}' is invalid. It must match /^[A-Za-z][A-Za-z0-9]*$/`)
	}

	return {
		type: 'capture',
		name,
		content,
	}
}

export function sameAs(captureGroupNameOrIndex: SameAs['captureGroupNameOrIndex']): SameAs {
	if (isString(captureGroupNameOrIndex)) {
		if (captureGroupNameOrIndex.length === 0) {
			throw new Error(`'sameAs' capture group name cannot be empty`)
		}
	} else if (isNumber(captureGroupNameOrIndex)) {
		if (captureGroupNameOrIndex < 1 || captureGroupNameOrIndex > 9) {
			throw new Error(`'sameAs' capture group index can only be between 1 and 9. Please use named groups for indexes 10 or higher (see the online documentation for more details about this restriction).`)
		}

		if (captureGroupNameOrIndex !== Math.floor(captureGroupNameOrIndex)) {
			throw new Error(`'sameAs' capture group index cannot be a fractional number.`)
		}
	}

	return {
		type: 'sameAs',
		captureGroupNameOrIndex: captureGroupNameOrIndex
	}
}

export function unicodeProperty(property: string): SpecialToken
export function unicodeProperty(property: string, value: string): SpecialToken
export function unicodeProperty(property: string, value?: string): SpecialToken {
	let propertyString: string

	if (isString(value)) {
		propertyString = `${property}=${value}`
	} else {
		propertyString = property
	}

	return {
		type: 'specialToken',
		name: 'unicodeProperty',
		rawRegExp: `\\p{${propertyString}}`
	}
}

export function notUnicodeProperty(property: string): SpecialToken
export function notUnicodeProperty(property: string, value: string): SpecialToken
export function notUnicodeProperty(property: string, value?: string): SpecialToken {
	let propertyString: string

	if (isString(value)) {
		propertyString = `${property}=${value}`
	} else {
		propertyString = property
	}

	return {
		type: 'specialToken',
		name: 'notUnicodeProperty',
		rawRegExp: `\\P{${propertyString}}`
	}
}

export function codepoint(unicodeCodepointHex: string): SpecialToken
export function codepoint(unicodeCodepointIndex: number): SpecialToken
export function codepoint(unicodeCodepoint: string | number): SpecialToken {
	if (isNumber(unicodeCodepoint)) {
		assertValidNumericCodepoint(unicodeCodepoint)

		unicodeCodepoint = unicodeCodepoint.toString(16)
	} else {
		assertValidHexCodepointString(unicodeCodepoint)
		unicodeCodepoint = unicodeCodepoint.toLowerCase()
	}

	return {
		type: 'specialToken',
		name: 'codepoint',
		rawRegExp: `\\u{${unicodeCodepoint}}`
	}
}

export function charRange(startChar: string, endChar: string): SpecialToken {
	if (!isSingleUnicodeCodepoint(startChar)) {
		throw new Error(`Character range is invalid. Starting character '${startChar}' must be a single Unicode codepoint.`)
	}

	if (!isSingleUnicodeCodepoint(endChar)) {
		throw new Error(`Character range is invalid. Ending character '${endChar}' must be a single Unicode codepoint.`)
	}

	if (startChar.codePointAt(0)! > endChar.codePointAt(0)!) {
		throw new Error(`Character range is invalid. Starting character '${startChar}' has codepoint higher then ending character '${endChar}'.`)
	}

	// The resulting token is emitted inside a character class (`[START-END]` or,
	// when inlined into a larger class, as `START-END`). Escaping is mandatory
	// here: an unescaped `^` would negate the whole class (`[^-a]`), an unescaped
	// `]` would terminate it (`[]-a]`) and an unescaped `\` corrupts the syntax.
	startChar = escapeCharForCharClass(startChar)
	endChar = escapeCharForCharClass(endChar)

	return {
		type: 'specialToken',
		name: 'charRange',
		rawRegExp: `${startChar}-${endChar}`
	}
}

export function codepointRange(startHexCode: string, endHexCode: string): SpecialToken
export function codepointRange(startIntegerCode: number, endIntegerCode: number): SpecialToken
export function codepointRange(start: string | number, end: string | number): SpecialToken {
	if (isNumber(start)) {
		assertValidNumericCodepoint(start)
		start = start.toString(16)
	} else {
		assertValidHexCodepointString(start)
	}

	if (isNumber(end)) {
		assertValidNumericCodepoint(end)
		end = end.toString(16)
	} else {
		assertValidHexCodepointString(end)
	}

	start = start.toUpperCase()
	end = end.toUpperCase()

	if (Number.parseInt(start, 16) > Number.parseInt(end, 16)) {
		throw new Error(`Character range is invalid. Starting hex code '${start}' has codepoint higher then ending hex code '${end}'.`)
	}

	return {
		type: 'specialToken',
		name: 'codepointRange',
		rawRegExp: `\\u{${start}}-\\u{${end}}`
	}
}

////////////////////////////////////////////////////////////////////////////////////////////////////
// Match patterns
////////////////////////////////////////////////////////////////////////////////////////////////////
interface MatchesConditions {
	except?: PatternExpression
	ifFollowedBy?: PatternExpression
	ifNotFollowedBy?: PatternExpression
	ifPrecededBy?: PatternExpression
	ifNotPrecededBy?: PatternExpression
	ifExtendsTo?: PatternExpression
	ifExtendsBackTo?: PatternExpression
	ifNotExtendsBackTo?: PatternExpression
}

export function matches(content: PatternExpression, conditions: MatchesConditions): PatternExpression
export function matches(content: PatternExpression, conditionsArray: MatchesConditions[]): PatternExpression
export function matches(content: PatternExpression, conditionsOrConditionsArray: MatchesConditions | MatchesConditions[]): PatternExpression {
	const beforePatternExpression: PatternExpression[] = []
	const afterPatternExpression: PatternExpression[] = []

	let conditionsArray: MatchesConditions[]

	if (Array.isArray(conditionsOrConditionsArray)) {
		conditionsArray = conditionsOrConditionsArray
	} else {
		conditionsArray = [conditionsOrConditionsArray]
	}

	for (const conditions of conditionsArray) {
		if (conditions.except) {
			beforePatternExpression.push(notFollowedBy(conditions.except))
		}

		if (conditions.ifFollowedBy) {
			afterPatternExpression.push(followedBy(conditions.ifFollowedBy))
		}

		if (conditions.ifNotFollowedBy) {
			afterPatternExpression.push(notFollowedBy(conditions.ifNotFollowedBy))
		}

		if (conditions.ifPrecededBy) {
			beforePatternExpression.push(precededBy(conditions.ifPrecededBy))
		}

		if (conditions.ifNotPrecededBy) {
			beforePatternExpression.push(notPrecededBy(conditions.ifNotPrecededBy))
		}

		if (conditions.ifExtendsTo) {
			beforePatternExpression.push(followedBy(conditions.ifExtendsTo))
		}

		if (conditions.ifExtendsBackTo) {
			afterPatternExpression.push(precededBy(conditions.ifExtendsBackTo))
		}

		if (conditions.ifNotExtendsBackTo) {
			afterPatternExpression.push(notPrecededBy(conditions.ifNotExtendsBackTo))
		}
	}

	const resultPattern = [
		...beforePatternExpression,
		content,
		...afterPatternExpression
	]

	return resultPattern
}

////////////////////////////////////////////////////////////////////////////////////////////////////
// Unexported builders used only internally in `matches`
////////////////////////////////////////////////////////////////////////////////////////////////////

function precededBy(content: PrecededBy['content']): PrecededBy {
	return {
		type: 'precededBy',
		content,
	}
}

function notPrecededBy(content: NotPrecededBy['content']): NotPrecededBy {
	return {
		type: 'notPrecededBy',
		content,
	}
}

function followedBy(content: FollowedBy['content']): FollowedBy {
	return {
		type: 'followedBy',
		content,
	}
}

function notFollowedBy(content: NotFollowedBy['content']): NotFollowedBy {
	return {
		type: 'notFollowedBy',
		content,
	}
}

////////////////////////////////////////////////////////////////////////////////////////////////////
// Assertions
////////////////////////////////////////////////////////////////////////////////////////////////////

function assertValidHexCodepointString(rawHex: string): void {
	const normalized = rawHex.toLowerCase()

	if (!isValidHexCodepointString(normalized)) {
		throw new Error(`Codepoint '${rawHex}' is invalid. It can only include between 1 and 6 hexadecimal digits.`)
	}

	assertValidNumericCodepoint(Number.parseInt(normalized, 16))
}

function isValidHexCodepointString(hex: string): boolean {
	return /^[0-9a-f]{1,6}$/.test(hex)
}

function assertValidRepeatBounds(minCount: number, maxCount: number): void {
	// An infinite minimum count is meaningless (and would encode as `{Infinity}`)
	if (!Number.isFinite(minCount)) {
		throw new Error(`Repeated minCount is invalid: ${minCount}`)
	}

	if (!Number.isFinite(maxCount) && maxCount !== Infinity) {
		throw new Error(`Repeated maxCount is invalid: ${maxCount}`)
	}

	if (minCount < 0 || maxCount < 0) {
		throw new Error(`Repeated counts must be non-negative (got [${minCount}, ${maxCount}])`)
	}

	if (maxCount !== Infinity && minCount > maxCount) {
		throw new Error(`Repeated range is invalid: minCount ${minCount} is greater than maxCount ${maxCount}`)
	}
}

function assertValidNumericCodepoint(numericCodepoint: number) {
	if (isNaN(numericCodepoint)) {
		throw new Error(`Codepoint is to NaN`)
	}

	if (numericCodepoint < 0 || numericCodepoint > 1114111) {
		throw new Error(`Codepoint ${numericCodepoint} is outside the accepted range of 0 to 1,114,111 (inclusive)`)
	}
}

////////////////////////////////////////////////////////////////////////////////////////////////////
// Build options
////////////////////////////////////////////////////////////////////////////////////////////////////
function getRegExpFlagsForOptions(options: BuildOptions) {
	let flagsString = ""

	const hasIndices = options.hasIndices
	const global = options.global
	const ignoreCase = options.ignoreCase
	const multiline = false
	const dotAll = true
	const unicode = true
	const unicodeSets = false
	const sticky = options.sticky

	if (hasIndices) { flagsString += 'd' }
	if (global) { flagsString += 'g' }
	if (ignoreCase) { flagsString += 'i' }
	if (multiline) { flagsString += 'm' }
	if (dotAll) { flagsString += 's' }
	if (unicode) { flagsString += 'u' }
	if (unicodeSets) { flagsString += 'v' }
	if (sticky) { flagsString += 'y' }

	return flagsString
}

export const defaultBuildOptions: BuildOptions = {
	global: false,
	hasIndices: true,
	ignoreCase: false,
	//multiline: false,
	//dotMatchesAll: true,
	//unicode: true,
	//unicodeSets: false,
	sticky: false
}

interface BuildOptions {
	global: boolean
	hasIndices: boolean
	ignoreCase: boolean
	//multiline: boolean
	//dotMatchesAll: boolean
	//unicode: boolean
	//unicodeSets: boolean
	sticky: boolean
}

////////////////////////////////////////////////////////////////////////////////////////////////////
// Special token constants
////////////////////////////////////////////////////////////////////////////////////////////////////
export const inputStart: SpecialToken = {
	type: 'specialToken',
	name: 'inputStart',
	rawRegExp: '^'
}

export const inputEnd: SpecialToken = {
	type: 'specialToken',
	name: 'inputEnd',
	rawRegExp: '$'
}

export const anyChar: SpecialToken = {
	type: 'specialToken',
	name: 'anyChar',
	rawRegExp: '.'
}

export const whitespace: SpecialToken = {
	type: 'specialToken',
	name: 'whitespace',
	rawRegExp: '\\s'
}

export const nonWhitespace: SpecialToken = {
	type: 'specialToken',
	name: 'nonWhitespace',
	rawRegExp: '\\S'
}

export const digit: SpecialToken = {
	type: 'specialToken',
	name: 'digit',
	rawRegExp: '\\d'
}

export const nonDigit: SpecialToken = {
	type: 'specialToken',
	name: 'nonDigit',
	rawRegExp: '\\D'
}

export const wordBoundary: SpecialToken = {
	type: 'specialToken',
	name: 'wordBoundary',
	rawRegExp: '\\b'
}

export const nonWordBoundary: SpecialToken = {
	type: 'specialToken',
	name: 'nonWordBoundary',
	rawRegExp: '\\B'
}

export const formFeed: SpecialToken = {
	type: 'specialToken',
	name: 'formFeed',
	rawRegExp: '\\f'
}

export const lineFeed: SpecialToken = {
	type: 'specialToken',
	name: 'lineFeed',
	rawRegExp: '\\n'
}

export const carriageReturn: SpecialToken = {
	type: 'specialToken',
	name: 'carriageReturn',
	rawRegExp: '\\r'
}

export const tab: SpecialToken = {
	type: 'specialToken',
	name: 'tab',
	rawRegExp: '\\t'
}

export const verticalTab: SpecialToken = {
	type: 'specialToken',
	name: 'verticalTab',
	rawRegExp: '\\v'
}

// Convenience pattern for newline
export const newLine: PatternExpression = [possibly(carriageReturn), lineFeed]
