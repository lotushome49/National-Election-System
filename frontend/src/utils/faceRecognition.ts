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

export function createDemoFaceEmbedding(seed: string): string {
  const normalized = (seed || "demo").trim().toUpperCase();
  let hash = 0;

  for (let i = 0; i < normalized.length; i += 1) {
    hash = (hash * 31 + normalized.charCodeAt(i)) >>> 0;
  }

  const embedding = Array.from({ length: 128 }, (_, index) => {
    const value = (hash + index * 97) % 1000;
    return Number(((value / 999) * 2 - 1).toFixed(6));
  });

  return serializeFaceEmbedding(embedding);
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
