import { WxTilesLayerProps } from "../layers/WxTilesLayer";

export interface WxTilesLib {
	updateLayerSource(args: { layerId: string, URI: string }): void;
	createLayer(wxTilesLayerProps: WxTilesLayerProps): void;
}

export type createWxTilesLib = ({ debug }: { debug: boolean }) => WxTilesLib;
