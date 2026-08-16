export interface VisionAnalysisResult {
  status: 'CLEAR' | 'NO_FACE_DETECTED' | 'MULTIPLE_FACES_DETECTED' | 'PHONE_DETECTED' | 'CAMERA_OBSTRUCTED';
  detail: string;
  faceCount: number;
}

export async function analyzeWebcamFrame(videoElement: HTMLVideoElement): Promise<VisionAnalysisResult> {
  if (!videoElement || !videoElement.videoWidth || !videoElement.videoHeight) {
    return { status: 'CLEAR', detail: 'Camera warming up', faceCount: 1 };
  }

  // 1. Attempt Native Chrome/Electron FaceDetector API if available
  if ('FaceDetector' in window) {
    try {
      const faceDetector = new (window as any).FaceDetector({ maxFaces: 5, fastMode: true });
      const faces = await faceDetector.detect(videoElement);

      if (faces.length === 0) {
        return {
          status: 'NO_FACE_DETECTED',
          detail: 'No candidate face detected in camera view (Candidate stepped away or hid face)',
          faceCount: 0
        };
      }

      if (faces.length > 1) {
        return {
          status: 'MULTIPLE_FACES_DETECTED',
          detail: `Multiple faces (${faces.length}) detected in camera view (Potential unauthorized assistance)`,
          faceCount: faces.length
        };
      }

      // Single face detected via native API — check for phone / obstruction on canvas
      const canvasResult = analyzeCanvasFrame(videoElement);
      if (canvasResult.status === 'PHONE_DETECTED' || canvasResult.status === 'CAMERA_OBSTRUCTED') {
        return canvasResult;
      }

      return { status: 'CLEAR', detail: 'Candidate face verified', faceCount: 1 };
    } catch (e) {
      // Fall through to Canvas vision analysis fallback
    }
  }

  // 2. Smart HTML5 Canvas Vision Analysis Fallback
  return analyzeCanvasFrame(videoElement);
}

function analyzeCanvasFrame(videoElement: HTMLVideoElement): VisionAnalysisResult {
  const canvas = document.createElement('canvas');
  canvas.width = 160;
  canvas.height = 120;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return { status: 'CLEAR', detail: 'Canvas context unavailable', faceCount: 1 };
  }

  ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  let totalLuminance = 0;
  let skinTonePixels = 0;
  let brightScreenPixels = 0;
  const totalPixels = canvas.width * canvas.height;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
    totalLuminance += luminance;

    // Check for human skin tone color range
    if (r > 60 && g > 40 && b > 20 && r > g && r > b && Math.abs(r - g) > 15) {
      skinTonePixels++;
    }

    // Check for smartphone glowing screen light (very high luminance with cool blue/white tint)
    if (luminance > 220 && b > 180 && r > 160 && Math.abs(r - b) < 40) {
      brightScreenPixels++;
    }
  }

  const avgLuminance = totalLuminance / totalPixels;
  const skinRatio = (skinTonePixels / totalPixels) * 100;
  const brightScreenRatio = (brightScreenPixels / totalPixels) * 100;

  // Check if camera is covered / pitch black
  if (avgLuminance < 12) {
    return {
      status: 'CAMERA_OBSTRUCTED',
      detail: 'Camera lens appears covered or blacked out',
      faceCount: 0
    };
  }

  // Check if phone or glowing handheld screen detected in frame
  if (brightScreenRatio > 3.5) {
    return {
      status: 'PHONE_DETECTED',
      detail: 'Mobile phone / active screen detected in camera view',
      faceCount: 1
    };
  }

  // Check if human skin tone / face is absent in camera frame
  if (skinRatio < 2.0) {
    return {
      status: 'NO_FACE_DETECTED',
      detail: 'No candidate face detected in camera view (Candidate stepped away or hid face)',
      faceCount: 0
    };
  }

  return { status: 'CLEAR', detail: 'Candidate face verified', faceCount: 1 };
}
