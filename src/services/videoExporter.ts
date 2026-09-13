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
 * High quality in-browser video generator capturing canvas frames synchronously
 */
export async function exportRouteVideo({
  canvas,
  durationSeconds,
  fps = 30,
  format = 'mp4',
  title = 'travel-route-animation',
  onProgress,
  renderFrameAtProgress,
}: VideoRecorderOptions): Promise<{ blob: Blob; url: string; filename: string }> {
  const totalFrames = Math.max(1, Math.round(durationSeconds * fps));
  const cleanTitle = (title || 'route-animation').replace(/[^a-zA-Z0-9_-]/g, '_');
  // Check supported mime types and match extension
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

  // 1. Pre-render Frame 0 and wait for all tiles and canvas overlays to be 100% ready
  if (onProgress) {
    onProgress({
      progress: 0,
      status: 'Preparing frame 0 & preloading map tiles...',
    });
  }
  await renderFrameAtProgress(0);
  // Guarantee buffer flush to canvas
  await new Promise((r) => setTimeout(r, 150));

  // 2. NOW initialize captureStream and mediaRecorder — canvas already has the pristine frame 0
  const stream = canvas.captureStream(fps);
  const recordedChunks: Blob[] = [];

  const mediaRecorder = new MediaRecorder(stream, {
    mimeType: MediaRecorder.isTypeSupported(mimeType) ? mimeType : '',
    videoBitsPerSecond: 8000000, // 8 Mbps for high quality 1080p
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

  // 3. Render and record frames sequentially
  const frameIntervalMs = 1000 / fps;

  for (let frame = 0; frame <= totalFrames; frame++) {
    const progress = frame / totalFrames;

    // Update progress state
    if (onProgress) {
      onProgress({
        progress: Math.min(99, Math.round((frame / totalFrames) * 100)),
        status: `Rendering frame ${frame} of ${totalFrames} (${Math.round((frame / totalFrames) * 100)}%)...`,
      });
    }

    if (frame > 0) {
      // Direct render callback for frames 1..totalFrames
      await renderFrameAtProgress(progress);
    }

    // Give time for canvas to flush frame to stream
    await new Promise((r) => setTimeout(r, frameIntervalMs));
  }

  // Finalize recording
  mediaRecorder.stop();

  return recordingPromise;
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
