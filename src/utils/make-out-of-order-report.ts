import { AST_NODE_TYPES, type TSESLint } from '@typescript-eslint/utils'

import type { ImportNode, ImportNodeObject } from '../rules/order.js'
import { findEndOfLineWithComments, findStartOfLineWithComments } from './find-comment.js'
import { findRootNode } from './find-root-node.js'

type OrderTerm = 'before' | 'after'

function findOutOfOrder(imported: ImportNodeObject[]) {
	if (imported.length === 0) return []

	let maxSeenRankNode = imported[0]
	return imported.filter((importedModule) => {
		let isLessThanPrevious = importedModule.rank < maxSeenRankNode.rank
		if (maxSeenRankNode.rank < importedModule.rank) {
			maxSeenRankNode = importedModule
		}

		return isLessThanPrevious
	})
}

function reverse(array: ImportNodeObject[]) {
	return array.map((v) => ({ ...v, rank: -v.rank })).reverse()
}

function isPlainImportModule(node: ImportNode) {
	return (
		node.type === AST_NODE_TYPES.ImportDeclaration &&
		// eslint-disable-next-line no-eq-null, eqeqeq
		node.specifiers != null &&
		node.specifiers.length > 0
	)
}

function isPlainImportEquals(node: ImportNode): boolean {
	return (
		node.type === AST_NODE_TYPES.TSImportEqualsDeclaration &&
		'expression' in node.moduleReference
	)
}

function canCrossNodeWhileReorder(node: ImportNode) {
	return isPlainImportModule(node) || isPlainImportEquals(node)
}

/**
 * The `parent` key should have a type of `ESTree.Program` but then the `body`
 * key is incompatible with the `Rule.Node` type.
 */
function canReorderItems(firstNode: ImportNode, secondNode: ImportNode) {
	let { parent } = firstNode

	// @ts-expect-error -- Types don't account for `body` property on `parent`.
	let indices = [parent.body.indexOf(firstNode), parent.body.indexOf(secondNode)] as [
		number,
		number,
	]
	let [firstIndex, secondIndex] = indices.sort()
	// @ts-expect-error -- Types don't account for `body` property on `parent`.
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
	// Only needed for Flow syntax.
	// if (node.node.importKind === 'typeof') return 'typeof import'
	return 'import'
}

function fixOutOfOrder(
	context: TSESLint.RuleContext<string, never[]>,
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

	if (order === 'before') {
		context.report({
			node: secondNode.node,
			messageId: 'out-of-order',
			data: { firstImport, secondImport, order },
			fix: canFix
				? (fixer: TSESLint.RuleFixer) =>
						fixer.replaceTextRange(
							[firstRootStart, secondRootEnd],
							newCode + sourceCode.text.slice(firstRootStart, secondRootStart),
						)
				: undefined,
		})
	} else if (order === 'after') {
		context.report({
			node: secondNode.node,
			messageId: 'out-of-order',
			data: { firstImport, secondImport, order },
			fix: canFix
				? (fixer: TSESLint.RuleFixer) =>
						fixer.replaceTextRange(
							[secondRootStart, firstRootEnd],
							sourceCode.text.slice(secondRootEnd, firstRootEnd) + newCode,
						)
				: undefined,
		})
	}
}

function reportOutOfOrder(
	context: TSESLint.RuleContext<string, never[]>,
	imported: ImportNodeObject[],
	outOfOrder: ImportNodeObject[],
	order: OrderTerm,
) {
	for (let imp of outOfOrder) {
		let found = imported.find((importedItem) => imp.rank < importedItem.rank)
		if (found) fixOutOfOrder(context, found, imp, order)
	}
}

export function makeOutOfOrderReport(
	context: TSESLint.RuleContext<string, never[]>,
	imported: ImportNodeObject[],
) {
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
