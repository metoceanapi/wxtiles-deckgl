import { TileLayer } from '@deck.gl/geo-layers';
import { TileLayerProps } from '@deck.gl/geo-layers/tile-layer/tile-layer';
import { TextLayer } from '@deck.gl/layers';
import { PathLayer } from '@deck.gl/layers';
import { Position } from 'deck.gl';
import { RenderSubLayers } from './IRenderSubLayers';

export interface DebugTilesLayerProps extends TileLayerProps<any> {
	// debg: string;
}

export class DebugTilesLayer extends TileLayer<any> {
	//@ts-ignore this statement makes sure that this.props are always properly typed
	public props: DebugTilesLayerProps;

	constructor(props: DebugTilesLayerProps) {
		super(props);
	}

	renderSubLayers(args: RenderSubLayers) {
		const {
			x,
			y,
			z,
			bbox: { west, south, east, north },
		} = args.tile;
		const subLayers = [
			new TextLayer({
				id: args.id + '-c',
				data: [{}],
				getPosition: () => [west + (east - west) * 0.05, north + (south - north) * 0.05], // if not ON TILE - visual issues occure
				getText: () => x + '-' + y + '-' + z,
				getColor: () => [0, 255, 255],
				billboard: false,
				getSize: 10,
				getTextAnchor: 'start',
			}),
			new PathLayer({
				id: args.id + '-b',
				visible: args.visible,
				data: [
					[
						[west, north],
						[west, south],
						[east, south],
						// [east, north],
						// [west, north],
					],
				],
				getPath: (d: unknown): Position[] => {
					return d as Position[];
				},
				getColor: [255, 0, 0, 120],
				widthMinPixels: 1,
			}),
		];

		return subLayers;
	}
}
DebugTilesLayer.layerName = 'DebugTilesLayer';
