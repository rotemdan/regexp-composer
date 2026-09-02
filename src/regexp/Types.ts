////////////////////////////////////////////////////////////////////////////////////////////////////
// Pattern type definitions
////////////////////////////////////////////////////////////////////////////////////////////////////
export type PatternNode =
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
	NotAnyOfChars |
	Capture |
	SameAs

export interface PatternNodeBase {
	type: string
}

export interface Possibly extends PatternNodeBase {
	type: 'possibly'
	content: PatternExpression
}

export interface ZeroOrMore extends PatternNodeBase {
	type: 'zeroOrMore'
	content: PatternExpression
	greedy: boolean
}

export interface OneOrMore extends PatternNodeBase {
	type: 'oneOrMore'
	content: PatternExpression
	greedy: boolean
}

export interface Repeated extends PatternNodeBase {
	type: 'repeated'
	content: PatternExpression

	minCount: number
	maxCount: number

	greedy: boolean
}

export interface PrecededBy extends PatternNodeBase {
	type: 'precededBy'
	content: PatternExpression
}

export interface NotPrecededBy extends PatternNodeBase {
	type: 'notPrecededBy'
	content: PatternExpression
}

export interface FollowedBy extends PatternNodeBase {
	type: 'followedBy'
	content: PatternExpression
}

export interface NotFollowedBy extends PatternNodeBase {
	type: 'notFollowedBy'
	content: PatternExpression
}

export interface AnyOf extends PatternNodeBase {
	type: 'anyOf'
	members: PatternExpression[]
}

export interface NotAnyOfChars extends PatternNodeBase {
	type: 'notAnyOfChars'
	members: (string | SpecialToken)[]
}

export interface Capture extends PatternNodeBase {
	type: 'capture'
	name: string | undefined
	content: PatternExpression
}

export interface SameAs extends PatternNodeBase {
	type: 'sameAs'
	captureGroupNameOrIndex: string | number
}

export interface SpecialToken extends PatternNodeBase {
	type: 'specialToken'
	name: string
	rawRegExp: string
}

export type RepeatedRange = [number, number?]

export type PatternExpression = string | PatternNode | PatternExpression[]
