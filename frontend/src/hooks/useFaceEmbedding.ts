import { useCallback, useEffect, useRef, useState } from "react";
import { captureFaceEmbedding, loadFaceModels } from "../utils/faceRecognition";

export function useFaceEmbedding() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [modelReady, setModelReady] = useState(false);
  const [modelError, setModelError] = useState("");

  useEffect(() => {
    let mounted = true;

    void loadFaceModels()
      .then(() => {
        if (mounted) setModelReady(true);
      })
      .catch((error: unknown) => {
        if (mounted) {
          setModelError(
            error instanceof Error
              ? error.message
              : "Failed to load face models.",
          );
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  const startCamera = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("Camera access is not supported in this browser.");
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user" },
      audio: false,
    });

    streamRef.current = stream;
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      await videoRef.current.play().catch(() => undefined);
    }

    return stream;
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const captureEmbedding = useCallback(async () => {
    if (!videoRef.current) {
      throw new Error("Camera preview is not ready.");
    }

    return captureFaceEmbedding(videoRef.current);
  }, []);

  return {
    videoRef,
    modelReady,
    modelError,
    startCamera,
    stopCamera,
    captureEmbedding,
  };
}
