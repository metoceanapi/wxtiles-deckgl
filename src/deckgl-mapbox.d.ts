declare module '@deck.gl/mapbox' {
	import { CustomLayerInterface } from 'mapbox-gl';
	type Props = {
		id: string;
		type: new (props: any) => any;
	};

	// I wish I could do something like `declare class MapboxLayer extends CustomLayerInterface {` :sadface:
	// https://stackoverflow.com/a/23225358
	declare class MapboxLayer {
		constructor(props: Props): void;
		id: CustomLayerInterface['id'];
		onAdd: CustomLayerInterface['onAdd'];
		onRemove: CustomLayerInterface['onRemove'];
		prerender: CustomLayerInterface['prerender'];
		render: CustomLayerInterface['render'];
		renderingMode: CustomLayerInterface['renderingMode'];
		type: CustomLayerInterface['type'];
	}

	export { MapboxLayer };
}
