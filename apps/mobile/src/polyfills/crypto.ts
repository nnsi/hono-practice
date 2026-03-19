import { getRandomValues } from "expo-crypto";

// Polyfill crypto.getRandomValues for uuid package in React Native (Hermes)
if (typeof globalThis.crypto === "undefined") {
  // @ts-expect-error partial Crypto interface
  globalThis.crypto = {};
}
if (typeof globalThis.crypto.getRandomValues !== "function") {
  // @ts-expect-error expo-crypto's getRandomValues is compatible but typed differently
  globalThis.crypto.getRandomValues = getRandomValues;
}
