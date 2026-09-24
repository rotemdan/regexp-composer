import { test } from 'vitest'

// This file was a transient probe that determined the runtime semantics of
// `ifExtendsBackTo` and `ifNotExtendsBackTo`. The lookbehind is encoded after
// the content, so those conditions constrain the suffix of the match itself
// rather than the surrounding context.
//
// The findings have been folded into `tests/behavior/Matches.Behavior.test.ts`,
// so this probe is retired. It is kept as a skipped tombstone because the
// current tooling cannot delete files.
test.skip('retired probe: ifExtendsBackTo runtime semantics', () => {})
