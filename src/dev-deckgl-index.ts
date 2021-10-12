import './wxtilesdeckgl.css';
import { Deck, MapView } from '@deck.gl/core';

import {
	setupWxTilesLib,
	setWxTilesLogging,
	createWxTilesLayerProps,
	createDeckGlLayer,
	WxServerVarsStyleType,
	DebugTilesLayer,
	WxTilesLayerManager,
	WxTilesLayer,
} from './wxtilesdeckgl';

export async function start() {
	const deckgl = new Deck({
		initialViewState: { latitude: -38, longitude: 176, zoom: 4 },
		controller: true,
		parent: document.getElementById('map')!,
		views: [new MapView({ repeat: true })],
		layers: [],
	});

	// ESSENTIAL step to get lib ready.
	await setupWxTilesLib(); // !!! IMPORTANT: make sure fonts (barbs, arrows, etc) are loaded
	setWxTilesLogging(true);

	const params: WxServerVarsStyleType =
		//
		// ['nz_wave_trki', 'hs_mean', 'Significant wave height'];
		// ['ecwmf.global', 'air.temperature.at-2m', 'temper2m'];
		['ecwmf.global', 'air.temperature.at-2m', 'Sea Surface Temperature'];
	// ['ecwmf.global', 'air.humidity.at-2m', 'base'];
	// ['ww3-ecmwf.global', 'wave.height', 'Significant wave height'];
	// ['ww3-ecmwf.global', 'wave.direction.above-8s.peak', 'direction'];
	// ['obs-radar.rain.nzl.national', 'reflectivity', 'rain.EWIS'];
	// ['ecwmf.global', ['wind.speed.eastward.at-10m', 'wind.speed.northward.at-10m'], 'Wind Speed2'];
	const extraParams = {
		// DeckGl layer's common parameters
		opacity: 0.5,
		// event hook
		onClick(info: any, pickingEvent: any): void {
			console.log(info?.layer?.onClickProcessor?.(info, pickingEvent) || info);
		},
	};

	const wxProps = await createWxTilesLayerProps({ server: 'https://tiles.metoceanapi.com/data/', params, extraParams });

	const layerManager = createDeckGlLayer(deckgl, wxProps);
	// or
	// const layerManager = new WxTilesLayerManager({ deckgl, props: wxProps });

	let isPlaying = false;
	const play = async () => {
		do {
			await layerManager.nextTimestep();
		} while (isPlaying);
	};

	await layerManager.renderCurrentTimestep();
	
	const debugLayerRed = new DebugTilesLayer({
		id: 'debugtilesR',
		data: { color: [255, 0, 0, 120] },
	});
	const debugLayerBlue = new DebugTilesLayer({
		id: 'debugtilesB',
		data: { color: [0, 0, 255, 120] },
		maxZoom: wxProps.maxZoom,
	});

	deckgl.setProps({ layers: [...deckgl.props.layers, debugLayerRed, debugLayerBlue] });

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
}
