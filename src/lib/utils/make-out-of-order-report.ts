import type { Rule } from 'eslint'

import type { ImportNodeObject } from '../rules/sort-imports'
import { findEndOfLineWithComments, findStartOfLineWithComments } from './find-comment'
import { findRootNode } from './find-root-node'

type OrderTerm = 'before' | 'after'

function findOutOfOrder(imported: ImportNodeObject[]) {
	if (imported.length === 0) return []

	let maxSeenRankNode = imported[0]
	return imported.filter((importedModule) => {
		let result = importedModule.rank < maxSeenRankNode.rank
		if (maxSeenRankNode.rank < importedModule.rank) {
			maxSeenRankNode = importedModule
		}

		return result
	})
}

function reverse(array: ImportNodeObject[]) {
	return array.map((v) => ({ ...v, rank: -v.rank })).reverse()
}

function isPlainImportModule(node: Rule.Node) {
	return (
		// eslint-disable-next-line no-eq-null, eqeqeq
		node.type === 'ImportDeclaration' && node.specifiers != null && node.specifiers.length > 0
	)
}

function isPlainImportEquals(node) {
	return node.type === 'TSImportEqualsDeclaration' && node.moduleReference.expression
}

function canCrossNodeWhileReorder(node: Rule.Node) {
	return isPlainImportModule(node) || isPlainImportEquals(node)
}

/**
 * The `parent` key should have a type of `ESTree.Program` but then the `body`
 * key is incompatible with the `Rule.Node` type.
 */
function canReorderItems(firstNode: Rule.Node, secondNode: Rule.Node) {
	let { parent } = firstNode
	let [firstIndex, secondIndex] = [
		parent.body.indexOf(firstNode),
		parent.body.indexOf(secondNode),
	].sort()
	let nodesBetween = parent.body.slice(firstIndex, secondIndex + 1)

	for (let nodeBetween of nodesBetween) {
		if (!canCrossNodeWhileReorder(nodeBetween)) {
			return false
		}
	}

	return true
}

function makeImportDescription(node: ImportNodeObject) {
	if (node.node.importKind === 'type') return 'type import'
	if (node.node.importKind === 'typeof') return 'typeof import'
	return 'import'
}

function fixOutOfOrder(
	context: Rule.RuleContext,
	firstNode: ImportNodeObject,
	secondNode: ImportNodeObject,
	order: OrderTerm,
) {
	let { sourceCode } = context

	let firstRoot = findRootNode(firstNode.node)
	let firstRootStart = findStartOfLineWithComments(sourceCode, firstRoot)
	let firstRootEnd = findEndOfLineWithComments(sourceCode, firstRoot)

	let secondRoot = findRootNode(secondNode.node)
	let secondRootStart = findStartOfLineWithComments(sourceCode, secondRoot)
	let secondRootEnd = findEndOfLineWithComments(sourceCode, secondRoot)
	let canFix = canReorderItems(firstRoot, secondRoot)

	let newCode = sourceCode.text.slice(secondRootStart, secondRootEnd)
	if (!newCode.endsWith('\n')) {
		newCode = `${newCode}\n`
	}

	let firstImport = `${makeImportDescription(firstNode)} of \`${firstNode.displayName}\``
	let secondImport = `\`${secondNode.displayName}\` ${makeImportDescription(secondNode)}`
	let message = `${secondImport} should occur ${order} ${firstImport}`

	if (order === 'before') {
		context.report({
			node: secondNode.node,
			message,
			fix: canFix
				? (fixer: Rule.RuleFixer) =>
						fixer.replaceTextRange(
							[firstRootStart, secondRootEnd],
							newCode + sourceCode.text.slice(firstRootStart, secondRootStart),
						)
				: undefined,
		})
	} else if (order === 'after') {
		context.report({
			node: secondNode.node,
			message,
			fix: canFix
				? (fixer: Rule.RuleFixer) =>
						fixer.replaceTextRange(
							[secondRootStart, firstRootEnd],
							sourceCode.text.slice(secondRootEnd, firstRootEnd) + newCode,
						)
				: undefined,
		})
	}
}

function reportOutOfOrder(
	context: Rule.RuleContext,
	imported: ImportNodeObject[],
	outOfOrder: ImportNodeObject[],
	order: OrderTerm,
) {
	for (let imp of outOfOrder) {
		let found = imported.find((importedItem) => imp.rank < importedItem.rank)
		if (found) fixOutOfOrder(context, found, imp, order)
	}
}

export function makeOutOfOrderReport(context: Rule.RuleContext, imported: ImportNodeObject[]) {
	console.log('IMPORTED', imported)

	let outOfOrder = findOutOfOrder(imported)
	if (outOfOrder.length === 0) return

	// There are things to report. Try to minimize the number of reported errors.
	let reversedImported = reverse(imported)
	let reversedOrder = findOutOfOrder(reversedImported)
	if (reversedOrder.length < outOfOrder.length) {
		reportOutOfOrder(context, reversedImported, reversedOrder, 'after')
		return
	}

	reportOutOfOrder(context, imported, outOfOrder, 'before')
}
