import { Deck, Layer } from '@deck.gl/core';
import { LayerProps } from '@deck.gl/core/lib/layer';
import { WxTilesLayer, WxTilesLayerProps } from '../layers/WxTilesLayer';

type CLayer = Layer<any, LayerProps<any>>;

export class WxTilesLayerManager {
	props: WxTilesLayerProps;
	deckgl: Deck;
	currentIndex: number;

	layer?: WxTilesLayer;
	protected prevLayer?: WxTilesLayer;

	constructor(deckgl: Deck, props: WxTilesLayerProps) {
		this.deckgl = deckgl;
		this.props = props;
		this.currentIndex = 0;
	}

	nextTimestep() {
		++this.currentIndex;
		this._checkIndex();
		return this._renderCurrentTimestep();
	}

	prevTimestep() {
		--this.currentIndex;
		this._checkIndex();
		return this._renderCurrentTimestep();
	}

	goToTimestep(index: number) {
		if (index === this.currentIndex) {
			return Promise.resolve(index);
		}

		this.currentIndex = index;
		this._checkIndex();
		return this._renderCurrentTimestep();
	}

	cancel() {
		if (this.prevLayer && this.layer) {
			// trying to render a this.layer, stop it and revert this.layer.
			this._setFilteredLayers(this.layer);
			this.layer = this.prevLayer;
			this.prevLayer = undefined;
		}
	}

	remove() {
		this.cancel();
		if (this.layer) this._setFilteredLayers(this.layer);
		this.layer = undefined;
	}

	protected _setFilteredLayers(lRm1?: CLayer, lRm2?: CLayer, lAdd?: CLayer) {
		const layers = this._getDeckglLayers().filter((l) => l !== lRm1 && l !== lRm2);
		if (lAdd) layers.push(lAdd);
		this.deckgl.setProps({ layers });
	}

	protected _renderCurrentTimestep() {
		return this._renderLayerByTimeIndex(this.currentIndex);
	}

	protected async _renderLayerByTimeIndex(index: number) {
		const layerPromise = this._newLayerByTimeIndexPromise(index);
		const layer = await layerPromise;
		if (layer === this.layer || !this.layer) {
			// could be canceled during promise resolving
			this.currentIndex = index;
			const visProps = { ...layer.props };
			visProps.visible = true;
			const visLayer = new WxTilesLayer(visProps);
			this._setFilteredLayers(layer, this.prevLayer, visLayer);
			this.layer = visLayer;
			this.prevLayer = undefined;
		}

		return this.currentIndex;
	}

	protected _newLayerByTimeIndexPromise(index: number) {
		const layerId = this.props.id + index;
		const URI = this.props.wxprops.URITime.replace('{time}', this.props.wxprops.meta.times[index]);

		const promise = new Promise<WxTilesLayer>((resolve, reject) => {
			const newLayerProps = {
				...this.props,
				id: layerId,
				data: URI,

				visible: false,

				onViewportLoad: (data) => {
					this.props?.onViewportLoad?.(data);
					resolve(newWxtilesLayer);
				},
			};

			const newWxtilesLayer = new WxTilesLayer(newLayerProps);

			this.cancel();
			this.prevLayer = this.layer;
			this.layer = newWxtilesLayer;

			this.deckgl.setProps({ layers: [newWxtilesLayer, ...this._getDeckglLayers()] });
		});

		return promise;
	}

	protected _checkIndex() {
		this.currentIndex = (this.currentIndex + this.props.wxprops.meta.times.length) % this.props.wxprops.meta.times.length;
	}

	protected _getDeckglLayers() {
		return this.deckgl.props.layers.filter((layer) => layer.parent === null);
		// changed because of this:
		//    https://github.com/visgl/deck.gl/issues/4016#issuecomment-565545861
		// return ((deckgl as any).layerManager.getLayers() as Layer<any>[]).filter((layer) => layer.parent === null);
	}
}

/*
export interface WxtilesLayerManager {
	nextTimestep(): Promise<number>;
	prevTimestep(): Promise<number>;
	goToTimestep(index: number): Promise<void>;
	cancel(): void;
	remove(): void;
}

export const createDeckGlLayer = (deckgl: Deck, props: WxTilesLayerProps): WxtilesLayerManager => {
	let currentIndex = 0;
	let prevLayer: Layer<any> | null = null;

	let cancelPrevRequest = () => {};

	const getDeckglLayers = (): Layer<any>[] => {
		return deckgl.props.layers.filter((layer) => layer.parent === null);
		// changed becouse of this:
		//    https://github.com/visgl/deck.gl/issues/4016#issuecomment-565545861
		// return ((deckgl as any).layerManager.getLayers() as Layer<any>[]).filter((layer) => layer.parent === null);
	};

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
			currentIndex = (++currentIndex + props.wxprops.meta.times.length) % props.wxprops.meta.times.length;
			await renderCurrentTimestep();
			return currentIndex;
		},
		prevTimestep: async () => {
			currentIndex = (--currentIndex + props.wxprops.meta.times.length) % props.wxprops.meta.times.length;
			await renderCurrentTimestep();
			return currentIndex;
		},
		goToTimestep: async (index: number) => {
			if (index === currentIndex) {
				return;
			}
			currentIndex = (index + props.wxprops.meta.times.length) % props.wxprops.meta.times.length;
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
*/
