import './wxtilesdeckgl.css';
import { Deck } from '@deck.gl/core';

import { DebugTilesLayer, WxServerVarsStyleType, createDeckGlLayer, setupWxTilesLib, createWxTilesLayerProps, WxTilesLayer } from './wxtilesdeckgl';
import { WxTilesLayerManager } from './libs/createDeckGlLayer';

export async function start() {
	const deckgl = new Deck({
		initialViewState: { latitude: -38, longitude: 176, zoom: 4 },
		controller: true,
		parent: document.getElementById('map')!,
		layers: [
			new DebugTilesLayer({
				id: 'debugtiles',
				data: { color: [255, 0, 0, 120] },
				// visible: false,
			}),
		],
	});

	// ESSENTIAL step to get lib ready.
	await setupWxTilesLib(); // !!! IMPORTANT: make sure fonts (barbs, arrows, etc) are loaded

	const params: WxServerVarsStyleType =
		//
		// ['nz_wave_trki', 'hs_mean', 'Significant wave height'];
		// ['ecwmf.global', 'air.temperature.at-2m', 'temper2m'];
		// ['ecwmf.global', 'air.temperature.at-2m', 'Sea Surface Temperature'];
		// ['ecwmf.global', 'air.humidity.at-2m', 'base'];
		// ['ww3-ecmwf.global', 'wave.height', 'Significant wave height'];
		// ['ww3-ecmwf.global', 'wave.direction.above-8s.peak', 'direction'];
		// ['obs-radar.rain.nzl.national', 'reflectivity', 'rain.EWIS'];
		['ecwmf.global', ['wind.speed.eastward.at-10m', 'wind.speed.northward.at-10m'], 'Wind Speed2'];
	const wxProps = await createWxTilesLayerProps('https://tiles.metoceanapi.com/data/', params);
	// wxProps.visible = false;
	wxProps.opacity = 0.2;
	wxProps.onClick = function (info: any, pickingEvent: any) {
		console.log(info?.layer?.onClickProcessor?.(info, pickingEvent) || info);
	};

	// const layerManager = createDeckGlLayer(deckgl, wxProps);
	const layerManager = new WxTilesLayerManager(deckgl, wxProps);

	let isPlaying = false;
	const play = async () => {
		do {
			await layerManager.nextTimestep();
		} while (isPlaying);
	};

	const nextButton = document.getElementById('next');
	const prevButton = document.getElementById('prev');
	const playButton = document.getElementById('play');
	const removeButton = document.getElementById('remove');
	removeButton?.addEventListener('click', () => layerManager.remove());
	nextButton?.addEventListener('click', () => layerManager.nextTimestep());
	prevButton?.addEventListener('click', () => layerManager.prevTimestep());
	playButton?.addEventListener('click', () => {
		layerManager.cancel();
		isPlaying = !isPlaying;
		isPlaying && play();
		playButton.innerHTML = isPlaying ? 'Stop' : 'Play';
	});

	layerManager.nextTimestep();
}
