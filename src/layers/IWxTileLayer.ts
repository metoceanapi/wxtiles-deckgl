import { TileLayerProps } from '@deck.gl/geo-layers/tile-layer/tile-layer';
import { ColorStyleStrict, Meta } from '../utils/wxtools';
import { TileLayer } from '@deck.gl/geo-layers';

export type IWxTilesLayerData = string;

export interface IWxTilesLayerProps extends TileLayerProps<IWxTilesLayerData> {
	id: string;
	wxprops: {
		meta: Meta;
		variables: string | string[];
		style: ColorStyleStrict;
		URITime: string;
	};
	data: IWxTilesLayerData;
}

export type IWxTilesLayer = TileLayer<IWxTilesLayerData, IWxTilesLayerProps>;
