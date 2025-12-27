/* =====================================================
   src/utils/cryptoUtils.js
   COMPLETE LIBRARY: ZKP MATH + VAULT ENCRYPTION
===================================================== */

// --- SECTION 1: ZKP CONSTANTS & MATH (For Login) ---

export const ZKP_PARAMS = {
    p: 0xffffffff00000001000000000000000000000000ffffffffffffffffffffffffn,
    q: 0x7fffffff800000008000000000000000000000007fffffffffffffffffffffffn,
    g: 0x2n,
    h: 0x4n
};

export function modExp(base, exp, mod) {
    let result = 1n;
    let b = base % mod;
    let e = exp;
    while (e > 0n) {
        if (e & 1n) result = (result * b) % mod;
        b = (b * b) % mod;
        e >>= 1n;
    }
    return result;
}

// Internal Helper (Not Exported)
async function fiatShamirHash(g, h, y, z, a, b, domain, timestamp) {
    const transcript = g + h + y + z + a + b + domain + timestamp;
    const encoder = new TextEncoder();
    const data = encoder.encode(transcript);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return BigInt('0x' + hashHex) % ZKP_PARAMS.q;
}

// ✅ REQUIRED BY LOGIN FORM
export async function computeProof(secretX, domain = "chrome-extension://zk-auth") {
    const timestamp = Math.floor(Date.now() / 1000);
    const kBytes = new Uint8Array(32);
    window.crypto.getRandomValues(kBytes);
    const kHex = Array.from(kBytes).map(b => b.toString(16).padStart(2, '0')).join('');
    const k = BigInt('0x' + kHex) % ZKP_PARAMS.q;

    const a = modExp(ZKP_PARAMS.g, k, ZKP_PARAMS.p);
    const b = modExp(ZKP_PARAMS.h, k, ZKP_PARAMS.p);
    const y = modExp(ZKP_PARAMS.g, secretX, ZKP_PARAMS.p);
    const z = modExp(ZKP_PARAMS.h, secretX, ZKP_PARAMS.p);

    const c = await fiatShamirHash(
        ZKP_PARAMS.g.toString(), ZKP_PARAMS.h.toString(), y.toString(), z.toString(),
        a.toString(), b.toString(), domain, timestamp.toString()
    );

    const s = (k + c * secretX) % ZKP_PARAMS.q;

    return { a: a.toString(), b: b.toString(), s: s.toString(), timestamp, domain };
}

// ✅ REQUIRED FOR NEW USERS
export function generateRandomSecret() {
    const bytes = new Uint8Array(32);
    window.crypto.getRandomValues(bytes);
    const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
    return BigInt('0x' + hex) % ZKP_PARAMS.q;
}


// --- SECTION 2: VAULT ENCRYPTION (For PIN Setup) ---

// ✅ REQUIRED BY PIN SETUP
export async function deriveKeyFromPIN(pin, saltString = null) {
    const enc = new TextEncoder();
    let salt;
    if (saltString) {
        salt = new Uint8Array(saltString.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
    } else {
        salt = crypto.getRandomValues(new Uint8Array(16));
    }

    const keyMaterial = await crypto.subtle.importKey(
        "raw",
        enc.encode(pin),
        { name: "PBKDF2" },
        false,
        ["deriveKey"]
    );

    const key = await crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            salt: salt,
            iterations: 100000,
            hash: "SHA-256"
        },
        keyMaterial,
        { name: "AES-GCM", length: 256 },
        true,
        ["encrypt", "decrypt"]
    );

    return {
        aesKey: key, // Note: Returned as aesKey to match your PinSetup logic
        salt: Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('')
    };
}

// ✅ REQUIRED BY PIN SETUP
export async function encryptPrivateKey(data, key, salt) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const enc = new TextEncoder();
    const encrypted = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv: iv },
        key,
        enc.encode(data)
    );
    return {
        encrypted: Array.from(new Uint8Array(encrypted)).map(b => b.toString(16).padStart(2, '0')).join(''),
        iv: Array.from(iv).map(b => b.toString(16).padStart(2, '0')).join(''),
        salt: salt
    };
}

// ✅ REQUIRED BY LOCK SCREEN
export async function decryptPrivateKey(storageData, pin) {
    const { aesKey } = await deriveKeyFromPIN(pin, storageData.salt);
    const iv = new Uint8Array(storageData.iv.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
    const encryptedData = new Uint8Array(storageData.encrypted.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
    const decrypted = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: iv },
        aesKey,
        encryptedData
    );
    return new TextDecoder().decode(decrypted);
}

// ✅ EXPORT HELPER (just in case other files import it differently)
export async function getPublicKeys(secretX) {
    const y = modExp(ZKP_PARAMS.g, secretX, ZKP_PARAMS.p);
    const z = modExp(ZKP_PARAMS.h, secretX, ZKP_PARAMS.p);
    return { y: y.toString(), z: z.toString() };
}