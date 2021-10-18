const esbuild = require('esbuild');
const express = require('express');
const { externalGlobalPlugin } = require('esbuild-plugin-external-global');

const sharedConfig = {
	loader: {
		'.woff': 'base64',
		'.fs': 'text',
		'.vs': 'text',
	},
	entryPoints: ['src/wxtilesdeckgl.ts'],
	// outfile: 'dist/es/wxtilesdeckgl.js',
	bundle: true,
	sourcemap: false,
	minify: true,
	// splitting: true,
	treeShaking: true,
	// https://www.stetic.com/market-share/browser/
	target: ['es2020', 'chrome80', 'safari13', 'edge89', 'firefox70'],
};

// BUILD as ESModules
esbuild
	.build({
		...sharedConfig,
		outdir: 'dist/es',
		format: 'esm',
		external: ['@deck.gl/core', '@deck.gl/layers', '@deck.gl/geo-layers', '@luma.gl/webgl', '@luma.gl/constants'],
	})
	.then(() => {
		require('fs').copyFileSync('dist/es/wxtilesdeckgl.css', './wxtilescss.css');
	})
	.catch((e) => console.error(e.message));

// build for web
esbuild
	.build({
		...sharedConfig,
		plugins: [
			externalGlobalPlugin({
				'@deck.gl/core': 'window.deck',
				'@deck.gl/layers': 'window.deck',
				'@deck.gl/geo-layers': 'window.deck',
				'@luma.gl/core': 'window.luma',
				'@luma.gl/webgl': 'window.luma',
				'@luma.gl/constants': 'window.luma',
			}),
		],
		format: 'iife',
		outfile: 'dist/web/wxtilesdeckgl.js',
		globalName: 'wxtilesdeckgl',
	})
	.catch((e) => console.error(e.message));
