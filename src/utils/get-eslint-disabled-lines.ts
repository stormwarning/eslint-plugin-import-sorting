import type { TSESLint } from '@typescript-eslint/utils'

import { getEslintDisabledRules } from './get-eslint-disabled-rules.js'

export function getEslintDisabledLines({
	ruleName,
	sourceCode,
}: {
	ruleName: string
	sourceCode: TSESLint.SourceCode
}): number[] {
	let returnValue: number[] = []
	// eslint-disable-next-line no-undef-init
	let lineRulePermanentlyDisabled: number | undefined = undefined

	for (let comment of sourceCode.getAllComments()) {
		let eslintDisabledRules = getEslintDisabledRules(comment.value)
		let isRuleDisabled =
			eslintDisabledRules?.rules === 'all' || eslintDisabledRules?.rules.includes(ruleName)

		if (!isRuleDisabled) continue

		switch (eslintDisabledRules?.eslintDisableDirective) {
			case 'eslint-disable-next-line':
				returnValue.push(comment.loc.end.line + 1)
				continue
			case 'eslint-disable-line':
				returnValue.push(comment.loc.start.line)
				continue
			case 'eslint-disable':
				lineRulePermanentlyDisabled ??= comment.loc.start.line
				break
			case 'eslint-enable':
				if (!lineRulePermanentlyDisabled) continue

				returnValue.push(
					...createArrayFromTo(lineRulePermanentlyDisabled + 1, comment.loc.start.line),
				)
				lineRulePermanentlyDisabled = undefined
				break
			default:
				break
		}
	}

	return returnValue
}

// eslint-disable-next-line unicorn/prevent-abbreviations
let createArrayFromTo = (i: number, index: number): number[] =>
	Array.from({ length: index - i + 1 }, (_, item) => i + item)
