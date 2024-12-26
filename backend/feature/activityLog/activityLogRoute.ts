import { Hono } from "hono";
const app = new Hono();

/*
  endpoint: /activity-logs
  GET /{logID} : 単一ログ取得
  GET ?date=YYYY-MM-DD : 日付別ログ一覧
  GET ?month=YYYY-MM : 月別ログ一覧
  GET /stats?month=YYYY-MM : 月別統計取得
*/

export const newActivityLogRoute = app
  .get("/", (c) => {
    const { date, month } = c.req.query();

    if (date) {
      // 日付別ログ一覧
    }

    if (month) {
      // 月別ログ一覧
    }

    return c.json({ message: "success" }, 200);
  })
  .get("/:id", (c) => {
    const { id } = c.req.param();

    return c.json({ message: id }, 200);
  })
  .post("/:id", (c) => {
    const { id } = c.req.param();

    return c.json({ message: id }, 200);
  })
  .put("/:id", (c) => {
    const { id } = c.req.param();

    return c.json({ message: id }, 200);
  })
  .delete("/:id", (c) => {
    const { id } = c.req.param();

    return c.json({ message: id }, 200);
  })
  .get("/stats", (c) => {
    const { month } = c.req.query();

    return c.json({ message: month }, 200);
  });
