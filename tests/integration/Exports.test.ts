import { describe, test, expect } from 'vitest'
import * as R from '../../src/exports/Exports.ts'

const functions = [
	'buildRegExp',
	'encodePattern',
	'isPatternOptional',
	'possibly',
	'zeroOrMore',
	'zeroOrMoreNonGreedy',
	'oneOrMore',
	'oneOrMoreNonGreedy',
	'repeated',
	'repeatedNonGreedy',
	'anyOf',
	'notAnyOfChars',
	'capture',
	'captureAs',
	'sameAs',
	'unicodeProperty',
	'notUnicodeProperty',
	'codepoint',
	'charRange',
	'codepointRange',
	'matches'
]

const tokenConstants = [
	'inputStart',
	'inputEnd',
	'anyChar',
	'whitespace',
	'nonWhitespace',
	'digit',
	'nonDigit',
	'wordBoundary',
	'nonWordBoundary',
	'formFeed',
	'lineFeed',
	'carriageReturn',
	'tab',
	'verticalTab'
]

const internalLookaroundBuilders = ['precededBy', 'notPrecededBy', 'followedBy', 'notFollowedBy']

describe('public function boundary', () => {
	for (const name of functions) {
		test(`${name} is exported as a function`, () => {
			expect(typeof (R as Record<string, unknown>)[name]).toBe('function')
		})
	}
})

describe('public constant boundary', () => {
	for (const name of tokenConstants) {
		test(`${name} is exported as a special token`, () => {
			expect((R as Record<string, unknown>)[name]).toMatchObject({ type: 'specialToken', name })
		})
	}

	test('newLine is exported as a pattern sequence', () => {
		expect(Array.isArray(R.newLine)).toBe(true)
	})

	test('defaultBuildOptions is exported as an object', () => {
		expect(typeof R.defaultBuildOptions).toBe('object')
	})
})

describe('internal boundary', () => {
	for (const name of internalLookaroundBuilders) {
		test(`${name} is not part of the public surface`, () => {
			expect(name in R).toBe(false)
		})
	}
})
