export async function initWebcamStream(videoElement: HTMLVideoElement): Promise<MediaStream | null> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 640 },
        height: { ideal: 480 },
        facingMode: 'user'
      },
      audio: false
    });
    videoElement.srcObject = stream;
    await videoElement.play();
    return stream;
  } catch (err) {
    console.error('Failed to access webcam:', err);
    return null;
  }
}

export function captureVideoFrame(videoElement: HTMLVideoElement): string | null {
  if (!videoElement || !videoElement.videoWidth || !videoElement.videoHeight) {
    return null;
  }

  const canvas = document.createElement('canvas');
  canvas.width = videoElement.videoWidth;
  canvas.height = videoElement.videoHeight;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
  
  // Overlay subtle timestamp on snapshot for audit trace
  const timestamp = new Date().toISOString();
  ctx.fillStyle = 'rgba(15, 17, 21, 0.8)';
  ctx.fillRect(10, canvas.height - 30, 240, 20);
  ctx.font = '12px "IBM Plex Mono", monospace';
  ctx.fillStyle = '#D9A441';
  ctx.fillText(timestamp.substring(0, 19).replace('T', ' '), 15, canvas.height - 15);

  return canvas.toDataURL('image/jpeg', 0.85);
}

export function stopWebcamStream(stream: MediaStream | null) {
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
  }
}
