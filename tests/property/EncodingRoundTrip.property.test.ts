import { describe, test, expect } from 'vitest'
import * as R from '../../src/exports/Exports.ts'
import { literalSamples, leafPatterns, patternSpace, describePattern } from './PatternSpace.ts'

// Purpose: assert invariant relationships between the two public entry points.
// `buildRegExp` compiles the string that `encodePattern` produces, so the
// compiled source must equal the encoded string, and the build options may only
// influence the flags.

describe('source and encoder agreement', () => {
	test('the compiled source equals the encoded pattern across the pattern space', () => {
		for (const pattern of patternSpace) {
			expect(R.buildRegExp(pattern).source, describePattern(pattern)).toBe(compiledSourceFor(pattern))
		}
	})

	test('a literal compiles to its own escaped form', () => {
		for (const literal of literalSamples) {
			expect(R.buildRegExp(literal).source, JSON.stringify(literal)).toBe(compiledSourceFor(literal))
		}
	})
})

describe('option independence', () => {
	test('build options never change the source', () => {
		for (const pattern of patternSpace) {
			const source = R.buildRegExp(pattern).source
			expect(R.buildRegExp(pattern, { global: true, ignoreCase: true, sticky: true }).source, describePattern(pattern)).toBe(source)
		}
	})

	test('the flag string is composed from the options', () => {
		for (const pattern of leafPatterns) {
			expect(R.buildRegExp(pattern, {}).flags, describePattern(pattern)).toBe('dsu')
			expect(R.buildRegExp(pattern, { global: true }).flags, describePattern(pattern)).toBe('dgsu')
			expect(R.buildRegExp(pattern, { ignoreCase: true }).flags, describePattern(pattern)).toBe('disu')
			expect(R.buildRegExp(pattern, { sticky: true }).flags, describePattern(pattern)).toBe('dsuy')
			expect(R.buildRegExp(pattern, { global: true, ignoreCase: true, sticky: true }).flags, describePattern(pattern)).toBe('dgisuy')
		}
	})
})

describe('literal escaping', () => {
	test('an escaped literal matches itself when anchored', () => {
		for (const literal of literalSamples) {
			const re = R.buildRegExp([R.inputStart, literal, R.inputEnd])
			expect(re.test(literal), JSON.stringify(literal)).toBe(true)
		}
	})

	test('encoding the same literal twice yields the same string', () => {
		for (const literal of literalSamples) {
			expect(R.encodePattern(literal), JSON.stringify(literal)).toBe(R.encodePattern(literal))
		}
	})
})

// The engine normalizes an empty source to `(?:)`, so an encoded empty pattern
// reads back as a non-empty source.
function compiledSourceFor(pattern: R.PatternExpression): string {
	const encoded = R.encodePattern(pattern)

	return encoded === '' ? '(?:)' : encoded
}
