import { fetchJson, LibSetupObject, Meta, WxTileLibSetup } from '../utils/wxtools';
import styles from '../styles/styles.json';
import uconv from '../styles/uconv.json';
import colorschemes from '../styles/colorschemes.json';

export function getTimeClosestTo(times: string[], time: string) {
	const dtime = new Date(time).getTime();
	return times.find((t) => new Date(t).getTime() >= dtime) || times[times.length - 1];
}

export async function getURIfromDatasetName(dataServer: string, dataSet: string) {
	// URI could be hardcoded, but tiles-DB is alive!
	if (dataSet[dataSet.length - 1] != '/') dataSet += '/';
	const instance = (await fetchJson(dataServer + dataSet + 'instances.json')).reverse()[0] + '/';
	const meta: Meta = await fetchJson(dataServer + dataSet + instance + 'meta.json');
	const URITime = dataServer + dataSet + instance + '{variable}/{time}/{z}/{x}/{y}.png';
	return { URITime, meta };
}


export async function setupWxTilesLib(setupObject: LibSetupObject = {}) {
	const wxlibCustomSettings: LibSetupObject = {
		colorStyles: styles as any,
		units: uconv as any,
		colorSchemes: colorschemes,
		...setupObject,
	};
	// ESSENTIAL step to get lib ready.
	WxTileLibSetup(wxlibCustomSettings); // load fonts and styles, units, colorschemas - empty => defaults
	return document.fonts.ready; // !!! IMPORTANT: make sure fonts (barbs, arrows, etc) are loaded
}
