import { prisma } from '@/lib/prisma';

export type TreeNode = {
  userId: number;
  phone: string;
  referralCode: string;
  bonusBalance: number;
  directCount: number;
  revenue30d: number;
  children?: TreeNode[];
};

export async function getUserTree(
  userId: number,
  depth: number = 3,
  days: number = 30,
): Promise<TreeNode | null> {
  const now = new Date();
  const from = new Date(now);
  from.setDate(from.getDate() - (days - 1));
  from.setHours(0, 0, 0, 0);

  // Получаем основного пользователя
  const rootUser = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      phone: true,
      referralCode: true,
      bonusBalance: true,
      referredByUserId: true,
    },
  });

  if (!rootUser) return null;

  // Получаем всех пользователей с их пригласителями
  const allUsers = await prisma.user.findMany({
    select: {
      id: true,
      phone: true,
      referralCode: true,
      bonusBalance: true,
      referredByUserId: true,
    },
  });

  // Получаем заказы за период для расчёта оборота
  const orders = await prisma.order.findMany({
    where: {
      createdAt: { gte: from },
      status: { not: 'CANCELLED' },
      userId: { not: null },
    },
    select: { userId: true, totalAmount: true },
  });

  // Считаем оборот для каждого пользователя
  const revenueByUser = new Map<number, number>();
  for (const o of orders) {
    const uid = o.userId!;
    revenueByUser.set(uid, (revenueByUser.get(uid) || 0) + o.totalAmount);
  }

  // Считаем количество прямых приглашённых для каждого пользователя
  const directCountByUser = new Map<number, number>();
  for (const u of allUsers) {
    if (u.referredByUserId) {
      directCountByUser.set(
        u.referredByUserId,
        (directCountByUser.get(u.referredByUserId) || 0) + 1,
      );
    }
  }

  // Строим мапу для быстрого поиска
  const userMap = new Map<number, typeof allUsers[0]>();
  for (const u of allUsers) {
    userMap.set(u.id, u);
  }

  // Строим мапу детей
  const childrenMap = new Map<number, number[]>();
  for (const u of allUsers) {
    if (u.referredByUserId) {
      const parentId = u.referredByUserId;
      if (!childrenMap.has(parentId)) {
        childrenMap.set(parentId, []);
      }
      childrenMap.get(parentId)!.push(u.id);
    }
  }

  // Рекурсивная функция для построения дерева
  function buildTree(currentUserId: number, currentDepth: number): TreeNode | null {
    const user = userMap.get(currentUserId);
    if (!user) return null;

    const children: TreeNode[] = [];
    if (currentDepth < depth) {
      const childIds = childrenMap.get(currentUserId) || [];
      for (const childId of childIds) {
        const childNode = buildTree(childId, currentDepth + 1);
        if (childNode) {
          children.push(childNode);
        }
      }
    }

    return {
      userId: user.id,
      phone: user.phone,
      referralCode: user.referralCode,
      bonusBalance: user.bonusBalance,
      directCount: directCountByUser.get(user.id) || 0,
      revenue30d: revenueByUser.get(user.id) || 0,
      children: children.length > 0 ? children : undefined,
    };
  }

  return buildTree(userId, 0);
}







