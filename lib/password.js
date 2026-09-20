// Password hashing with Node's built-in scrypt. No plaintext or hash ever
// lives in a frontend file; hashes live in the user store (or, for the
// bootstrap admin, in an environment variable on Vercel).
import { scrypt, randomBytes, timingSafeEqual } from 'node:crypto';

const N = 16384, r = 8, p = 1, KEYLEN = 64;

function scryptAsync(password, salt) {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, KEYLEN, { N, r, p }, (err, key) => err ? reject(err) : resolve(key));
  });
}

export async function hashPassword(password) {
  const salt = randomBytes(16);
  const key = await scryptAsync(String(password).normalize('NFKC'), salt);
  return `scrypt$${N}$${salt.toString('base64')}$${key.toString('base64')}`;
}

// Constant-time verify. Malformed hashes verify false (never throw).
export async function verifyPassword(password, stored) {
  try {
    const [algo, n, saltB64, keyB64] = String(stored || '').split('$');
    if (algo !== 'scrypt' || Number(n) !== N) return false;
    const expected = Buffer.from(keyB64, 'base64');
    const key = await scryptAsync(String(password).normalize('NFKC'), Buffer.from(saltB64, 'base64'));
    return expected.length === key.length && timingSafeEqual(expected, key);
  } catch { return false; }
}

// A real hash of a throwaway password, used so that a login attempt for an
// unknown email costs the same time as one for a known email.
let dummy = null;
export async function dummyVerify(password) {
  if (!dummy) dummy = await hashPassword(randomBytes(12).toString('hex'));
  return verifyPassword(password, dummy);
}

export function passwordProblem(pw) {
  if (typeof pw !== 'string' || pw.length < 10) return 'Use at least 10 characters.';
  if (pw.length > 200) return 'That password is too long.';
  if (!/[a-z]/i.test(pw) || !/[0-9]/.test(pw)) return 'Include at least one letter and one number.';
  return null;
}
