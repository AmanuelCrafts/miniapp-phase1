'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/', label: '🏠', title: 'Home' },
  { href: '/plans', label: '🎯', title: 'Plans' },
];

export function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 border-t border-white/5 bg-surface/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-sm items-center justify-around py-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 rounded-xl px-4 py-2 text-xs transition-colors ${
                isActive ? 'text-primary-light' : 'text-text-muted'
              }`}
            >
              <span className="text-lg">{item.label}</span>
              <span>{item.title}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
