// ============================================================
// 傾斜割り勘・清算ロジック（DB 非依存の純粋関数）
//   各人の重み = 役職比率 × 飲酒フラグ(1.2)
//   これをもとに 2 通りの清算を出す:
//     (A) 1円単位: 本来の負担額（最大剰余法で合計ぴったり）＋きっちり精算
//     (B) 100円単位: 切り上げ、端数は幹事（なければ最多立替者）が受け取る
// ============================================================

/** 飲酒者の傾斜倍率 */
export const DRINK_MULTIPLIER = 1.2;
/** 丸めの単位（円） */
export const ROUND_UNIT = 100;

/** 計算に渡す 1 人分の入力 */
export interface ParticipantInput {
  name: string;
  /** 役職比率（4:3:2:1 の 4 など） */
  roleRatio: number;
  isDrinking: boolean;
  amountPaid: number;
  /** この人が幹事か（100円版の端数を受け取る） */
  isOrganizer?: boolean;
}

export interface SettlementInput {
  participants: ParticipantInput[];
  /** 省略時は立替額の合計を会計総額とする */
  totalAmount?: number;
}

/** 「Cさん → Aさんに 3,000円」1 件分 */
export interface Transfer {
  from: string;
  to: string;
  amount: number;
}

/** 各人の内訳 */
export interface ShareDetail {
  name: string;
  weight: number;
  /** 本来の負担額（1円単位・合計は会計額ぴったり） */
  exactShare: number;
  /** 100円単位に切り上げた負担額 */
  roundedShare: number;
  amountPaid: number;
}

export interface SettlementResult {
  total_amount: number;
  /** 100円版の端数（幹事の取り分） */
  organizer_benefit: number;
  /** 100円単位の送金リスト */
  transfers: Transfer[];
  /** 1円単位のきっちり送金リスト */
  exact_transfers: Transfer[];
  shares: ShareDetail[];
}

/** 100円単位に切り上げ */
function ceilToUnit(value: number): number {
  return Math.ceil(value / ROUND_UNIT) * ROUND_UNIT;
}

/**
 * 送金マッチング（回数最小化・貪欲法）。
 * net: 正=不足(payer=from) / 負=過払い(receiver=to)
 */
function matchTransfers(entries: { name: string; net: number }[]): Transfer[] {
  const debtors = entries
    .filter((e) => e.net > 0)
    .map((e) => ({ name: e.name, amount: e.net }))
    .sort((a, b) => b.amount - a.amount);
  const creditors = entries
    .filter((e) => e.net < 0)
    .map((e) => ({ name: e.name, amount: -e.net }))
    .sort((a, b) => b.amount - a.amount);

  const transfers: Transfer[] = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const pay = Math.min(debtors[i].amount, creditors[j].amount);
    if (pay > 0) {
      transfers.push({ from: debtors[i].name, to: creditors[j].name, amount: pay });
    }
    debtors[i].amount -= pay;
    creditors[j].amount -= pay;
    if (debtors[i].amount === 0) i++;
    if (creditors[j].amount === 0) j++;
  }
  return transfers;
}

export function calculateSettlement(input: SettlementInput): SettlementResult {
  const { participants } = input;
  if (participants.length === 0) {
    throw new Error("participants が空です");
  }

  // 合計金額は立替額の合計（明示指定があればそれを優先）
  const totalPaid = participants.reduce((s, p) => s + p.amountPaid, 0);
  const totalAmount = Math.round(input.totalAmount ?? totalPaid);

  // 重み
  const weights = participants.map(
    (p) => p.roleRatio * (p.isDrinking ? DRINK_MULTIPLIER : 1)
  );
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  if (totalWeight <= 0) {
    throw new Error("重みの合計が 0 です（役職比率を確認してください）");
  }

  const raw = weights.map((w) => (totalAmount * w) / totalWeight);

  // --- (A) 1円単位: 最大剰余法で整数円に配分し、合計を totalAmount にぴったり合わせる ---
  const floors = raw.map((v) => Math.floor(v));
  let remainder = totalAmount - floors.reduce((a, b) => a + b, 0);
  const fracOrder = raw
    .map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac);
  const exactShares = floors.slice();
  for (let k = 0; k < remainder && k < fracOrder.length; k++) {
    exactShares[fracOrder[k].i] += 1;
  }

  // --- (B) 100円単位: 切り上げ ---
  const roundedShares = raw.map((v) => ceilToUnit(v));

  const shares: ShareDetail[] = participants.map((p, i) => ({
    name: p.name,
    weight: weights[i],
    exactShare: exactShares[i],
    roundedShare: roundedShares[i],
    amountPaid: p.amountPaid,
  }));

  // 1円版の送金（端数なし）
  const exact_transfers = matchTransfers(
    shares.map((s) => ({ name: s.name, net: s.exactShare - s.amountPaid }))
  );

  // 100円版の送金（端数の受け取り先を決める）
  const collected = roundedShares.reduce((a, b) => a + b, 0);
  const residual = collected - totalAmount;
  const organizerIdx = participants.findIndex((p) => p.isOrganizer);
  let absorberIdx = organizerIdx;
  if (absorberIdx < 0) {
    absorberIdx = 0;
    shares.forEach((s, i) => {
      if (s.amountPaid > shares[absorberIdx].amountPaid) absorberIdx = i;
    });
  }
  const roundedNets = shares.map((s) => ({
    name: s.name,
    net: s.roundedShare - s.amountPaid,
  }));
  roundedNets[absorberIdx].net -= residual;
  const transfers = matchTransfers(roundedNets);

  return {
    total_amount: totalAmount,
    organizer_benefit: organizerIdx >= 0 ? residual : 0,
    transfers,
    exact_transfers,
    shares,
  };
}
