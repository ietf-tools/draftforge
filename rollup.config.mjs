// @ts-nocheck
import { nodeResolve } from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'

export default {
	input: 'src/extension.js',
	output: {
		file: 'dist/extension.js',
		format: 'es',
    inlineDynamicImports: true
	},
  external: ['vscode'],
  plugins: [
    nodeResolve(),
    commonjs()
  ]
}
