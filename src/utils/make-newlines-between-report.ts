import type { TSESLint } from '@typescript-eslint/utils'
import type { AST } from 'eslint'

import type { ImportNodeObject } from '../rules/order.js'
import {
	commentOnSameLineAs,
	findEndOfLineWithComments,
	findStartOfLineWithComments,
} from './find-comment.js'
import { findRootNode } from './find-root-node.js'
import { takeTokensAfterWhile } from './take-tokens.js'

function fixNewLineAfterImport(
	context: TSESLint.RuleContext<string, never[]>,
	previousImport: ImportNodeObject,
) {
	let previousRoot = findRootNode(previousImport.node)
	let tokensToEndOfLine = takeTokensAfterWhile(
		context.sourceCode,
		previousRoot,
		commentOnSameLineAs(previousRoot),
	)

	let endOfLine = previousRoot.range[1]
	if (tokensToEndOfLine.length > 0) {
		endOfLine = tokensToEndOfLine.at(-1)!.range[1]
	}

	return (fixer: TSESLint.RuleFixer) =>
		fixer.insertTextAfterRange([previousRoot.range[0], endOfLine], '\n')
}

function removeNewLineAfterImport(
	context: TSESLint.RuleContext<string, never[]>,
	currentImport: ImportNodeObject,
	previousImport: ImportNodeObject,
) {
	let { sourceCode } = context
	let previousRoot = findRootNode(previousImport.node)
	let currentRoot = findRootNode(currentImport.node)
	let rangeToRemove: AST.Range = [
		findEndOfLineWithComments(sourceCode, previousRoot),
		findStartOfLineWithComments(sourceCode, currentRoot),
	]

	if (/^\s*$/.test(sourceCode.text.slice(rangeToRemove[0], rangeToRemove[1]))) {
		return (fixer: TSESLint.RuleFixer) => fixer.removeRange(rangeToRemove)
	}

	return undefined
}

export function makeNewlinesBetweenReport(
	context: TSESLint.RuleContext<string, never[]>,
	imported: ImportNodeObject[],
	newlinesBetweenImports = 'always',
) {
	let getNumberOfEmptyLinesBetween = (
		currentImport: ImportNodeObject,
		previousImport: ImportNodeObject,
	) => {
		let linesBetweenImports = context.sourceCode.lines.slice(
			(previousImport.node.loc as AST.SourceLocation).end.line,
			(currentImport.node.loc as AST.SourceLocation).start.line - 1,
		)

		return linesBetweenImports.filter((line) => line.trim().length === 0).length
	}

	let getIsStartOfDistinctGroup = (
		currentImport: ImportNodeObject,
		previousImport: ImportNodeObject,
	) => currentImport.rank - 1 >= previousImport.rank

	let previousImport = imported[0]

	for (let currentImport of imported.slice(1)) {
		let emptyLinesBetween = getNumberOfEmptyLinesBetween(currentImport, previousImport)
		let isStartOfDistinctGroup = getIsStartOfDistinctGroup(currentImport, previousImport)

		if (newlinesBetweenImports === 'always') {
			if (currentImport.rank !== previousImport.rank && emptyLinesBetween === 0) {
				if (isStartOfDistinctGroup) {
					context.report({
						node: previousImport.node,
						messageId: 'needs-newline',
						fix: fixNewLineAfterImport(context, previousImport),
					})
				}
			} else if (
				emptyLinesBetween > 0 &&
				(currentImport.rank === previousImport.rank || !isStartOfDistinctGroup)
			) {
				context.report({
					node: previousImport.node,
					messageId: 'extra-newline',
					fix: removeNewLineAfterImport(context, currentImport, previousImport),
				})
			}
		} else if (emptyLinesBetween > 0) {
			context.report({
				node: previousImport.node,
				messageId: 'extra-newline-in-group',
				fix: removeNewLineAfterImport(context, currentImport, previousImport),
			})
		}

		previousImport = currentImport
	}
}
