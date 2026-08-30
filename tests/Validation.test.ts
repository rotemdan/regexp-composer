import { describe, test, expect } from 'vitest'
import * as R from '../src/exports/Exports.ts'

describe('validation', () => {
	test('codepoint rejects bad hex', () => {
		expect(() => R.codepoint('zz')).toThrow()
		expect(() => R.codepoint('')).toThrow()
		expect(() => R.codepoint('1234567')).toThrow()
	})

	test('codepoint accepts good values', () => {
		expect(() => R.codepoint('1f600')).not.toThrow()
		expect(() => R.codepoint(0x1f600)).not.toThrow()
	})

	test('codepointRange validates hex strings and ordering', () => {
		expect(() => R.codepointRange('zz', 'ff')).toThrow()
		expect(() => R.codepointRange('ff', '00')).toThrow()
		expect(() => R.codepointRange('a', 'f')).not.toThrow()
		expect(() => R.codepointRange(0x41, 0x5a)).not.toThrow()
	})

	test('charRange validates single codepoints and ordering', () => {
		expect(() => R.charRange('ab', 'c')).toThrow()
		expect(() => R.charRange('z', 'a')).toThrow()
		expect(() => R.charRange('a', 'z')).not.toThrow()
	})

	test('repeated validates bounds', () => {
		expect(() => R.repeated(-1, 'a')).toThrow()
		expect(() => R.repeated(NaN as any, 'a')).toThrow()
		expect(() => R.repeated(Infinity as any, 'a')).toThrow()
		expect(() => R.repeated([3, 2], 'a')).toThrow()
		expect(() => R.repeated([0, 0], 'a')).not.toThrow()
	})

	test('repeatedNonGreedy mirrors repeated validation', () => {
		expect(() => R.repeatedNonGreedy(-1, 'a')).toThrow()
		expect(() => R.repeatedNonGreedy([5, 2], 'a')).toThrow()
	})

	test('captureAs validates names', () => {
		expect(() => R.captureAs('', 'a')).toThrow()
		expect(() => R.captureAs('a-b', 'a')).toThrow()
		expect(() => R.captureAs('myGroup1', 'a')).not.toThrow()
	})

	test('sameAs validates index/name', () => {
		expect(() => R.sameAs('')).toThrow()
		expect(() => R.sameAs(0 as any)).toThrow()
		expect(() => R.sameAs(10 as any)).toThrow()
		expect(() => R.sameAs(1.5 as any)).toThrow()
		expect(() => R.sameAs(1)).not.toThrow()
		expect(() => R.sameAs('myGroup')).not.toThrow()
	})

	test('notAnyOfChars validates single-codepoint / class token', () => {
		expect(() => R.buildRegExp(R.notAnyOfChars('ab'))).toThrow()
		expect(() => R.buildRegExp(R.notAnyOfChars(R.anyOf('a', 'b') as any))).toThrow()
		expect(() => R.buildRegExp(R.notAnyOfChars('a', R.digit))).not.toThrow()
	})
})
