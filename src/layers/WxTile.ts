import { CompositeLayer } from '@deck.gl/core';
import { Texture2D } from '@luma.gl/core';
import { CompositeLayerProps } from '@deck.gl/core/lib/composite-layer';

import { WxTileFill, WxTileFillData } from './WxTileFill';
import { WxTileIsolineText, WxTileIsolineTextData } from './WxTileIsolineText';

export interface WxTileData {
	image: ImageBitmap;
	image2?: ImageBitmap;
	clutTextureUniform: Texture2D;
	bounds: [number, number, number, number];
}
export interface WxTileProps extends CompositeLayerProps<WxTileData> {
	data: WxTileData;
}
export class WxTile extends CompositeLayer<WxTileData, WxTileProps> {
	constructor(props: WxTileProps) {
		super(props);
	}

	renderLayers() {
		const { props } = this;
		const data = props.data;
		const isoData: WxTileIsolineTextData[] = [
			{
				pos: [data.bounds[0], data.bounds[1]],
				text: '12341234',
				color: [255, 255, 0],
			},
		];
		return [
			new WxTileFill({
				id: props.id + '-fill',
				data: {
					clutTextureUniform: data.clutTextureUniform,
				},
				bounds: data.bounds,
				image: data.image,
			}),
			new WxTileIsolineText({
				id: props.id + '-isotext',
				data: isoData,
				getPosition: (d) => d.pos,
				getText: (d) => d.text,
				getColor: (d) => d.color,
				// billboard: false,
				// getSize: 10,
				// getTextAnchor: 'start',
			}),
		];
	}
}
WxTile.layerName = 'WxTile';
