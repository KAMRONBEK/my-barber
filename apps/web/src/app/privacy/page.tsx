import type { Metadata } from 'next';
import { APP_NAME } from '@my-barber/config';

export const metadata: Metadata = { title: 'Privacy Policy' };

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-3xl px-6 py-16 prose prose-zinc dark:prose-invert">
      <h1>Privacy Policy</h1>
      <p>
        {APP_NAME} respects your privacy. This page is a placeholder; the full policy will be
        published before public launch.
      </p>
    </article>
  );
}
