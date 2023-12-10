import { sortImports } from './lib/rules/sort-imports'

const plugin = {
	rules: {
		'sort-imports': sortImports,
	},
}

export default plugin
