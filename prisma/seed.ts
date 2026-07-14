import { prisma } from "../models/prisma.js";

async function main() {
  // 役職（比率 4:3:2:1）
  const roleData = [
    { name: "部長", ratio: 4 },
    { name: "課長", ratio: 3 },
    { name: "主任", ratio: 2 },
    { name: "一般", ratio: 1 },
  ];

  const roles: Record<string, number> = {};
  for (const r of roleData) {
    const role = await prisma.role.upsert({
      where: { name: r.name },
      update: { ratio: r.ratio },
      create: r,
    });
    roles[r.name] = role.id;
  }

  // サンプルメンバー
  const members = [
    { name: "Aさん", role: "部長" },
    { name: "Bさん", role: "課長" },
    { name: "Cさん", role: "主任" },
    { name: "Dさん", role: "一般" },
  ];
  for (const m of members) {
    await prisma.member.create({
      data: { name: m.name, roleId: roles[m.role] },
    });
  }

  console.log("Seed 完了");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
