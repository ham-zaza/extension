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
        aesKey: key,
        salt: Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('')
    };
}

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