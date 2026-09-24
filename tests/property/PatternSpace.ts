import * as R from '../../src/exports/Exports.ts'

// A deterministic pattern space shared by the property files. Every entry is a
// pattern expression that both public entry points accept, so a property can be
// asserted over the whole list without filtering cases per test.

export const literalSamples = ['', 'a', 'Z', '0', '.', '*', 'hello world', 'a.b*c', 'Cześć', '😀', 'e\u0301']

export const leafPatterns: R.PatternExpression[] = [
	'',
	'a',
	'ab',
	'😀',
	R.inputStart,
	R.inputEnd,
	R.anyChar,
	R.digit,
	R.whitespace,
	R.nonDigit,
	R.wordBoundary,
	R.nonWordBoundary,
	R.lineFeed,
	R.newLine,
	R.charRange('a', 'z'),
	R.codepointRange('41', '5a'),
	R.codepoint('41'),
	R.unicodeProperty('Letter'),
	R.notUnicodeProperty('Letter'),
	R.notAnyOfChars('a', 'b'),
	R.anyOf('a', 'b'),
	R.anyOf('ab', 'cd'),
	R.anyOf('a', ''),
	R.anyOf(),
	R.capture('a'),
	R.captureAs('group', 'a'),
	R.capture(R.possibly('a'))
]

export const wrapperFactories: [string, (content: R.PatternExpression) => R.PatternExpression][] = [
	['possibly', content => R.possibly(content)],
	['zeroOrMore', content => R.zeroOrMore(content)],
	['zeroOrMoreNonGreedy', content => R.zeroOrMoreNonGreedy(content)],
	['oneOrMore', content => R.oneOrMore(content)],
	['oneOrMoreNonGreedy', content => R.oneOrMoreNonGreedy(content)],
	['repeated(0)', content => R.repeated(0, content)],
	['repeated(2)', content => R.repeated(2, content)],
	['repeated([0, 3])', content => R.repeated([0, 3], content)],
	['repeated([1, 3])', content => R.repeated([1, 3], content)],
	['repeatedNonGreedy(0)', content => R.repeatedNonGreedy(0, content)],
	['repeatedNonGreedy(2)', content => R.repeatedNonGreedy(2, content)],
	['precededBy', content => ({ type: 'precededBy', content })],
	['notPrecededBy', content => ({ type: 'notPrecededBy', content })],
	['followedBy', content => ({ type: 'followedBy', content })],
	['notFollowedBy', content => ({ type: 'notFollowedBy', content })]
]

export const patternSpace: R.PatternExpression[] = [
	...literalSamples,
	...leafPatterns,
	...wrapperFactories.flatMap(([, wrap]) => leafPatterns.map(leaf => wrap(leaf))),
	R.possibly(R.oneOrMore(R.anyOf('a', R.digit))),
	R.anyOf('a', R.capture('b'), R.possibly('c')),
	R.anyOf(R.possibly(''), R.zeroOrMore('a')),
	[R.capture('a'), R.sameAs(1)],
	[R.captureAs('group', 'a'), R.sameAs('group')],
	[R.capture(R.possibly('a')), R.capture(R.sameAs(1))],
	[R.inputStart, R.oneOrMore(R.charRange('a', 'z')), R.inputEnd],
	R.matches('a', { except: 'b' }),
	R.matches('a', { ifFollowedBy: 'b' }),
	R.matches('a', { ifNotFollowedBy: 'b' }),
	R.matches('a', { ifPrecededBy: 'b' }),
	R.matches('a', { ifNotPrecededBy: 'b' }),
	R.matches('a', { ifExtendsTo: 'b' }),
	R.matches('a', { ifExtendsBackTo: 'b' }),
	R.matches('a', { ifNotExtendsBackTo: 'b' }),
	R.matches('a', [{ ifPrecededBy: 'b' }, { ifFollowedBy: 'c' }])
]

export function describePattern(pattern: R.PatternExpression): string {
	return JSON.stringify(pattern)
}
