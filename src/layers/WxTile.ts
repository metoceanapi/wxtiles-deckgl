import { CompositeLayer } from '@deck.gl/core';
import { Texture2D } from '@luma.gl/core';
import { CompositeLayerProps } from '@deck.gl/core/lib/composite-layer';

import { WxTileFill } from './WxTileFill';
import { WxTileIsolineText } from './WxTileIsolineText';

export interface WxTileData {
	image: any;
	image2?: any;
	clutTextureUniform: Texture2D;
	bounds: [number, number, number, number];
}
export interface WxTileProps extends CompositeLayerProps<WxTileData> {
	data: WxTileData;
}
export class WxTile extends CompositeLayer<WxTileData> {
	//@ts-ignore this statement makes sure that this.props are always properly typed
	public props: WxTileProps;

	constructor(props: WxTileProps) {
		super(props);
	}

	renderLayers() {
		const { props } = this;
		const data = this.props.data;
		return [
			new WxTileFill({
				id: props.id + '-fill',
				data: undefined,
				...data,
			}),
			new WxTileIsolineText({
				id: props.id + '-isotext',
				data: [
					{
						pos: [data.bounds[0], data.bounds[1]],
						text: '12341234',
						color: [255, 255, 0],
					},
				],
				getPosition: (d) => {
					return d.pos;
				},
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
