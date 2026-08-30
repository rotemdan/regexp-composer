import { describe, test, expect } from 'vitest'
import * as R from '../src/exports/Exports.ts'

describe('capture / sameAs', () => {
	test('capture basics', () => {
		const re = R.buildRegExp([R.capture('ab'), R.sameAs(1)])
		expect(re.test('abab')).toBe(true)
		expect(re.test('abac')).toBe(false)
	})

	test('named capture + named sameAs', () => {
		const re = R.buildRegExp([R.captureAs('g', 'ab'), R.sameAs('g')])
		expect(re.test('abab')).toBe(true)
		const m = re.exec('abab')!
		expect(m.groups?.g).toBe('ab')
	})

	test('sameAs forward reference throws via isPatternOptional lookup', () => {
		// sameAs(2) when only one capture precedes it — the array short-circuits
		// on a non-optional first element and never reaches sameAs, so use an
		// optional first capture to force evaluation of the backreference.
		const pat: any = [R.capture(R.possibly('a')), R.sameAs(2)]
		expect(() => R.isPatternOptional(pat)).toThrow(/resolve backreference/)
	})

	test('buildRegExp forward numeric backref is allowed by engine but sameAs validation still applies', () => {
		// The encoder doesn't validate ordering — engine will handle it
		expect(() => R.buildRegExp([R.sameAs(1), R.capture('a')] as any)).not.toThrow()
	})
})
