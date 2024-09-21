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

  let order = prev;
  // 'z' 以外の場合は 'a' を追加
  if (prev[prev.length - 1] !== "z") {
    order += "a";
  } else {
    // 'z' の場合は、末尾の 'z' を除去して、その前の文字をインクリメント
    let i = prev.length - 1;
    while (i >= 0 && prev[i] === "z") {
      i--;
    }
    if (i < 0) {
      // すべて 'z' の場合
      order = "a";
    } else {
      const charCode = prev.charCodeAt(i) + 1;
      order = prev.substring(0, i) + String.fromCharCode(charCode);
    }
  }

  // order が next よりも大きくなるまで 'a' を追加
  while (order >= next) {
    order += "a";
  }

  return order;
}
