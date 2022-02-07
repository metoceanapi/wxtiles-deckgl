import { DataSet } from '@deck.gl/core/lib/layer';
import { RGBAColor } from '@deck.gl/core/utils/color';
import { TextLayer, TextLayerProps } from '@deck.gl/layers';

export interface WxTileVectorData {
	position: [number, number];
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
	fontSettings: { sdf: true },
	outlineWidth: 0.2, // appeared in ver 8.5
	outlineColor: [200, 200, 200], // appeared in ver 8.5
	// getTextAnchor: 'middle', // default
	// getAlignmentBaseline: 'center', // default
	// getText: (d: WxTileVectorData) => d.text, // default
	// getPosition: (d: WxTileVectorData) => d.position, // default
	getColor: (d: WxTileVectorData) => d.color,
	getAngle: (d: WxTileVectorData) => d.angle,
	// getAngle: {
	// 	type: 'function',
	// 	value: (d) => {
	// 		return d.angle;
	// 	},
	// 	compare: false,
	// },
};

// Animation
// https://github.com/visgl/deck.gl/blob/master/docs/developer-guide/animations-and-transitions.md
// https://github.com/visgl/deck.gl/blob/master/dev-docs/RFCs/v7.2/property-animation-rfc.md
