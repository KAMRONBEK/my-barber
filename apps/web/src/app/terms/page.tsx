import type { Metadata } from 'next';
import { APP_NAME } from '@my-barber/config';

export const metadata: Metadata = { title: 'Terms of Service' };

export default function TermsPage() {
  return (
    <article className="mx-auto max-w-3xl px-6 py-16 prose prose-zinc dark:prose-invert">
      <h1>Terms of Service</h1>
      <p>
        These terms govern use of {APP_NAME}. This page is a placeholder; the full terms will be
        published before public launch.
      </p>
    </article>
  );
}
