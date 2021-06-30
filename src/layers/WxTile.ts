import { CompositeLayer } from '@deck.gl/core';
import { Texture2D } from '@luma.gl/core';
import { CompositeLayerProps } from '@deck.gl/core/lib/composite-layer';

import { WxTileFill, WxTileFillData } from './WxTileFill';
import { WxTileIsolineText, WxTileIsolineTextData } from './WxTileIsolineText';
import { ColorStyleStrict, Meta } from '../utils/wxtools';

export interface WxTileDataPrep {
	image: ImageData;
	imageU?: ImageData;
	imageV?: ImageData;
	isoData: WxTileIsolineTextData[];
}
export interface WxTileData extends WxTileDataPrep {
	style: ColorStyleStrict;
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
	onClick(info: any, pickingEvent: any) {
		console.log('WxTile onClick:', { info, pickingEvent });
	}

	renderLayers() {
		const { props } = this;
		const data = props.data;

		return [
			new WxTileFill({
				id: props.id + '-fill',
				data: {
					clutTextureUniform: data.clutTextureUniform,
				},
				bounds: data.bounds,
				image: data.image,
				pickable: true,
			}),
			new WxTileIsolineText({
				id: props.id + '-isotext',
				data: data.isoData,
			}),
			// new WxVectorText(),
			// new WxVectorAnimation(),
		];
	}
}
WxTile.layerName = 'WxTile';
