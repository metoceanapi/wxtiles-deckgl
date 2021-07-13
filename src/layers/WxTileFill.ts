import { BitmapLayer, BitmapLayerProps } from '@deck.gl/layers';
import { picking, project32 } from '@deck.gl/core';
import { Texture2D } from '@luma.gl/core';
import { ColorStyleStrict, HEXtoRGBA, UIntToColor } from '../utils/wxtools';
import vs from '../shaders/bitmap-layer-vertex.vs';
import fs from '../shaders/bitmap-layer-fragment.fs';
import { UpdateStateInfo } from '@deck.gl/core/lib/layer';

export interface WxTileFillData {
	clutTextureUniform: Texture2D;
	imageTextureUniform: Texture2D;
	style: ColorStyleStrict;
}
export interface WxTileFillProps extends BitmapLayerProps<WxTileFillData> {
	data: WxTileFillData;
}

export class WxTileFill extends BitmapLayer<WxTileFillData, WxTileFillProps> {
	constructor(props: WxTileFillProps) {
		super(props);
	}

	updateState(a: UpdateStateInfo<WxTileFillProps>) {
		super.updateState(a);
		const { style } = this.props.data;
		const fill = style.fill !== 'none';
		const isolineColorUI = HEXtoRGBA(style.isolineColor);
		let isoline = 3;
		switch (style.isolineColor) {
			case 'none':
				isoline = 0;
				break;
			case 'inverted':
				isoline = 1;
				break;
			case 'fill':
				isoline = 2;
				break;
		}
		this.state.model.setUniforms({
			clutTextureUniform: this.props.data.clutTextureUniform,
			bitmapTexture: this.props.data.imageTextureUniform,
			fill,
			isoline,
			isolineColor: UIntToColor(isolineColorUI),
		});
	}

	getShaders() {
		return { vs, fs, modules: [project32, picking] };
	}

	draw(opts: any) {
		const { props, context } = this;
		const { viewport } = context;
		const [west, south, east, north] = props.bounds;
		const [wnX, wnY] = viewport.project([west, north]);
		const [esX, esY] = viewport.project([east, south]);
		const pixdif = ((esX - wnX) ** 2 + (esY - wnY) ** 2) ** 0.5;
		this.state.model.setUniforms({
			// bitmapTexture: this.props.data.imageTextureUniform,
			shift: 1.5 / pixdif /* 1.5 = isoline Width in Pixels */,
			// shift: 1/255,
		});
		this.state.model.draw(opts);
		// super.draw(opts);
	}
}

WxTileFill.layerName = 'WxTileFill';
