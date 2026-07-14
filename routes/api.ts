import { Router } from "express";
import { findAllMembers } from "../models/member.js";
import {
  calculateSettlement,
  type ParticipantInput,
} from "../services/settlement.js";

export const apiRouter = Router();

// メンバー一覧を取得する（名前の候補などに使う）
apiRouter.get("/members", async (_req, res) => {
  const members = await findAllMembers();
  res.json(
    members.map((m) => ({
      id: m.id,
      name: m.name,
      role: m.role.name,
      ratio: m.role.ratio,
    }))
  );
});

// 清算計算を実行する
//   リクエスト: { participants: [{ name, ratio, is_drinking, amount_paid, is_organizer }], total_amount? }
//   合計金額は省略時、立替額の合計を使う
apiRouter.post("/calculate", (req, res) => {
  try {
    const { participants, total_amount } = req.body ?? {};

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

    const result = calculateSettlement({
      participants: inputs,
      totalAmount:
        typeof total_amount === "number" ? total_amount : undefined,
    });

    res.json({
      total_amount: result.total_amount,
      organizer_benefit: result.organizer_benefit,
      transfers: result.transfers,
      exact_transfers: result.exact_transfers,
      shares: result.shares.map((s) => ({
        name: s.name,
        exact_share: s.exactShare,
        rounded_share: s.roundedShare,
        amount_paid: s.amountPaid,
      })),
    });
  } catch (err) {
    res
      .status(400)
      .json({ error: err instanceof Error ? err.message : "計算に失敗しました" });
  }
});
