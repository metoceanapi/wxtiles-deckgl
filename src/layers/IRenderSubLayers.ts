export interface RenderSubLayers {
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
		data: any;
	};
	visible: boolean;
}
