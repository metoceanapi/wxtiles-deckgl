import { BitmapLayer, BitmapLayerProps } from '@deck.gl/layers';
import { picking, project32, Viewport } from '@deck.gl/core';
import { UpdateStateInfo } from '@deck.gl/core/lib/layer';

import { Texture2D } from '@luma.gl/webgl';

import { ColorStyleStrict, HEXtoRGBA, UIntToColor } from '../utils/wxtools';

import vs from '../shaders/bitmap-layer-vertex.vs';
import fs from '../shaders/bitmap-layer-fragment.fs';

export interface WxTileFillData {
	clutTextureUniform: Texture2D;
	style: ColorStyleStrict;
}
export interface WxTileFillProps extends BitmapLayerProps<WxTileFillData> {
	data: WxTileFillData;
}

export class WxTileFill extends BitmapLayer<WxTileFillData, WxTileFillProps> {
	constructor(props: WxTileFillProps) {
		super(props);
	}

	updateState(st: UpdateStateInfo<WxTileFillProps>) {
		super.updateState(st);
		if (st.changeFlags.propsChanged) {
			const { image, data, desaturate, transparentColor, tintColor, bounds } = this.props;
			const { style, clutTextureUniform } = data;
			const fill = style.fill !== 'none';
			const isolineColor = UIntToColor(style.isolineColor[0] === '#' ? HEXtoRGBA(style.isolineColor) : 0);
			const isoline = { none: 0, inverted: 1, fill: 2 }[style.isolineColor] || 3;

			this.state.model.setUniforms({
				clutTextureUniform,
				imageTextureUniform: image,
				fill,
				isoline,
				isolineColor,
				desaturate,
				transparentColor,
				tintColor,
				bounds,
			});
		}
	}

	getShaders() {
		return { vs, fs, modules: [project32, picking] };
	}

	draw(opts: any) {
		const { uniforms, moduleParameters } = opts;
		const { model, coordinateConversion, disablePicking } = this.state;

		if ((moduleParameters.pickingActive && disablePicking) || !model) {
			return;
		}

		const { context, props } = this;
		const { bounds } = props;
		const viewport = context.viewport as Viewport & { center: number[] };
		const pix1 = viewport.project([bounds[0], bounds[1]]);
		const pix2 = viewport.project([bounds[2], bounds[3]]);
		const dx = (pix2[0] - pix1[0]) / 256;
		const dy = (pix1[1] - pix2[1]) / 256;
		const len = Math.sqrt(dx * dx + dy * dy);
		const shift = 2 / (255 * len);

		model.setUniforms({
			...uniforms,
			shift,
			coordinateConversion,
		});

		model.draw(opts);
	}
}

WxTileFill.layerName = 'WxTileFill';
WxTileFill.defaultProps = {
	desaturate: { type: 'number', min: 0, max: 1, value: 0 },
	// More context: because of the blending mode we're using for ground imagery,
	// alpha is not effective when blending the bitmap layers with the base map.
	// Instead we need to manually dim/blend rgb values with a background color.
	transparentColor: { type: 'color', value: [0, 0, 0, 0] },
	tintColor: { type: 'color', value: [1, 1, 1] },
	opacity: { type: 'number', min: 0, max: 1, value: 1 },
};
