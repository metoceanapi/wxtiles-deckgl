import { MapboxLayer } from '@deck.gl/mapbox';
import { Map } from 'mapbox-gl';
import { IWxTilesLayer } from '../layers/IWxTileLayer';

export const mapAddLayer = <Layer extends IWxTilesLayer>(map: Map, LayerClass: new (props: Layer['props']) => Layer, props: Layer['props']) => {
	let currentIndex = 0;
	let prevLayerId: string | undefined = undefined;

	let cancelPrevRequest = () => {};
	const renderCurrentTimestep = async () => {
		const { cancel, layerId, promise } = renderLayerByTimeIndex(currentIndex);
		cancelPrevRequest();
		cancelPrevRequest = cancel;
		await promise;
		prevLayerId && map.removeLayer(prevLayerId);
		prevLayerId = layerId;
		cancelPrevRequest = () => {};
	};

	const renderLayerByTimeIndex = (index: number) => {
		const uri = props.wxprops.URITime.replace('{time}', props.wxprops.meta.times[index]);
		const layerId = props.id + index;
		let canceled = false;
		const promise = new Promise<void>((resolve, reject) => {
			const layer = new MapboxLayer({
				type: LayerClass,
				...props,
				id: layerId,
				data: uri,
				onViewportLoad: () => {
					canceled ? reject(new Error('Cancelled')) : resolve();
				},
				onTileError: (error) => {
					console.error(error);
					canceled ? reject(new Error('Cancelled')) : resolve();
				},
			});
			map.addLayer(layer, prevLayerId);
		});
		return {
			layerId,
			promise,
			cancel: () => {
				canceled = true;
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
		cancel: () => cancelPrevRequest(),
		remove: () => {
			cancelPrevRequest();
			cancelPrevRequest = () => {};
			prevLayerId && map.removeLayer(prevLayerId)
		}
	};
};
