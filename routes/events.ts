import { Router } from "express";
import {
  calculateSettlement,
  type ParticipantInput,
} from "../services/settlement.js";
import {
  createEvent,
  setDebtSettled,
  deleteEvent,
} from "../models/event.js";

export const eventsRouter = Router();

// 飲み会を記録する（サーバー側で再計算し、100円単位の送金を Debt として保存）
eventsRouter.post("/events", async (req, res) => {
  try {
    const { title, participants } = req.body ?? {};
    if (!Array.isArray(participants) || participants.length === 0) {
      return res.status(400).json({ error: "participants が空です" });
    }

    const inputs: ParticipantInput[] = participants.map((p: any) => {
      const ratio = Number(p.ratio);
      if (!Number.isFinite(ratio) || ratio <= 0) {
        throw new Error(`役職比率(ratio)が不正です: ${p.name ?? ""}`);
      }
      return {
        name: String(p.name ?? "名無し"),
        roleRatio: ratio,
        isDrinking: Boolean(p.is_drinking),
        amountPaid: Number(p.amount_paid) || 0,
        isOrganizer: Boolean(p.is_organizer),
      };
    });

    const result = calculateSettlement({ participants: inputs });

    const event = await createEvent({
      title: title ? String(title).slice(0, 100) : null,
      totalAmount: result.total_amount,
      participants,
      transfers: result.transfers, // 100円単位
    });

    res.json({ id: event.id });
  } catch (err) {
    res
      .status(400)
      .json({ error: err instanceof Error ? err.message : "記録に失敗しました" });
  }
});

// 清算済みフラグの切り替え
eventsRouter.patch("/debts/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const settled = Boolean(req.body?.settled);
    await setDebtSettled(id, settled);
    res.json({ ok: true });
  } catch {
    res.status(400).json({ error: "更新に失敗しました" });
  }
});

// 記録の削除
eventsRouter.delete("/events/:id", async (req, res) => {
  try {
    await deleteEvent(Number(req.params.id));
    res.json({ ok: true });
  } catch {
    res.status(400).json({ error: "削除に失敗しました" });
  }
});
