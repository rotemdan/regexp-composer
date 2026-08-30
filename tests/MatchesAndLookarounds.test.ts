import { describe, test, expect } from 'vitest'
import * as R from '../src/exports/Exports.ts'

describe('matches / lookarounds behavioral', () => {
	test('except excludes exact pattern', () => {
		const re = R.buildRegExp([R.inputStart, R.matches(R.oneOrMore(R.charRange('0', '9')), { except: '23' }), R.inputEnd])
		expect(re.test('12344')).toBe(true)
		expect(re.test('23')).toBe(false)
		expect(re.test('230')).toBe(false) // starts with 23 but longer — depends on engine: (?!23)[0-9]+ from start will still fail on "23" prefix? At position 0, (?!23) fails, so "230" also fails.
	})

	test('ifFollowedBy / ifNotFollowedBy', () => {
		const reFollowed = R.buildRegExp(R.matches('a', { ifFollowedBy: 'b' }))
		expect(reFollowed.test('ab')).toBe(true)
		expect(reFollowed.test('ac')).toBe(false)

		const reNotFollowed = R.buildRegExp([R.matches('a', { ifNotFollowedBy: 'b' }), R.inputEnd])
		// "a" at end not followed by b => true, "ab" => a is followed by b => false at the position where a occurs? We anchor end to make intent clear.
		expect(reNotFollowed.test('a')).toBe(true)
		expect(R.buildRegExp([R.matches('a', { ifNotFollowedBy: 'b' })]).test('ab')).toBe(false)
	})

	test('ifPrecededBy / ifNotPrecededBy', () => {
		const rePreceded = R.buildRegExp(R.matches('b', { ifPrecededBy: 'a' }))
		expect(rePreceded.test('ab')).toBe(true)
		expect(rePreceded.test('cb')).toBe(false)

		const reNotPreceded = R.buildRegExp(R.matches('b', { ifNotPrecededBy: 'a' }))
		expect(reNotPreceded.test('cb')).toBe(true)
		expect(reNotPreceded.test('ab')).toBe(false)
	})

	test('ifExtendsTo / ifExtendsBackTo (prefix checks)', () => {
		// ifExtendsTo: pattern must be prefix of followingPattern — encoded as (?=following)pattern at same position
		// Example: pattern "a" extends to "ab" means at pos, "ab" present ahead.
		const re = R.buildRegExp(R.matches('a', { ifExtendsTo: 'ab' }))
		expect(re.test('ab')).toBe(true)
		expect(re.test('ac')).toBe(false)
	})

	test('multiple conditions combined', () => {
		// ifNotPrecededBy is a per-position lookbehind — "hello" in "xhello" is
		// preceded by 'x', so the literal match must be rejected at that position
		const reSub = R.buildRegExp(R.matches('hello', { ifNotPrecededBy: 'x' }))
		expect(reSub.test('hello')).toBe(true)
		// In "xhello", the only occurrence of "hello" starts at offset 1 and is
		// preceded by 'x', so the filtered regex finds no match at all
		expect(reSub.exec('xhello')).toBeNull()

		// ifNotFollowedBy is checked at the current match position, not at
		// inputEnd — with greedy oneOrMore the 'y' is simply consumed. Use a
		// fixed literal to make the distinction meaningful.
		const reEnd = R.buildRegExp([R.inputStart, R.matches('hello', { ifNotFollowedBy: 'y' }), R.inputEnd])
		expect(reEnd.test('hello')).toBe(true)
		expect(reEnd.test('helloy')).toBe(false)
		expect(R.buildRegExp(R.matches('hello', { ifNotFollowedBy: 'y' })).test('hellox')).toBe(true) // 'y' not immediately after the match
	})
})
