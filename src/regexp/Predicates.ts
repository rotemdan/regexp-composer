import { PatternExpression, SpecialToken } from './Types.js'

////////////////////////////////////////////////////////////////////////////////////////////////////
// Predicate functions
////////////////////////////////////////////////////////////////////////////////////////////////////
export function isSingleCharOrClassTokenExpression(patternExpression: PatternExpression) {
	return isSingleCharExpression(patternExpression) || isClassToken(patternExpression)
}

function isSingleCharExpression(patternExpression: PatternExpression) {
	return (isString(patternExpression) && isSingleUnicodeCodepoint(patternExpression))
}

function isClassToken(patternExpression: PatternExpression) {
	return isSpecialToken(patternExpression) && !isMetacharacterToken(patternExpression)
}

function isMetacharacterToken(patternExpression: PatternExpression) {
	return isSpecialToken(patternExpression) && (
		patternExpression.name === 'inputStart' ||
		patternExpression.name === 'inputEnd' ||
		patternExpression.name === 'anyChar' ||
		patternExpression.name === 'wordBoundary' ||
		patternExpression.name === 'nonWordBoundary'
	)
}

function isSpecialToken(patternExpression: PatternExpression): patternExpression is SpecialToken {
	return typeof patternExpression === 'object' &&
		!isArray(patternExpression) && patternExpression.type == 'specialToken'
}

export function isString(obj: any): obj is string {
	return typeof obj === 'string'
}

export function isNumber(obj: any): obj is number {
	return typeof obj === 'number'
}

export function isArray(obj: any): obj is any[] {
	return Array.isArray(obj)
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
