const esbuild = require('esbuild');
// const sassPlugin = require('esbuild-plugin-sass');

const sharedConfig = {
	entryPoints: ['src/prod-index.ts'],
	bundle: true,
	// plugins: [sassPlugin()],
	loader: {
		'.ttf': 'base64',
		'.woff': 'base64',
		'.fs': 'text',
		'.vs': 'text',
	},
	target: 'es6',
	minify: true,
};

// BUILD as ESModules
esbuild
	.build({
		...sharedConfig,
		format: 'esm',
		outfile: 'dist/es/bundle.js',
	})
	.catch((e) => console.error(e.message));

// build for web
esbuild
	.build({
		...sharedConfig,
		format: 'iife',
		outfile: 'dist/web/wxtiledeckgl.js',
		globalName: 'wxtiledeckgl',
	})
	.catch((e) => console.error(e.message));
