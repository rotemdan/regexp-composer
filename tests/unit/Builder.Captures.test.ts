import { describe, test, expect } from 'vitest'
import * as R from '../../src/exports/Exports.ts'

describe('capture builders', () => {
	test('capture produces an unnamed capture node', () => {
		expect(R.capture('ab')).toEqual({ type: 'capture', name: undefined, content: 'ab' })
	})

	test('captureAs produces a named capture node', () => {
		expect(R.captureAs('group1', 'ab')).toEqual({ type: 'capture', name: 'group1', content: 'ab' })
	})

	test('captureAs accepts names with trailing digits', () => {
		expect(() => R.captureAs('myGroup1', 'a')).not.toThrow()
	})
})

describe('sameAs builder', () => {
	test('a name produces a named backreference node', () => {
		expect(R.sameAs('group')).toEqual({ type: 'sameAs', captureGroupNameOrIndex: 'group' })
	})

	test('an integer produces a numeric backreference node', () => {
		expect(R.sameAs(1)).toEqual({ type: 'sameAs', captureGroupNameOrIndex: 1 })
	})

	test('every integer index from 1 to 9 is accepted', () => {
		for (let index = 1; index <= 9; index++) {
			expect(() => R.sameAs(index)).not.toThrow()
		}
	})
})
