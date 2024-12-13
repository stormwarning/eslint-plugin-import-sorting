import order from './rules/order.js'
import specifierOrder from './rules/specifier-order.js'

const plugin = {
	name: 'import-sorting',
	rules: {
		order,
		'specifier-order': specifierOrder,
	},
}

export default plugin
