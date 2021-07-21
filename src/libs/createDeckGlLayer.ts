import { IWxTilesLayerProps } from '../layers/IWxTileLayer';
import { WxTilesLayer } from '../layers/WxTilesLayer';
import { WxtilesGlLayer } from './WxtilesGlLayer';
import { Deck, LayerManager, Layer } from '@deck.gl/core';

export const createDeckGlLayer = (deckgl: Deck, props: IWxTilesLayerProps): WxtilesGlLayer => {
	const getDeckglLayers = (): Layer<any>[] => {
		return ((deckgl as any).layerManager.getLayers() as Layer<any>[]).filter((layer) => layer.parent === null);
	};

	let currentIndex = 0;
	let prevLayer: Layer<any> | null = null;

	let cancelPrevRequest = () => {};
	const renderCurrentTimestep = async () => {
		const { cancel, layerId, promise } = renderLayerByTimeIndex(currentIndex);
		cancelPrevRequest();
		cancelPrevRequest = cancel;
		const layer = await promise;
		if (prevLayer) {
			const currentLayers = getDeckglLayers();
			deckgl.setProps({ layers: currentLayers.filter((layer) => layer !== prevLayer) });
		}
		prevLayer = layer;
		cancelPrevRequest = () => {};
	};

	const renderLayerByTimeIndex = (index: number) => {
		const layerId = props.id + index;
		const URI = props.wxprops.URITime.replace('{time}', props.wxprops.meta.times[index]);
		const promise = new Promise<WxTilesLayer>((resolve, reject) => {
			const newWxtilesLayer = new WxTilesLayer({
				...props,
				id: layerId,
				data: URI,
				onViewportLoad: (data) => {
					props?.onViewportLoad?.(data);
					resolve(newWxtilesLayer);
				},
				onTileError: (error) => {
					reject(reject);
				},
			});
			const currentLayers = getDeckglLayers();
			deckgl.setProps({ layers: [newWxtilesLayer, ...currentLayers] });
		});

		return {
			promise,
			layerId,
			cancel: () => {
				const currentLayers = getDeckglLayers();
				deckgl.setProps({ layers: currentLayers.filter(({ id }) => id !== layerId) });
			},
		};
	};

	return {
		nextTimestep: async () => {
			currentIndex = ++currentIndex % props.wxprops.meta.times.length;
			await renderCurrentTimestep();
		},
		prevTimestep: async () => {
			currentIndex = --currentIndex % props.wxprops.meta.times.length;
			await renderCurrentTimestep();
		},
		cancel: () => {
			cancelPrevRequest();
			cancelPrevRequest = () => {};
		},
		remove: () => {
			cancelPrevRequest();
			cancelPrevRequest = () => {};
			if (prevLayer) {
				const currentLayers = getDeckglLayers();
				deckgl.setProps({ layers: currentLayers.filter((layer) => layer !== prevLayer) });
			}
		},
	};
};
