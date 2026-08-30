import { defineConfig, configDefaults } from 'vitest/config'

export default defineConfig({
	test: {
		reporters: ['default'],
		disableConsoleIntercept: true,

		include: ['tests/**/*.test.ts'],

		exclude: [
			...configDefaults.exclude,
			'**/node_modules/**',
			'**/dist/**',
		],
	},
})
