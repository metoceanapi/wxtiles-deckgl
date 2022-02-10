import { TextLayer, TextLayerProps } from '@deck.gl/layers';
import { TileLayer } from '@deck.gl/geo-layers';

import { RenderSubLayersProps, Tile } from './IRenderSubLayers';
import { WxTileVectorData } from './WxTileVector';

export interface WxTileVectorProp extends TextLayerProps<WxTileVectorData> {
	data: WxTileVectorData[];
}

export class WxTileVector2 extends TileLayer<WxTileVectorData, WxTileVectorProp> {
	constructor(props: WxTileVectorProp) {
		super(props);
	}

	getTileData(tile: Tile) {
		const squareResolution = 11;
		console.log(this.props.data[0].z, tile.z);
		const zoomDiv = tile.z - this.props.data[0].z;
		let mod: number = 1;
		if (zoomDiv < 0) {
			mod = 8;
		} else if (zoomDiv < 2) {
			mod = 6;
		} else if (zoomDiv < 4) {
			mod = 4;
		} else if (zoomDiv < 6) {
			mod = 2;
		}
		console.log(this.props.data);
		return this.props.data.filter(({ x, y }: any, i) => {
			const columnOffset = x % mod;
			const rowOffset = y % mod;

			const rowIndex = Math.floor(i / squareResolution);
			const columnIndex = i % squareResolution;
			return (columnIndex + columnOffset) % mod === 0 && (rowIndex + rowOffset) % mod === 0;
		});
	}

	renderSubLayers(subProps: RenderSubLayersProps<WxTileVectorData[]>): any {
		const { tile, id, data } = subProps;
		const { x, y, z, bbox } = tile;
		const { west, south, east, north } = bbox;

		const subLayers = [
			new TextLayer<WxTileVectorData>({
				id,
				data,
				pickable: false,
				billboard: false,
				parameters: {
					depthTest: false,
				},
				fontFamily: 'arrows',
				fontWeight: 'bold',
				getSize: 30,
				fontSettings: { sdf: true },
				outlineWidth: 0.2, // appeared in ver 8.5
				outlineColor: [200, 200, 200], // appeared in ver 8.5
				// getTextAnchor: 'middle', // default
				// getAlignmentBaseline: 'center', // default
				// getText: (d: WxTileVectorData) => d.text, // default
				// getPosition: (d: WxTileVectorData) => d.position, // default
				getColor: (d: WxTileVectorData) => d.color,
				getAngle: (d: WxTileVectorData) => d.angle,
			}),
		];

		return subLayers;
	}
}

WxTileVector2.layerName = 'WxTileVector2';
WxTileVector2.defaultProps = {
	data: { color: [255, 0, 0, 255] },
	tileSize: 256,
	maxZoom: 24,
	minZoom: 0,
	pickable: false,
};
