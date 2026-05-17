import crypto from 'crypto';
import { decrypt, encrypt } from './crypto';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const TOTP_STEP_SECONDS = 30;
const TOTP_DIGITS = 6;
const RECOVERY_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export interface StoredMfaState {
  secret: string;
  recoveryCodes: string[];
}

function toBase32(buffer: Buffer): string {
  let bits = '';

  for (const byte of buffer) {
    bits += byte.toString(2).padStart(8, '0');
  }

  let output = '';
  for (let index = 0; index < bits.length; index += 5) {
    const chunk = bits.slice(index, index + 5).padEnd(5, '0');
    output += BASE32_ALPHABET[Number.parseInt(chunk, 2)];
  }

  return output;
}

function fromBase32(input: string): Buffer {
  const normalized = input.toUpperCase().replace(/=+$/g, '');
  let bits = '';

  for (const char of normalized) {
    const value = BASE32_ALPHABET.indexOf(char);
    if (value === -1) {
      throw new Error('Invalid base32 secret');
    }
    bits += value.toString(2).padStart(5, '0');
  }

  const bytes: number[] = [];
  for (let index = 0; index + 8 <= bits.length; index += 8) {
    bytes.push(Number.parseInt(bits.slice(index, index + 8), 2));
  }

  return Buffer.from(bytes);
}

function hotp(secret: string, counter: number): string {
  const key = fromBase32(secret);
  const buffer = Buffer.alloc(8);
  buffer.writeUInt32BE(Math.floor(counter / 0x100000000), 0);
  buffer.writeUInt32BE(counter % 0x100000000, 4);

  const digest = crypto.createHmac('sha1', key).update(buffer).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const binary = ((digest[offset] & 0x7f) << 24)
    | ((digest[offset + 1] & 0xff) << 16)
    | ((digest[offset + 2] & 0xff) << 8)
    | (digest[offset + 3] & 0xff);

  return (binary % 10 ** TOTP_DIGITS).toString().padStart(TOTP_DIGITS, '0');
}

export function generateMfaSecret(bytes = 20): string {
  return toBase32(crypto.randomBytes(bytes));
}

export function generateTotpCode(secret: string, now = Date.now()): string {
  const counter = Math.floor(now / 1000 / TOTP_STEP_SECONDS);
  return hotp(secret, counter);
}

export function verifyTotpCode(secret: string, code: string, now = Date.now(), window = 1): boolean {
  const normalizedCode = code.replace(/\s+/g, '');

  if (!/^\d{6}$/.test(normalizedCode)) {
    return false;
  }

  const counter = Math.floor(now / 1000 / TOTP_STEP_SECONDS);
  for (let offset = -window; offset <= window; offset += 1) {
    if (hotp(secret, counter + offset) === normalizedCode) {
      return true;
    }
  }

  return false;
}

export function buildOtpAuthUrl(secret: string, username: string, issuer = 'NEHS'): string {
  const label = encodeURIComponent(`${issuer}:${username}`);
  const encodedIssuer = encodeURIComponent(issuer);
  return `otpauth://totp/${label}?secret=${secret}&issuer=${encodedIssuer}&algorithm=SHA1&digits=${TOTP_DIGITS}&period=${TOTP_STEP_SECONDS}`;
}

export function buildQrCodeUrl(otpauthUrl: string): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(otpauthUrl)}`;
}

export function generateRecoveryCodes(count = 5): string[] {
  return Array.from({ length: count }, () => {
    const left = Array.from({ length: 4 }, () => RECOVERY_CODE_ALPHABET[Math.floor(Math.random() * RECOVERY_CODE_ALPHABET.length)]).join('');
    const right = Array.from({ length: 4 }, () => RECOVERY_CODE_ALPHABET[Math.floor(Math.random() * RECOVERY_CODE_ALPHABET.length)]).join('');
    return `${left}-${right}`;
  });
}

export function normalizeRecoveryCode(code: string): string {
  return code.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function createMfaStateCipher(state: StoredMfaState): string {
  return encrypt(JSON.stringify(state));
}

export function parseMfaStateCipher(ciphertext: string): StoredMfaState {
  return JSON.parse(decrypt(ciphertext)) as StoredMfaState;
}
