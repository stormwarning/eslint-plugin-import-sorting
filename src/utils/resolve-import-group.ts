import { isBuiltin } from 'node:module'

import type { TSESLint } from '@typescript-eslint/utils'

const moduleRegExp = /^\w/
function isModule(name: string) {
	return moduleRegExp.test(name)
}

const scopedRegExp = /^@[^/]+\/?[^/]+/
function isScoped(name: string) {
	return scopedRegExp.test(name)
}

function isFramework(name: string, pattern: string | string[]) {
	if (Array.isArray(pattern)) {
		return pattern.some((item) => new RegExp(item).test(name))
	}

	return new RegExp(pattern).test(name)
}

function isThirdParty(name: string) {
	return isModule(name) || isScoped(name)
}

function isFirstParty(name: string, pattern: string | string[]) {
	if (Array.isArray(pattern)) {
		return pattern.some((item) => new RegExp(item).test(name))
	}

	return new RegExp(pattern).test(name)
}

/**
 * @todo Add dot segment count stuff here maybe.
 */
function isLocal(name: string) {
	return name.startsWith('.')
}

function isStyle(name: string) {
	return ['.less', '.scss', '.sass', '.styl', '.pcss', '.css', '.sss'].some((extension) =>
		name.endsWith(extension),
	)
}

function assertString(value: unknown, setting: string) {
	if (typeof value !== 'string')
		throw new Error(
			// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
			`Invalid value for '${setting}': '${value}'.\nExpected 'string', got '${typeof value}' instead.`,
		)
}

function validateSetting(settings: TSESLint.SharedConfigurationSettings, setting: string) {
	let value = settings[setting] as string | string[]

	if (!value) return ''

	if (value && setting === 'import-sorting/known-framework') {
		// eslint-disable-next-line no-console
		console.warn(
			'Deprecated setting: import-sorting/known-framework. This setting will be removed in the next major version of the plugin. Use import-sorting/framework-patterns instead.',
		)
	}

	if (value && setting === 'import-sorting/known-first-party') {
		// eslint-disable-next-line no-console
		console.warn(
			'Deprecated setting: import-sorting/known-first-party. This setting will be removed in the next major version of the plugin. Use import-sorting/internal-patterns instead.',
		)
	}

	if (Array.isArray(value)) {
		for (let item of value) {
			assertString(item, setting)
		}

		return value
	}

	assertString(value, setting)

	return value
}

export function resolveImportGroup(name: string, settings: TSESLint.SharedConfigurationSettings) {
	let knownFramework = validateSetting(settings, 'import-sorting/known-framework')
	let knownFirstParty = validateSetting(settings, 'import-sorting/known-first-party')

	if (settings['import-sorting/framework-patterns']) {
		knownFramework = validateSetting(settings, 'import-sorting/framework-patterns')
	}

	if (settings['import-sorting/internal-patterns']) {
		knownFirstParty = validateSetting(settings, 'import-sorting/internal-patterns')
	}

	if (isBuiltin(name)) return 'builtin'
	if (isStyle(name)) return 'style'
	if (isFramework(name, knownFramework)) return 'framework'
	if (isFirstParty(name, knownFirstParty)) return 'firstparty'
	if (isThirdParty(name)) return 'thirdparty'
	if (isLocal(name)) return 'local'

	return 'unknown'
}
