import { describe, test, expect } from 'vitest'
import * as R from '../../src/exports/Exports.ts'

const metacharacters = '.*+?^${}()|[]\\/'

describe('literal escaping behavior', () => {
	test('every metacharacter matches itself', () => {
		for (const char of metacharacters) {
			expect(R.buildRegExp([char]).test(char), `char ${JSON.stringify(char)}`).toBe(true)
		}
	})

	test('a mixed metacharacter literal matches itself', () => {
		const literal = 'a.b*c(d)[e]{f}|g^h$i\\j'
		expect(R.buildRegExp([literal]).test(literal)).toBe(true)
	})

	test('unicode text matches itself', () => {
		expect(R.buildRegExp(['Cześć']).test('Cześć')).toBe(true)
	})

	test('astral characters match themselves', () => {
		expect(R.buildRegExp(['😀']).test('😀')).toBe(true)
	})
})
