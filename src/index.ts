import './index.css';
import { Deck } from '@deck.gl/core';
import { TileLayer } from '@deck.gl/geo-layers';

import { createWxTilesLayer, WxServerVarsTimeType, wxTileLibSetupPromice, WxTilesLayer } from './layers/WxTilesLayer';
import { DebugTilesLayer } from './layers/DebugTilesLayer';

import { Meta } from './utils/wxtools';
import { BitmapLayer, TextLayer } from '@deck.gl/layers';

export async function start() {
	const deckgl = new Deck({
		initialViewState: { latitude: -38, longitude: 176, zoom: 4 },
		controller: true,
		// layers, // or use: deckgl.setProps({ layers });
		// views: new GlobeView({ id: 'globe', controller: true }),
	});

	// ESSENTIAL step to get lib ready.
	await wxTileLibSetupPromice('styles/styles.json', 'styles/uconv.json', 'styles/colorschemes.json'); // !!! IMPORTANT: make sure fonts (barbs, arrows, etc) are loaded

	const params: WxServerVarsTimeType =
		//
		// ['ecwmf.global', 'air.temperature.at-2m', 'temper2m'];
		// ['ecwmf.global', 'air.temperature.at-2m', 'Sea Surface Temperature'];
		// ['ecwmf.global', 'air.humidity.at-2m', 'base'];
		['ww3-ecmwf.global', 'wave.height', 'Significant wave height'];
	// ['ww3-ecmwf.global', 'wave.direction.above-8s.peak', 'direction'];
	// ['obs-radar.rain.nzl.national', 'reflectivity', 'rain.EWIS'];
	// ['ecwmf.global', ['wind.speed.eastward.at-10m', 'wind.speed.northward.at-10m'] as [string, string], 'Wind Speed2'];

	let i = 0;
	let time = new Date().toString();
	let play = false;

	const { meta, wxLayer } = await createWxTilesLayer('https://tiles.metoceanapi.com/data/', params, time);
	const layers = [createBaseLayer(), new TextLayer({ id: 'empty' }), wxLayer, ...createDebugLayers(meta)];
	deckgl.setProps({ layers });

	const timeAnimation = async () => {
		if (!play) return;
		i = ++i % meta.times.length;
		time = meta.times[i];
		const { onViewportLoadPromise, wxLayer } = await createWxTilesLayer('https://tiles.metoceanapi.com/data/', params, time);
		layers[1] = wxLayer; // put our layer UNDER prev one
		deckgl.setProps({ layers: [...layers] }); // draw it // layers: [...layers] - to convince Deck process new layers.
		await onViewportLoadPromise; // wait it
		layers[2] = wxLayer; // put it on top
		layers[1] = new TextLayer({ id: 'empty' }); // set the UNDER layer to empty
		deckgl.setProps({ layers: [...layers] }); // draw it
		setTimeout(timeAnimation, 5);
	};

	const button = document.createElement('button');
	button.style.zIndex = '1000000';
	button.style.position = 'absolute';
	button.innerHTML = 'Start|Stop';
	document.body.appendChild(button);
	button.addEventListener('click', () => {
		play = !play;
		play && timeAnimation();
	});
}

function createBaseLayer() {
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

function createDebugLayers(meta: Meta) {
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
