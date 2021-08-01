import { MapboxLayer } from '@deck.gl/mapbox';
import { Map } from 'mapbox-gl';
import { WxTilesLayer } from '../layers/WxTilesLayer';
import { WxtilesGlLayer } from './WxtilesGlLayer';

export const createMapboxLayer = (
	map: Map,
	props: WxTilesLayer['props'],
	beforeLayerId: string = map.getStyle().layers![map.getStyle().layers!.length - 1].id
): WxtilesGlLayer => {
	const firstLayer = map.getStyle().layers![0].id;
	let currentIndex = -1;
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
				type: WxTilesLayer,
				...props,
				id: layerId,
				data: uri,
				onViewportLoad: resolve,
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
			prevLayerId && map.removeLayer(prevLayerId);
			prevLayerId = undefined;
		},
	};
};
