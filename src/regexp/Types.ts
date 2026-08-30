////////////////////////////////////////////////////////////////////////////////////////////////////
// Pattern type definitions
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
	NotAnyOfChars |
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

export interface NotAnyOfChars extends PatternBase {
	type: 'notAnyOfChars'
	members: CharPattern[]
}

export interface Capture extends PatternBase {
	type: 'capture'
	name: string | undefined
	content: Pattern
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
export type RepeatedRange = [number, number?]

export type Pattern = SinglePattern | Pattern[]
export type CharPattern = string | SpecialToken | CharPattern[]
