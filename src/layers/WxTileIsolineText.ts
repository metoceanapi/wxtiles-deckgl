import { DataSet } from '@deck.gl/core/lib/layer';
import { RGBAColor } from '@deck.gl/core/utils/color';
import { TextLayer, TextLayerProps } from '@deck.gl/layers';

export interface WxTileIsolineTextData {
	pos: [number, number];
	text: string;
	angle: number;
	color: RGBAColor;
}

export interface WxTileIsolineTextProp extends TextLayerProps<WxTileIsolineTextData> {
	data: DataSet<WxTileIsolineTextData>;
}

export class WxTileIsolineText extends TextLayer<WxTileIsolineTextData, WxTileIsolineTextProp> {
	constructor(props: WxTileIsolineTextProp) {
		super(props);
	}
}
WxTileIsolineText.layerName = 'WxTileIsolineText';
WxTileIsolineText.defaultProps = {
	billboard: false,
	getSize: 5,
	getTextAnchor: 'middle',
	getAlignmentBaseline: 'center',
	fontFamily: 'Monaco, monospace', // TODO
	getText: (d: WxTileIsolineTextData) => d.text,
	getPosition: (d: WxTileIsolineTextData) => d.pos,
	getColor: (d: WxTileIsolineTextData) => d.color,
	getAngle: (d: WxTileIsolineTextData) => d.angle,
	// backgroundColor: (d: WxTileIsolineTextData) => {return d.bcolor},
};
