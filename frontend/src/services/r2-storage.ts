/**
 * Cloudflare R2 Cloud Storage Service for AurasMatch.
 * Direct S3-compatible API implementation using AWS Signature Version 4 (SigV4)
 * with zero external dependencies and pure JS synchronous cryptography.
 * Fulfills storage requirements for user-uploaded looks and community feed images.
 */

const R2_ACCOUNT_ID = (process.env.EXPO_PUBLIC_R2_ACCOUNT_ID || '').trim();
const R2_ACCESS_KEY = (process.env.EXPO_PUBLIC_R2_ACCESS_KEY || '').trim();
const R2_SECRET_KEY = (process.env.EXPO_PUBLIC_R2_SECRET_KEY || '').trim();
const R2_BUCKET = (process.env.EXPO_PUBLIC_R2_BUCKET || 'auras-match').trim();
const R2_PUBLIC_URL = (process.env.EXPO_PUBLIC_R2_PUBLIC_URL || '').trim().replace(/\/+$/, '');
const R2_REGION = 'auto';

export const isR2Configured = Boolean(
  R2_ACCOUNT_ID && R2_ACCESS_KEY && R2_SECRET_KEY && R2_BUCKET
);

// ============================================================================
// Pure JS Synchronous SHA-256 and HMAC-SHA256 (Zero external packages/dependencies)
// ============================================================================
const K = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
];

function rotr(n: number, b: number): number {
  return (n >>> b) | (n << (32 - b));
}

function toUtf8Bytes(str: string): number[] {
  const bytes: number[] = [];
  for (let i = 0; i < str.length; i++) {
    let code = str.charCodeAt(i);
    if (code < 0x80) {
      bytes.push(code);
    } else if (code < 0x800) {
      bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    } else if (code < 0xd800 || code >= 0xe000) {
      bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
    } else {
      i++;
      code = 0x10000 + (((code & 0x3ff) << 10) | (str.charCodeAt(i) & 0x3ff));
      bytes.push(
        0xf0 | (code >> 18),
        0x80 | ((code >> 12) & 0x3f),
        0x80 | ((code >> 6) & 0x3f),
        0x80 | (code & 0x3f)
      );
    }
  }
  return bytes;
}

function sha256Bytes(data: string | number[] | Uint8Array): number[] {
  let bytes: number[];
  if (typeof data === 'string') {
    bytes = toUtf8Bytes(data);
  } else {
    bytes = Array.from(data);
  }

  const bitLength = bytes.length * 8;
  bytes.push(0x80);
  while ((bytes.length + 8) % 64 !== 0) {
    bytes.push(0);
  }

  const highBits = Math.floor(bitLength / 0x100000000);
  const lowBits = bitLength >>> 0;
  bytes.push(
    (highBits >>> 24) & 0xff,
    (highBits >>> 16) & 0xff,
    (highBits >>> 8) & 0xff,
    highBits & 0xff,
    (lowBits >>> 24) & 0xff,
    (lowBits >>> 16) & 0xff,
    (lowBits >>> 8) & 0xff,
    lowBits & 0xff
  );

  let h0 = 0x6a09e667;
  let h1 = 0xbb67ae85;
  let h2 = 0x3c6ef372;
  let h3 = 0xa54ff53a;
  let h4 = 0x510e527f;
  let h5 = 0x9b05688c;
  let h6 = 0x1f83d9ab;
  let h7 = 0x5be0cd19;

  const w = new Int32Array(64);

  for (let chunk = 0; chunk < bytes.length; chunk += 64) {
    for (let i = 0; i < 16; i++) {
      const idx = chunk + i * 4;
      w[i] =
        (bytes[idx] << 24) |
        (bytes[idx + 1] << 16) |
        (bytes[idx + 2] << 8) |
        bytes[idx + 3];
    }
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (((w[i - 16] + s0) | 0) + ((w[i - 7] + s1) | 0)) | 0;
    }

    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;
    let f = h5;
    let g = h6;
    let h = h7;

    for (let i = 0; i < 64; i++) {
      const s1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (((h + s1) | 0) + ((ch + K[i]) | 0) + w[i]) | 0;
      const s0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (s0 + maj) | 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) | 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) | 0;
    }

    h0 = (h0 + a) | 0;
    h1 = (h1 + b) | 0;
    h2 = (h2 + c) | 0;
    h3 = (h3 + d) | 0;
    h4 = (h4 + e) | 0;
    h5 = (h5 + f) | 0;
    h6 = (h6 + g) | 0;
    h7 = (h7 + h) | 0;
  }

  const out: number[] = [];
  const hashWords = [h0, h1, h2, h3, h4, h5, h6, h7];
  for (let i = 0; i < 8; i++) {
    out.push(
      (hashWords[i] >>> 24) & 0xff,
      (hashWords[i] >>> 16) & 0xff,
      (hashWords[i] >>> 8) & 0xff,
      hashWords[i] & 0xff
    );
  }
  return out;
}

function sha256Hex(data: string | number[] | Uint8Array): string {
  return sha256Bytes(data)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function hmacSha256Bytes(key: string | number[] | Uint8Array, message: string | number[] | Uint8Array): number[] {
  let keyBytes = typeof key === 'string' ? toUtf8Bytes(key) : Array.from(key);
  const msgBytes = typeof message === 'string' ? toUtf8Bytes(message) : Array.from(message);

  if (keyBytes.length > 64) {
    keyBytes = sha256Bytes(keyBytes);
  }
  while (keyBytes.length < 64) {
    keyBytes.push(0);
  }

  const oKeyPad = new Array(64);
  const iKeyPad = new Array(64);
  for (let i = 0; i < 64; i++) {
    oKeyPad[i] = keyBytes[i] ^ 0x5c;
    iKeyPad[i] = keyBytes[i] ^ 0x36;
  }

  const inner = sha256Bytes(iKeyPad.concat(msgBytes));
  return sha256Bytes(oKeyPad.concat(inner));
}

function hmacSha256Hex(key: string | number[] | Uint8Array, message: string | number[] | Uint8Array): string {
  return hmacSha256Bytes(key, message)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ============================================================================
// Cloudflare R2 Public & Presigned URL Resolution
// ============================================================================

/**
 * Returns a full HTTPS URL for reading an image from Cloudflare R2.
 * - If EXPO_PUBLIC_R2_PUBLIC_URL is configured, returns the fast CDN public URL.
 * - If not, generates an authenticated AWS SigV4 Presigned GET URL (synchronously)
 *   valid for 24 hours, so mobile images render seamlessly without any 403 error.
 */
export function getPresignedR2Url(keyPath: string, expiresInSeconds: number = 86400): string | null {
  if (!keyPath) return null;
  const cleanPath = keyPath.trim().replace(/^\/+/, '');

  // 1. If public domain is configured, use it directly (best for CDN edge caching)
  if (R2_PUBLIC_URL) {
    return `${R2_PUBLIC_URL}/${cleanPath}`;
  }

  // 2. Fall back to generating an authenticated Presigned GET URL using R2 keys
  if (!isR2Configured) {
    return null;
  }

  const host = `${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);
  const credentialScope = `${dateStamp}/${R2_REGION}/s3/aws4_request`;

  const queryParams: Record<string, string> = {
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Credential': `${R2_ACCESS_KEY}/${credentialScope}`,
    'X-Amz-Date': amzDate,
    'X-Amz-Expires': expiresInSeconds.toString(),
    'X-Amz-SignedHeaders': 'host',
  };

  const canonicalQuery = Object.keys(queryParams)
    .sort()
    .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(queryParams[k])}`)
    .join('&');

  const canonicalUri = `/${R2_BUCKET}/${cleanPath}`;
  const canonicalHeaders = `host:${host}\n`;
  const signedHeaders = 'host';
  const payloadHash = 'UNSIGNED-PAYLOAD';

  const canonicalRequest = [
    'GET',
    canonicalUri,
    canonicalQuery,
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n');

  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join('\n');

  const kDate = hmacSha256Bytes(`AWS4${R2_SECRET_KEY}`, dateStamp);
  const kRegion = hmacSha256Bytes(kDate, R2_REGION);
  const kService = hmacSha256Bytes(kRegion, 's3');
  const kSigning = hmacSha256Bytes(kService, 'aws4_request');
  const signature = hmacSha256Hex(kSigning, stringToSign);

  return `https://${host}${canonicalUri}?${canonicalQuery}&X-Amz-Signature=${signature}`;
}

// ============================================================================
// Direct Cloudflare R2 Upload via AWS SigV4
// ============================================================================

/**
 * Uploads an image binary directly to Cloudflare R2 bucket `auras-match` using AWS SigV4.
 *
 * @param imageUri - Local file URI (file://...), blob URI, or data URL
 * @param folder - Destination folder prefix in R2 (defaults to 'user_looks')
 * @returns Object with the relative `r2Path` to store in `looks.image_path`, and the display `url`
 */
export async function uploadImageToR2(
  imageUri: string,
  folder: string = 'user_looks'
): Promise<{ r2Path: string; url: string }> {
  if (!isR2Configured) {
    throw new Error(
      'Cloudflare R2 no está configurado en las variables de entorno (.env). Faltan credenciales.'
    );
  }

  // 1. Fetch binary data from the local URI
  const imageResponse = await fetch(imageUri);
  if (!imageResponse.ok) {
    throw new Error(`No se pudo leer la imagen seleccionada: ${imageResponse.statusText}`);
  }
  const blob = await imageResponse.blob();

  // 2. Generate unique path
  const fileId = generateUUID();
  const cleanFolder = folder.replace(/^\/+|\/+$/g, '');
  const r2Path = `${cleanFolder}/${fileId}.jpg`;

  // 3. Prepare AWS SigV4 authorization headers
  const host = `${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);
  const credentialScope = `${dateStamp}/${R2_REGION}/s3/aws4_request`;

  const canonicalUri = `/${R2_BUCKET}/${r2Path}`;
  const canonicalQuery = '';

  const headers: Record<string, string> = {
    'content-type': blob.type || 'image/jpeg',
    host: host,
    'x-amz-content-sha256': 'UNSIGNED-PAYLOAD',
    'x-amz-date': amzDate,
  };

  const signedHeaders = Object.keys(headers).sort().join(';');
  const canonicalHeaders = Object.keys(headers)
    .sort()
    .map((k) => `${k}:${headers[k]}\n`)
    .join('');

  const canonicalRequest = [
    'PUT',
    canonicalUri,
    canonicalQuery,
    canonicalHeaders,
    signedHeaders,
    'UNSIGNED-PAYLOAD',
  ].join('\n');

  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join('\n');

  const kDate = hmacSha256Bytes(`AWS4${R2_SECRET_KEY}`, dateStamp);
  const kRegion = hmacSha256Bytes(kDate, R2_REGION);
  const kService = hmacSha256Bytes(kRegion, 's3');
  const kSigning = hmacSha256Bytes(kService, 'aws4_request');
  const signature = hmacSha256Hex(kSigning, stringToSign);

  const authHeader = `AWS4-HMAC-SHA256 Credential=${R2_ACCESS_KEY}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  // 4. Send PUT request to R2
  const putUrl = `https://${host}${canonicalUri}`;
  const uploadResponse = await fetch(putUrl, {
    method: 'PUT',
    headers: {
      ...headers,
      Authorization: authHeader,
    },
    body: blob,
  });

  if (!uploadResponse.ok) {
    const errorBody = await uploadResponse.text();
    throw new Error(
      `Error al subir imagen a Cloudflare R2 (${uploadResponse.status} ${uploadResponse.statusText}): ${errorBody}`
    );
  }

  const resolvedUrl = getPresignedR2Url(r2Path) || imageUri;

  return {
    r2Path,
    url: resolvedUrl,
  };
}

