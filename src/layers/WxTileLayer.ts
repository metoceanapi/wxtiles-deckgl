import { TileLayer } from '@deck.gl/geo-layers';
import { TileLayerProps } from '@deck.gl/geo-layers/tile-layer/tile-layer';
import { ColorStyleStrict } from '../utils/wxtools';
import { TextLayer } from '@deck.gl/layers';
import { PathLayer } from '@deck.gl/layers';
import { RawCLUT } from '../utils/RawCLUT';
import { Model, Texture2D, Geometry } from '@luma.gl/core';
import GL from '@luma.gl/constants';
import { WxTile } from './WXBitmapLayer';

interface RenderSubLayers {
	id: string;
	tile: {
		bbox: {
			west: number;
			south: number;
			east: number;
			north: number;
		};
	};
	data: any;
	visible: boolean;
}

interface WxTilesLayerCustomProps {
	style: ColorStyleStrict;
	variable: string;
	meta: any; //meta.json
	maxZoom: number;
}

export type WxTilesLayerProps = TileLayerProps<string> & WxTilesLayerCustomProps;

export class WxTilesLayer extends TileLayer<string> {
	//@ts-ignore
	public props: WxTilesLayerProps;

	constructor(props: WxTilesLayerProps) {
		super(props);
	}

	initializeState(params: any) {
		super.initializeState(params);
		this.loadCLUT();
	}
	// onHover: (info, event) => console.log('Hovered:', info, event),
	onClick(...a) {
		console.log('WxTilesLayer onClick:', a[0].bitmap.pixel);
	}

	renderSubLayers(props: RenderSubLayers) {
		const { tile } = props;
		const { west, south, east, north } = tile.bbox;
		const tileLayer = new WxTile({
			id: props.id + 'BM-layer',
			clutTextureUniform: this.state.clutTextureUniform,
			bounds: [west, south, east, north],
			image: props.data,
			//maxZoom: (this.props.data as WxTilesLayerProps).meta.maxZoom,
			// _imageCoordinateSystem: COORDINATE_SYSTEM.CARTESIAN, // only for GlobeView
		});
		const textLayerId = props.id + 'tile';
		const subLayers = [
			tileLayer,
			new TextLayer<{ west: number; south: number; east: number; north: number; id: string }>({
				id: textLayerId,
				data: [{ west, south, east, north, id: textLayerId }],
				getPosition: (d) => [d.west + 2, d.north - 2], // if not ON TILE - visual issues occure
				getText: (d) => d.id,
				getColor: (d) => [0, 0, 255],
				billboard: false,
				getSize: 10,
				// getAngle: 0,
				getTextAnchor: 'start',
				// getAlignmentBaseline: 'center',
				// parameters: {
				// 	depthTest: false,
				// },
			}),
			new PathLayer({
				id: props.id + 'border',
				visible: props.visible,
				data: [
					{
						path: [
							[west, north],
							[west, south],
							[east, south],
							[east, north],
							[west, north],
						],
					},
				],
				getPath: (d: any) => d.path,
				getColor: [255, 0, 0, 120],
				widthMinPixels: 1,
			}),
		];

		return subLayers;
	}

	loadCLUT() {
		const { style, variable, meta } = this.props;
		const varMeta = meta.variablesMeta[variable];
		const CLUT = new RawCLUT(style, varMeta.units, [varMeta.min, varMeta.max], false);
		const { colorsI, levelIndex } = CLUT;
		const dataShift = 4;
		const dataWidth = 65536 >> dataShift;
		const data = new Uint32Array(dataWidth * 2);
		for (let x = 0; x < dataWidth; ++x) {
			data[x] = colorsI[x << dataShift];
			data[dataWidth + x] = levelIndex[x << dataShift];
		}
		const clutTextureUniform = new Texture2D(this.context.gl, {
			data: new Uint8Array(data.buffer),
			width: dataWidth,
			height: 2,
			format: GL.RGBA,

			parameters: {
				[GL.TEXTURE_WRAP_S]: GL.CLAMP_TO_EDGE,
				[GL.TEXTURE_WRAP_T]: GL.CLAMP_TO_EDGE,
				[GL.TEXTURE_MIN_FILTER]: GL.LINEAR,
				[GL.TEXTURE_MAG_FILTER]: GL.LINEAR,
			},
			mipmaps: false,
		});

		this.setState({ clutTextureUniform });
	}
}
