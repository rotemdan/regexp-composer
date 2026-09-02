////////////////////////////////////////////////////////////////////////////////////////////////////
// Utilities
////////////////////////////////////////////////////////////////////////////////////////////////////

export function escapeStringForRegExp(str: string) {
	// MDN Reference: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_expressions#escaping
	// Note: `-` must be escaped in character classes,
	// but will error if escaped outside of them (not very good design).
	// It must be escaped separately when in a character class, like [\-]
	return str.replaceAll(
		/[.*+?^${}()|[\]\\]/g,
		'\\$&')
}

// Escapes a single character so it is safe to embed in a character class,
// either as a `charRange` endpoint or as an element of a larger class.
// Built on top of `escapeStringForRegExp` (which already covers `^`, `]`, `\`
// and every other metacharacter), adding only the `-` case which is a
// metacharacter exclusively inside character classes.
export function escapeCharForCharClass(char: string): string {
	const escaped = escapeStringForRegExp(char)

	return escaped === '-' ? '\\-' : escaped
}
