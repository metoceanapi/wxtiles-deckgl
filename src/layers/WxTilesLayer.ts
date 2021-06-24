import { TileLayer } from '@deck.gl/geo-layers';
import GL from '@luma.gl/constants';
import { Texture2D } from '@luma.gl/core';
import { WxTile } from './WxTile';
import { RawCLUT } from '../utils/RawCLUT';
import { RenderSubLayers } from './IRenderSubLayers';
import { IWxTilesLayerData, IWxTilesLayerProps } from './IWxTileLayer';

export class WxTilesLayer extends TileLayer<IWxTilesLayerData, IWxTilesLayerProps> {
	//@ts-ignore this statement makes sure that this.props are always properly typed
	constructor(props: IWxTilesLayerProps) {
		super(props);
	}

	initializeState(params: any) {
		super.initializeState(params);
		this.loadCLUT();
	}

	// onHover: (info, event) => console.log('Hovered:', info, event),

	onClick(info: any, pickingEvent: any) {
		console.log('WxTilesLayer onClick:', { info, pickingEvent });
	}

	renderSubLayers(args: RenderSubLayers<[ImageBitmap, ImageBitmap]>) {
		const { tile } = args;
		const { west, south, east, north } = tile.bbox;
		const { data } = tile;

		return new WxTile({
			id: args.id + 'wxtile',
			// tile,
			data: {
				image: data[0],
				image2: data[1], // if 'undefined' - it's ok!
				clutTextureUniform: this.state.clutTextureUniform,
				bounds: [west, south, east, north],
			},
		});
	}
	async getTileData(tile) {
		const { data } = this.props;
		const { getTileData, fetch } = this.getCurrentLayer().props;
		const { signal } = tile;

		const { x, y, z } = tile;

		const tiles = await Promise.all(
			data.map(async (uri) => {
				const url = uri
					.replace('{x}', x)
					.replace('{y}', y)
					.replace('{z}', z)
					.replace('{-y}', Math.pow(2, z) - y - 1 + '');
				return await fetch(url, { layer: this, signal });
			})
		);
		return tiles.length > 0 ? tiles : null;
	}
	loadCLUT() {
		const { style, variable, meta } = this.props.wxprops;
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
WxTilesLayer.layerName = 'WxTilesLayer';
// WxTilesLayer.defaultProps = {
// 	minZoom: { type: 'number', value: 0 },
// };
