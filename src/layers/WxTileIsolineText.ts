import { DataSet } from '@deck.gl/core/lib/layer';
import { RGBAColor } from '@deck.gl/core/utils/color';
import { TextLayer, TextLayerProps } from '@deck.gl/layers';

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
	getSize: 12,
	outlineWidth: 5, // to appear in ver 8.5 // TODO
	outlineColor: [255, 255, 255], // to appear in ver 8.5
	// getTextAnchor: 'middle', // default
	// getAlignmentBaseline: 'center', // default
	// getText: (d: WxTileIsolineTextData) => d.text, // default
	// getPosition: (d: WxTileIsolineTextData) => d.position, // default
	getColor: (d: WxTileIsolineTextData) => {
		return d.color;
	},
	// getAngle: (d: WxTileIsolineTextData) => d.angle,
	getAngle: {
		type: 'function',
		value: (d) => {
			return d.angle;
		},
		compare: false,
	},
	animated: true,
	_animate: true,
};
