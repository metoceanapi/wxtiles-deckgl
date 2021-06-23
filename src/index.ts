import { Deck } from '@deck.gl/core';

import { WxTilesLayer } from './layers/WxTilesLayer';
import { DebugTilesLayer } from './layers/DebugTilesLayer';

import { WxTileLibSetup, WxGetColorStyles, LibSetupObject, Meta } from './utils/wxtools';
import { createWxTilesLib } from './interfaces/wxTilesLib';

// // Create an async iterable
// async function* getData() {
// 	for (let i = 0; i < 10; i++) {
// 		const chunk = await fetch('asdf');
// 		yield chunk;
// 	}
// }

async function fetchJson(url) {
	console.log(url);
	const req = await fetch(url, { mode: 'cors' }); // json loader helper
	const jso = await req.json();
	return jso;
}

export async function getURI({ dataSet, variable }) {
	const dataServer = 'https://tiles.metoceanapi.com/data/';
	dataSet += '/';
	variable += '/';
	const instances = await fetchJson(dataServer + dataSet + 'instances.json');
	const instance = instances.reverse()[0] + '/';
	const meta: Meta = await fetchJson(dataServer + dataSet + instance + 'meta.json');
	const { times } = meta;
	const time = times.find((t) => new Date(t).getTime() >= Date.now()) || times[times.length - 1];
	// URI could be hardcoded, but tiles-DB is alive!
	const URI = dataServer + dataSet + instance + variable + time + '/{z}/{x}/{y}.png';
	const URITime = dataServer + dataSet + instance + variable + '{time}/{z}/{x}/{y}.png';
	return { URI, URITime, meta };
}

export async function start() {
	const wxlibCustomSettings: LibSetupObject = {
		colorStyles: await fetchJson('styles/styles.json'),
		units: await fetchJson('styles/uconv.json'),
		colorSchemes: await fetchJson('styles/colorschemes.json'),
	};
	// ESSENTIAL step to get lib ready.
	WxTileLibSetup(wxlibCustomSettings); // load fonts and styles, units, colorschemas - empty => defaults
	await document.fonts.ready; // !!! IMPORTANT: make sure fonts (barbs, arrows, etc) are loaded

	// const [dataSet, variable, styleName] = ['ecwmf.global', 'air.temperature.at-2m', 'Sea Surface Temperature'];
	const [dataSet, variable, styleName] = ['ww3-ecmwf.global', 'wave.height', 'Significant wave height'];
	// const [dataSet, variable, styleName] = ['obs-radar.rain.nzl.national', 'reflectivity', 'rain.EWIS'];
	const { URI, URITime, meta } = await getURI({ dataSet, variable });
	const styles = WxGetColorStyles();
	const style = styles[styleName];

	const GLOBUS = true; 

	const wxTilesId = 'wxtiles' + dataSet + '/' + variable;

	const deckgl = new Deck({
		initialViewState: { latitude: -41, longitude: 175, zoom: 0 },
		controller: true,
		//layers, // or use: deckgl.setProps({ layers });
		// views: new GlobeView({ id: 'globe', controller: true }),
	});

	const wxTilesLayer = createWxTilesLib({debug: true}).createLayer(
		{
			id: wxTilesId,
			// WxTiles settings
			wxprops: {
				meta,
				variable,
				style,
				URITime,
			},
			// DATA
			data: [URI], // [eastward, northward] - for vector data
			// DECK.gl settings
			minZoom: 0,
			maxZoom: meta.maxZoom,
			pickable: true,
			tileSize: 256,
			onViewportLoad: () => {},
			// _imageCoordinateSystem: COORDINATE_SYSTEM.CARTESIAN, // only for GlobeView
		},
		deckgl
	);

	await wxTilesLayer.nextTimestep();

	const button = document.createElement('button');
	button.style.zIndex = '1000000';
	button.style.position = 'absolute';
	button.innerHTML = 'NEXT';
	document.body.appendChild(button);
	button.addEventListener('click', () => {
		wxTilesLayer.nextTimestep();
	});
}
