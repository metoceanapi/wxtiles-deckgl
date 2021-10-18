import { BitmapLayer, BitmapLayerProps } from '@deck.gl/layers';
import { picking, project32, Viewport } from '@deck.gl/core';
import { UpdateStateInfo } from '@deck.gl/core/lib/layer';

import { Texture2D } from '@luma.gl/webgl';

import { ColorStyleStrict, HEXtoRGBA, UIntToColor } from '../utils/wxtools';

import vs from '../shaders/bitmap-layer-vertex.vs';
import fs from '../shaders/bitmap-layer-fragment.fs';

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
		const isolineColor = UIntToColor(style.isolineColor[0] === '#' ? HEXtoRGBA(style.isolineColor) : 0);
		const isoline =
			{
				none: 0,
				inverted: 1,
				fill: 2,
			}[style.isolineColor] || 3;

		const { desaturate, transparentColor, tintColor, bounds } = this.props;
		this.state.model.setUniforms({
			clutTextureUniform: this.props.data.clutTextureUniform,
			bitmapTexture: this.props.data.imageTextureUniform,
			fill,
			isoline,
			isolineColor,
			desaturate,
			transparentColor: transparentColor!.map((x) => x! / 255),
			tintColor: tintColor!.slice(0, 3).map((x) => x / 255),
			bounds,
		});
	}

	getShaders() {
		return { vs, fs, modules: [project32, picking] };
	}

	draw(opts: any) {
		const { uniforms, moduleParameters } = opts;
		const { model, coordinateConversion, disablePicking } = this.state;
		// const { context } = this;

		if ((moduleParameters.pickingActive && disablePicking) || !model) {
			return;
		}

		// const viewport = context.viewport as Viewport & { center: number[] };
		// const camPos = viewport.getCameraPosition();
		// const camCent = viewport.center;
		// const sub = Math.sqrt((camPos[0] - camCent[0]) ** 2 + (camPos[1] - camCent[1]) ** 2 + (camPos[2] - camCent[2]) ** 2);
		model.setUniforms({
			...uniforms,
			shift: 1 / 255,
			// shift: sub / 50000,
			coordinateConversion,
		});
		this.state.model.draw(opts);
	}
}

WxTileFill.layerName = 'WxTileFill';
WxTileFill.defaultProps = {
	desaturate: { type: 'number', min: 0, max: 1, value: 0 },
	// More context: because of the blending mode we're using for ground imagery,
	// alpha is not effective when blending the bitmap layers with the base map.
	// Instead we need to manually dim/blend rgb values with a background color.
	transparentColor: { type: 'color', value: [0, 0, 0, 0] },
	tintColor: { type: 'color', value: [255, 255, 255] },
	opacity: { type: 'number', min: 0, max: 1, value: 1 },
};
