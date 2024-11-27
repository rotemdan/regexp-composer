import { buildRegExp, anyOf, captureAs, charRange, oneOrMore, possibly, repeated, inputStart, whitespace, notAnyOf, sameAs, unicodeProperty, notUnicodeProperty, codepoint, inputEnd, matches, newLine, lineFeed, encodePattern } from './RegExpBuilder.js'

const log = console.log

export async function startTest() {
	const conditionsTestPattern = [
		inputStart,
		matches(
			oneOrMore(unicodeProperty('Letter')), [
				{
					except: anyOf('Cat', 'Dog'),
					ifNotPrecededBy: charRange('0', '9'),
					ifNotFollowedBy: anyOf('?', '!')
				},
				{
					except: anyOf('Horse', 'Sheep')
				}
			]
		),
		inputEnd
	]

	const conditionsRegExp = buildRegExp(conditionsTestPattern)

	log(conditionsRegExp.test('asdf'))
	log(conditionsRegExp.test('Cat'))
	log(conditionsRegExp.test('Sheep'))
	log(conditionsRegExp.test('3asdf'))
	log(conditionsRegExp.test('hgfh!'))

	const orTest = [anyOf('hello', 'world')]

	log(encodePattern(orTest))

	const dashTest = [anyOf('a', 'b', '-', charRange('-', '9'))]

	const result = buildRegExp(dashTest)

	log(result.test('-'))
	log(result.source)

	const pattern1 = [
		inputStart,

		possibly(oneOrMore(whitespace)),

		captureAs('stuff', [
			possibly(anyOf('v', 'b', 'hello', charRange('a', 'z'), 'world')),
			notAnyOf('x', 'y', charRange('a', 'z'), '?', '['),
		]),

		repeated([3, 6], sameAs('stuff')),

		unicodeProperty('Letter'),

		notUnicodeProperty('Letter'),

		codepoint(5345),

		inputEnd
	]

	const pattern2 =
		matches([
			inputStart,

			possibly(oneOrMore(whitespace)),
			oneOrMore(unicodeProperty('Letter')),
		], {
			ifFollowedBy: anyOf('x', 'y', newLine, 'hoho', 'baba'),
		})

	const pattern3 = [
		anyOf('v', 'b', 'hello', 'friend', charRange('a', 'z'), lineFeed, 't', 'world'),
		notAnyOf('a', 'b', 'c'),
		unicodeProperty('Letter'),
		notUnicodeProperty('Digit')
	]

	const digitPattern = charRange('0', '9')

	const phoneNumberPattern = [
		possibly(['+', captureAs('countryCode', repeated([1, 3], digitPattern)), oneOrMore(' ')]),
		possibly(['(', captureAs('areaCode', repeated(3, digitPattern)), ')', oneOrMore(' ')]),
		captureAs('localNumber', [
			repeated(3, digitPattern),
			possibly(anyOf('-', ' ')),
			repeated(4, digitPattern),
		])
	]

	const targetPattern = phoneNumberPattern

	log(JSON.stringify(targetPattern, undefined, 4))

	log('')
	log(encodePattern(targetPattern))
	log('')

	{
		const conditionTest = buildRegExp([inputStart, matches(oneOrMore(charRange('0', '9')), { except: '23'})])

		const a = conditionTest.test('12344')
		const b = conditionTest.test('233')

		const x = 0
	}

	const regExp = buildRegExp(targetPattern)

	const regExpString = regExp.source

	log('')
	log(regExpString)

	const matchList = regExp.exec('345 334')

	if (matchList) {
		for (const match of matchList!) {
			log(match)
		}
	} else {
		log('No matches found.')
	}
}

startTest()
