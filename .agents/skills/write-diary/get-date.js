// JST基準で現在の日付と時刻を出力する
const now = new Date();
const jst = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));

const year = jst.getFullYear();
const month = String(jst.getMonth() + 1).padStart(2, "0");
const day = String(jst.getDate()).padStart(2, "0");
const hours = String(jst.getHours()).padStart(2, "0");
const minutes = String(jst.getMinutes()).padStart(2, "0");

console.log(`${year}-${month}-${day} ${hours}:${minutes} JST`);
