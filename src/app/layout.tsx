// src/app/layout.tsx
import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MustHave — косметика и уход',
  description:
    'Косметика и уход с доставкой по всему Казахстану и реферальной программой.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body className="min-h-screen bg-gradient-to-b from-neutral-50 to-white text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100 dark:from-neutral-950 dark:to-neutral-950">
        <script
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: `
              !(function() {
                try {
                  var theme = localStorage.getItem('musthave_theme') || 'light';
                  var root = document.documentElement;
                  if (theme === 'dark') {
                    root.classList.add('dark');
                    root.style.colorScheme = 'dark';
                  } else {
                    root.classList.remove('dark');
                    root.style.colorScheme = 'light';
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
        {children}
      </body>
    </html>
  );
}
