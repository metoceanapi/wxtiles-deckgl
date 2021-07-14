import './index.css';
import { Deck } from '@deck.gl/core';

import { createWxTilesLayerProps, WxServerVarsTimeType, WxTilesLayer } from './layers/WxTilesLayer';
import { setupWxTilesLib, createWxTilesManager } from './libs/wxTilesLib';

export async function start() {
	const deckgl = new Deck({
		initialViewState: { latitude: -38, longitude: 176, zoom: 4 },
		controller: true,
		_animate: true,
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
	await setupWxTilesLib('styles/styles.json', 'styles/uconv.json', 'styles/colorschemes.json'); // !!! IMPORTANT: make sure fonts (barbs, arrows, etc) are loaded
	const wxManager = createWxTilesManager(deckgl, { debug: true });
	const wxProps = await createWxTilesLayerProps('https://tiles.metoceanapi.com/data/', params);
	wxManager.createLayer(WxTilesLayer, wxProps);
	wxManager.nextTimestep();

	const button = document.createElement('button');
	button.style.zIndex = '1000000';
	button.style.position = 'absolute';
	button.innerHTML = 'Start|Stop';
	document.body.appendChild(button);
	button.addEventListener('click', wxManager.nextTimestep.bind(wxManager));
}
