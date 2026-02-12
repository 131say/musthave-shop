# Архитектура MustHave (MVP)

## Технологический стек
- Frontend + Backend: Next.js (App Router) + TypeScript.
- Стили: Tailwind CSS.
- БД: SQLite (MVP, локально и на первом сервере).
- ORM: Prisma.
- Хостинг: позже (VPS/Render/Vercel + внешний volume/БД).

## Слои

### 1. Презентационный слой (Frontend)
- Next.js pages (App Router).
- Компоненты:
  - Layout (общий каркас, шапка, подвал).
  - ProductCard.
  - ProductList.
  - Cart.
  - Forms (checkout, login).

### 2. API слой (Backend внутри Next.js)
- Route handlers в /app/api/*:
  - /api/products
  - /api/cart (логика на клиенте + сохранение в localStorage, позже можно вынести на сервер)
  - /api/orders
  - /api/auth (позже, если нужна полноценная авторизация).
  - /api/referrals (позже, когда запустим программу).

### 3. Данные (БД через Prisma)
Модели:
- User
- Product
- Order
- OrderItem
- ReferralEvent (на будущее)

## Принципы
- Простота кода важнее сложности на старте.
- Минимум внешних зависимостей.
- Возможность простого расширения:
  - смена SQLite на Postgres,
  - добавление ролей, бонусов, реферальных уровней.







