// import { loadTexture, createCLUT, loadImage } from './textures';

// import vs from './shaders/bitmap-layer-vertex';
// import fs from './shaders/bitmap-layer-fragment';
import vs from './shaders/bitmap-layer-vertex.vs';
import fs from './shaders/bitmap-layer-fragment.fs';

import { TextLayer } from '@deck.gl/layers';
import { BitmapLayer } from '@deck.gl/layers';
import { PathLayer } from '@deck.gl/layers';

import { TileLayer } from '@deck.gl/geo-layers';
import { loadImage } from '@loaders.gl/images';

import { COORDINATE_SYSTEM } from '@deck.gl/core';
import { gouraudLighting, picking, project32 } from '@deck.gl/core';
import { Model, Texture2D, Geometry } from '@luma.gl/core';

import GL from '@luma.gl/constants';

import { createLegend, RawCLUT } from './RawCLUT';
import { ColorStyleStrict } from './wxtools';

class WxTile extends BitmapLayer {
	constructor(...a) {
		super(...a);
	}

	// initializeState(...a) {
	// 	super.initializeState(...a);
	// 	console.log('WxTile initializeState');
	// }

	updateState(a) {
		super.updateState(a);
		this.state.model.setUniforms({
			clutTextureUniform: this.props.clutTextureUniform,
		});
	}

	getShaders() {
		return { vs, fs, modules: [project32, picking] };
	}

	draw(a) {
		// // console.log('viewport.zoom:', this.context.viewport.zoom, 'props.zoom', this.props.zoom);
		const { viewport } = this.context;
		const [west, south, east, north] = this.props.bounds;
		const [wnX, wnY] = viewport.project([west, north]);
		const [esX, esY] = viewport.project([east, south]);
		const pixdif = ((esX - wnX) ** 2 + (esY - wnY) ** 2) ** 0.5;
		this.state.model.setUniforms({
			shift: /* isoline Size in Pix */ 1.5 / pixdif,
		});
		super.draw(a);
	}
}
WxTile.layerName = 'WxTile';

export class WxTilesLayer extends TileLayer {
	constructor(...a) {
		super(...a);
	}

	initializeState() {
		super.initializeState();
		this.loadCLUT();
	}
	// onHover: (info, event) => console.log('Hovered:', info, event),
	onClick(...a) {
		console.log('WxTilesLayer onClick:', a[0].bitmap.pixel);
	}

	renderSubLayers(props) {
		const { tile, meta } = props;
		const { west, south, east, north } = tile.bbox;
		const tileLayer = new WxTile(props, {
			id: props.id + 'BM-layer',
			data: null,
			image: props.data,
			clutTextureUniform: this.state.clutTextureUniform,
			maxZoom: meta.maxZoom,
			bounds: [west, south, east, north],
			// _imageCoordinateSystem: COORDINATE_SYSTEM.CARTESIAN, // only for GlobeView
		});

		const subLayers = [
			tileLayer,
			new TextLayer({
				id: props.id + 'tile',
				data: [{}],
				getPosition: (d) => [west + 2, north - 2], // if not ON TILE - visual issues occure
				getText: (d) => props.id,
				getColor: (d) => [0, 0, 255],
				minZoom: 0,
				maxZoom: 40,

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
					[
						[west, north],
						[west, south],
						[east, south],
						[east, north],
						[west, north],
					],
				],
				getPath: (d) => d,
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

WxTilesLayer.layerName = 'WxTilesLayer';
// WxTilesLayer.defaultProps = {
// 	minZoom: { type: 'number', value: 0 },
// };
