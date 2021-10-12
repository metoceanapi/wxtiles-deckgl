import { Deck, Layer } from '@deck.gl/core';
import { LayerProps } from '@deck.gl/core/lib/layer';
import { WxTilesLayer, WxTilesLayerProps } from '../layers/WxTilesLayer';
import { WXLOG } from '../utils/wxtools';

type CLayer = Layer<any, LayerProps<any>>;

export class WxTilesLayerManager {
	props: WxTilesLayerProps;
	deckgl: Deck;
	currentIndex: number = 0;
	layer?: WxTilesLayer;

	protected cancelNewLayerPromise?: () => void;

	constructor({ deckgl, props }: { deckgl: Deck; props: WxTilesLayerProps }) {
		this.deckgl = deckgl;
		this.props = props;
	}

	nextTimestep(): Promise<number> {
		WXLOG('nextTimestep');
		return this.goToTimestep(this.currentIndex + 1);
	}

	prevTimestep(): Promise<number> {
		WXLOG('prevTimestep');
		return this.goToTimestep(this.currentIndex - 1);
	}

	cancel() {
		// should be async? - ибо нахер!
		if (this.cancelNewLayerPromise) {
			WXLOG('cancel');
			this.cancelNewLayerPromise();
		}
	}

	remove(): void {
		WXLOG('remove');
		this.cancel();
		if (this.layer) {
			this._setFilteredLayers({ remove: this.layer });
			this.layer = undefined;
		}
	}

	renderCurrentTimestep(): Promise<number> {
		WXLOG('renderCurrentTimestep');
		return this.goToTimestep(this.currentIndex);
	}

	goToTimestep(index: number): Promise<number> {
		WXLOG('goToTimestep:', index);
		this.cancel(); // in case it was busy with the rotten result :( This will remove unwanted layer

		index = this._checkIndex(index);
		if (this.layer && index === this.currentIndex) return Promise.resolve(this.currentIndex); // wait first then check index!!!

		const layerId = this.props.id + index;
		const URI = this.props.wxprops.URITime.replace('{time}', this.props.wxprops.meta.times[index]);

		const promise = new Promise<number>((resolve): void => {
			WXLOG('promise:', index, 'started');
			const newInvisibleLayer = new WxTilesLayer({
				...this.props,
				id: layerId,
				data: URI,

				visible: false,

				onViewportLoad: (): void => {
					WXLOG('promise:onViewportLoad:', index);
					const newVisibleLayer = new WxTilesLayer({ ...this.props, id: layerId, data: URI });
					this._setFilteredLayers({ remove: newInvisibleLayer, replace: this.layer, add: newVisibleLayer });
					this.layer = newVisibleLayer;
					this.currentIndex = index;
					this.cancelNewLayerPromise = undefined;
					resolve(this.currentIndex);
				},
			});

			this.cancelNewLayerPromise = () => {
				WXLOG('promise:cancelNewLayerPromise:', index);
				this._setFilteredLayers({ remove: newInvisibleLayer });
				this.cancelNewLayerPromise = undefined;
				resolve(this.currentIndex);
			};

			this._setFilteredLayers({ add: newInvisibleLayer });
			WXLOG('promise:', index, 'finished');
		});

		WXLOG('newLayerByTimeIndexPromise:', index, 'finished');

		return promise;
	}

	protected _setFilteredLayers({ remove, replace, add }: { remove?: CLayer; replace?: CLayer; add?: CLayer }): void {
		const layers: Layer<any, LayerProps<any>>[] = [];
		this._getDeckglLayers().forEach((l) => {
			if (l !== remove && l !== replace) layers.push(l);
			if (l === replace && add) layers.push(add);
		});

		if (!replace && add) layers.push(add);

		this.deckgl.setProps({ layers });
	}

	protected _checkIndex(index: number): number {
		return (index + this.props.wxprops.meta.times.length) % this.props.wxprops.meta.times.length;
	}

	protected _getDeckglLayers() {
		return this.deckgl.props.layers; //.filter((layer) => layer.parent === null);
		// changed because of this:
		//    https://github.com/visgl/deck.gl/issues/4016#issuecomment-565545861
		// return ((deckgl as any).layerManager.getLayers() as Layer<any>[]).filter((layer) => layer.parent === null);
	}
}

export function createDeckGlLayer(deckgl: Deck, props: WxTilesLayerProps): WxTilesLayerManager {
	return new WxTilesLayerManager({ deckgl, props });
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
