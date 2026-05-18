import fs from "fs";
import path from "path";
import multer from "multer";

const uploadRoot = path.resolve(process.cwd(), "uploads", "candidate-docs");

fs.mkdirSync(uploadRoot, { recursive: true });

const allowedMimeTypes = new Set([
  "application/pdf",
]);

export const candidateUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB
    files: 5,
  },
  fileFilter: (_req, file, cb) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      cb(new Error("Unsupported candidate document type. Only PDFs are allowed."));
      return;
    }

    cb(null, true);
  },
});

export function getCandidateUploadRoot() {
  return uploadRoot;
}
