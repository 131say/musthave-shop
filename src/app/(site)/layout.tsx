// src/app/(site)/layout.tsx
import { CartProvider } from '@/components/cart/CartProvider';
import Link from 'next/link';
import { CartBadge } from '@/components/cart/CartBadge';
import UserBar from '@/components/UserBar';
import ThemeInit from '@/components/ThemeInit';
import ThemeToggle from '@/components/ThemeToggle';
import FloatingCartButton from '@/components/FloatingCartButton';
import ChatWidget from '@/components/ChatWidget';
import ConditionalHeader from './ConditionalHeader';
import ReferralRefHandler from '@/components/ReferralRefHandler';

export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CartProvider>
      <ThemeInit />
      <ReferralRefHandler />
      <ConditionalHeader />
      <div className="mx-auto w-full max-w-5xl px-3 sm:px-4 py-4 sm:py-6 pb-24 min-h-screen sm:pb-6">
        <ConditionalHeader showHeader={true} />
        <main className="pt-6">{children}</main>
        <FloatingCartButton />
        <ChatWidget />
      </div>
    </CartProvider>
  );
}






