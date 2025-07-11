/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import {Blob as GenAiBlob} from '@google/genai'; // Renamed to avoid conflict with DOM Blob
import { COLORS } from './core/constants';

function encode(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function createGenAiBlob(data: Float32Array): GenAiBlob { // Renamed function
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    // convert float32 -1 to 1 to int16 -32768 to 32767
    int16[i] = data[i] * 32768;
  }

  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000', // Note: Lyria output is 48kHz. This seems for a different purpose.
  };
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  // data is Int16Array, but passed as Uint8Array view of its buffer
  const pcmDataInt16 = new Int16Array(data.buffer, data.byteOffset, data.byteLength / 2);

  const buffer = ctx.createBuffer(
    numChannels,
    pcmDataInt16.length / numChannels,
    sampleRate,
  );

  // Convert Int16 to Float32 for WebAudio API
  const dataFloat32 = new Float32Array(pcmDataInt16.length);
  for (let i = 0; i < pcmDataInt16.length; i++) {
    dataFloat32[i] = pcmDataInt16[i] / 32768.0;
  }

  // Deinterleave channels
  if (numChannels === 1) { 
    buffer.copyToChannel(dataFloat32, 0);
  } else {
    for (let i = 0; i < numChannels; i++) {
      const channelData = new Float32Array(dataFloat32.length / numChannels);
      for (let j = 0; j < channelData.length; j++) {
        channelData[j] = dataFloat32[j * numChannels + i];
      }
      buffer.copyToChannel(channelData, i);
    }
  }

  return buffer;
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

function pcmToWav(pcmData: Uint8Array, numChannels: number, sampleRate: number, bitsPerSample: number): Blob {
  const blockAlign = numChannels * (bitsPerSample / 8);
  const byteRate = sampleRate * blockAlign;
  const dataSize = pcmData.byteLength;

  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  // RIFF chunk descriptor
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true); // ChunkSize
  writeString(view, 8, 'WAVE');

  // FMT sub-chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true); // AudioFormat (1 for PCM)
  view.setUint16(22, numChannels, true); // NumChannels
  view.setUint32(24, sampleRate, true); // SampleRate
  view.setUint32(28, byteRate, true); // ByteRate
  view.setUint16(32, blockAlign, true); // BlockAlign
  view.setUint16(34, bitsPerSample, true); // BitsPerSample

  // DATA sub-chunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true); // Subchunk2Size (data size)

  // Write PCM data
  new Uint8Array(buffer, 44).set(pcmData);

  return new Blob([view], { type: 'audio/wav' });
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** 
 * Throttles a callback to be called at most once per `delay` milliseconds. 
 * Returns a Promise that resolves with the result of the last successful invocation.
 * This ensures that `await` works correctly on the throttled function.
 */
function throttle<T extends (...args: any[]) => any>(func: T, delay: number): (...args: Parameters<T>) => Promise<ReturnType<T>> {
  let lastCall = 0;
  let lastResult: ReturnType<T>;
  return function(this: any, ...args: Parameters<T>): Promise<ReturnType<T>> {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      lastResult = func.apply(this, args);
    }
    return Promise.resolve(lastResult);
  };
}


function getUnusedRandomColor(usedColors: string[]): string {
  const availableColors = COLORS.filter((c) => !usedColors.includes(c));
  if (availableColors.length === 0) {
    // If no available colors, pick a random one from the original list.
    return COLORS[Math.floor(Math.random() * COLORS.length)];
  }
  return availableColors[Math.floor(Math.random() * availableColors.length)];
}

/**
 * Checks for a live internet connection by making a lightweight request.
 * @returns {Promise<boolean>} True if the connection is likely available, false otherwise.
 */
async function checkInternetConnection(): Promise<boolean> {
  try {
    // The 'generate_204' endpoint is designed for this purpose. It returns a 204 No Content response.
    // We use HEAD method to be as lightweight as possible.
    // 'no-cors' mode prevents CORS errors but gives an opaque response. We only care if the request succeeds, not its content.
    // 'no-store' cache option helps ensure we are making a fresh check.
    const response = await fetch('https://www.google.com/generate_204', {
      method: 'HEAD',
      mode: 'no-cors',
      cache: 'no-store'
    });
    // For opaque responses, 'ok' is always false. Success is determined by the fetch promise not rejecting.
    return true;
  } catch (error) {
    // A network error (e.g., DNS resolution failure, no route to host) will cause the promise to reject.
    console.warn('Internet connection check failed:', error);
    return false;
  }
}


export {createGenAiBlob as createBlob, decode, decodeAudioData, encode, pcmToWav, downloadBlob, throttle, getUnusedRandomColor, checkInternetConnection};