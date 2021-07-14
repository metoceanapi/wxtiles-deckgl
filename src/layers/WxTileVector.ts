import { DataSet } from '@deck.gl/core/lib/layer';
import { RGBAColor } from '@deck.gl/core/utils/color';
import { TextLayer, TextLayerProps } from '@deck.gl/layers';

export interface WxTileVectorData {
	pos: [number, number];
	text: string;
	angle: number;
	color: RGBAColor;
}

export interface WxTileVectorProp extends TextLayerProps<WxTileVectorData> {
	data: DataSet<WxTileVectorData>;
}

export class WxTileVector extends TextLayer<WxTileVectorData, WxTileVectorProp> {
	constructor(props: WxTileVectorProp) {
		super(props);
	}
}
WxTileVector.layerName = 'WxTileVector';
WxTileVector.defaultProps = {
	pickable: false,
	billboard: false,
	parameters: {
		depthTest: false,
	},
	fontFamily: 'arrows',
	fontWeight: 'bold',
	getSize: 30,
	outlineWidth: 5, // to appear in ver 8.5 // TODO
	outlineColor: [255, 255, 255], // to appear in ver 8.5
	getTextAnchor: 'middle',
	getAlignmentBaseline: 'center',
	getText: (d: WxTileVectorData) => d.text,
	getPosition: (d: WxTileVectorData) => d.pos,
	getColor: (d: WxTileVectorData) => {
		return d.color;
	},
	_animations: {
		'*': { speed: 5 },
	},
	// getAngle: (d: WxTileVectorData) => d.angle,
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

// Animation
// https://github.com/visgl/deck.gl/blob/master/docs/developer-guide/animations-and-transitions.md
// https://github.com/visgl/deck.gl/blob/master/dev-docs/RFCs/v7.2/property-animation-rfc.md
