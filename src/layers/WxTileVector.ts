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
	getColor: (d: WxTileVectorData) => d.color,
	getAngle: (d: WxTileVectorData) => d.angle,
};
