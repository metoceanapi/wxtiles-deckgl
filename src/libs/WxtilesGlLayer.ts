export interface WxtilesGlLayer {
	nextTimestep(): Promise<void>;
	prevTimestep(): Promise<void>;
	cancel(): void;
	remove(): void;
}
