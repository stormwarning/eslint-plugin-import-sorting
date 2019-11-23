import { RuleTester } from 'eslint'

// eslint-disable-next-line @typescript-eslint/ban-ts-ignore
// @ts-ignore
RuleTester.setDefaultConfig({
    parserOptions: {
        ecmaVersion: 6,
        sourceType: 'module',
    },
})

export default new RuleTester()
