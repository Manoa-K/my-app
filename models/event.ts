import { prisma } from "./prisma.js";
import type { Transfer } from "../services/settlement.js";

/** 飲み会を記録する（送金リストを Debt として保存） */
export function createEvent(params: {
  title: string | null;
  totalAmount: number;
  participants: unknown;
  transfers: Transfer[];
}) {
  return prisma.event.create({
    data: {
      title: params.title,
      totalAmount: params.totalAmount,
      participants: params.participants as any,
      debts: {
        create: params.transfers.map((t) => ({
          fromName: t.from,
          toName: t.to,
          amount: t.amount,
        })),
      },
    },
    include: { debts: true },
  });
}

/** 記録一覧（新しい順、借金つき） */
export function findAllEvents() {
  return prisma.event.findMany({
    include: { debts: { orderBy: { id: "asc" } } },
    orderBy: { createdAt: "desc" },
  });
}

/** 清算済みフラグを切り替える */
export function setDebtSettled(id: number, settled: boolean) {
  return prisma.debt.update({ where: { id }, data: { settled } });
}

/** 記録を削除する（債務も cascade で消える） */
export function deleteEvent(id: number) {
  return prisma.event.delete({ where: { id } });
}
