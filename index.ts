import "dotenv/config";
import express from "express";
import { findAllMembers, findAllRoles } from "./models/member.js";
import { apiRouter } from "./routes/api.js";

const app = express();
const PORT = process.env.PORT || 8888;

app.set("view engine", "ejs");
app.set("views", "./views");
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// 清算 API（GET /members, POST /calculate）
app.use("/", apiRouter);

// メイン画面：清算アプリの操作画面
app.get("/", async (_req, res) => {
  const [members, roles] = await Promise.all([
    findAllMembers(),
    findAllRoles(),
  ]);
  res.render("index", { members, roles });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
