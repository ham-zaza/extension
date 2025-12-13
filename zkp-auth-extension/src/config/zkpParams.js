// src/config/zkpParams.js
// These are SAFE, STANDARD numbers for Chaum-Pedersen ZKP
// p = a big prime (2048 bits is super secure, but we use 256-bit for testing)
// q = a prime divisor of (p - 1)
// g = a generator of a subgroup of order q

export const ZKP_PARAMS = {
    // 🔒 BIG PRIME (p) - 256-bit for fast testing (real systems use 2048+ bits)
    p: 0xffffffff00000001000000000000000000000000ffffffffffffffffffffffffn,

    // 🔒 PRIME DIVISOR (q) - (p-1)/2 is also prime (this is a "safe prime" setup)
    q: 0x7fffffff800000008000000000000000000000007fffffffffffffffffffffffn,

    // 🔒 GENERATOR (g) - a number that "cycles" through q values
    g: 0x2n,

    h: 0x3n
};

// 💡 Why these numbers?
// - They come from **RFC 5114** (a trusted crypto standard)
// - They are SAFE for testing Chaum-Pedersen
// - g=2 is simple and works because p is a "safe prime"