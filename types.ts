
export interface FilterParams {
  radius: number;
  epsilon: number;
  iterations: number;
  weight: number;
}

export type ImageDataRGB = {
  r: Float32Array;
  g: Float32Array;
  b: Float32Array;
  width: number;
  height: number;
};

export interface ProcessingState {
  isProcessing: boolean;
  progress: number;
  error: string | null;
}
