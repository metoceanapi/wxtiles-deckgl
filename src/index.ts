import { WxTilesLayer } from './wxtilelayer';

import { Deck } from '@deck.gl/core';
import { _GlobeView as GlobeView } from '@deck.gl/core';
import { TextLayer } from '@deck.gl/layers';

import { WxTileLibSetup, WxGetColorStyles, LibSetupObject } from './wxtools';

// // Create an async iterable
// async function* getData() {
// 	for (let i = 0; i < 10; i++) {
// 		const chunk = await fetch('asdf');
// 		yield chunk;
// 	}
// }

// json loader helper
// async function fetchJson(url) {
// 	return (await fetch(url)).json();
// }

async function fetchJson(url) {
	console.log(url);
	const req = await fetch(url, { mode: 'cors' }); // json loader helper
	const jso = await req.json();
	return jso;
}

export async function getURI() {
	const dataServer = 'https://tiles.metoceanapi.com/data/';
	const dataSet = /* 'ww3-gfs.global/'; */ /* 'mercator.global/'; */ 'ecwmf.global/'; /* 'obs-radar.rain.nzl.national/'; */
	const variable =
		'air.temperature.at-2m/'; /* 'wave.height/'; */ /* 'current.speed.northward.at-sea-surface/';  */ /* 'air.humidity.at-2m/';  */ /* 'reflectivity/'; */
	const instances = await fetchJson(dataServer + dataSet + 'instances.json');
	const instance = instances.reverse()[0] + '/';
	const meta = await fetchJson(dataServer + dataSet + instance + 'meta.json');
	const { times } = meta;
	const time = times.find((t) => new Date(t).getTime() >= Date.now()) || times[times.length - 1];
	// URI could be hardcoded, but tiles-DB is alive!
	const URI = dataServer + dataSet + instance + variable + time + '/{z}/{x}/{y}.png';
	const URITime = dataServer + dataSet + instance + variable + '{time}/{z}/{x}/{y}.png';
	return { URI, URITime, meta };
}

export async function start() {
	const wxlibCustomSettings: LibSetupObject = {};
	try {
		// these URIs are for the demo purpose. set the correct URI
		wxlibCustomSettings.colorStyles = await fetchJson('styles/styles.json'); // set the correct URI
	} catch (e) {
		console.log(e);
	}
	try {
		wxlibCustomSettings.units = await fetchJson('styles/uconv.json'); // set the correct URI
	} catch (e) {
		console.log(e);
	}
	try {
		wxlibCustomSettings.colorSchemes = await fetchJson('styles/colorschemes.json'); // set the correct URI
	} catch (e) {
		console.log(e);
	}

	// ESSENTIAL step to get lib ready.
	WxTileLibSetup(wxlibCustomSettings); // load fonts and styles, units, colorschemas - empty => defaults
	await document.fonts.ready; // !!! IMPORTANT: make sure fonts (barbs, arrows, etc) are loaded
	const styles = WxGetColorStyles();
	const style = styles['Sea.surface.temperature'];

	const { URI, URITime, meta } = await getURI();
	const layers = [
		new TextLayer({
			data: [{}],
			getText: () => 'Text',
			getPosition: () => [0, 0],
			getColor: () => [0, 0, 255],
		}),
		new WxTilesLayer({
			// WxTiles settings
			style: style,
			//DECK.gl settings
			data: URI, // TODO: Create an async iterable
			maxZoom: meta.maxZoom,
			pickable: true,
			tileSize: 256,
			// refinementStrategy: 'best-available', // default 'best-available'
			// onViewportLoad: (data, b) => console.log(data, b),
		}),
	];

	const deckgl = new Deck({
		initialViewState: { latitude: -41, longitude: 175, zoom: 1 },
		controller: true,
		views: new GlobeView({ id: 'globe', controller: true }),
		layers, // or use: deckgl.setProps({ layers });
	});
}
