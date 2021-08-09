export interface WxtilesGlLayer {
	nextTimestep(): Promise<number>;
	prevTimestep(): Promise<number>;
	goToTimestep(index: number): Promise<void>;
	cancel(): void;
	remove(): void;
}
