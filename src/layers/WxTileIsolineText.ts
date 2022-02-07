import { TextLayer, TextLayerProps } from '@deck.gl/layers';
import { DataSet } from '@deck.gl/core/lib/layer';
import { RGBAColor } from '@deck.gl/core/utils/color';

export interface WxTileIsolineTextData {
	position: [number, number];
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
	pickable: false,
	billboard: false,
	parameters: {
		depthTest: false,
	},
	fontFamily: 'Sans-serif',
	fontWeight: 'bold',
	getSize: 12,
	fontSettings: { sdf: true },
	outlineWidth: 0.5, // appeared in ver 8.5
	outlineColor: [200, 200, 200], // appeared in ver 8.5
	// getTextAnchor: 'middle', // default
	// getAlignmentBaseline: 'center', // default
	// getText: (d: WxTileIsolineTextData) => d.text, // default
	// getPosition: (d: WxTileIsolineTextData) => d.position, // default
	getColor: (d: WxTileIsolineTextData) => d.color,
	getAngle: (d: WxTileIsolineTextData) => d.angle,
	// getAngle: {
	// 	type: 'function',
	// 	value: (d) => {
	// 		return d.angle;
	// 	},
	// 	compare: false,
	// },
};
