import fs from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { logger } from "../../configs/logger";
import { authRepository } from "../auth/auth.repository";
import { observerRepository } from "./observer.repository";
import { observerEvidenceRepository } from "./observerEvidence.repository";
import { getEvidenceUploadRoot } from "./observerEvidence.upload";
import { buildPaginationMeta } from "../../utils/response";
import { ForbiddenError, NotFoundError } from "../../errors/AppError";
import { sha256 } from "../../utils/crypto";

const PUBLIC_PREFIX = "/uploads/observer-evidence";

function buildPublicUrl(fileName: string) {
  return `${PUBLIC_PREFIX}/${fileName}`;
}

function sanitizeName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "_");
}

async function writeUpload(file: Express.Multer.File) {
  const ext = path.extname(file.originalname) || "";
  const fileName = `${Date.now()}-${uuidv4()}${ext}`;
  const storagePath = path.join(getEvidenceUploadRoot(), fileName);
  await fs.writeFile(storagePath, file.buffer);
  return { fileName, storagePath };
}

export const observerEvidenceService = {
  async upload(files: Express.Multer.File[], uploadedBy: string, ip: string) {
    const uploader = await authRepository.findById(uploadedBy);
    if (!uploader) {
      throw new NotFoundError("User");
    }

    const records = [] as any[];
    for (const file of files) {
      const { fileName, storagePath } = await writeUpload(file);
      const record = await observerEvidenceRepository.create({
        id: uuidv4(),
        uploadedBy,
        originalName: sanitizeName(file.originalname),
        fileName,
        mimeType: file.mimetype,
        fileSize: file.size,
        storagePath,
        publicUrl: buildPublicUrl(fileName),
        checksum: sha256(file.buffer.toString("base64")),
      });

      records.push(record);
      logger.info(
        `[ObserverEvidence] Uploaded ${record.publicUrl} by ${uploadedBy} from ${ip}`,
      );
    }

    return records;
  },

  async list(
    userId: string,
    role: string,
    page: number,
    limit: number,
    ownedOnly = false,
  ) {
    const where: any = { deletedAt: null };
    if (ownedOnly || role === "OBSERVER") {
      where.uploadedBy = userId;
    }

    const [data, total] = await observerEvidenceRepository.findMany(
      where,
      (page - 1) * limit,
      limit,
    );
    return { data, meta: buildPaginationMeta(total, page, limit) };
  },

  async getById(id: string, userId: string, role: string) {
    const record = await observerEvidenceRepository.findById(id);
    if (!record) {
      throw new NotFoundError("Evidence");
    }

    if (
      role !== "ADMIN" &&
      role !== "SUPER_ADMIN" &&
      record.uploadedBy !== userId
    ) {
      throw new ForbiddenError("You can only view your own evidence");
    }

    return record;
  },

  async remove(id: string, userId: string, role: string, ip: string) {
    const record = await observerEvidenceRepository.findById(id);
    if (!record) {
      throw new NotFoundError("Evidence");
    }

    if (
      role !== "ADMIN" &&
      role !== "SUPER_ADMIN" &&
      record.uploadedBy !== userId
    ) {
      throw new ForbiddenError("You can only delete your own evidence");
    }

    await observerEvidenceRepository.softDelete(id);
    await fs.unlink(record.storagePath).catch(() => undefined);

    if (record.reportId) {
      const report = await observerRepository.findById(record.reportId);
      const nextUrls = (
        (Array.isArray(report?.evidenceUrls)
          ? report?.evidenceUrls
          : []) as string[]
      ).filter((url: string) => url !== record.publicUrl);
      await observerRepository.update(record.reportId, {
        evidenceUrls: nextUrls,
      });
    }

    logger.info(
      `[ObserverEvidence] Deleted ${record.publicUrl} by ${userId} from ${ip}`,
    );
  },
};
