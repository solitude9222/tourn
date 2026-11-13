/* ---------------------------------------------------------------------------
   Trade chat encryption.

   Each account gets a P-256 key pair on this device, kept in localStorage and
   never uploaded. Messages are encrypted with an AES-GCM key derived from the
   two public keys, so the server only ever stores ciphertext. A different
   device has a different key pair, which is why older messages may read as
   locked there — that is the cost of the server never holding a key.
   --------------------------------------------------------------------------- */

type StoredKeys = { publicKey: JsonWebKey; privateKey: JsonWebKey };
const STORE = "tourn.e2ee.v1";
const ALGO = { name: "ECDH", namedCurve: "P-256" } as const;

function readStore(): Record<string, StoredKeys> {
  try {
    const raw = localStorage.getItem(STORE);
    return raw ? (JSON.parse(raw) as Record<string, StoredKeys>) : {};
  } catch {
    return {};
  }
}

async function keyPair(userId: string): Promise<CryptoKeyPair> {
  const stored = readStore()[userId];
  if (stored) {
    try {
      const privateKey = await crypto.subtle.importKey("jwk", stored.privateKey, ALGO, false, ["deriveBits"]);
      const publicKey = await crypto.subtle.importKey("jwk", stored.publicKey, ALGO, true, []);
      return { privateKey, publicKey };
    } catch {
      /* corrupt entry — generate a fresh pair */
    }
  }
  const pair = (await crypto.subtle.generateKey(ALGO, true, ["deriveBits"])) as CryptoKeyPair;
  const all = readStore();
  all[userId] = {
    publicKey: await crypto.subtle.exportKey("jwk", pair.publicKey),
    privateKey: await crypto.subtle.exportKey("jwk", pair.privateKey),
  };
  try {
    localStorage.setItem(STORE, JSON.stringify(all));
  } catch {
    /* private mode: the pair still works for this tab */
  }
  return pair;
}

export async function myPublicKey(userId: string): Promise<JsonWebKey> {
  const pair = await keyPair(userId);
  return crypto.subtle.exportKey("jwk", pair.publicKey);
}

async function sharedKey(userId: string, peer: JsonWebKey): Promise<CryptoKey> {
  const mine = await keyPair(userId);
  const peerKey = await crypto.subtle.importKey("jwk", peer, ALGO, false, []);
  const bits = await crypto.subtle.deriveBits({ name: "ECDH", public: peerKey }, mine.privateKey, 256);
  const material = await crypto.subtle.importKey("raw", bits, "HKDF", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: new Uint8Array(16),
      info: new TextEncoder().encode("tourn-trade-v1"),
    },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

const toBase64 = (buffer: ArrayBuffer | ArrayBufferView) => {
  const bytes = ArrayBuffer.isView(buffer)
    ? new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength)
    : new Uint8Array(buffer);
  return btoa(String.fromCharCode(...bytes));
};
const fromBase64 = (value: string) => Uint8Array.from(atob(value), (char) => char.charCodeAt(0));

export async function encryptMessage(
  userId: string,
  peer: JsonWebKey,
  text: string,
): Promise<{ cipher: string; iv: string }> {
  const key = await sharedKey(userId, peer);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(text));
  return { cipher: toBase64(cipher), iv: toBase64(iv) };
}

export async function decryptMessage(
  userId: string,
  peer: JsonWebKey,
  cipher: string,
  iv: string,
): Promise<string> {
  const key = await sharedKey(userId, peer);
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fromBase64(iv) as unknown as BufferSource },
    key,
    fromBase64(cipher) as unknown as BufferSource,
  );
  return new TextDecoder().decode(plain);
}
