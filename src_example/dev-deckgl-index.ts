import { Deck, MapView } from '@deck.gl/core';

import {
	setupWxTilesLib,
	setWxTilesLogging,
	createWxTilesLayerProps,
	createDeckGlLayer,
	WxServerVarsStyleType,
	DebugTilesLayer,
	CreateProps,
	LibSetupObject,
	WxTilesLayerManager,
	WxTilesLayer,
	WxGetColorStyles,
	createLegend,
} from '../src/wxtilesdeckgl';
// } from '@metoceanapi/wxtiles-deckgl';
import '../wxtilescss.css';

import colorStyles from './styles/styles.json';
import units from './styles/uconv.json';
import colorSchemes from './styles/colorschemes.json';

async function start() {
	// ESSENTIAL step to get lib ready.
	const wxlibCustomSettings: LibSetupObject = {
		colorStyles: colorStyles as any,
		units: units as any,
		colorSchemes,
	};
	await setupWxTilesLib(wxlibCustomSettings); // !!! IMPORTANT: await to make sure fonts (barbs, arrows, etc) are loaded
	setWxTilesLogging(true); // logging on

	const deckgl = new Deck({
		initialViewState: { latitude: -38, longitude: 176, zoom: 4 },
		controller: true,
		parent: document.getElementById('map')!,
		views: [new MapView({ repeat: true })],
		layers: [],
	});

	const wxParams: WxServerVarsStyleType =
		// --- datas ---
		// ['obs-radar.rain.nzl.national', 'reflectivity', 'rain.EWIS'];
		['ecwmf.global', ['wind.speed.eastward.at-10m', 'wind.speed.northward.at-10m'], 'Wind Speed2'];
		// ['ecwmf.global', 'air.temperature.at-2m', 'Sea Surface Temperature'];

	const deckCommonLayersParams = {
		// DeckGl layer's common parameters
		opacity: 1.0,
		// event hook
		onClick(info: any, pickingEvent: any): void {
			console.log(info?.layer?.onClickProcessor?.(info, pickingEvent) || info);
		},
	};

	const wxProps = await createWxTilesLayerProps({ server: 'https://tiles.metoceanapi.com/data/', params: wxParams, extraParams: deckCommonLayersParams });

	const layerManager = createDeckGlLayer(deckgl, wxProps);
	// or
	// const layerManager = new WxTilesLayerManager({ deckgl, props: wxProps });

	// layerManager.renderCurrentTimestep();
	// const params2: WxServerVarsStyleType = ['ecwmf.global', ['wind.speed.eastward.at-10m', 'wind.speed.northward.at-10m'], 'Wind Speed2'];
	// const wxProps2 = await createWxTilesLayerProps({ server: 'https://tiles.metoceanapi.com/data/', params: params2 });
	// const layerManager2 = createDeckGlLayer(deckgl, wxProps2);
	// await layerManager2.renderCurrentTimestep();
	await layerManager.renderCurrentTimestep();

	// // layerManager.renderCurrentTimestep();
	// const params2: WxServerVarsStyleType = ['ecwmf.global', ['wind.speed.eastward.at-10m', 'wind.speed.northward.at-10m'], 'Wind Speed2'];
	// const wxProps2 = await createWxTilesLayerProps({ server: 'https://tiles.metoceanapi.com/data/', params: params2, extraParams: { opacity: 0.5 } });
	// const layerManager2 = createDeckGlLayer(deckgl, wxProps2);
	// await layerManager2.renderCurrentTimestep();

	UIhooks(layerManager);
	debugLayers(deckgl, wxProps.maxZoom);

	const legendCanvasEl = document.getElementById('legend') as HTMLCanvasElement;
	if (!legendCanvasEl) return;

	const style = WxGetColorStyles()[wxParams[2]];
	const legend = createLegend(legendCanvasEl.width - 50, style);

	const txt = wxParams[2] + ' (' + legend.units + ')';
	drawLegend({ legend, txt, canvas: legendCanvasEl });
}

function debugLayers(deckgl: Deck, maxZoom?: number) {
	const debugLayerRed = new DebugTilesLayer({
		id: 'debugtilesR',
		data: { color: [255, 0, 0, 120] },
	});
	const debugLayerBlue = new DebugTilesLayer({
		id: 'debugtilesB',
		data: { color: [0, 0, 255, 120] },
		maxZoom,
	});

	deckgl.setProps({ layers: [...deckgl.props.layers, debugLayerRed, debugLayerBlue] });
}

function UIhooks(layerManager: WxTilesLayerManager) {
	// set up user interface
	const nextButton = document.getElementById('next');
	const prevButton = document.getElementById('prev');
	const playButton = document.getElementById('play');
	const removeButton = document.getElementById('remove');
	removeButton?.addEventListener('click', () => layerManager.remove());
	nextButton?.addEventListener('click', () => layerManager.nextTimestep());
	prevButton?.addEventListener('click', () => layerManager.prevTimestep());
	let isPlaying = false;
	const play = async () => {
		do {
			await layerManager.nextTimestep();
		} while (isPlaying);
	};
	playButton?.addEventListener('click', () => {
		layerManager.cancel();
		isPlaying = !isPlaying;
		isPlaying && play();
		playButton.innerHTML = isPlaying ? 'Stop' : 'Play';
	});
}

function drawLegend({ legend, canvas, txt }) {
	if (!canvas || !legend) return;

	const { width, height } = canvas;
	const halfHeight = (16 + height) >> 2;

	// draw legend
	const ctx = canvas.getContext('2d');
	const imData = ctx.createImageData(width, height);
	const im = new Uint32Array(imData.data.buffer);
	im.fill(-1);

	const startX = 2;
	const startY = 2;
	const startXY = startX + width * startY;

	const trSize = halfHeight >> 1;
	// left triangle
	if (legend.showBelowMin) {
		const c = legend.colors[0];
		if (c) {
			for (let x = 0; x < trSize; ++x) {
				for (let y = trSize; y < trSize + x; ++y) {
					im[startXY + x + y * width] = c;
					im[startXY + x + (trSize * 2 - y) * width] = c;
				}
			}
		}
	}

	for (let x = 0; x < legend.size; ++x) {
		for (let y = 0; y < halfHeight; ++y) {
			if (legend.colors[0]) {
				im[startX + x + trSize + (y + startY + 1) * width] = legend.colors[x];
			}
		}
	}

	// right triangle
	if (legend.showAboveMax) {
		const c = legend.colors[legend.colors.length - 1];
		if (c) {
			for (let x = 0; x <= trSize; ++x) {
				for (let y = trSize; y < trSize + x; ++y) {
					im[startXY + trSize * 2 + legend.size - x + y * width] = c;
					im[startXY + trSize * 2 + legend.size - x + (trSize * 2 - y) * width] = c;
				}
			}
		}
	}

	ctx.putImageData(imData, 0, 0);

	// draw ticks
	ctx.font = '8px sans-serif';
	ctx.beginPath();
	for (const tick of legend.ticks) {
		ctx.strokeStyle = '#000';
		ctx.moveTo(tick.pos + trSize + startX + 1, startY + 3);
		ctx.lineTo(tick.pos + trSize + startX + 1, halfHeight);
		ctx.fillText(tick.dataString, tick.pos + trSize + startX + 1, halfHeight + 11);
	}
	ctx.font = '12px sans-serif';
	ctx.fillText(txt, 13, height - 5);
	ctx.stroke();

	ctx.strokeStyle = '#888';
	ctx.strokeRect(1, 1, width - 3, height - 2); //for white background
}

start();
