import { Deck } from '@deck.gl/core';

import { WxTilesLayer } from './layers/WxTilesLayer';
import { DebugTilesLayer } from './layers/DebugTilesLayer';

import { WxTileLibSetup, WxGetColorStyles, LibSetupObject, Meta } from './utils/wxtools';

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
	const wxlibCustomSettings: LibSetupObject = {};
	{
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
	}
	// ESSENTIAL step to get lib ready.
	WxTileLibSetup(wxlibCustomSettings); // load fonts and styles, units, colorschemas - empty => defaults
	await document.fonts.ready; // !!! IMPORTANT: make sure fonts (barbs, arrows, etc) are loaded

	// const [dataSet, variable, styleName] = ['ecwmf.global', 'air.temperature.at-2m', 'Sea Surface Temperature'];
	const [dataSet, variable, styleName] = ['ww3-ecmwf.global', 'wave.height', 'Significant wave height'];
	// const [dataSet, variable, styleName] = ['obs-radar.rain.nzl.national', 'reflectivity', 'rain.EWIS'];
	const { URI, URITime, meta } = await getURI({ dataSet, variable });
	// const styles = WxGetColorStyles();
	// const style = styles[styleName];

	// const wxTilesProps = {
	// 	id: 'wxtiles' + dataSet + '/' + variable,
	// 	// WxTiles settings
	// 	wxprops: {
	// 		meta,
	// 		variables, // TODO
	// 		style,
	// 	},
	// 	// DATA
	// 	data: URI, // [eastward, northward] - for vector data
	// 	// DECK.gl settings
	// 	minZoom: 0,
	// 	maxZoom: meta.maxZoom,
	// 	pickable: true,
	// 	tileSize: 256,
	// 	onViewportLoad: () => {},
	// 	// _imageCoordinateSystem: COORDINATE_SYSTEM.CARTESIAN, // only for GlobeView
	// };

	const layers = [
		// new WxTilesLayer(wxTilesProps),
		new DebugTilesLayer({
			id: 'debugtilesR',
			data: { color: [255, 0, 0, 255] },
			maxZoom: meta.maxZoom,
			minZoom: 0,
			pickable: false,
			tileSize: 256,
		}),
		new DebugTilesLayer({
			id: 'debugtilesRB',
			data: { color: [255, 0, 255, 128] },
			maxZoom: 24,
			minZoom: meta.maxZoom + 1,
			pickable: false,
			tileSize: 256,
		}),
	];

	const deckgl = new Deck({
		initialViewState: { latitude: -41, longitude: 175, zoom: 0 },
		controller: true,
		layers, // or use: deckgl.setProps({ layers });
		// views: new GlobeView({ id: 'globe', controller: true }),
	});

	// let i = 0;
	// var timestep = () => {
	// 	i = ++i % meta.times.length;
	// 	wxTilesProps.data = URITime.replace('{time}', meta.times[i]);
	// 	wxTilesProps.onViewportLoad = () => {
	// 		setTimeout(timestep, 1000);
	// 	};
	// 	layers[0] = new WxTilesLayer(wxTilesProps);
	// 	deckgl.setProps({ layers });
	// };

	// // setTimeout(timestep, 1000);
}
