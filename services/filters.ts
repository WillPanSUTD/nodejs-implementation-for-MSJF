
import { ImageDataRGB, FilterParams } from '../types';

/**
 * Robust Box Filter implementation with boundary checking.
 */
function boxFilter(data: Float32Array, width: number, height: number, r: number): Float32Array {
  const n = data.length;
  const dest = new Float32Array(n);
  const temp = new Float32Array(n);

  // Horizontal pass
  for (let y = 0; y < height; y++) {
    const offset = y * width;
    let sum = 0;
    // Initial window
    for (let x = -r; x <= r; x++) {
      sum += data[offset + Math.min(Math.max(x, 0), width - 1)];
    }
    for (let x = 0; x < width; x++) {
      dest[offset + x] = sum / (2 * r + 1);
      const nextX = x + r + 1;
      const prevX = x - r;
      sum += data[offset + Math.min(nextX, width - 1)] - data[offset + Math.max(prevX, 0)];
    }
  }

  // Vertical pass
  for (let x = 0; x < width; x++) {
    let sum = 0;
    // Initial window
    for (let y = -r; y <= r; y++) {
      sum += dest[Math.min(Math.max(y, 0), height - 1) * width + x];
    }
    for (let y = 0; y < height; y++) {
      temp[y * width + x] = sum / (2 * r + 1);
      const nextY = y + r + 1;
      const prevY = y - r;
      sum += dest[Math.min(nextY, height - 1) * width + x] - dest[Math.max(prevY, 0) * width + x];
    }
  }

  return temp;
}

/**
 * Joint Guided Filter Channel
 */
function guidedFilterChannel(
  P: Float32Array, 
  I: Float32Array, 
  width: number, 
  height: number, 
  r: number, 
  eps: number
): Float32Array {
  const meanI = boxFilter(I, width, height, r);
  const meanP = boxFilter(P, width, height, r);
  
  const II = new Float32Array(I.length);
  const IP = new Float32Array(I.length);
  for (let i = 0; i < I.length; i++) {
    II[i] = I[i] * I[i];
    IP[i] = I[i] * P[i];
  }

  const varI = boxFilter(II, width, height, r);
  const covIP = boxFilter(IP, width, height, r);

  for (let i = 0; i < I.length; i++) {
    varI[i] = varI[i] - meanI[i] * meanI[i];
    covIP[i] = covIP[i] - meanI[i] * meanP[i];
  }

  const a = new Float32Array(I.length);
  const b = new Float32Array(I.length);
  for (let i = 0; i < I.length; i++) {
    a[i] = covIP[i] / (varI[i] + eps);
    b[i] = meanP[i] - a[i] * meanI[i];
  }

  const meanA = boxFilter(a, width, height, r);
  const meanB = boxFilter(b, width, height, r);

  const q = new Float32Array(I.length);
  for (let i = 0; i < I.length; i++) {
    q[i] = meanA[i] * I[i] + meanB[i];
  }

  return q;
}

export function extractRGB(imageData: ImageData): ImageDataRGB {
  const { width, height, data } = imageData;
  const size = width * height;
  const r = new Float32Array(size);
  const g = new Float32Array(size);
  const b = new Float32Array(size);

  for (let i = 0; i < size; i++) {
    r[i] = data[i * 4] / 255;
    g[i] = data[i * 4 + 1] / 255;
    b[i] = data[i * 4 + 2] / 255;
  }

  return { r, g, b, width, height };
}

export function combineRGB(rgb: ImageDataRGB): ImageData {
  const { r, g, b, width, height } = rgb;
  const data = new Uint8ClampedArray(width * height * 4);
  const size = width * height;

  for (let i = 0; i < size; i++) {
    data[i * 4] = Math.min(255, Math.max(0, r[i] * 255));
    data[i * 4 + 1] = Math.min(255, Math.max(0, g[i] * 255));
    data[i * 4 + 2] = Math.min(255, Math.max(0, b[i] * 255));
    data[i * 4 + 3] = 255;
  }

  return new ImageData(data, width, height);
}

export async function applyMutualStructureFilter(
  target: ImageDataRGB,
  guidance: ImageDataRGB,
  params: FilterParams,
  onProgress: (p: number) => void
): Promise<ImageDataRGB> {
  const { width, height } = target;
  const { radius, epsilon, iterations } = params;

  let currentR = new Float32Array(target.r);
  let currentG = new Float32Array(target.g);
  let currentB = new Float32Array(target.b);

  // Convert guidance to grayscale
  const grayI = new Float32Array(width * height);
  for(let i=0; i < width * height; i++) {
    grayI[i] = 0.299 * guidance.r[i] + 0.587 * guidance.g[i] + 0.114 * guidance.b[i];
  }

  for (let iter = 0; iter < iterations; iter++) {
    onProgress((iter / iterations) * 100);
    await new Promise(resolve => setTimeout(resolve, 10));

    // Iterative application of Guided Filter using the joint structure
    // In a more complex mutual structure filter, both would be updated.
    // For this approximation, we filter the target using the guidance structure.
    currentR = guidedFilterChannel(currentR, grayI, width, height, radius, epsilon);
    currentG = guidedFilterChannel(currentG, grayI, width, height, radius, epsilon);
    currentB = guidedFilterChannel(currentB, grayI, width, height, radius, epsilon);
  }

  onProgress(100);
  return { r: currentR, g: currentG, b: currentB, width, height };
}
