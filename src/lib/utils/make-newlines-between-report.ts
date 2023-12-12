import type { AST, Rule } from 'eslint'

import type { ImportNodeObject } from '../rules/sort-imports'
import {
	commentOnSameLineAs,
	findEndOfLineWithComments,
	findStartOfLineWithComments,
} from './find-comment'
import { findRootNode } from './find-root-node'
import { takeTokensAfterWhile } from './take-tokens'

function fixNewLineAfterImport(context: Rule.RuleContext, previousImport: ImportNodeObject) {
	let previousRoot = findRootNode(previousImport.node)
	let tokensToEndOfLine = takeTokensAfterWhile(
		context.sourceCode,
		previousRoot,
		commentOnSameLineAs(previousRoot),
	)

	let endOfLine = previousRoot.range?.[1] as number
	if (tokensToEndOfLine.length > 0) {
		endOfLine = tokensToEndOfLine.at(-1)?.range?.[1] as number
	}

	return (fixer: Rule.RuleFixer) =>
		fixer.insertTextAfterRange([previousRoot.range?.[0] as number, endOfLine], '\n')
}

function removeNewLineAfterImport(
	context: Rule.RuleContext,
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
		return (fixer: Rule.RuleFixer) => fixer.removeRange(rangeToRemove)
	}

	return undefined
}

export function makeNewlinesBetweenReport(
	context: Rule.RuleContext,
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
						message: 'There should be at least one empty line between import groups',
						fix: fixNewLineAfterImport(context, previousImport),
					})
				}
			} else if (
				emptyLinesBetween > 0 &&
				(currentImport.rank === previousImport.rank || !isStartOfDistinctGroup)
			) {
				context.report({
					node: previousImport.node,
					message: 'There should be no empty line within import group',
					fix: removeNewLineAfterImport(context, currentImport, previousImport),
				})
			}
		} else if (emptyLinesBetween > 0) {
			context.report({
				node: previousImport.node,
				message: 'There should be no empty line between import groups',
				fix: removeNewLineAfterImport(context, currentImport, previousImport),
			})
		}

		previousImport = currentImport
	}
}
