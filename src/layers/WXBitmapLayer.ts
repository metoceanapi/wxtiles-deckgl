import { BitmapLayer } from '@deck.gl/layers';
import { BitmapLayerProps } from '@deck.gl/layers/bitmap-layer/bitmap-layer';
import vs from '../shaders/bitmap-layer-vertex.vs';
import fs from '../shaders/bitmap-layer-fragment.fs';
import { gouraudLighting, picking, project32 } from '@deck.gl/core';
import { Model, Texture2D, Geometry } from '@luma.gl/core';
export interface BitmapLayerCustomProps {
	clutTextureUniform: Texture2D;
	bounds: [number, number, number, number];
}

export type WxTileProps = BitmapLayerProps<any> & BitmapLayerCustomProps;
export class WxTile extends BitmapLayer<any> {
	//@ts-ignore
	public props: WxTileProps;

	constructor(props: WxTileProps) {
		super(props);
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
