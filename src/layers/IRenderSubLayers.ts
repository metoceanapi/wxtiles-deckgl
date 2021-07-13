export interface RenderSubLayers<Data = any> {
	id: string;
	tile: {
		x: number;
		y: number;
		z: number;
		bbox: {
			west: number;
			south: number;
			east: number;
			north: number;
		};
		data: Data;
	};
	data: Data;
	visible: boolean;
}
