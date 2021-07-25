import { MapboxLayer } from '@deck.gl/mapbox';
import { Map } from 'mapbox-gl';
import { IWxTilesLayer } from '../layers/IWxTileLayer';
import { WxtilesGlLayer } from './WxtilesGlLayer';

export const createMapboxLayer = <Layer extends IWxTilesLayer>(
	map: Map,
	LayerClass: new (props: Layer['props']) => Layer,
	props: Layer['props'],
	beforeLayerId: string = map.getStyle().layers![map.getStyle().layers!.length - 1].id
): WxtilesGlLayer => {
	const firstLayer = map.getStyle().layers![0].id;
	let currentIndex = 0;
	let prevLayerId: string | undefined = undefined;

	let cancelPrevRequest = () => {};
	const renderCurrentTimestep = async () => {
		const { cancel, layerId, promise } = renderLayerByTimeIndex(currentIndex);
		cancelPrevRequest();
		cancelPrevRequest = cancel;
		await promise;
		map.moveLayer(layerId, beforeLayerId);
		prevLayerId && map.removeLayer(prevLayerId);
		prevLayerId = layerId;
		cancelPrevRequest = () => {};
	};

	const renderLayerByTimeIndex = (index: number) => {
		const uri = props.wxprops.URITime.replace('{time}', props.wxprops.meta.times[index]);
		const layerId = props.id + index;
		const promise = new Promise<void>((resolve, reject) => {
			const layer = new MapboxLayer({
				type: LayerClass,
				...props,
				id: layerId,
				data: uri,
				onViewportLoad: () => {
					resolve();
				},
				onTileError: (error) => {
					console.error(error);
					reject(new Error('Cancelled'));
				},
			});
			map.addLayer(layer, firstLayer);
		});
		return {
			layerId,
			promise,
			cancel: () => {
				map.removeLayer(layerId);
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
			prevLayerId && map.removeLayer(prevLayerId);
			prevLayerId = undefined;
		},
	};
};
