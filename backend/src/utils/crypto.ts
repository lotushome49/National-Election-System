import crypto from 'crypto';
import { env } from '../configs/env';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;   // 128-bit IV
const TAG_LENGTH = 16;  // 128-bit auth tag

// Key is stored as 64 hex chars → 32 bytes
const KEY = Buffer.from(env.ENCRYPTION_KEY, 'hex');

// ─── AES-256-GCM Encrypt ──────────────────────────────────────────────────────
export function encrypt(plaintext: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);

  const tag = cipher.getAuthTag();

  // Format: iv(hex):tag(hex):ciphertext(hex)
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

// ─── AES-256-GCM Decrypt ──────────────────────────────────────────────────────
export function decrypt(ciphertext: string): string {
  const [ivHex, tagHex, encryptedHex] = ciphertext.split(':');

  if (!ivHex || !tagHex || !encryptedHex) {
    throw new Error('Invalid ciphertext format');
  }

  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  const encrypted = Buffer.from(encryptedHex, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
  decipher.setAuthTag(tag);

  return decipher.update(encrypted) + decipher.final('utf8');
}

// ─── SHA-256 Hash (for biometrics, tokens) ────────────────────────────────────
export function sha256(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

// ─── Secure random token ──────────────────────────────────────────────────────
export function generateSecureToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('hex');
}

// ─── HMAC-SHA256 (for receipt hashes) ────────────────────────────────────────
export function hmac(data: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(data).digest('hex');
}
