import Link from 'next/link';
import { APP_NAME } from '@my-barber/config';

export function Header() {
  return (
    <header className="w-full border-b border-black/5 dark:border-white/10">
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-base font-semibold">
          {APP_NAME}
        </Link>
        <ul className="flex items-center gap-6 text-sm">
          <li>
            <Link href="/privacy">Privacy</Link>
          </li>
          <li>
            <Link href="/terms">Terms</Link>
          </li>
          <li>
            <Link href="/contact">Contact</Link>
          </li>
        </ul>
      </nav>
    </header>
  );
}
