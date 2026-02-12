// src/app/admin/orders/page.tsx
import { prisma } from '@/lib/prisma';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { OrdersFilters } from './OrdersFilters';
import { OrderCard } from './OrderCard';

export const dynamic = 'force-dynamic';

type SearchParams =
  | Record<string, string | string[] | undefined>
  | Promise<Record<string, string | string[] | undefined>>
  | undefined;

async function unwrapSearchParams(sp: SearchParams) {
  const v: any = sp;
  if (v && typeof v?.then === "function") return (await v) ?? {};
  return v ?? {};
}

function toISOStartOfDay(dateStr?: string | null) {
  if (!dateStr) return null;
  const d = new Date(`${dateStr}T00:00:00.000`);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

function toISOEndOfDay(dateStr?: string | null) {
  if (!dateStr) return null;
  const d = new Date(`${dateStr}T23:59:59.999`);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const sp = await unwrapSearchParams(searchParams);
  const phone = (sp.phone || '').toString().trim();
  const status = (sp.status || '').toString().trim();
  const from = (sp.from || '').toString().trim();
  const to = (sp.to || '').toString().trim();

  const createdAt: { gte?: Date; lte?: Date } = {};
  const gteISO = toISOStartOfDay(from);
  const lteISO = toISOEndOfDay(to);
  if (gteISO) createdAt.gte = new Date(gteISO);
  if (lteISO) createdAt.lte = new Date(lteISO);

  const where: any = {};
  if (phone) where.customerPhone = { contains: phone };
  if (status && status !== 'ALL') {
    // Маппинг: WORKING -> PROCESSING, CANCEL -> CANCELLED
    if (status === 'WORKING') {
      where.status = 'PROCESSING';
    } else if (status === 'CANCEL') {
      where.status = 'CANCELLED';
    } else {
      where.status = status;
    }
  }
  if (createdAt.gte || createdAt.lte) where.createdAt = createdAt;

  const orders = await prisma.order.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      items: {
        include: {
          product: true,
        },
      },
      user: {
        include: {
          referredBy: true,
        },
      },
      referralEvents: true,
    },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight dark:text-white">Заказы</h1>

      <OrdersFilters
        initialPhone={phone}
        initialStatus={status || 'ALL'}
        initialFrom={from}
        initialTo={to}
      />

      <div className="space-y-4">
        {orders.map((order) => (
          <OrderCard key={order.id} order={order} />
        ))}
      </div>
    </div>
  );
}


