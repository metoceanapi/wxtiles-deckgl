import { CompositeLayer, Position, RGBAColor } from '@deck.gl/core';
import { TextLayer, PathLayer } from '@deck.gl/layers';
import { TileLayer } from '@deck.gl/geo-layers';
import { TileLayerProps } from '@deck.gl/geo-layers/tile-layer/tile-layer';

import { RenderSubLayers } from './IRenderSubLayers';

export interface DebugTilesLayerData {
	color: RGBAColor;
}

export interface DebugTilesLayerProps extends TileLayerProps<DebugTilesLayerData> {
	data: DebugTilesLayerData;
}

export class DebugTilesLayer extends TileLayer<DebugTilesLayerData, DebugTilesLayerProps> {
	constructor(props: DebugTilesLayerProps) {
		super(props);
	}

	getTileData(tile: any) {
		// /* this is to test async fetching the data */
		// return new Promise((resolve) => {
		// 	setTimeout(() => {
		// 		resolve(true);
		// 	}, ~~(Math.random() * 1000 + 1000));
		// });
	}

	renderSubLayers(args: RenderSubLayers) {
		const {
			x,
			y,
			z,
			bbox: { west, south, east, north },
		} = args.tile;
		const { data } = this.props;
		const subLayers = [
			new TextLayer({
				id: args.id + '-c',
				visible: args.visible,
				data: [{}],
				getPosition: () => [west + (east - west) * 0.05, north + (south - north) * 0.05], // if not ON TILE - visual issues occure
				getText: () => x + '-' + y + '-' + z,
				getColor: data.color,
				billboard: false,
				getSize: 10,
				getTextAnchor: 'start',
			}),

			new PathLayer({
				id: args.id + '-b',
				visible: args.visible,
				data: [
					[
						[west, north], // two (left and bottom) lines are enough to compose a square mesh
						[west, south],
						[east, south],
						// [east, north],
						// [west, north],
					],
				],
				getPath: (d) => d as Position[],
				getColor: data.color,
				widthMinPixels: 1,
			}),
		];

		return subLayers;
	}
}
DebugTilesLayer.layerName = 'DebugTilesLayer';
DebugTilesLayer.defaultProps = {
	tileSize: 256,
	pickable: false,
	data: { color: [255, 0, 0, 255] },
	maxZoom: 24,
	minZoom: 0,
};
