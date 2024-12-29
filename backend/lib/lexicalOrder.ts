const CHAR_CODE_A = "a".charCodeAt(0);
const CHAR_CODE_Z = "z".charCodeAt(0);

function generateRandomAlphabet(len: number) {
  let result = "";
  for (let i = 0; i < len; i++) {
    result += String.fromCharCode(97 + Math.floor(Math.random() * 26));
  }
  return result;
}

export function generateOrder(
  prev: string | null | undefined,
  next: string | null | undefined,
) {
  if (!prev) {
    if (!next) return generateRandomAlphabet(8);

    const lastNextChar = next.slice(-1).charCodeAt(0);
    if (lastNextChar === CHAR_CODE_A) return next.slice(0, -1);
    return next.slice(0, -1) + String.fromCharCode(lastNextChar - 1);
  }
  if (!next) {
    const lastPrevChar = prev.slice(-1).charCodeAt(0);
    if (lastPrevChar === CHAR_CODE_Z) return prev + "a";
    return prev.slice(0, -1) + String.fromCharCode(lastPrevChar + 1);
  }

  if (prev >= next) {
    throw new Error("'prev' must be lexicographically less than 'next'");
  }

  let i = 0;
  const minLength = Math.min(prev.length, next.length);

  while (i < minLength && prev[i] === next[i]) {
    i++;
  }

  if (i === minLength && prev.length < next.length) {
    const lastNextChar = next.charCodeAt(next.length - 1);
    if (lastNextChar === CHAR_CODE_A) {
      if (next.length - prev.length === 1) {
        throw new Error("cannot generate: next is already the last order");
      } else {
        return next.slice(0, -1);
      }
    }
    return (
      next.slice(0, -1) +
      String.fromCharCode(Math.floor((CHAR_CODE_A + lastNextChar) / 2))
    );
  }

  const prevCharCode = prev.charCodeAt(i);
  const nextCharCode = next.charCodeAt(i);

  if (nextCharCode - prevCharCode > 1) {
    const midCharCode = Math.floor((prevCharCode + nextCharCode) / 2);
    return prev.slice(0, i) + String.fromCharCode(midCharCode);
  } else {
    const prevLastCode = prev.charCodeAt(prev.length - 1);
    if (prev.length > next.length) {
      if (prevLastCode === CHAR_CODE_Z) {
        return prev + "a";
      }
    }
    return (
      prev.slice(0, i + 1) +
      String.fromCharCode(Math.floor(prevLastCode + CHAR_CODE_Z) / 2)
    );
  }
}
