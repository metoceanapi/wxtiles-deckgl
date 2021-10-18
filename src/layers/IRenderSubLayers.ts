import { BoundaryMeta } from '../utils/wxtools';

export interface Tile {
	x: number;
	y: number;
	z: number;
	bbox: BoundaryMeta;
}
export interface RenderSubLayersProps<Data = any> {
	id: string;
	tile: Tile;
	data: Data;
}
