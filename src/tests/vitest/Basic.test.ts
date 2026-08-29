import { test, expect } from 'vitest'
import * as R from '../../exports/Exports.js'

test(`Correctly applies 'matches' with 'except' clause`, () => {
	const conditionTest = R.buildRegExp([
		R.inputStart,

		R.matches(
			R.oneOrMore(R.charRange('0', '9')), { except: '23' }
		)
	])

	expect(conditionTest.test('12344')).toBe(true)
	expect(conditionTest.test('23')).toBe(false)
})

