const ALPHABET = "abcdefghijklmnopqrstuvwxyz";

// 8桁のランダム文字列を生成する
function generateRandomAlphabet(len: number) {
  let str = "";
  for (let i = 0; i < len; i++) {
    str += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return str;
}

export function generateNextOrder(order: string) {
  const lastCharAt = order.slice(-1).charCodeAt(0);
  return lastCharAt === 96
    ? order.slice(0, -1)
    : order.slice(0, -1) + String.fromCharCode(lastCharAt - 1);
}

export function generatePrevOrder(order: string) {
  const lastCharAt = order.slice(-1).charCodeAt(0);
  return lastCharAt === 122
    ? order + "a"
    : order.slice(0, -1) + String.fromCharCode(lastCharAt + 1);
}

export function generateOrder(
  prev: string | null | undefined,
  next: string | null | undefined
) {
  if (!prev) return next ? generateNextOrder(next) : "a";
  if (!next) return generatePrevOrder(prev);

  if (prev >= next) throw new Error("prev must be less than next");

  let order = "";
  for (let i = 0; i < prev.length; i++) {
    if (prev[i] === next[i]) {
      order += prev[i];
    } else {
      order += ALPHABET[ALPHABET.indexOf(prev[i]) + 1];
      break;
    }
  }

  if (order.length >= prev.length) {
    const nextCharCode = prev.charCodeAt(order.length) - 1;
    order += nextCharCode === 96 ? "aa" : String.fromCharCode(nextCharCode - 1);
  } else if (order.length <= next.length) {
    const nextCharCode = next.charCodeAt(order.length) - 1;
    order += nextCharCode === 96 ? "aa" : String.fromCharCode(nextCharCode);
  }

  while (order.length < Math.min(prev.length, next.length)) {
    order += generateRandomAlphabet(1);
  }

  return order;
}
