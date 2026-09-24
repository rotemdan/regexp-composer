import { describe, test, expect } from 'vitest'
import * as R from '../../src/exports/Exports.ts'

describe('defaultBuildOptions', () => {
	test('the documented defaults', () => {
		expect(R.defaultBuildOptions).toEqual({ global: false, hasIndices: true, ignoreCase: false, sticky: false })
	})
})

describe('flag composition', () => {
	test('the default flags are dsu', () => {
		expect(R.buildRegExp('a').flags).toBe('dsu')
	})

	test('global adds g', () => {
		expect(R.buildRegExp('a', { global: true }).flags).toBe('dgsu')
	})

	test('ignoreCase adds i', () => {
		expect(R.buildRegExp('a', { ignoreCase: true }).flags).toBe('disu')
	})

	test('sticky adds y', () => {
		expect(R.buildRegExp('a', { sticky: true }).flags).toBe('dsuy')
	})

	test('hasIndices false removes d', () => {
		expect(R.buildRegExp('a', { hasIndices: false }).flags).toBe('su')
	})

	test('combined options compose in canonical order', () => {
		expect(R.buildRegExp('a', { global: true, ignoreCase: true, sticky: true }).flags).toBe('dgisuy')
	})

	test('an empty options object keeps the defaults', () => {
		expect(R.buildRegExp('a', {}).flags).toBe('dsu')
	})
})

describe('option behavior', () => {
	test('ignoreCase matches either case', () => {
		expect(R.buildRegExp('a', { ignoreCase: true }).test('A')).toBe(true)
		expect(R.buildRegExp('a').test('A')).toBe(false)
	})

	test('global advances lastIndex and enables iterating every match', () => {
		const re = R.buildRegExp('a', { global: true })
		expect(re.test('a')).toBe(true)
		expect(re.lastIndex).toBe(1)

		const matches = [...'aba'.matchAll(R.buildRegExp('a', { global: true }))]
		expect(matches).toHaveLength(2)
		expect(matches.map(match => match.index)).toEqual([0, 2])
	})

	test('sticky anchors every attempt at lastIndex', () => {
		expect(R.buildRegExp('a', { sticky: true }).test('ba')).toBe(false)

		const re = R.buildRegExp('a', { sticky: true })
		re.lastIndex = 1
		expect(re.test('ba')).toBe(true)
	})

	test('hasIndices populates match indices', () => {
		const match = R.buildRegExp([R.capture('a')]).exec('ba')!
		expect(match.indices?.[0]).toEqual([1, 2])
		expect(match.indices?.[1]).toEqual([1, 2])
	})

	test('hasIndices false leaves indices undefined', () => {
		const match = R.buildRegExp([R.capture('a')], { hasIndices: false }).exec('ba')!
		expect(match.indices).toBeUndefined()
	})
})
