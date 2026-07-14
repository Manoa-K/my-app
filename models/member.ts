import { prisma } from "./prisma.js";

/** メンバー一覧（役職名・比率つき） */
export function findAllMembers() {
  return prisma.member.findMany({
    include: { role: true },
    orderBy: { id: "asc" },
  });
}

/** 役職一覧（比率の高い順） */
export function findAllRoles() {
  return prisma.role.findMany({
    orderBy: { ratio: "desc" },
  });
}
