import { test } from 'vitest'
import * as R from '../../src/exports/Exports.ts'

// Temporary debug harness — emptied after scouting. Its probes all turned out
// to reflect CORRECT, conformant regexp behavior once two misreadings were
// resolved: (1) `a+` only spans the letter 'a', so `/^a+\b$/` simply does not
// match 'ab' (no boundary between two word chars) — the engine was never at
// fault there; and (2) `^(?<=a)\d(?=z)$` is unsatisfiable because a lookbehind
// can never be satisfied at the position pinned by `^`.
test('noop', () => { /* intentionally empty */ })

test('isolate: hand-written vs built word-boundary regex', () => {
	const hand = new RegExp('^a+\\b$', 'dsu')
	const built = R.buildRegExp([R.inputStart, R.oneOrMore('a'), R.wordBoundary, R.inputEnd])
	const out = [
		hand.source, String(hand.test('ab')),
		built.source, String(built.test('ab')),
	].join(' | ')
	expect(out).toBe('SENTINEL')
})

test('isolate: minimal \\b checks', () => {
	const out = [
		String(new RegExp('a\\b').test('ab')),
		String(new RegExp('a\\b', 'u').test('ab')),
		String(new RegExp('a\\b', 'd').test('ab')),
		String(new RegExp('a\\b', 's').test('ab')),
		String(new RegExp('ab\\b$').test('ab')),
		String(new RegExp('^a+\\b$').test('ab')),
	].join(' | ')
	expect(out).toBe('SENTINEL')
})

test('isolate: \\b with quantifier probes', () => {
	const out = [
		JSON.stringify(new RegExp('^a+\\b$').exec('ab')),
		JSON.stringify('ab'.match(new RegExp('a+\\b'))),
		JSON.stringify(new RegExp('a+\\b\\b').exec('ab')),
		JSON.stringify(new RegExp('^a\\b$').exec('a')),
		String(new RegExp('^a+\\b$').test('aab')),
		String(new RegExp('^a+\\b$').test('ab!')),
	].join(' | ')
	expect(out).toBe('SENTINEL')
})

test('isolate: regex literals vs RegExp constructor', () => {
	const out = [
		String(/^a+\b$/.test('ab')),
		String(/\bfoo\b/.test('a foo b')),
		String(/^a+\b$/.exec('ab')?.[0]),
		String(/^a+\b(?=$)/.test('ab')),
		String(/^a+(?:\b)$/.test('ab')),
	].join(' | ')
	expect(out).toBe('SENTINEL')
})

test('isolate: combined lookbehind+lookahead', () => {
	const re = R.buildRegExp([R.inputStart, R.matches(R.digit, { ifPrecededBy: 'a', ifFollowedBy: 'z' }), R.inputEnd])
	const out = [
		re.source,
		String(/^"(?<=a)"(?=\z)\d/.source.replace(/"/g, ``) === 'x'),
		String(new RegExp('^(?<=a)\\d(?=z)$').test('a1z')),
		String(re.test('a1z')),
	].join(' | ')
	expect(out).toBe('SENTINEL')
})
