import { Pattern, SpecialToken } from './Types.js'

////////////////////////////////////////////////////////////////////////////////////////////////////
// Predicate functions
////////////////////////////////////////////////////////////////////////////////////////////////////
export function isSingleCharOrClassTokenPattern(pattern: Pattern) {
	return isSingleCharPattern(pattern) || isClassToken(pattern)
}

function isSingleCharPattern(pattern: Pattern) {
	return (isString(pattern) && isSingleUnicodeCodepoint(pattern))
}

function isClassToken(pattern: Pattern) {
	return isSpecialToken(pattern) && !isMetacharacterToken(pattern)
}

function isMetacharacterToken(pattern: Pattern) {
	return isSpecialToken(pattern) && (
		pattern.name === 'inputStart' ||
		pattern.name === 'inputEnd' ||
		pattern.name === 'anyChar' ||
		pattern.name === 'wordBoundary' ||
		pattern.name === 'nonWordBoundary'
	)
}

function isSpecialToken(pattern: Pattern): pattern is SpecialToken {
	return typeof pattern === 'object' && !isArray(pattern) && pattern.type == 'specialToken'
}

export function isString(data: any): data is string {
	return typeof data === 'string'
}

export function isNumber(data: any): data is number {
	return typeof data === 'number'
}

export function isArray(data: any): data is any[] {
	return Array.isArray(data)
}

export function isSingleUnicodeCodepoint(str: string) {
	if (str.length === 0) {
		return false
	}

	for (const char of str) {
		return char.length === str.length
	}

	return false
}
