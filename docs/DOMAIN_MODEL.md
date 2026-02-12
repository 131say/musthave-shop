# Domain Model (предметная модель MustHave)

## User
Покупатель/партнёр.

Поля (черновик):
- id
- name
- phone
- email (опционально)
- referralCode (уникальный код пользователя)
- referredByUserId (кто его пригласил)
- bonusBalance (текущий баланс бонусов)
- createdAt

## Product
Товар в магазине.

Поля:
- id
- name
- slug
- description
- price
- oldPrice (опционально)
- imageUrl
- isActive
- createdAt
- updatedAt

## Order
Заказ, оформленный клиентом.

Поля:
- id
- userId (опционально, если у нас будет авторизация)
- customerName
- customerPhone
- customerAddress
- comment
- status (new / processing / done / cancelled)
- totalAmount
- createdAt

## OrderItem
Позиция товара в заказе.

Поля:
- id
- orderId
- productId
- quantity
- priceAtMoment (фиксируем цену на момент заказа)
- subtotal

## ReferralEvent (на будущее)
Событие, связанное с реферальной программой.

Поля (черновик):
- id
- userId (кому начисляем или кто привёл)
- referredUserId (кого привели, если применимо)
- orderId (если бонус за заказ)
- type (signup_bonus / order_bonus / level_bonus / manual_adjustment)
- amount (в бонусных единицах)
- createdAt







