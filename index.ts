import "dotenv/config";
import express from "express";
import { findAllMembers, findAllRoles } from "./models/member.js";
import { findAllEvents } from "./models/event.js";
import { apiRouter } from "./routes/api.js";
import { eventsRouter } from "./routes/events.js";
import { aggregateOutstanding, type DebtRecord } from "./services/ledger.js";

const app = express();
const PORT = process.env.PORT || 8888;

app.set("view engine", "ejs");
app.set("views", "./views");
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// API（GET /members, POST /calculate, POST /events, PATCH /debts/:id, DELETE /events/:id）
app.use("/", apiRouter);
app.use("/", eventsRouter);

// 会の見出し（タイトル or 日付）
function eventLabel(e: { title: string | null; createdAt: Date }) {
  if (e.title) return e.title;
  return new Date(e.createdAt).toLocaleDateString("ja-JP");
}

// メイン画面：清算アプリ＋過去の記録
app.get("/", async (_req, res) => {
  const [members, roles, events] = await Promise.all([
    findAllMembers(),
    findAllRoles(),
    findAllEvents(),
  ]);

  // 未清算の債務を集めて相殺
  const outstanding: DebtRecord[] = [];
  for (const e of events) {
    for (const d of e.debts) {
      if (!d.settled) {
        outstanding.push({
          fromName: d.fromName,
          toName: d.toName,
          amount: d.amount,
          eventLabel: eventLabel(e),
        });
      }
    }
  }
  const aggregated = aggregateOutstanding(outstanding);

  res.render("index", {
    members,
    roles,
    events: events.map((e) => ({
      id: e.id,
      label: eventLabel(e),
      totalAmount: e.totalAmount,
      debts: e.debts,
    })),
    aggregated,
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
