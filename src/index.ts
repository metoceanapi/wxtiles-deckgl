import './index.css';
import { Deck } from '@deck.gl/core';
import { TileLayer } from '@deck.gl/geo-layers';

import { WxTilesLayer } from './layers/WxTilesLayer';
import { DebugTilesLayer } from './layers/DebugTilesLayer';

import { WxTileLibSetup, WxGetColorStyles, LibSetupObject, Meta } from './utils/wxtools';
import { BitmapLayer } from '@deck.gl/layers';

async function fetchJson(url) {
	console.log(url);
	const req = await fetch(url, { mode: 'cors' }); // json loader helper
	const jso = await req.json();
	return jso;
}

export function getTimeClosestToNow(times: string[]) {
	return times.find((t) => new Date(t).getTime() >= Date.now()) || times[times.length - 1];
}

export async function getURIfromDatasetName(dataServer: string, dataSet: string) {
	// URI could be hardcoded, but tiles-DB is alive!
	if (dataSet[dataSet.length - 1] != '/') dataSet += '/';
	const instance = (await fetchJson(dataServer + dataSet + 'instances.json')).reverse()[0] + '/';
	const meta: Meta = await fetchJson(dataServer + dataSet + instance + 'meta.json');
	const URI = dataServer + dataSet + instance + '{variable}/{time}/{z}/{x}/{y}.png';
	return { URI, meta };
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

	// const [dataSet, variables, styleName] = ['ecwmf.global', 'air.temperature.at-2m', 'temper2m'];
	// const [dataSet, variables, styleName] = ['ecwmf.global', 'air.temperature.at-2m', 'Sea Surface Temperature'];
	// const [dataSet, variables, styleName] = ['ecwmf.global', 'air.humidity.at-2m', 'base'];
	// const [dataSet, variables, styleName] = ['ww3-ecmwf.global', 'wave.height', 'Significant wave height'];
	// const [dataSet, variables, styleName] = ['ww3-ecmwf.global', 'wave.direction.above-8s.peak', 'direction'];
	// const [dataSet, variables, styleName] = ['obs-radar.rain.nzl.national', ['reflectivity'], 'rain.EWIS'];
	const [dataSet, variables, styleName] = ['ecwmf.global', ['wind.speed.eastward.at-10m', 'wind.speed.northward.at-10m'] as [string, string], 'Wind Speed2'];

	const { URI, meta } = await getURIfromDatasetName('https://tiles.metoceanapi.com/data/', dataSet);
	const time = getTimeClosestToNow(meta.times);
	const styles = WxGetColorStyles();
	const style = styles[styleName];

	const wxTilesProps = {
		id: 'wxtiles/' + dataSet + '/' + variables,
		// WxTiles settings
		wxprops: {
			meta,
			variables, // 'temp2m' or ['eastward', 'northward'] for vector data
			style,
		},
		// DATA
		data: URI.replace('{time}', time),
		// DECK.gl settings
		maxZoom: meta.maxZoom,
		pickable: true,
		onViewportLoad: () => {},
		// _imageCoordinateSystem: COORDINATE_SYSTEM.CARTESIAN, // only for GlobeView
	};

	const layers = [baseLayer(), new WxTilesLayer(wxTilesProps), ...debugLayers(meta)];

	const deckgl = new Deck({
		// initialViewState: { latitude: 0, longitude: 0, zoom: -1 },
		initialViewState: { latitude: -0, longitude: 0, zoom: 2 },
		controller: true,
		layers, // or use: deckgl.setProps({ layers });
		// views: new GlobeView({ id: 'globe', controller: true }),
	});
}

function baseLayer() {
	return new TileLayer({
		// https://wiki.openstreetmap.org/wiki/Slippy_map_tilenames#Tile_servers
		data: 'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png',

		minZoom: 0,
		maxZoom: 19,

		renderSubLayers: (props) => {
			const {
				bbox: { west, south, east, north },
			} = props.tile;

			return new BitmapLayer(props, {
				data: null,
				image: props.data,
				bounds: [west, south, east, north],
			});
		},
	});
}

function debugLayers(meta: Meta) {
	return [
		new DebugTilesLayer({
			id: 'debugtilesR',
			data: { color: [255, 0, 0, 255] },
			maxZoom: meta.maxZoom,
			minZoom: 0,
		}),
		new DebugTilesLayer({
			id: 'debugtilesRB',
			data: { color: [255, 0, 255, 128] },
			maxZoom: 24,
			minZoom: meta.maxZoom + 1,
		}),
	];
}
