import { WxTilesLayer as DeckWxTilesLayer, WxTilesLayerProps } from '../layers/WxTilesLayer';
import { Deck, Layer } from '@deck.gl/core';
import { DebugTilesLayer } from '../layers/DebugTilesLayer';
import { sleep } from '../utils/wxtools';

export interface WxTilesLayer {
	nextTimestep(): Promise<void>;
	prevTimestep(): Promise<void>;
	jumpToTimestep(timesIndex: number): Promise<void>;
}
export interface WxTilesLib {
	createLayer(wxTilesLayerProps: WxTilesLayerProps, deckgl: Deck): WxTilesLayer;
}

export type CreateWxTilesLib = (props?: { debug: boolean }) => WxTilesLib;

const wxTilesLayer = (wxTilesLayerProps: WxTilesLayerProps, deckgl: Deck, otherLayers: Layer<any>[]): WxTilesLayer => {
	let currentTimestepIndex = 0;
	let prevLayer: DeckWxTilesLayer;

	const renderTimestep = async (timestep: number) => {
		return new Promise<DeckWxTilesLayer>((resolve) => {
			let onViewportLoadedBefore = false;
			const URI = wxTilesLayerProps.wxprops.URITime.replace('{time}', wxTilesLayerProps.wxprops.meta.times[timestep]);
			const deckLayer = new DeckWxTilesLayer({
				...wxTilesLayerProps,
				id: wxTilesLayerProps.id! + timestep,
				data: [URI],
				onViewportLoad: async () => {
					if (onViewportLoadedBefore) return;
					await sleep(0);
					deckgl.setProps({ layers: [deckLayer, ...otherLayers] });
					onViewportLoadedBefore = true;
					resolve(deckLayer);
				},
				onTileError: () => {
					resolve(deckLayer);
				},
			});
			deckgl.setProps({ layers: [deckLayer, ...(prevLayer ? [prevLayer] : []), ...otherLayers] });
		});
	};

	return {
		nextTimestep: async () => {
			currentTimestepIndex = ++currentTimestepIndex % wxTilesLayerProps.wxprops.meta.times.length;
			prevLayer = await renderTimestep(currentTimestepIndex);
		},
		prevTimestep: async () => {
			currentTimestepIndex = --currentTimestepIndex % wxTilesLayerProps.wxprops.meta.times.length;
			prevLayer = await renderTimestep(currentTimestepIndex);
		},
		jumpToTimestep: async (timesIndex: number) => {
			currentTimestepIndex = timesIndex % wxTilesLayerProps.wxprops.meta.times.length;
			prevLayer = await renderTimestep(currentTimestepIndex);
		},
	};
};

const wxTilesLib = (otherLayers: Layer<any>[]): WxTilesLib => {
	return {
		createLayer: (wxTilesLayerProps, deckgl) => wxTilesLayer(wxTilesLayerProps, deckgl, otherLayers),
	};
};

export const createWxTilesLib: CreateWxTilesLib = ({ debug } = { debug: false }) => {
	const debugLayer = debug
		? new DebugTilesLayer({
				id: 'debugtiles',
				data: undefined,
				maxZoom: 24,
				minZoom: 0,
				pickable: false,
				tileSize: 256,
		  })
		: undefined;
	return wxTilesLib(debugLayer ? [debugLayer] : []);
};
