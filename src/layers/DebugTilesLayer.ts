import { TileLayer } from '@deck.gl/geo-layers';
import { TileLayerProps } from '@deck.gl/geo-layers/tile-layer/tile-layer';
import { TextLayer } from '@deck.gl/layers';
import { PathLayer } from '@deck.gl/layers';
import { Position } from 'deck.gl';

export interface DebugTilesLayerProps extends TileLayerProps<any> {
	// debg: string;
}

export class DebugTilesLayer extends TileLayer<any> {
	constructor(...props: DebugTilesLayerProps[]) {
		super(...props);
	}

	renderSubLayers(props) {
		const {
			x,
			y,
			z,
			bbox: { west, south, east, north },
		} = props.tile;
		const subLayers = [
			new TextLayer({
				id: props.id + '-c',
				data: [{}],
				getPosition: () => [west + (east - west) * 0.05, north + (south - north) * 0.05], // if not ON TILE - visual issues occure
				getText: () => x + '-' + y + '-' + z,
				getColor: () => [0, 255, 255],
				billboard: false,
				getSize: 10,
				getTextAnchor: 'start',
			}),
			new PathLayer({
				id: props.id + '-b',
				visible: props.visible,
				data: [
					[
						[west, north],
						[west, south],
						[east, south],
						// [east, north],
						// [west, north],
					],
				],
				getPath: (d: unknown): Position[] => {
					return d as Position[];
				},
				getColor: [255, 0, 0, 120],
				widthMinPixels: 1,
			}),
		];

		return subLayers;
	}
}
DebugTilesLayer.layerName = 'DebugTilesLayer';
