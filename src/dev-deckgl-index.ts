import './index.css';
import { Deck } from '@deck.gl/core';

import { createWxTilesLayerProps, WxServerVarsTimeType, WxTilesLayer } from './layers/WxTilesLayer';
import { createDeckGlLayer } from './libs/createDeckGlLayer';
import { setupWxTilesLib } from './libs/libTools';
import { DebugTilesLayer } from './layers/DebugTilesLayer';

export async function start() {
	const deckgl = new Deck({
		initialViewState: { latitude: -38, longitude: 176, zoom: 4 },
		controller: true,
		parent: document.getElementById('map')!,
		layers: [
			new DebugTilesLayer({
				id: 'debugtiles',
				data: { color: [255, 0, 0] },
				maxZoom: 24,
				minZoom: 0,
				pickable: false,
				tileSize: 256,
			}),
		],
	});

	const params: WxServerVarsTimeType =
		//
		// ['ecwmf.global', 'air.temperature.at-2m', 'temper2m'];
		// ['ecwmf.global', 'air.temperature.at-2m', 'Sea Surface Temperature'];
		// ['ecwmf.global', 'air.humidity.at-2m', 'base'];
		// ['ww3-ecmwf.global', 'wave.height', 'Significant wave height'];
		// ['ww3-ecmwf.global', 'wave.direction.above-8s.peak', 'direction'];
		// ['obs-radar.rain.nzl.national', 'reflectivity', 'rain.EWIS'];
		['ecwmf.global', ['wind.speed.eastward.at-10m', 'wind.speed.northward.at-10m'] as [string, string], 'Wind Speed2'];

	// ESSENTIAL step to get lib ready.
	await setupWxTilesLib(); // !!! IMPORTANT: make sure fonts (barbs, arrows, etc) are loaded
	const wxProps = await createWxTilesLayerProps('https://tiles.metoceanapi.com/data/', params);

	const layer = createDeckGlLayer(deckgl, wxProps);

	let isPlaying = false;
	const play = async () => {
		do {
			await layer.nextTimestep();
		} while (isPlaying);
	};

	const nextButton = document.getElementById('next');
	const prevButton = document.getElementById('prev');
	const playButton = document.getElementById('play');
	const removeButton = document.getElementById('remove');
	removeButton?.addEventListener('click', () => layer.remove());
	nextButton?.addEventListener('click', () => layer.nextTimestep());
	prevButton?.addEventListener('click', () => layer.prevTimestep());
	playButton?.addEventListener('click', () => {
		layer.cancel();
		isPlaying = !isPlaying;
		isPlaying && play();
		playButton.innerHTML = isPlaying ? 'Stop' : 'Play';
	});
	layer.nextTimestep();
}
