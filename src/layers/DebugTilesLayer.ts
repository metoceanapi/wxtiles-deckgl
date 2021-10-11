import { Position, RGBAColor } from '@deck.gl/core';
import { TextLayer, PathLayer } from '@deck.gl/layers';
import { TileLayer } from '@deck.gl/geo-layers';
import { TileLayerProps } from '@deck.gl/geo-layers/tile-layer/tile-layer';

import { RenderSubLayersProps } from './IRenderSubLayers';

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

	// getTileData(tile: any) {
	// 	/* this is to test async fetching the data */
	// 	return new Promise((resolve) => {
	// 		setTimeout(() => {
	// 			resolve(true);
	// 		}, ~~(Math.random() * 1000 + 1000));
	// 	});
	// }

	renderSubLayers(subProps: RenderSubLayersProps) {
		const { tile, id } = subProps;
		const { x, y, z, bbox } = tile;
		const { west, south, east, north } = bbox;
		const { color } = this.props.data;
		const subLayers = [
			new TextLayer({
				id: id + '-c',
				data: [{}],
				getPosition: () => [west + (east - west) * 0.05, north + (south - north) * 0.05], // if not ON TILE - visual issues occure
				getText: () => x + '-' + y + '-' + z,
				getColor: color,
				billboard: false,
				getSize: 10,
				getTextAnchor: 'start',
			}),

			new PathLayer({
				id: id + '-b',
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
				getColor: color,
				widthMinPixels: 1,
			}),
		];

		return subLayers;
	}
}

DebugTilesLayer.layerName = 'DebugTilesLayer';
DebugTilesLayer.defaultProps = {
	data: { color: [255, 0, 0, 255] },
	tileSize: 256,
	maxZoom: 24,
	minZoom: 0,
	pickable: false,
};
