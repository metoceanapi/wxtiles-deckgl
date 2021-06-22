import { TextLayer } from '@deck.gl/layers';

export interface WxTileIsolineTextData {
	pos: [number, number];
	text: string;
	color: [number, number, number];
}
export class WxTileIsolineText extends TextLayer<any> {}
WxTileIsolineText.layerName = 'WxTileIsolineText';
WxTileIsolineText.defaultProps = {
	billboard: false,
	getSize: 10,
};
