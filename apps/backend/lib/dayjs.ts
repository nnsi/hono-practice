import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";

dayjs.extend(utc);

/**
 * clientDate 未指定時のサーバー側フォールバックとして「今日」を YYYY-MM-DD で返す。
 *
 * このモジュールの default export は `dayjs.utc` のため、`dayjs().format("YYYY-MM-DD")`
 * は UTC 基準の日付になり、JST 00:00〜09:00 の間は「今日」が1日前にずれる。
 * Actiko のユーザーベースは JST 前提なので UTC+9 で日付を導出する。
 * （tz プラグインは未導入のため add(9, "hour") で JST の壁時計時刻に変換する）
 */
export function getServerTodayInJst(): string {
  return dayjs.utc().add(9, "hour").format("YYYY-MM-DD");
}

export default dayjs.utc;
