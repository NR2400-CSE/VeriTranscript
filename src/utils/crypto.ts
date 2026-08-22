import CryptoJS from "crypto-js";

export async function computeFileSHA256(file: File): Promise<`0x${string}`> {
  const arrayBuffer = await file.arrayBuffer();
  const wordArray = CryptoJS.lib.WordArray.create(arrayBuffer as unknown as number[]);
  const hashHex = CryptoJS.SHA256(wordArray).toString();
  return `0x${hashHex}` as `0x${string}`;
}