const esbuild = require('esbuild');
const express = require('express');
const { externalGlobalPlugin } = require('esbuild-plugin-external-global');

const sharedConfig = {
	entryPoints: ['src/wxtilesdeckgl.ts'],
	bundle: true,
	loader: {
		'.woff': 'base64',
		'.fs': 'text',
		'.vs': 'text',
	},
	plugins: [
		externalGlobalPlugin({
			'@deck.gl/core': 'window.deck',
			'@deck.gl/layers': 'window.deck',
			'@deck.gl/geo-layers': 'window.deck',
			'@luma.gl/core': 'window.luma',
			'@luma.gl/webgl': 'window.luma',
		}),
	],
	// https://www.stetic.com/market-share/browser/
	target: ['es2020', 'chrome80', 'safari13', 'edge89', 'firefox70'],
	minify: true,
};

// BUILD as ESModules
esbuild
	.build({
		...sharedConfig,
		format: 'esm',
		outfile: 'dist/es/wxtilesdeckgl.js',
	})
	.catch((e) => console.error(e.message));

// build for web
esbuild
	.build({
		...sharedConfig,
		format: 'iife',
		outfile: 'dist/web/wxtilesdeckgl.js',
		globalName: 'wxtilesdeckgl',
	})
	.catch((e) => console.error(e.message));
