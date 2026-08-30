import { describe, test, expect } from 'vitest'
import * as R from '../src/exports/Exports.ts'

describe('anyOf encoding — exhaustive', () => {
	test('empty anyOf', () => {
		expect(R.encodePattern(R.anyOf())).toBe('')
	})

	test('single non-class member', () => {
		// single member should still be wrapped in (?: )
		expect(R.encodePattern(R.anyOf('hello'))).toBe('(?:hello)')
	})

	test('anyOf of single-char class groups contiguously', () => {
		// consecutive single-char tokens collapse into one char class
		expect(R.encodePattern(R.anyOf('a', 'b', 'c'))).toBe('(?:[abc])')
		expect(R.encodePattern(R.anyOf('a', R.digit, 'b'))).toBe('(?:[a\\db])')
	})

	test('anyOf interleaving class/non-class groups by runs', () => {
		// a,b are class, "hello" is not, "c" is class => 3 runs
		const pat = R.anyOf('a', 'b', 'hello', 'c')
		const src = R.encodePattern(pat)
		expect(src).toBe('(?:[ab]|hello|[c])')
	})

	test('anyOf preserves empty disjunct across batches (non-class)', () => {
		expect(R.buildRegExp(R.anyOf('a', '')).test('')).toBe(true)
		expect(R.buildRegExp(R.anyOf('', 'a')).test('')).toBe(true)
		// interleaved class → non-class → class with empty in the middle batch
		// The empty is in the non-class batch, so it should still yield |
		expect(R.buildRegExp(R.anyOf('a', 'hello', '')).test('')).toBe(true)
	})

	test('anyOf class-only batch with empty-ish content: filtered silence', () => {
		// If a class batch contains only patterns that encode to "" (e.g. possibly('')),
		// the old code silently dropped the whole batch. Here the pattern itself
		// doesn't matter much — the key is we don't accidentally emit invalid [].
		const pat = R.anyOf(R.possibly('') as any, R.possibly('') as any)
		const src = R.encodePattern(pat)
		// Two empty string patterns filtered -> disjunctionMemberStrings empty -> '' overall
		// (this is correct: anyOf of empties collapses to empty, which matches "")
		expect(R.buildRegExp(pat).test('')).toBe(true)
		expect(src).not.toContain('[]')
	})

	test('anyOf with nested anyOf content', () => {
		const pat = R.anyOf(R.anyOf('a', 'b'), 'c')
		const re = R.buildRegExp(pat)
		expect(re.test('a')).toBe(true)
		expect(re.test('c')).toBe(true)
	})

	test('lookarounds inside anyOf', () => {
		const pat = R.anyOf(
			[R.inputStart, 'a'] as any,
			['b', R.inputEnd] as any,
		)
		const re = R.buildRegExp(pat)
		expect(re.test('a')).toBe(true)
		expect(re.test('b')).toBe(true)
	})
})
