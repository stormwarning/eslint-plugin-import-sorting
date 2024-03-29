import { isBuiltin } from 'node:module'

import type { TSESLint } from '@typescript-eslint/utils'

const moduleRegExp = /^\w/
function isModule(name: string) {
	return name && moduleRegExp.test(name)
}

const scopedRegExp = /^@[^/]+\/?[^/]+/
function isScoped(name: string) {
	return name && scopedRegExp.test(name)
}

function isFramework(name: string, pattern: string) {
	return pattern && new RegExp(pattern).test(name)
}

function isThirdParty(name: string) {
	return isModule(name) || isScoped(name)
}

function isFirstParty(name: string, pattern: string) {
	return pattern && new RegExp(pattern).test(name)
}

/**
 * @todo Add dot segment count stuff here maybe.
 */
function isLocal(name: string) {
	return name.startsWith('.')
}

function isStyle(name: string) {
	return name.endsWith('.css')
}

function assertStringSetting(settings: TSESLint.SharedConfigurationSettings, setting: string) {
	let value = settings[setting]

	if (!value) return ''
	if (typeof value !== 'string') throw new Error(`Invalid value for ${setting}. String expected.`)

	return value
}

export function resolveImportGroup(name: string, settings: TSESLint.SharedConfigurationSettings) {
	let knownFramework = assertStringSetting(settings, 'import-sorting/known-framework')
	let knownFirstParty = assertStringSetting(settings, 'import-sorting/known-first-party')

	if (isBuiltin(name)) return 'builtin'
	if (isStyle(name)) return 'style'
	if (isFramework(name, knownFramework)) return 'framework'
	if (isFirstParty(name, knownFirstParty)) return 'firstparty'
	if (isThirdParty(name)) return 'thirdparty'
	if (isLocal(name)) return 'local'

	return 'unknown'
}
