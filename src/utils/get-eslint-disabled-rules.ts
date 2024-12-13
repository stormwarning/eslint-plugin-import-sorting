const ESLINT_DIRECTIVES = [
	'eslint-disable',
	'eslint-enable',
	'eslint-disable-line',
	'eslint-disable-next-line',
] as const

export type EslintDisableDirective = (typeof ESLINT_DIRECTIVES)[number]

export function getEslintDisabledRules(comment: string):
	| {
			eslintDisableDirective: EslintDisableDirective
			rules: string[] | 'all'
	  }
	| undefined {
	for (let eslintDisableDirective of ESLINT_DIRECTIVES) {
		let disabledRules = getEslintDisabledRulesByType(comment, eslintDisableDirective)
		if (disabledRules) {
			return {
				eslintDisableDirective,
				rules: disabledRules,
			}
		}
	}

	return undefined
}

function getEslintDisabledRulesByType(
	comment: string,
	eslintDisableDirective: EslintDisableDirective,
): string[] | 'all' | undefined {
	let trimmedCommentValue = comment.trim()

	if (eslintDisableDirective === trimmedCommentValue) return 'all' as const

	let regexp = new RegExp(`^${eslintDisableDirective} ((?:.|\\s)*)$`)
	let disabledRulesMatch = trimmedCommentValue.match(regexp)

	if (!disabledRulesMatch) return undefined

	return disabledRulesMatch[1]
		.split(',')
		.map((rule) => rule.trim())
		.filter(Boolean)
}
