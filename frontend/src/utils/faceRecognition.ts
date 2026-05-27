import * as faceapi from "@vladmandic/face-api";

const MODEL_URL =
  import.meta.env.VITE_FACE_MODEL_URL ||
  "https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model";

let modelsPromise: Promise<void> | null = null;

export function serializeFaceEmbedding(
  embedding: number[] | Float32Array,
): string {
  return JSON.stringify(
    Array.from(embedding).map((value) => Number(value.toFixed(6))),
  );
}

export function parseFaceEmbedding(embedding: string): number[] {
  try {
    const parsed = JSON.parse(embedding);
    if (Array.isArray(parsed)) {
      return parsed
        .map((value) => Number(value))
        .filter((value) => Number.isFinite(value));
    }
  } catch {
    // Ignore malformed embeddings.
  }

  return [];
}

export function computeFaceEmbeddingScore(
  probeEmbedding: string,
  referenceEmbedding: string,
): number {
  const probe = parseFaceEmbedding(probeEmbedding);
  const reference = parseFaceEmbedding(referenceEmbedding);

  if (probe.length === 0 || reference.length === 0) return 0;

  const length = Math.min(probe.length, reference.length);
  let dot = 0;
  let probeMagnitude = 0;
  let referenceMagnitude = 0;

  for (let index = 0; index < length; index += 1) {
    const probeValue = probe[index];
    const referenceValue = reference[index];
    dot += probeValue * referenceValue;
    probeMagnitude += probeValue * probeValue;
    referenceMagnitude += referenceValue * referenceValue;
  }

  if (probeMagnitude === 0 || referenceMagnitude === 0) return 0;

  const similarity = dot / Math.sqrt(probeMagnitude * referenceMagnitude);
  return Math.round(Math.max(0, Math.min(1, (similarity + 1) / 2)) * 100);
}

export async function loadFaceModels(): Promise<void> {
  if (!modelsPromise) {
    modelsPromise = Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    ]).then(() => undefined);
  }

  return modelsPromise;
}

export async function captureFaceEmbedding(
  video: HTMLVideoElement,
): Promise<string> {
  await loadFaceModels();

  if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
    await new Promise<void>((resolve) => {
      const onReady = () => {
        video.removeEventListener("loadeddata", onReady);
        video.removeEventListener("canplay", onReady);
        resolve();
      };

      video.addEventListener("loadeddata", onReady, { once: true });
      video.addEventListener("canplay", onReady, { once: true });
    });
  }

  const attempts = 5;
  let lastError: unknown = null;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      // Perform a quick client-side liveness check before extracting a descriptor.
      const alive = await performLivenessCheck(video);
      if (!alive) {
        lastError = new Error(
          "Liveness check failed. Please blink or move your head and try again.",
        );
        await new Promise((resolve) => setTimeout(resolve, 400));
        continue;
      }
      const detection = await faceapi
        .detectSingleFace(
          video,
          new faceapi.TinyFaceDetectorOptions({
            inputSize: 512,
            scoreThreshold: 0.35,
          }),
        )
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (detection?.descriptor) {
        return serializeFaceEmbedding(detection.descriptor);
      }

      lastError = new Error(
        "No face detected. Please center your face in the camera and try again.",
      );
    } catch (error) {
      lastError = error;
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  if (lastError instanceof Error) {
    throw lastError;
  }

  throw new Error(
    "No face detected. Please center your face in the camera and try again.",
  );
}

function distance(a: { x: number; y: number }, b: { x: number; y: number }) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function eyeAspectRatio(eye: { x: number; y: number }[]) {
  // eye is 6 points: p0..p5
  // EAR = (||p1-p5|| + ||p2-p4||) / (2 * ||p0-p3||)
  if (!Array.isArray(eye) || eye.length < 6) return 0;
  const p0 = eye[0];
  const p1 = eye[1];
  const p2 = eye[2];
  const p3 = eye[3];
  const p4 = eye[4];
  const p5 = eye[5];
  const vert1 = distance(p1, p5);
  const vert2 = distance(p2, p4);
  const hor = distance(p0, p3) || 1;
  return (vert1 + vert2) / (2 * hor);
}

async function performLivenessCheck(
  video: HTMLVideoElement,
  options?: { samples?: number; intervalMs?: number },
): Promise<boolean> {
  const samples = options?.samples ?? 6;
  const intervalMs = options?.intervalMs ?? 180;

  let blinkDetected = false;
  const nosePositions: { x: number; y: number }[] = [];

  for (let i = 0; i < samples; i += 1) {
    try {
      const det = await faceapi
        .detectSingleFace(
          video,
          new faceapi.TinyFaceDetectorOptions({
            inputSize: 512,
            scoreThreshold: 0.35,
          }),
        )
        .withFaceLandmarks();

      if (det && det.landmarks) {
        const leftEye = det.landmarks.getLeftEye();
        const rightEye = det.landmarks.getRightEye();
        const nose = det.landmarks.getNose();

        const leftEar = eyeAspectRatio(leftEye as any);
        const rightEar = eyeAspectRatio(rightEye as any);
        const ear = (leftEar + rightEar) / 2;

        // Typical blink EAR threshold ~0.18
        if (ear > 0 && ear < 0.18) {
          blinkDetected = true;
        }

        if (nose && nose.length > 0) {
          const tip = nose[Math.floor(nose.length / 2)];
          nosePositions.push(tip);
        }
      }
    } catch {
      // ignore transient detection failures
    }

    // small delay between samples
    // eslint-disable-next-line no-await-in-loop
    await new Promise((r) => setTimeout(r, intervalMs));
  }

  // Movement check: compare nose position variance normalized by interocular distance
  let movementDetected = false;
  if (nosePositions.length >= 2) {
    const first = nosePositions[0];
    const last = nosePositions[nosePositions.length - 1];
    // approximate interocular distance using positions from the last successful frame
    try {
      const lastDet = await faceapi
        .detectSingleFace(
          video,
          new faceapi.TinyFaceDetectorOptions({
            inputSize: 512,
            scoreThreshold: 0.35,
          }),
        )
        .withFaceLandmarks();
      if (lastDet && lastDet.landmarks) {
        const left = lastDet.landmarks.getLeftEye();
        const right = lastDet.landmarks.getRightEye();
        const leftCenter = left.reduce(
          (acc: any, p: any) => ({ x: acc.x + p.x, y: acc.y + p.y }),
          { x: 0, y: 0 },
        );
        const rightCenter = right.reduce(
          (acc: any, p: any) => ({ x: acc.x + p.x, y: acc.y + p.y }),
          { x: 0, y: 0 },
        );
        leftCenter.x /= left.length;
        leftCenter.y /= left.length;
        rightCenter.x /= right.length;
        rightCenter.y /= right.length;
        const iod = distance(leftCenter, rightCenter) || 1;
        const moved = distance(first, last);
        // require movement > ~3% of interocular distance
        if (moved / iod > 0.03) movementDetected = true;
      }
    } catch {
      // ignore
    }
  }

  return blinkDetected || movementDetected;
}
