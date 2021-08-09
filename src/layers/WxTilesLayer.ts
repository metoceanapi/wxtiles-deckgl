import { TileLayer } from '@deck.gl/geo-layers';
import { UpdateStateInfo } from '@deck.gl/core/lib/layer';
import GL from '@luma.gl/constants';
import { Texture2D } from '@luma.gl/core';

import { RenderSubLayers } from './IRenderSubLayers';
import { WxTileIsolineTextData, WxTileIsolineText } from './WxTileIsolineText';
import { WxTileFill } from './WxTileFill';
import { WxTileVector, WxTileVectorData } from './WxTileVector';

import { IWxTilesLayerData, IWxTilesLayerProps } from './IWxTileLayer';
import { HEXtoRGBA, UIntToColor, WxGetColorStyles } from '../utils/wxtools';
import { RawCLUT } from '../utils/RawCLUT';
import { PixelsToLonLat, coordToPixel } from '../utils/mercator';
import { getURIfromDatasetName as getURIFromDatasetName } from '../libs/libTools';

// type WxTilesLayerData = string;

// interface WxTilesLayerProps extends TileLayerProps<WxTilesLayerData> {
// 	wxprops: {
// 		meta: Meta;
// 		variables: string | string[];
// 		style: ColorStyleStrict;
// 	};
// 	data: WxTilesLayerData;
// }

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

interface WxTileData {
	image: ImageData;
	imageTextureUniform: Texture2D;
	isoData: WxTileIsolineTextData[];
	imageU?: ImageData;
	imageV?: ImageData;
	vectorData?: WxTileVectorData[];
}
export class WxTilesLayer extends TileLayer<IWxTilesLayerData, IWxTilesLayerProps> {
	constructor(props: IWxTilesLayerProps) {
		super(props);
	}

	updateState(st: UpdateStateInfo<IWxTilesLayerProps>) {
		super.updateState(st);
		if (st.changeFlags.propsChanged) {
			this._prepareStateAndCLUT();
		}
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

	renderSubLayers(args: RenderSubLayers<WxTileData>) {
		const { tile, id, data } = args;
		if (!data) return null;
		const { west, south, east, north } = tile.bbox;
		const { wxprops, desaturate, transparentColor, tintColor, opacity } = this.props;
		const { style } = wxprops;
		return [
			new WxTileFill({
				id: id + '-fill',
				data: {
					clutTextureUniform: this.state.clutTextureUniform,
					imageTextureUniform: data.imageTextureUniform,
					style,
				},
				bounds: [west, south, east, north],
				image: null,
				pickable: true,
				opacity,
				desaturate,
				transparentColor,
				tintColor,
			}),
			new WxTileIsolineText({
				id: id + '-isotextBack',
				data: data.isoData,
				fontWeight: 'bold',
				getSize: 13,
				getColor: [255, 255, 255],
				opacity,
			}),
			new WxTileIsolineText({
				id: id + '-isotext',
				data: data.isoData,
				opacity,
			}),
			data.vectorData &&
				new WxTileVector({
					id: id + '-vector',
					data: data.vectorData,
					fontFamily: style.vectorType,
					opacity,
					getColor: (d: WxTileVectorData) => {
						return d.color;
					},
				}),
			// new WxVectorAnimation(),
		];
	}

	async getTileData(tile: Tile): Promise<WxTileData | null> {
		const { data: URL, wxprops } = this.props;
		const { fetch } = this.getCurrentLayer().props;
		const { x, y, z, signal } = tile;

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
			const isoData = this._createIsolines(image, tile);
			const imageTextureUniform = new Texture2D(this.context.gl, { ...texParams, data: new Uint8Array(image.data.buffer) });
			const vectorData = this._createVectorData(image, imageU, imageV, tile);
			return { image, imageU, imageV, isoData, vectorData, imageTextureUniform };
		}

		const image: ImageData = await fetch(makeURL(wxprops.variables), { layer: this, signal });
		const imageTextureUniform = new Texture2D(this.context.gl, { ...texParams, data: new Uint8Array(image.data.buffer) });
		const isoData = this._createIsolines(image, tile);
		const vectorData = this._createDegree(image, tile); // if not 'directions', it gives 'undefined' - OK
		return { image, isoData, vectorData, imageTextureUniform };
	}

	_prepareStateAndCLUT() {
		const { style, variables, meta } = this.props.wxprops;
		let { min, max, units } = meta.variablesMeta[variables instanceof Array ? variables[0] : variables];
		if (variables instanceof Array) {
			const metaV = meta.variablesMeta[variables[1]];
			max = 1.42 * Math.max(-min, max, -metaV.min, metaV.max);
			min = 0;
		}

		const CLUT = new RawCLUT(style, units, [min, max], variables instanceof Array);
		const { colorsI, levelIndex } = CLUT;
		const dataShift = 5;
		const dataWidth = 65536 >> dataShift;
		const data = new Uint32Array(dataWidth * 2);
		for (let x = 0; x < dataWidth; ++x) {
			const si = x << dataShift;
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

	_createIsolines(image: ImageData, { x, y, z }): WxTileIsolineTextData[] {
		const { style } = this.props.wxprops;
		if (!style.isolineText || style.isolineColor === 'none' || !style.isolineText) return [];
		const { state } = this;
		const CLUT: RawCLUT = state.CLUT;
		const { levelIndex } = CLUT;
		const raw = new Uint16Array(image.data.buffer);
		const res: WxTileIsolineTextData[] = [];
		const [ulx, uly] = coordToPixel(x, y); // upper left pixel coord in the world picture
		const mul = (state.max - state.min) / 65535;

		// go through the tile pixels
		for (let py = 0, t = 0; py < 256; py += 5) {
			for (let px = 0; px < 256; px += 5) {
				const i = ((py + 1) * 258 + (px + 1)) * 2; // index of a raw pixel data
				const dc = raw[i]; // central pixel data
				const dr = raw[i + 2]; // right pixel data
				const db = raw[i + 258 * 2]; // bottom pixel data
				if (!dc || !dr || !db) continue; // do not check isoline for NaN pixels (0)
				const lic = levelIndex[dc]; // level index of the central pixel
				const lir = levelIndex[dr]; // level index of the right pixel
				const lib = levelIndex[db]; // level index of the bottom pixel
				if (lic !== lir || lic !== lib) {
					if (++t % 2) continue; // skip some pixels
					const mli = Math.max(lic, lir, lib); // max level index out of three possible
					const iso = CLUT.ticks[mli].data; // current level value of the isoline (in style units)
					const rdc = CLUT.DataToStyle(state.min + mul * dc); // central pixel value (in style units)
					const rdr = CLUT.DataToStyle(state.min + mul * dr); // right   pixel value (in style units)
					const rdb = CLUT.DataToStyle(state.min + mul * db); // bottom  pixel value (in style units)
					const tx = 0.5 + (lic !== lir ? (rdc - iso) / (rdc - rdr) : 0); // x subpixel shift to match isoline position
					const ty = 0.5 + (lic !== lib ? (rdc - iso) / (rdc - rdb) : 0); // y subpixel shift to match isoline position

					const position = PixelsToLonLat(ulx + px + tx, uly + py + ty, z); // [lon, lat] of the pixel
					const text = CLUT.ticks[mli].dataString; // textual data on isoline
					const color = UIntToColor(style.isolineColor === 'inverted' ? ~CLUT.colorsI[dc] : CLUT.colorsI[dc]);
					let angle = Math.atan2(dc - dr, dc - db) * 57.3; // 57.3 = 180 / Math.PI;
					if (-90 > angle || angle > 90) angle += 180;

					res.push({ position, text, angle, color });
				}
			} // for x
		} // for y
		return res;
	}

	_createDegree(image: ImageData, { x, y, z }): WxTileVectorData[] | undefined {
		const { meta, variables } = this.props.wxprops;
		if (variables instanceof Array) return;

		const { min, max, units } = meta.variablesMeta[variables];
		if (units !== 'degree') return;

		const { style } = this.props.wxprops;
		if (style.vectorColor === 'none') return;

		const CLUT = this.state.CLUT as RawCLUT;
		const l = new Uint16Array(image.data.buffer);
		const ldmul = (max - min) / 65535;
		const [ulx, uly] = coordToPixel(x, y); // upper left pixel coord in the world picture

		const res: WxTileVectorData[] = [];
		const gridStep = 16;
		// go through the tile pixels
		for (let py = gridStep / 2; py < 256; py += gridStep) {
			for (let px = gridStep / 2; px < 256; px += gridStep) {
				const i = (px + 1 + (py + 1) * 258) * 2; // index f a raw pixel data
				const d = l[i];
				if (!d) continue;
				const angle = 180 - (min + ldmul * l[i] + style.addDegrees); // unpack data and add degree correction from style
				const text = 'F';
				const position = PixelsToLonLat(ulx + px + 0.5, uly + py + 0.5, z); // [lon, lat] of the pixel
				const color = UIntToColor(
					style.vectorColor === 'inverted' ? ~CLUT.colorsI[d] : style.vectorColor === 'fill' ? CLUT.colorsI[d] : HEXtoRGBA(style.vectorColor)
				);

				res.push({ position, text, angle, color });
			}
		}
		return res;
	}

	_createVelocities(imageU: ImageData, imageV: ImageData): ImageData {
		const { meta, variables } = this.props.wxprops;
		const image = new ImageData(258, 258);
		if (!(variables instanceof Array)) return image;
		const [uMeta, vMeta] = variables.map((v) => meta.variablesMeta[v]);
		const { min, max }: { min: number; max: number } = this.state;
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

	_createVectorData(image: ImageData, imageU: ImageData, imageV: ImageData, { x, y, z }): WxTileVectorData[] {
		const { meta, variables } = this.props.wxprops;
		const CLUT: RawCLUT = this.state.CLUT;
		const { style } = this.props.wxprops;

		if (!(variables instanceof Array) || !CLUT.DataToKnots || style.vectorColor === 'none') return [];
		const { min, max }: { min: number; max: number } = this.state;
		const [uMeta, vMeta] = variables.map((v) => meta.variablesMeta[v]);
		const l = new Uint16Array(image.data.buffer);
		const u = new Uint16Array(imageU.data.buffer);
		const v = new Uint16Array(imageV.data.buffer);
		const ldmul = (max - min) / 65535;
		const vdmul = (vMeta.max - vMeta.min) / 65535;
		const udmul = (uMeta.max - uMeta.min) / 65535;
		const [ulx, uly] = coordToPixel(x, y); // upper left pixel coord in the world picture

		const res: WxTileVectorData[] = [];
		const gridStep = 32;
		// go through the tile pixels
		for (let py = gridStep / 2; py < 256; py += gridStep) {
			for (let px = gridStep / 2; px < 256; px += gridStep) {
				const i = (px + 1 + (py + 1) * 258) * 2; // index of a raw pixel data
				if (!l[i]) continue; // do not process NODATA
				const _u = uMeta.min + udmul * u[i]; // unpack U data
				const _v = vMeta.min + vdmul * v[i]; // unpack V data
				const angle = Math.atan2(-_u, _v) * 57.3 + style.addDegrees;
				const vecLen = min + ldmul * l[i];
				const sm = variables[0].includes('current') ? 5 : 0.2; // arrows are longer for currents than wind
				const vecCode = Math.min(CLUT.DataToKnots(vecLen) * sm, 25 /* to fit .ttf */) + 65; /* A */
				const text = String.fromCharCode(vecCode);
				const position = PixelsToLonLat(ulx + px, uly + py, z); // [lon, lat] of the pixel
				const color = UIntToColor(
					style.vectorColor === 'inverted' ? ~CLUT.colorsI[l[i]] : style.vectorColor === 'fill' ? CLUT.colorsI[l[i]] : HEXtoRGBA(style.vectorColor)
				);

				res.push({ position, text, angle, color });
			}
		}
		return res;
	}
}
WxTilesLayer.layerName = 'WxTilesLayer';
WxTilesLayer.defaultProps = {
	minZoom: 0,
	tileSize: 256,
	pickable: true,
	loadOptions: { image: { type: 'data', decode: true } },
	// animated: true,
	// _animate: true,

	// More context: because of the blending mode we're using for ground imagery,
	// alpha is not effective when blending the bitmap layers with the base map.
	// Instead we need to manually dim/blend rgb values with a background color.
	transparentColor: { type: 'color', value: [0, 0, 0, 0] },
	opacity: { type: 'number', min: 0, max: 1, value: 1 },
	desaturate: { type: 'number', min: 0, max: 1, value: 0 },
	tintColor: { type: 'color', value: [255, 255, 255] },
};

export type WxServerVarsTimeType = [string, string | [string, string], string];

export async function createWxTilesLayerProps(server: string, params: WxServerVarsTimeType, requestInit?: RequestInit) {
	const [dataSet, variables, styleName] = params;
	const { URITime, meta } = await getURIFromDatasetName(server, dataSet);
	const wxTilesProps: IWxTilesLayerProps = {
		id: `wxtiles/${dataSet}/${variables}/`,
		// WxTiles settings
		wxprops: {
			meta,
			variables, // 'temp2m' or ['eastward', 'northward'] for vector data
			style: WxGetColorStyles()[styleName],
			URITime,
		},
		// DATA
		data: URITime.replace('{time}', meta.times[0]),
		// DECK.gl settings
		maxZoom: meta.maxZoom,
		loadOptions: {
			fetch: requestInit,
			image: {
				decode: true,
				type: 'data',
			},
		},
	};

	return wxTilesProps;
}
