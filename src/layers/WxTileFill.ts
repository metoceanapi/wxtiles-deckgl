import { BitmapLayer, BitmapLayerProps } from '@deck.gl/layers';
import { picking, project32 } from '@deck.gl/core';
import { Texture2D } from '@luma.gl/core';
import vs from '../shaders/bitmap-layer-vertex.vs';
import fs from '../shaders/bitmap-layer-fragment.fs';

export interface WxTileFillProps extends BitmapLayerProps<undefined> {
	clutTextureUniform: Texture2D;
	image2?: any;
}

export class WxTileFill extends BitmapLayer<undefined> {
	//@ts-ignore this statement makes sure that this.props are always properly typed
	public props: WxTileFillProps;

	constructor(props: WxTileFillProps) {
		super(props);
	}

	updateState(a) {
		super.updateState(a);
		const data = this.props.data;
		const { clutTextureUniform } = this.props;
		this.state.model.setUniforms({ clutTextureUniform });
	}

	getShaders() {
		return { vs, fs, modules: [project32, picking] };
	}

	draw(opts) {
		// // console.log('viewport.zoom:', this.context.viewport.zoom, 'props.zoom', this.props.zoom);
		const { props, context, state } = this;
		const { viewport } = context;
		const [west, south, east, north] = props.bounds;
		const [wnX, wnY] = viewport.project([west, north]);
		const [esX, esY] = viewport.project([east, south]);
		const pixdif = ((esX - wnX) ** 2 + (esY - wnY) ** 2) ** 0.5;
		const { model } = state;
		const { image2 } = props;
		model.setUniforms({
			shift: 1.5 / pixdif /* 1.5 = isoline Width in Pixels */,
			bitmapTexture2: image2,
		});
		// .setUniforms({ uniforms })
		// .draw();
		super.draw(opts);
	}
}

WxTileFill.layerName = 'WxTileFill';
