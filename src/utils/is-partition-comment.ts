// eslint-disable-next-line import/no-extraneous-dependencies
import { minimatch } from 'minimatch'

export const isPartitionComment = (
	partitionComment: string[] | boolean | string,
	comment: string,
) =>
	(Array.isArray(partitionComment) &&
		partitionComment.some((pattern) =>
			minimatch(comment.trim(), pattern, {
				nocomment: true,
			}),
		)) ??
	(typeof partitionComment === 'string' &&
		minimatch(comment.trim(), partitionComment, {
			nocomment: true,
		})) ??
	partitionComment === true
