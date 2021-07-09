import './index.css';
import { Deck } from '@deck.gl/core';
import { TileLayer } from '@deck.gl/geo-layers';

import { createWxTilesLayer, WxServerVarsTimeType, WxTileLibSetupPromice } from './layers/WxTilesLayer';
import { DebugTilesLayer } from './layers/DebugTilesLayer';

import { Meta } from './utils/wxtools';
import { BitmapLayer } from '@deck.gl/layers';

async function fetchJson(url) {
	console.log(url);
	const req = await fetch(url, { mode: 'cors' }); // json loader helper
	const jso = await req.json();
	return jso;
}

export async function start() {
	// ESSENTIAL step to get lib ready.
	await WxTileLibSetupPromice('styles/styles.json', 'styles/uconv.json', 'styles/colorschemes.json'); // !!! IMPORTANT: make sure fonts (barbs, arrows, etc) are loaded

	const params: WxServerVarsTimeType =
		//
		// ['ecwmf.global', 'air.temperature.at-2m', 'temper2m'];
		// ['ecwmf.global', 'air.temperature.at-2m', 'Sea Surface Temperature'];
		['ecwmf.global', 'air.humidity.at-2m', 'base'];
	// ['ww3-ecmwf.global', 'wave.height', 'Significant wave height'];
	// ['ww3-ecmwf.global', 'wave.direction.above-8s.peak', 'direction'];
	// ['obs-radar.rain.nzl.national', 'reflectivity', 'rain.EWIS'];
	// ['ecwmf.global', ['wind.speed.eastward.at-10m', 'wind.speed.northward.at-10m'] as [string, string], 'Wind Speed2'];

	const { onViewportLoadPromise, wxLayer } = await createWxTilesLayer('https://tiles.metoceanapi.com/data/', params, new Date().toString());

	const layers = [baseLayer(), wxLayer, ...debugLayers(wxLayer.props.wxprops.meta)];

	const deckgl = new Deck({
		initialViewState: { latitude: -38, longitude: 176, zoom: 4 },
		controller: true,
		layers, // or use: deckgl.setProps({ layers });
		// views: new GlobeView({ id: 'globe', controller: true }),
	});

	await onViewportLoadPromise;
	console.log('done!');
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
