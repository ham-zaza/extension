export default function modExp(base, exp, mod) {
    let result = 1n;
    let b = base % mod;
    let e = exp;

    while (e > 0n) {
        if (e % 2n === 1n) {
            result = (result * b) % mod;
        }
        b = (b * b) % mod;
        e = e / 2n;
    }
    return result;
}