// popup.js — FYP-Ready ZK-Auth Popup (Modules 1–3 Complete)
import { modExp } from './src/utils/modExp.js';
import { ZKP_PARAMS } from './src/config/zkpParams.js';
import {
    deriveKeyFromPIN,
    encryptPrivateKey,
    decryptPrivateKey
} from './src/utils/cryptoUtils.js';



// UI Elements
const pinSetup = document.getElementById('pinSetup');
const lockScreen = document.getElementById('lockScreen');
const loginForm = document.getElementById('loginForm');
const pinInput = document.getElementById('pinInput');
const unlockPin = document.getElementById('unlockPin');
const setPinBtn = document.getElementById('setPinBtn');
const unlockBtn = document.getElementById('unlockBtn');
const registerBtn = document.getElementById('registerBtn');
const loginBtn = document.getElementById('loginBtn');
const statusEl = document.getElementById('status');

// State
let secretX = null;
let lastActivity = Date.now();

// Auto-lock after 2 minutes (120,000 ms)
setInterval(() => {
    if (secretX !== null && Date.now() - lastActivity > 120000) {
        secretX = null;
        showLockScreen();
    }
}, 30000);

function updateActivity() {
    lastActivity = Date.now();
}

function showPinSetup() {
    pinSetup.style.display = 'block';
    lockScreen.style.display = 'none';
    loginForm.style.display = 'none';
}

function showLockScreen() {
    pinSetup.style.display = 'none';
    lockScreen.style.display = 'block';
    loginForm.style.display = 'none';
}

function showLoginForm() {
    pinSetup.style.display = 'none';
    lockScreen.style.display = 'none';
    loginForm.style.display = 'block';
}

// Check if user is set up
async function checkSetup() {
    const data = await chrome.storage.local.get(['encryptedX']);
    if (data.encryptedX) {
        showLockScreen();
    } else {
        showPinSetup();
    }
}

// Set PIN and generate keypair
setPinBtn.addEventListener('click', async () => {
    const pin = pinInput.value;
    if (!/^\d{6}$/.test(pin)) {
        statusEl.textContent = 'PIN must be 6 digits';
        return;
    }

    // Generate random secret x
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    const x = BigInt('0x' + Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('')) % ZKP_PARAMS.q;

    // Derive key and encrypt
    const { aesKey, salt } = await deriveKeyFromPIN(pin);
    const encryptedData = await encryptPrivateKey(x.toString(), aesKey, salt);

    await chrome.storage.local.set({
        encryptedX: encryptedData.encrypted,
        iv: encryptedData.iv,
        salt: encryptedData.salt,
        pinSet: true
    });

    secretX = x;
    statusEl.textContent = '✅ PIN set! Generating keys...';
    showLoginForm();
});

// Unlock with PIN
unlockBtn.addEventListener('click', async () => {
    const pin = unlockPin.value;
    if (!/^\d{6}$/.test(pin)) {
        statusEl.textContent = 'Enter 6-digit PIN';
        return;
    }

    const data = await chrome.storage.local.get(['encryptedX', 'iv', 'salt']);
    if (!data.encryptedX) {
        statusEl.textContent = 'No account found. Set up first.';
        return;
    }

    try {
        const xStr = await decryptPrivateKey({
            encrypted: data.encryptedX,
            iv: data.iv,
            salt: data.salt
        }, pin);
        secretX = BigInt(xStr);
        unlockPin.value = '';
        statusEl.textContent = '🔓 Unlocked!';
        showLoginForm();
    } catch (e) {
        statusEl.textContent = '❌ Wrong PIN';
    }
});

// Register user
registerBtn.addEventListener('click', async () => {
    updateActivity();
    const username = document.getElementById('username').value.trim();
    if (!username || !secretX) {
        statusEl.textContent = 'Enter username and unlock first';
        return;
    }

    const y = modExp(ZKP_PARAMS.g, secretX, ZKP_PARAMS.p);
    const z = modExp(ZKP_PARAMS.h, secretX, ZKP_PARAMS.p);

    console.log("🚀 Sending registration to:", `http://localhost:3000/api/register`);
    console.log("📝 Username:", username);
    console.log("🔑 Public Key Y:", y.toString());
    console.log("🔑 Public Key Z:", z.toString());

    try {
        const res = await fetch('http://localhost:3000/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, publicKeyY: y.toString(), publicKeyZ: z.toString() })
        });

        if (res.ok) {
            statusEl.textContent = '✅ Registered!';
        } else {
            const err = await res.json();
            statusEl.textContent = `❌ ${err.message || 'Registration failed'}`;
        }
    } catch (e) {
        statusEl.textContent = `Error: ${e.message}`;
    }
});

// Login with non-interactive ZKP
loginBtn.addEventListener('click', async () => {
    updateActivity();
    const username = document.getElementById('username').value.trim();
    if (!username || !secretX) {
        statusEl.textContent = 'Enter username and unlock first';
        return;
    }

    statusEl.textContent = '🔄 Attempting login...';

    let successCount = 0;
    let failureCount = 0;
    const totalAttempts = 10;

    for (let attempt = 1; attempt <= totalAttempts; attempt++) {
        try {
            const y = modExp(ZKP_PARAMS.g, secretX, ZKP_PARAMS.p);
            const z = modExp(ZKP_PARAMS.h, secretX, ZKP_PARAMS.p);

            // Generate random k
            const array = new Uint8Array(32);
            crypto.getRandomValues(array);
            const k = BigInt('0x' + Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('')) % ZKP_PARAMS.q;

            const a = modExp(ZKP_PARAMS.g, k, ZKP_PARAMS.p);
            const b = modExp(ZKP_PARAMS.h, k, ZKP_PARAMS.p);

            // Fiat-Shamir: c = H(g, h, y, z, a, b, domain, timestamp)
            const domain = chrome.runtime.getURL('');
            const timestamp = Math.floor(Date.now() / 1000);

            console.log(`🚀 Attempt ${attempt} - Sending domain:`, domain);
            console.log(`🕒 Attempt ${attempt} - Timestamp:`, timestamp);

            const encoder = new TextEncoder();
            const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(
                ZKP_PARAMS.g.toString() +
                ZKP_PARAMS.h.toString() +
                y.toString() +
                z.toString() +
                a.toString() +
                b.toString() +
                domain +
                timestamp.toString()
            ));
            const hashHex = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
            const c = BigInt('0x' + hashHex) % ZKP_PARAMS.q;

            // Response s = k + c * x mod q
            const s = (k + c * secretX) % ZKP_PARAMS.q;

            console.log(`📊 Attempt ${attempt} - Proof Details:`);
            console.log("a =", a.toString());
            console.log("b =", b.toString());
            console.log("c =", c.toString());
            console.log("s =", s.toString());

            const res = await fetch('http://localhost:3000/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username,
                    a: a.toString(),
                    b: b.toString(),
                    s: s.toString(),
                    domain,
                    timestamp
                })
            });

            if (res.ok) {
                successCount++;
                console.log(`✅ Attempt ${attempt} - Login successful!`);
                if (successCount === 1) {
                    statusEl.textContent = '✅ Login successful!';
                    return; // Exit on first success
                }
            } else {
                failureCount++;
                const err = await res.json();
                console.log(`❌ Attempt ${attempt} - Login failed: ${err.error || 'Unknown error'}`);
            }
        } catch (e) {
            failureCount++;
            console.log(`💥 Attempt ${attempt} - Error: ${e.message}`);
        }

        // Update status after each attempt
        if (successCount === 0) {
            statusEl.textContent = '🔄 Attempting login...';
        }
    }

    // If we reach here, all attempts failed
    statusEl.textContent = '❌ Login failed';
});

// Initialize
checkSetup();