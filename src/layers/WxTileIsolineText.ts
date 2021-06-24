import { TextLayer } from '@deck.gl/layers';

export interface WxTileIsolineTextData {
	pos: [number, number];
	text: string;
	color: [number, number, number];
}

export interface WxTileIsolineTextProp extends TextLayer<WxTileIsolineTextData> {
	data: WxTileIsolineTextData;
}

export class WxTileIsolineText extends TextLayer<WxTileIsolineTextData> {}
WxTileIsolineText.layerName = 'WxTileIsolineText';
WxTileIsolineText.defaultProps = {
	billboard: false,
	getSize: 10,
};
