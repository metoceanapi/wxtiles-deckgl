import { Deck, Layer } from '@deck.gl/core';
import { DebugTilesLayer } from '../layers/DebugTilesLayer';
import { IWxTilesLayer } from '../layers/IWxTileLayer';

const createTimestepIndexManager = () => {
	let currentTimestepIndex = -1;
	const timestepIndexManager = {
		get: () => currentTimestepIndex,
		max: (layerStore: LayerStoreItem[]) => {
			return Math.max(...layerStore.map(({ layerProps }) => layerProps.wxprops.meta.times.length));
		},
		next: (layerStore: LayerStoreItem[]) => {
			currentTimestepIndex = ++currentTimestepIndex % timestepIndexManager.max(layerStore);
			return currentTimestepIndex;
		},
		prev: (layerStore: LayerStoreItem[]) => {
			currentTimestepIndex = --currentTimestepIndex % timestepIndexManager.max(layerStore);
			return currentTimestepIndex;
		},
		set: (newIndex: number) => {
			currentTimestepIndex = newIndex;
			return currentTimestepIndex;
		},
	};
	return timestepIndexManager;
};

export interface WxTilesLib {
	createLayer<L extends IWxTilesLayer>(LayerClass: new (props: L['props']) => L, props: L['props']): { remove(): void };
	nextTimestep(): Promise<void>;
	prevTimestep(): Promise<void>;
	jumpToTimestep(timesIndex: number): Promise<void>;
}
export type CreateWxTilesManager = (deckgl: Deck, options?: { debug: boolean }) => WxTilesLib;

interface LayerStoreItem {
	layerInstance: IWxTilesLayer;
	LayerClass: new (props: IWxTilesLayer['props']) => IWxTilesLayer;
	layerProps: IWxTilesLayer['props'];
}

const layersManager = (deckgl: Deck, otherLayers: Layer<any>[]): WxTilesLib => {
	const timestepManager = createTimestepIndexManager();
	let currentLayersStore: LayerStoreItem[] = [];

	const syncLayerStore = (newLayerStore: LayerStoreItem[]) => {
		deckgl.setProps({ layers: [...newLayerStore.map(({ layerInstance }) => layerInstance), ...otherLayers] });
		currentLayersStore = newLayerStore;
	};

	const renderCurrentTimestep = async () => {
		const newLayerStore = await new Promise<LayerStoreItem[]>((resolve) => {
			let tempLayerStore: LayerStoreItem[] = [];
			const resolvePromiseIfAllResolved = (layerStoreItem: LayerStoreItem) => {
				tempLayerStore.push(layerStoreItem);
				if (tempLayerStore.length === currentLayersStore.length) {
					resolve(tempLayerStore);
				}
			};

			const currentTimestepIndex = timestepManager.get();

			const newLayers = currentLayersStore.map((layerStoreItem) => {
				if (currentTimestepIndex >= layerStoreItem.layerProps.wxprops.meta.times.length - 1) {
					// trying to render out-of-range index
					resolvePromiseIfAllResolved(layerStoreItem);
					return layerStoreItem.layerInstance;
				}
				const URI = layerStoreItem.layerProps.wxprops.URITime.replace('{time}', layerStoreItem.layerProps.wxprops.meta.times[currentTimestepIndex]);
				const { LayerClass, layerInstance, layerProps } = layerStoreItem;
				let onViewportLoadedBefore = false;
				const newLayer = new LayerClass({
					...layerProps,
					id: layerProps.id + currentTimestepIndex,
					data: URI,
					onViewportLoad: (data) => {
						layerProps?.onViewportLoad?.call(layerInstance, data);
						if (onViewportLoadedBefore) return;
						onViewportLoadedBefore = true;
						resolvePromiseIfAllResolved({ ...layerStoreItem, layerInstance: newLayer });
					},
					onTileError: (error) => {
						layerProps?.onTileError?.call(layerInstance, error);
						console.error(error);
						resolvePromiseIfAllResolved({ ...layerStoreItem, layerInstance: newLayer });
					},
				});
				return newLayer;
			});
			const previousLayers = currentLayersStore.map(({ layerInstance }) => layerInstance);
			deckgl.setProps({ layers: [...newLayers, ...previousLayers, ...otherLayers] });
		});
		syncLayerStore(newLayerStore);
	};

	return {
		createLayer: (LayerClass, layerProps) => {
			const newLayerInstance = new LayerClass(layerProps);
			currentLayersStore.push({
				LayerClass: LayerClass,
				layerInstance: newLayerInstance,
				layerProps,
			});
			return {
				remove: () => currentLayersStore.filter(({ layerInstance }) => layerInstance !== newLayerInstance),
			};
		},
		nextTimestep: async () => {
			timestepManager.next(currentLayersStore);
			await renderCurrentTimestep();
		},
		prevTimestep: async () => {
			timestepManager.prev(currentLayersStore);
			await renderCurrentTimestep();
		},
		jumpToTimestep: async (timesIndex: number) => {
			timestepManager.set(timesIndex);
			await renderCurrentTimestep();
		},
	};
};

export const createWxTilesManager: CreateWxTilesManager = (deckgl, { debug } = { debug: false }) => {
	const debugLayer = debug
		? new DebugTilesLayer({
				id: 'debugtiles',
				data: { color: [255, 0, 0] },
				maxZoom: 24,
				minZoom: 0,
				pickable: false,
				tileSize: 256,
		  })
		: undefined;
	return layersManager(deckgl, debugLayer ? [debugLayer] : []);
};
