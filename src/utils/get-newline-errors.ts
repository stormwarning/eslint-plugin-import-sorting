import type { TSESLint } from '@typescript-eslint/utils'

import { getLinesBetween } from './get-lines-between.js'
import type { SortingNode } from './types.js'

interface Options {
	newlinesBetween: 'ignore' | 'always' | 'never'
}

interface GetNewlineErrorsParameters<T extends string> {
	missingLineError: T
	extraLineError: T
	right: SortingNode
	rightNumber: number
	left: SortingNode
	leftNumber: number
	sourceCode: TSESLint.SourceCode
	options: Options
}

export function getNewlineErrors<T extends string>({
	missingLineError,
	extraLineError,
	right,
	rightNumber,
	left,
	leftNumber,
	sourceCode,
	options,
}: GetNewlineErrorsParameters<T>): T[] {
	let errors: T[] = []
	let numberOfEmptyLinesBetween = getLinesBetween(sourceCode, left, right)

	if (options.newlinesBetween === 'never' && numberOfEmptyLinesBetween > 0) {
		errors.push(extraLineError)
	}

	if (options.newlinesBetween === 'always') {
		if (leftNumber < rightNumber && numberOfEmptyLinesBetween === 0) {
			errors.push(missingLineError)
		} else if (
			numberOfEmptyLinesBetween > 1 ||
			(leftNumber === rightNumber && numberOfEmptyLinesBetween > 0)
		) {
			errors.push(extraLineError)
		}
	}

	return errors
}
