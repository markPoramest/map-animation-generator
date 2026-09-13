import { Muxer as Mp4Muxer, ArrayBufferTarget as Mp4ArrayBufferTarget } from 'mp4-muxer';
import { Muxer as WebmMuxer, ArrayBufferTarget as WebmArrayBufferTarget } from 'webm-muxer';

export interface ExportProgress {
  progress: number; // 0 to 100
  status: string;
  blob?: Blob;
  url?: string;
  filename?: string;
}

export interface VideoRecorderOptions {
  canvas: HTMLCanvasElement;
  durationSeconds: number;
  fps: number;
  format: 'webm' | 'mp4';
  title?: string;
  onProgress?: (progress: ExportProgress) => void;
  renderFrameAtProgress: (progress: number) => Promise<void> | void;
}

/**
 * Detects whether WebCodecs VideoEncoder is available and supports the requested format
 */
async function getSupportedVideoCodec(
  format: 'mp4' | 'webm',
  width: number,
  height: number,
  fps: number
): Promise<string | null> {
  if (
    typeof window === 'undefined' ||
    typeof (window as any).VideoEncoder === 'undefined' ||
    typeof (window as any).VideoFrame === 'undefined'
  ) {
    return null;
  }

  const candidates =
    format === 'mp4'
      ? ['avc1.4d002a', 'avc1.42001f', 'avc1.640028']
      : ['vp09.00.10.08', 'vp8'];

  for (const codec of candidates) {
    try {
      const support = await VideoEncoder.isConfigSupported({
        codec,
        width,
        height,
        bitrate: 8_000_000,
        framerate: fps,
      });
      if (support && support.supported) {
        return codec;
      }
    } catch {
      // Continue to next candidate
    }
  }

  return null;
}

/**
 * Offline, frame-accurate WebCodecs generator.
 * Each frame awaits Map tile loading and WebGL rendering completion (idle event),
 * guaranteeing zero dropped frames, zero pale fading, and zero timing jitter.
 */
async function exportWithWebCodecs(
  codec: string,
  options: VideoRecorderOptions,
  width: number,
  height: number
): Promise<{ blob: Blob; url: string; filename: string }> {
  const { canvas, durationSeconds, fps, format, title, onProgress, renderFrameAtProgress } = options;
  const totalFrames = Math.max(1, Math.round(durationSeconds * fps));
  const cleanTitle = (title || 'route-animation').replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `${cleanTitle}_${durationSeconds}s.${format}`;

  if (onProgress) {
    onProgress({
      progress: 0,
      status: 'Preparing scene and pre-caching tiles...',
    });
  }

  // Pre-render frame 0 and wait for all tiles to be idle
  await renderFrameAtProgress(0);

  let muxer: Mp4Muxer<Mp4ArrayBufferTarget> | WebmMuxer<WebmArrayBufferTarget>;

  if (format === 'mp4') {
    const target = new Mp4ArrayBufferTarget();
    muxer = new Mp4Muxer({
      target,
      video: {
        codec: 'avc',
        width,
        height,
        frameRate: fps,
      },
      fastStart: 'in-memory',
      firstTimestampBehavior: 'strict',
    });
  } else {
    const target = new WebmArrayBufferTarget();
    muxer = new WebmMuxer({
      target,
      video: {
        codec: codec.includes('vp8') ? 'V_VP8' : 'V_VP9',
        width,
        height,
        frameRate: fps,
      },
      firstTimestampBehavior: 'strict',
    });
  }

  let encoderError: any = null;
  const videoEncoder = new VideoEncoder({
    output: (chunk, meta) => {
      muxer.addVideoChunk(chunk, meta);
    },
    error: (e) => {
      encoderError = e;
      console.error('WebCodecs VideoEncoder error:', e);
    },
  });

  videoEncoder.configure({
    codec,
    width,
    height,
    bitrate: 8_000_000,
    framerate: fps,
  });

  const frameDurationUs = Math.round(1_000_000 / fps);

  // Discrete frame-by-frame loop:
  // Each iteration awaits tile loading (idle) and WebGL paint before capturing VideoFrame
  for (let frame = 0; frame <= totalFrames; frame++) {
    if (encoderError) {
      throw new Error(`Video encoder error: ${encoderError.message || encoderError}`);
    }

    const progress = frame / totalFrames;
    if (onProgress) {
      onProgress({
        progress: Math.min(98, Math.round((frame / totalFrames) * 100)),
        status: `Rendering frame ${frame} of ${totalFrames} (${Math.round((frame / totalFrames) * 100)}%)...`,
      });
    }

    if (frame > 0) {
      await renderFrameAtProgress(progress);
    }

    const timestampUs = Math.round((frame * 1_000_000) / fps);
    const videoFrame = new VideoFrame(canvas, {
      timestamp: timestampUs,
      duration: frameDurationUs,
    });

    const isKeyFrame = frame % (fps * 2) === 0;
    videoEncoder.encode(videoFrame, { keyFrame: isKeyFrame });
    videoFrame.close();

    // Prevent encoder backpressure by periodically draining the encode queue
    if (videoEncoder.encodeQueueSize > 4) {
      await videoEncoder.flush();
    }
  }

  if (onProgress) {
    onProgress({
      progress: 99,
      status: 'Finalizing video container...',
    });
  }

  await videoEncoder.flush();
  videoEncoder.close();
  muxer.finalize();

  const mimeType = format === 'mp4' ? 'video/mp4' : 'video/webm';
  const blob = new Blob([muxer.target.buffer], { type: mimeType });
  const url = URL.createObjectURL(blob);

  if (onProgress) {
    onProgress({ progress: 100, status: 'Export Complete!', blob, url, filename });
  }

  return { blob, url, filename };
}

/**
 * Fallback recorder using MediaRecorder if WebCodecs is not supported
 */
async function exportWithMediaRecorder(
  options: VideoRecorderOptions
): Promise<{ blob: Blob; url: string; filename: string }> {
  const { canvas, durationSeconds, fps, format, title, onProgress, renderFrameAtProgress } = options;
  const totalFrames = Math.max(1, Math.round(durationSeconds * fps));
  const cleanTitle = (title || 'route-animation').replace(/[^a-zA-Z0-9_-]/g, '_');

  let mimeType = 'video/webm;codecs=vp9';
  let fileExt = 'webm';

  if (format === 'mp4') {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('video/mp4;codecs=avc1')) {
      mimeType = 'video/mp4;codecs=avc1';
      fileExt = 'mp4';
    } else if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('video/mp4')) {
      mimeType = 'video/mp4';
      fileExt = 'mp4';
    } else if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
      mimeType = 'video/webm;codecs=vp9';
      fileExt = 'webm';
    } else {
      mimeType = 'video/webm';
      fileExt = 'webm';
    }
  } else {
    fileExt = 'webm';
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
      mimeType = 'video/webm;codecs=vp9';
    } else if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('video/webm;codecs=vp8')) {
      mimeType = 'video/webm;codecs=vp8';
    } else {
      mimeType = 'video/webm';
    }
  }

  const filename = `${cleanTitle}_${durationSeconds}s.${fileExt}`;

  if (onProgress) {
    onProgress({
      progress: 0,
      status: 'Preparing frame 0 & preloading map tiles...',
    });
  }
  await renderFrameAtProgress(0);
  await new Promise((r) => setTimeout(r, 150));

  const stream = canvas.captureStream(fps);
  const recordedChunks: Blob[] = [];

  const mediaRecorder = new MediaRecorder(stream, {
    mimeType: MediaRecorder.isTypeSupported(mimeType) ? mimeType : '',
    videoBitsPerSecond: 8000000,
  });

  mediaRecorder.ondataavailable = (event) => {
    if (event.data && event.data.size > 0) {
      recordedChunks.push(event.data);
    }
  };

  const recordingPromise = new Promise<{ blob: Blob; url: string; filename: string }>((resolve, reject) => {
    mediaRecorder.onstop = () => {
      const outputBlob = new Blob(recordedChunks, { type: mimeType });
      const url = URL.createObjectURL(outputBlob);
      if (onProgress) {
        onProgress({ progress: 100, status: 'Export Complete!', blob: outputBlob, url, filename });
      }
      resolve({ blob: outputBlob, url, filename });
    };

    mediaRecorder.onerror = (err) => {
      reject(err);
    };
  });

  mediaRecorder.start(100);

  const frameIntervalMs = 1000 / fps;

  for (let frame = 0; frame <= totalFrames; frame++) {
    const progress = frame / totalFrames;

    if (onProgress) {
      onProgress({
        progress: Math.min(99, Math.round((frame / totalFrames) * 100)),
        status: `Rendering frame ${frame} of ${totalFrames} (${Math.round((frame / totalFrames) * 100)}%)...`,
      });
    }

    if (frame > 0) {
      await renderFrameAtProgress(progress);
    }

    await new Promise((r) => setTimeout(r, frameIntervalMs));
  }

  mediaRecorder.stop();

  return recordingPromise;
}

/**
 * High quality in-browser video generator.
 * Employs WebCodecs + mp4-muxer/webm-muxer for deterministic frame-accurate rendering,
 * falling back to MediaRecorder if WebCodecs is not supported.
 */
export async function exportRouteVideo(
  options: VideoRecorderOptions
): Promise<{ blob: Blob; url: string; filename: string }> {
  const { canvas, fps = 30, format = 'mp4' } = options;

  // Video encoders require even pixel dimensions
  const width = canvas.width % 2 === 0 ? canvas.width : canvas.width - 1;
  const height = canvas.height % 2 === 0 ? canvas.height : canvas.height - 1;

  // 1. Attempt offline frame-accurate WebCodecs export
  const supportedCodec = await getSupportedVideoCodec(format, width, height, fps);
  if (supportedCodec) {
    try {
      return await exportWithWebCodecs(supportedCodec, options, width, height);
    } catch (err) {
      console.warn('WebCodecs offline export failed, falling back to MediaRecorder:', err);
    }
  }

  // 2. Fallback to MediaRecorder
  return exportWithMediaRecorder(options);
}

/**
 * Triggers a browser file download for a blob or URL
 */
export function downloadVideoFile(url: string, filename: string) {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
