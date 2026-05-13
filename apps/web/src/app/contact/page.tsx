import type { Metadata } from 'next';
import { SUPPORT_EMAIL } from '@my-barber/config';

export const metadata: Metadata = { title: 'Contact' };

export default function ContactPage() {
  return (
    <article className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Contact</h1>
      <p className="mt-4 text-zinc-600 dark:text-zinc-400">
        Reach us at{' '}
        <a className="underline" href={`mailto:${SUPPORT_EMAIL}`}>
          {SUPPORT_EMAIL}
        </a>
        .
      </p>
    </article>
  );
}
