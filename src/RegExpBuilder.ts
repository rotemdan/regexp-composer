////////////////////////////////////////////////////////////////////////////////////////////////////
// Main API:
////////////////////////////////////////////////////////////////////////////////////////////////////
export function buildRegExp(pattern: Pattern, buildOptions?: Partial<BuildOptions>): RegExp {
	const options: BuildOptions = { ...defaultBuildOptions, ...buildOptions }

	const regExpString = encodePattern(pattern)
	const regExpFlagsString = getRegExpFlagsForOptions(options)

	return new RegExp(regExpString, regExpFlagsString)
}

////////////////////////////////////////////////////////////////////////////////////////////////////
// Encoder functions:
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

		case 'notAnyOf': {
			return encodePattern_notAnyOf(pattern)
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

		if (lastGroup.length === 0 || isSingleCharPattern(member) === isSingleCharPattern(lastGroup[0])) {
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

		if (isSingleCharPattern(patternGroup[0])) {
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
			const memberStrings = patternGroup
				.map(member => encodePattern(member))
				.filter(value => value.length > 0)

			disjunctionMemberStrings.push(...memberStrings)
		}
	}

	if (disjunctionMemberStrings.length === 0) {
		return ''
	}

	const disjunctionString = disjunctionMemberStrings.join('|')

	return `(?:${disjunctionString})`
}

function encodePattern_notAnyOf(pattern: notAnyOf): string {
	const members = pattern.members

	if (members.length === 0) {
		return ''
	}

	const encodedElements: string[] = []

	for (const member of members) {
		if (!isStringOrClassToken(member)) {
			throw new Error(`The pattern ${member} is not a single codepoint or class token and cannot be included in a negated character class.`)
		}

		if (isString(member) && !isSingleUnicodeCodepoint(member)) {
			throw new Error(`The string pattern ${member} is not a single codepoint and cannot be included in a negated character class.`)
		}

		encodedElements.push(encodePattern(member, false))
	}

	return `[^${encodedElements.join('')}]`
}

function encodePattern_possibly(pattern: Possibly): string {
	const contentString = encodePattern(pattern.content)

	if (contentString === '') {
		return ''
	}

	if (isStringOrClassToken(pattern.content)) {
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

	if (isStringOrClassToken(pattern.content)) {
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

	if (isStringOrClassToken(pattern.content)) {
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
// AST building functions
////////////////////////////////////////////////////////////////////////////////////////////////////
export function possibly(pattern: Possibly['content']): Possibly {
	return {
		type: 'possibly',
		content: pattern,
	}
}

export function zeroOrMore(pattern: ZeroOrMore['content']): ZeroOrMore {
	return {
		type: 'zeroOrMore',
		content: pattern,
		greedy: true
	}
}

export function zeroOrMoreNonGreedy(pattern: ZeroOrMore['content']): ZeroOrMore {
	return {
		type: 'zeroOrMore',
		content: pattern,
		greedy: false
	}
}

export function oneOrMore(pattern: OneOrMore['content']): OneOrMore {
	return {
		type: 'oneOrMore',
		content: pattern,
		greedy: true
	}
}

export function oneOrMoreNonGreedy(pattern: OneOrMore['content']): OneOrMore {
	return {
		type: 'oneOrMore',
		content: pattern,
		greedy: false
	}
}

export function repeated(count: number, pattern: Repeated['content']): Repeated
export function repeated(range: RepeatedRange, pattern: Repeated['content']): Repeated
export function repeated(countOrRange: number | RepeatedRange, pattern: Repeated['content']): Repeated {
	let minCount: number
	let maxCount: number

	if (typeof countOrRange === 'number') {
		const count = countOrRange

		minCount = count
		maxCount = count
	} else {
		const range = countOrRange

		if (range.length as number === 0 || range.length > 2) {
			throw new Error(`Range should either be [min] or [min, max]`)
		}

		minCount = range[0]
		maxCount = range[1] ?? Infinity
	}

	minCount |= 0
	maxCount |= 0

	return {
		type: 'repeated',
		minCount,
		maxCount,
		content: pattern,
		greedy: true
	}
}

export function repeatedNonGreedy(pattern: Repeated['content'], range: RepeatedRange): Repeated {
	if (range.length as number === 0 || range.length > 2) {
		throw new Error(`Range should either be [min] or [min, max]`)
	}

	let minCount = range[0]
	let maxCount = range[1] ?? Infinity

	minCount |= 0
	maxCount |= 0

	return {
		type: 'repeated',
		minCount,
		maxCount,
		content: pattern,
		greedy: false
	}
}

function precededBy(pattern: PrecededBy['content']): PrecededBy {
	return {
		type: 'precededBy',
		content: pattern
	}
}

function notPrecededBy(pattern: NotPrecededBy['content']): NotPrecededBy {
	return {
		type: 'notPrecededBy',
		content: pattern
	}
}

function followedBy(pattern: FollowedBy['content']): FollowedBy {
	return {
		type: 'followedBy',
		content: pattern
	}
}

function notFollowedBy(pattern: NotFollowedBy['content']): NotFollowedBy {
	return {
		type: 'notFollowedBy',
		content: pattern
	}
}

export function anyOf(...members: AnyOf['members']): AnyOf {
	return {
		type: 'anyOf',
		members: members
	}
}

export function notAnyOf(...members: notAnyOf['members']): notAnyOf {
	return {
		type: 'notAnyOf',
		members: members
	}
}

export function capture(pattern: Capture['content']): Capture {
	return {
		type: 'capture',
		name: undefined,
		content: pattern
	}
}

export function captureAs(name: string, pattern: Capture['content']): Capture {
	return {
		type: 'capture',
		name,
		content: pattern
	}
}

export function sameAs(captureGroupNameOrIndex: SameAs['captureGroupNameOrIndex']): SameAs {
	if (isString(captureGroupNameOrIndex)) {
		if (captureGroupNameOrIndex.length === 0) {
			throw new Error(`'sameAs' capture group name cannot be empty`)
		}
	} else if (isNumber(captureGroupNameOrIndex)) {
		if (captureGroupNameOrIndex < 1 || captureGroupNameOrIndex > 99) {
			throw new Error(`'sameAs' capture group index can only be between 1 and 99`)
		}

		if (captureGroupNameOrIndex != (captureGroupNameOrIndex | 0)) {
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
		unicodeCodepoint = unicodeCodepoint.toLowerCase()

		if (/^[0-9a-fA-F]{1, 6}$/.test(unicodeCodepoint)) {
			throw new Error(`Codepoint '${unicodeCodepoint}' is invalid. It can only include between 1 and 6 hexedecimal digits.`)
		}

		assertValidNumericCodepoint(Number.parseInt(unicodeCodepoint, 16))
	}

	return {
		type: 'specialToken',
		name: 'codepoint',
		rawRegExp: `\\u{${unicodeCodepoint}}`
	}
}

export function charRange(startChar: string, endChar: string): SpecialToken {
	if (startChar.codePointAt(0)! > endChar.codePointAt(0)!) {
		throw new Error(`Character range is invalid. Starting character '${startChar}' has codepoint higher then ending character '${endChar}'.`)
	}

	if (startChar === '-') {
		startChar = '\\-'
	}

	if (endChar === '-') {
		endChar = '\\-'
	}

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
		start = start.toString(16)
	}

	if (isNumber(end)) {
		end = end.toString(16)
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
// Match patterns:
////////////////////////////////////////////////////////////////////////////////////////////////////
interface MatchesConditions {
	except?: Pattern
	ifFollowedBy?: Pattern
	ifNotFollowedBy?: Pattern
	ifPrecededBy?: Pattern
	ifNotPrecededBy?: Pattern
	ifExtendsTo?: Pattern
	ifExtendsBackTo?: Pattern
	ifNotExtendsBackTo?: Pattern
}

export function matches(pattern: Pattern, conditions: MatchesConditions): Pattern
export function matches(pattern: Pattern, conditionsArray: MatchesConditions[]): Pattern
export function matches(pattern: Pattern, conditionsOrConditionsArray: MatchesConditions | MatchesConditions[]): Pattern {
	const beforePattern: Pattern[] = []
	const afterPattern: Pattern[] = []

	let conditionsArray: MatchesConditions[]

	if (Array.isArray(conditionsOrConditionsArray)) {
		conditionsArray = conditionsOrConditionsArray
	} else {
		conditionsArray = [conditionsOrConditionsArray]
	}

	for (const conditions of conditionsArray) {
		if (conditions.except) {
			beforePattern.push(notFollowedBy(conditions.except))
		}

		if (conditions.ifFollowedBy) {
			afterPattern.push(followedBy(conditions.ifFollowedBy))
		}

		if (conditions.ifNotFollowedBy) {
			afterPattern.push(notFollowedBy(conditions.ifNotFollowedBy))
		}

		if (conditions.ifPrecededBy) {
			beforePattern.push(precededBy(conditions.ifPrecededBy))
		}

		if (conditions.ifNotPrecededBy) {
			beforePattern.push(notPrecededBy(conditions.ifNotPrecededBy))
		}

		if (conditions.ifExtendsTo) {
			beforePattern.push(followedBy(conditions.ifExtendsTo))
		}

		if (conditions.ifExtendsBackTo) {
			afterPattern.push(precededBy(conditions.ifExtendsBackTo))
		}

		if (conditions.ifNotExtendsBackTo) {
			afterPattern.push(notPrecededBy(conditions.ifNotExtendsBackTo))
		}
	}

	const resultPattern = [
		...beforePattern,
		pattern,
		...afterPattern
	]

	return resultPattern
}

////////////////////////////////////////////////////////////////////////////////////////////////////
// Detect if a pattern is optional:
////////////////////////////////////////////////////////////////////////////////////////////////////
export function isPatternOptional(pattern: Pattern): boolean {
	const captureGroupLookup: boolean[] = []
	const namedCaptureGroupLookup = new Map<string, boolean>()

	function isOptional(pattern: Pattern): boolean {
		if (isString(pattern)) {
			return false
		}

		if (isArray(pattern)) {
			for (const element of pattern) {
				if (!isOptional(element)) {
					return false
				}
			}

			return true
		}

		if (pattern.type === 'specialToken' || pattern.type === 'notAnyOf') {
			return false
		}

		if (pattern.type === 'possibly' || pattern.type === 'zeroOrMore') {
			return true
		}

		if (pattern.type === 'oneOrMore' ||
			pattern.type === 'repeated' ||
			pattern.type === 'precededBy' ||
			pattern.type === 'notPrecededBy' ||
			pattern.type === 'followedBy' ||
			pattern.type === 'notFollowedBy') {

			return isOptional(pattern.content)
		}

		if (pattern.type === 'capture') {
			const isGroupOptional = isOptional(pattern.content)

			captureGroupLookup.push(isGroupOptional)

			if (pattern.name) {
				namedCaptureGroupLookup.set(pattern.name, isGroupOptional)
			}

			return isGroupOptional
		}

		if (pattern.type === 'anyOf') {
			for (const member of pattern.members) {
				if (!isOptional(member)) {
					return false
				}
			}

			return true
		}

		if (pattern.type === 'sameAs') {
			const nameOrIndex = pattern.captureGroupNameOrIndex

			if (isNumber(nameOrIndex)) {
				const lookupResult = captureGroupLookup[nameOrIndex]

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

////////////////////////////////////////////////////////////////////////////////////////////////////
// Build options:
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
// Utility functions
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

function isSingleCharPattern(pattern: Pattern) {
	return (isString(pattern) && isSingleUnicodeCodepoint(pattern)) || isClassToken(pattern)
}

function isStringOrClassToken(pattern: Pattern): pattern is (string | SpecialToken) {
	return isString(pattern) || isClassToken(pattern)
}

function isClassToken(pattern: Pattern): pattern is SpecialToken {
	return typeof pattern === 'object' && !isArray(pattern) && pattern.type == 'specialToken'
}

function assertValidNumericCodepoint(numericCodepoint: number) {
	if (isNaN(numericCodepoint)) {
		throw new Error(`Codepoint is to NaN`)
	}

	if (numericCodepoint < 0 || numericCodepoint > 1114111) {
		throw new Error(`Codepoint ${codepoint} is outside the accepted range of 0 to 1,114,111 (inclusive)`)
	}
}

function isString(data: any): data is string {
	return typeof data === 'string'
}

function isNumber(data: any): data is number {
	return typeof data === 'number'
}

function isArray(data: any): data is any[] {
	return Array.isArray(data)
}

function isSingleUnicodeCodepoint(str: string) {
	for (const char of str) {
		return char.length === str.length
	}

	throw new Error('Zero-length string')
}

////////////////////////////////////////////////////////////////////////////////////////////////////
// Pattern type definitions:
////////////////////////////////////////////////////////////////////////////////////////////////////
export type SinglePattern =
	string |
	SpecialToken |
	Possibly |
	ZeroOrMore |
	OneOrMore |
	Repeated |
	PrecededBy |
	NotPrecededBy |
	FollowedBy |
	NotFollowedBy |
	AnyOf |
	notAnyOf |
	Capture |
	SameAs

export interface PatternBase {
	type: string
}

export interface Possibly extends PatternBase {
	type: 'possibly'
	content: Pattern
}

export interface ZeroOrMore extends PatternBase {
	type: 'zeroOrMore'
	content: Pattern
	greedy: boolean
}

export interface OneOrMore extends PatternBase {
	type: 'oneOrMore'
	content: Pattern
	greedy: boolean
}

export interface Repeated extends PatternBase {
	type: 'repeated'
	content: Pattern

	minCount: number
	maxCount: number

	greedy: boolean
}

export interface PrecededBy extends PatternBase {
	type: 'precededBy'
	content: Pattern
}

export interface NotPrecededBy extends PatternBase {
	type: 'notPrecededBy'
	content: Pattern
}

export interface FollowedBy extends PatternBase {
	type: 'followedBy'
	content: Pattern
}

export interface NotFollowedBy extends PatternBase {
	type: 'notFollowedBy'
	content: Pattern
}

export interface AnyOf extends PatternBase {
	type: 'anyOf'
	members: Pattern[]
}

export interface notAnyOf extends PatternBase {
	type: 'notAnyOf'
	members: (string | SpecialToken | (string | SpecialToken)[])[]
}

export interface Capture extends PatternBase {
	type: 'capture'
	name: string | undefined
	content: Exclude<SinglePattern, string> | SinglePattern[]
}

export interface SameAs extends PatternBase {
	type: 'sameAs'
	captureGroupNameOrIndex: string | number
}

export interface SpecialToken extends PatternBase {
	type: 'specialToken'
	name: string
	rawRegExp: string
}

////////////////////////////////////////////////////////////////////////////////////////////////////
// Special token constants:
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

// Convenience pattern for new line:
export const newLine: SinglePattern[] = [possibly(carriageReturn), lineFeed]

export type RepeatedRange = [number, number?]

export type Pattern = SinglePattern | Pattern[]

