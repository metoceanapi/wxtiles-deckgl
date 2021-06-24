import { Deck, Layer } from '@deck.gl/core';
import { DebugTilesLayer } from '../layers/DebugTilesLayer';
import { sleep } from '../utils/wxtools';
import { IWxTileLayer } from '../layers/IWxTileLayer';

export interface WxTilesLayer {
	nextTimestep(): Promise<void>;
	prevTimestep(): Promise<void>;
	jumpToTimestep(timesIndex: number): Promise<void>;
}
export interface WxTilesLib {
	createLayer<L extends IWxTileLayer>(LayerClass: new (props: L['props']) => L, props: L['props']): WxTilesLayer;
}
export type CreateWxTilesManager = (deckgl: Deck, options?: { debug: boolean }) => WxTilesLib;

const wxTilesLayer = <L extends IWxTileLayer>(
	LayerClass: new (props: L['props']) => L,
	props: L['props'],
	deckgl: Deck,
	otherLayers: Layer<any>[]
): WxTilesLayer => {
	let currentTimestepIndex = 0;
	let prevLayer: L;

	const renderTimestep = async (timestep: number) => {
		return new Promise<L>((resolve) => {
			let onViewportLoadedBefore = false;
			const URI = props.wxprops.URITime.replace('{time}', props.wxprops.meta.times[timestep]);
			const layerInstance = new LayerClass({
				...props,
				id: props.id! + timestep,
				data: [URI],
				onViewportLoad: async (data) => {
					props?.onViewportLoad?.call(layerInstance, data);
					if (onViewportLoadedBefore) return;
					onViewportLoadedBefore = true;
					await sleep(0);
					deckgl.setProps({ layers: [layerInstance, ...otherLayers] });
					resolve(layerInstance);
				},
				onTileError: (error) => {
					props?.onTileError?.call(layerInstance, error);
					console.error(error);
					resolve(layerInstance);
				},
			});
			deckgl.setProps({ layers: [layerInstance, ...(prevLayer ? [prevLayer] : []), ...otherLayers] });
		});
	};

	return {
		nextTimestep: async () => {
			currentTimestepIndex = ++currentTimestepIndex % props.wxprops.meta.times.length;
			prevLayer = await renderTimestep(currentTimestepIndex);
		},
		prevTimestep: async () => {
			currentTimestepIndex = --currentTimestepIndex % props.wxprops.meta.times.length;
			prevLayer = await renderTimestep(currentTimestepIndex);
		},
		jumpToTimestep: async (timesIndex: number) => {
			currentTimestepIndex = timesIndex % props.wxprops.meta.times.length;
			prevLayer = await renderTimestep(currentTimestepIndex);
		},
	};
};

const layersManager = (deckgl: Deck, otherLayers: Layer<any>[]): WxTilesLib => {
	return {
		createLayer: (LayerClass, layerProps) => wxTilesLayer(LayerClass, layerProps, deckgl, otherLayers),
	};
};

export const createWxTilesManager: CreateWxTilesManager = (deckgl, { debug } = { debug: false }) => {
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
	return layersManager(deckgl, debugLayer ? [debugLayer] : []);
};
