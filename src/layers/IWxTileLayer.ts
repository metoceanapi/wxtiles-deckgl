import { TileLayerProps } from '@deck.gl/geo-layers/tile-layer/tile-layer';
import { ColorStyleStrict, Meta } from '../utils/wxtools';
import { TileLayer } from '@deck.gl/geo-layers';

export type IWxTilesLayerData = string[];

export interface IWxTilesLayerProps extends TileLayerProps<IWxTilesLayerData> {
	wxprops: {
		meta: Meta;
		variable: string;
		style: ColorStyleStrict;
		URITime: string;
	};
	data: IWxTilesLayerData;
}

export type IWxTileLayer = TileLayer<IWxTilesLayerData, IWxTilesLayerProps>;
