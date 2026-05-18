import fs from "fs";
import path from "path";
import multer from "multer";

const uploadRoot = path.resolve(process.cwd(), "uploads", "observer-evidence");

fs.mkdirSync(uploadRoot, { recursive: true });

const allowedMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/webm",
  "application/pdf",
]);

export const evidenceUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024,
    files: 10,
  },
  fileFilter: (_req, file, cb) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      cb(new Error("Unsupported evidence file type"));
      return;
    }

    cb(null, true);
  },
});

export function getEvidenceUploadRoot() {
  return uploadRoot;
}
