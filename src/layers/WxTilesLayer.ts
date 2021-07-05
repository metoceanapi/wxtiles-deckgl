import { TileLayer } from '@deck.gl/geo-layers';
import { TileLayerProps } from '@deck.gl/geo-layers/tile-layer/tile-layer';
import GL from '@luma.gl/constants';
import { Texture2D } from '@luma.gl/core';

import { WxTile, WxTileDataPrep } from './WxTile';
import { ColorStyleStrict, Meta, UItoColor } from '../utils/wxtools';
import { RawCLUT } from '../utils/RawCLUT';
import { RenderSubLayers } from './IRenderSubLayers';
import { WxTileIsolineTextData } from './WxTileIsolineText';
import { RGBAColor } from '@deck.gl/core/utils/color';
import { LatLonToPixels, PixelsToLatLon, coordToPixel } from '../utils/mercator';

export type WxTilesLayerData = string;

export interface WxTilesLayerProps extends TileLayerProps<WxTilesLayerData> {
	wxprops: {
		meta: Meta;
		variables: string | string[];
		style: ColorStyleStrict;
	};
	data: WxTilesLayerData;
}

interface Tile {
	x: number;
	y: number;
	z: number;
	signal: AbortSignal;
	bbox: {
		west: number;
		north: number;
		east: number;
		south: number;
	};
}

export class WxTilesLayer extends TileLayer<WxTilesLayerData, WxTilesLayerProps> {
	constructor(props: WxTilesLayerProps) {
		super(props);
	}

	initializeState(params: any) {
		super.initializeState(params);
		const { wxprops, id } = this.props;

		this._loadCLUT();
	}

	onHover(info: any, pickingEvent: any) {
		if (!info.picked) {
			return; //console.log('!');
		}
		this.onClick(info, pickingEvent);
	}

	onClick(info: any, pickingEvent: any) {
		// console.log('WxTilesLayer onClick:', info, pickingEvent);
		const { /* sourceLayer, bitmap,  */ coordinate, color } = info;
		// const [x, y] = bitmap.pixel;
		// const { props } = sourceLayer;
		// const { image } = props.data;
		// const { data } = image;
		const CLUT: RawCLUT = this.state.CLUT;

		// const minmaxbuf = new Uint8Array(8);
		// for (let i = 0; i < 8; ++i) {
		// 	minmaxbuf[i] = data[i * 4 + 2];
		// }

		// const view = new DataView(minmaxbuf.buffer);
		// const min = view.getFloat32(0, true);
		// const max = view.getFloat32(4, true);
		const { min, max } = this.state;
		const mul = (max - min) / 65535;

		// const index = ((y + 1) * 258 + (x + 1)) * 2;
		// const rawData = new Uint16Array(data.buffer);
		// const raw = rawData[index];
		// const raw1 = data[index * 2 + 3];

		const raw = color[0] + color[1] * 256;

		const varData = mul * raw + min;
		const clutData = CLUT.DataToStyle(varData);
		const text = 'lonLat:' + coordinate + '<br>clut:' + clutData + ' var: ' + varData + ' color:' + color;
		const infoPanel = document.getElementById('infoPanel');
		if (!infoPanel) {
			console.log(text);
			return;
		}
		infoPanel.innerHTML = text;
	}

	renderSubLayers(args: RenderSubLayers<WxTileDataPrep>) {
		const { style } = this.props.wxprops;
		const { tile, id } = args;
		const { west, south, east, north } = tile.bbox;
		const { data } = tile;
		if (!data) return null;

		return new WxTile({
			id: id + 'wxtile',
			data: {
				...data,
				style,
				clutTextureUniform: this.state.clutTextureUniform,
				bounds: [west, south, east, north],
			},
		});
	}

	async getTileData(tile: Tile): Promise<WxTileDataPrep | null> {
		const { data: URL, wxprops } = this.props;
		const { fetch } = this.getCurrentLayer().props;
		const { x, y, z, bbox, signal } = tile;

		const makeURL = (v: string) =>
			URL.replace('{variable}', v)
				.replace('{x}', x + '')
				.replace('{y}', y + '')
				.replace('{z}', z + '')
				.replace('{-y}', Math.pow(2, z) - y - 1 + '');

		const texParams = {
			width: 258,
			height: 258,
			format: GL.RGBA,
			type: GL.UNSIGNED_BYTE,
			dataFormat: GL.RGBA,
			parameters: {
				[GL.TEXTURE_WRAP_S]: GL.CLAMP_TO_EDGE,
				[GL.TEXTURE_WRAP_T]: GL.CLAMP_TO_EDGE,
				[GL.TEXTURE_MIN_FILTER]: GL.LINEAR,
				[GL.TEXTURE_MAG_FILTER]: GL.LINEAR,
			},
			mipmaps: false,
		};

		if (wxprops.variables instanceof Array) {
			const [imageU, imageV] = await Promise.all(wxprops.variables.map((v): Promise<ImageData> => fetch(makeURL(v), { layer: this, signal })));
			const image = this._createVelocities(imageU, imageV);
			const isoData = this._createIsolines(image, { x, y, z }, bbox);
			const imageTextureUniform = new Texture2D(this.context.gl, { ...texParams, data: new Uint8Array(image.data.buffer) });

			return { image, imageU, imageV, isoData, imageTextureUniform };
		}

		const mu = makeURL(wxprops.variables);
		const image: ImageData = await fetch(mu, { layer: this, signal });
		const imageTextureUniform = new Texture2D(this.context.gl, { ...texParams, data: new Uint8Array(image.data.buffer) });

		const isoData = this._createIsolines(image, { x, y, z }, bbox);
		return { image, isoData, imageTextureUniform };
	}

	_loadCLUT() {
		const { style, variables, meta } = this.props.wxprops;
		let { min, max, units } = meta.variablesMeta[variables instanceof Array ? variables[0] : variables];
		if (variables instanceof Array) {
			const metaV = meta.variablesMeta[variables[1]];
			max = 1.42 * Math.max(-min, max, -metaV.min, metaV.max);
			min = 0;
		}

		const CLUT = new RawCLUT(style, units, [min, max], false);
		const { colorsI, levelIndex } = CLUT;
		const dataShift = 1;
		const dataWidth = 65536 >> dataShift;
		const data = new Uint32Array(dataWidth * 2);
		let si = 0;
		for (let x = 0; x < dataWidth; ++x) {
			si = x << dataShift;
			data[x] = colorsI[si];
			data[dataWidth + x] = levelIndex[si];
		}
		const clutTextureUniform = new Texture2D(this.context.gl, {
			data: new Uint8Array(data.buffer),
			width: dataWidth,
			height: 2,
			format: GL.RGBA,
			parameters: {
				[GL.TEXTURE_WRAP_S]: GL.CLAMP_TO_EDGE,
				[GL.TEXTURE_WRAP_T]: GL.CLAMP_TO_EDGE,
				[GL.TEXTURE_MIN_FILTER]: GL.NEAREST,
				[GL.TEXTURE_MAG_FILTER]: GL.NEAREST,
			},
			mipmaps: false,
		});

		this.setState({ clutTextureUniform, min, max, CLUT });
	}

	_createIsolines(image: ImageData, { x, y, z }, bbox: { west: number; north: number; east: number; south: number }): WxTileIsolineTextData[] {
		const { style } = this.props.wxprops;
		if (!style.isolineText || style.isolineColor === 'none') return [];
		const { state } = this;
		const CLUT: RawCLUT = state.CLUT;
		const { levelIndex, colorsI } = CLUT;
		const raw = new Uint16Array(image.data.buffer);
		const res: WxTileIsolineTextData[] = [];
		const ULpixel = coordToPixel(x, y, z);

		for (let y = 0, t = 0; y < 256; y += 2) {
			for (let x = 0; x < 256; x += 2) {
				const i = ((y + 1) * 258 + (x + 1)) * 2;
				const d = raw[i]; // central data
				const dr = raw[i + 2]; // right
				const db = raw[i + 258 * 2]; // bottom
				if (!d || !dr || !db) continue; // do not check isoline for NaN pixels (0)
				const lic = levelIndex[d]; // check level index aroud the current pixel
				const lir = levelIndex[dr]; // check level index aroud the current pixel
				const lib = levelIndex[db]; // check level index aroud the current pixel
				if (lic !== lir || lic !== lib) {
					if (/* !(++t % 2 ) &&*/ x > 20 && x < 235 && y > 20 && y < 235) {
						// if (!(++t % 1) && x > 20 && x < 235 && y > 20 && y < 235) {
						const mli = Math.max(lic, lir, lib); // max level index out of three possible
						const uPr = PixelsToLatLon(ULpixel[0] + x + 0.5, ULpixel[1] + y + 0.5, z);
						const pos: [number, number] = [uPr[1], -uPr[0]]; //[bbox.west + dLon * x, bbox.north - dLat * y];
						const text = CLUT.ticks[mli].dataString;
						let angle: number = Math.atan2(d - dr, d - db);
						angle = angle < -1.57 || angle > 1.57 ? angle + 3.14159 : angle;
						angle = (angle * 180) / Math.PI; // rotate angle: we can use RAW d, dd, and dr for atan2!
						let ccolor = style.isolineColor === 'inverted' ? ~CLUT.colorsI[d] : CLUT.colorsI[d];
						const color: RGBAColor = UItoColor(ccolor);
						res.push({ pos, text, angle, color });
					}
				}
			} // for x
		} // for y
		return res;
	}

	_createVelocities(imageU: ImageData, imageV: ImageData): ImageData {
		const { meta, variables } = this.props.wxprops;
		const image = new ImageData(258, 258);
		if (!(variables instanceof Array)) return image;
		const { min, max }: { min: number; max: number } = this.state;
		const [uMeta, vMeta] = variables.map((v) => meta.variablesMeta[v]);
		const ldmul = (max - min) / 65535;
		const vdmul = (vMeta.max - vMeta.min) / 65535;
		const udmul = (uMeta.max - uMeta.min) / 65535;
		const l = new Uint16Array(image.data.buffer);
		const u = new Uint16Array(imageU.data.buffer);
		const v = new Uint16Array(imageV.data.buffer);
		for (let i = 0; i < 258 * 258 * 2; i += 2) {
			l[i + 1] = 65280; // it sets alfa to 255, othervise picture is interpreted as empty
			if (!u[i] || !v[i]) {
				l[i] = 0;
				continue;
			} // NODATA
			const _u = uMeta.min + udmul * u[i]; // unpack U data
			const _v = vMeta.min + vdmul * v[i]; // unpack V data
			l[i] = Math.sqrt(_v * _v + _u * _u) / ldmul; // pack data back to use the original rendering approach
		}
		return image;
	}
}
WxTilesLayer.layerName = 'WxTilesLayer';
WxTilesLayer.defaultProps = {
	// minZoom: { type: 'number', value: 0 },
	loadOptions: { image: { type: 'data', decode: true } },
	onTileLoad: (tile) => {
		console.log(tile);
	},
};

// interface PicData {
// 	raw: Uint16Array;
// 	dmin: number;
// 	dmax: number;
// }

// function createVelocities(u: PicData v:PicData) {
// 	l.dmax = 1.42 * Math.max(-u.dmin, u.dmax, -v.dmin, v.dmax);
// 	l.dmul = (l.dmax - l.dmin) / 65535;
// 	for (let i = 0; i < 258 * 258; ++i) {
// 		if (!u.raw[i] || !v.raw[i]) {
// 			l.raw[i] = 0;
// 			continue;
// 		} // NODATA
// 		const _u = u.dmin + u.dmul * u.raw[i]; // unpack U data
// 		const _v = v.dmin + v.dmul * v.raw[i]; // unpack V data
// 		l.raw[i] = Math.sqrt(_v * _v + _u * _u) / l.dmul; // pack data back to use the original rendering approach
// 	}
// } // _vectorPrepare
