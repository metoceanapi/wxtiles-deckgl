import { LayerProps } from '@deck.gl/core/lib/layer';

import { fetchJson, LibSetupObject, Meta, WxGetColorStyles, WxTileLibSetup } from '../utils/wxtools';
import { WxTilesLayerProps } from '../layers/WxTilesLayer';

export { setWxTilesLogging } from '../utils/wxtools';

async function getURIandMetafromDatasetName(dataServer: string, dataSet: string, requestInit?: RequestInit) {
	// URI could be hardcoded, but tiles-DB is alive!
	if (dataSet[dataSet.length - 1] != '/') dataSet += '/';
	const instance = (await fetchJson(dataServer + dataSet + 'instances.json', requestInit)).reverse()[0] + '/';
	const meta: Meta = await fetchJson(dataServer + dataSet + instance + 'meta.json', requestInit);
	const URITime = dataServer + dataSet + instance + '{variable}/{time}/{z}/{x}/{y}.png';
	return { URITime, meta };
}

export function setupWxTilesLib(setupObject: LibSetupObject = {}): Promise<any> | undefined {
	// ESSENTIAL step to get lib ready.
	WxTileLibSetup(setupObject); // load fonts and styles, units, colorschemas - empty => defaults
	return (document as any).fonts?.ready; // !!! IMPORTANT: make sure fonts (barbs, arrows, etc) are loaded
}

export type WxServerVarsStyleType = [string, string | [string, string], string];

export interface CreateProps {
	server: string;
	params: WxServerVarsStyleType;
	extraParams?: LayerProps<any>;
	requestInit?: RequestInit;
}

export async function createWxTilesLayerProps({ server, params, extraParams, requestInit }: CreateProps): Promise<WxTilesLayerProps> {
	const [dataSet, variables, styleName] = params;
	const { URITime, meta } = await getURIandMetafromDatasetName(server, dataSet, requestInit);
	const wxTilesProps: WxTilesLayerProps = {
		...extraParams,
		id: `wxtiles/${dataSet}/${variables}/`,
		// WxTiles settings
		wxprops: {
			meta,
			variables, // 'temp2m' or ['eastward', 'northward'] for vector data
			style: WxGetColorStyles()[styleName],
			URITime,
		},
		// DATA
		data: URITime.replace('{time}', meta.times[0]),
		// DECK.gl settings
		maxZoom: meta.maxZoom,
		loadOptions: {
			fetch: requestInit, // https://deck.gl/docs/developer-guide/loading-data#example-fetch-data-with-credentials
			image: {
				decode: true,
				type: 'data',
			},
		},
	};

	return wxTilesProps;
}
