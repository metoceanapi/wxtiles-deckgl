import { IWxTilesLayerProps } from '../layers/IWxTileLayer';
import { WxTilesLayer } from '../layers/WxTilesLayer';
import { WxtilesGlLayer } from './WxtilesGlLayer';
import { Deck, LayerManager, Layer } from '@deck.gl/core';

export const createDeckGlLayer = (deckgl: Deck, props: IWxTilesLayerProps): WxtilesGlLayer => {
	let currentIndex = 0;
	let prevLayer: Layer<any> | null = null;

	const getDeckglLayers = (): Layer<any>[] => {
		return ((deckgl as any).layerManager).getLayers();
	};

	const renderCurrentTimestep = async () => {
		const newId = props.id + currentIndex;
		const URI = props.wxprops.URITime.replace('{time}', props.wxprops.meta.times[currentIndex]);
		const wxtilesLayer = await new Promise<WxTilesLayer>((resolve, reject) => {
			const newWxtilesLayer = new WxTilesLayer({
				...props,
				id: newId,
				data: URI,
				onViewportLoad: (data) => {
					props?.onViewportLoad?.(data);
					resolve(newWxtilesLayer);
				},
				onTileError: (error) => {
					reject(reject);
				},
			});
			console.log(deckgl);
			const currentLayers = getDeckglLayers();
			console.log([...currentLayers, newWxtilesLayer]);
			deckgl.setProps({ layers: [...currentLayers, newWxtilesLayer] });
		});
		return
		const currentLayers = getDeckglLayers();
		const filteredLayers = currentLayers.filter((layer) => layer !== prevLayer);
		console.log(filteredLayers);
		deckgl.setProps({ layers: filteredLayers });
		prevLayer = wxtilesLayer;
	};

	return {
		cancel: () => false,
		nextTimestep: async () => {
			currentIndex = ++currentIndex % props.wxprops.meta.times.length;
			return renderCurrentTimestep();
		},
		prevTimestep: async () => {
			currentIndex = --currentIndex % props.wxprops.meta.times.length;
			return renderCurrentTimestep();
		},
		remove: () => false,
	};
};
