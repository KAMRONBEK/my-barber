import { APP_NAME, SUPPORT_EMAIL } from '@my-barber/config';

export function Footer() {
  return (
    <footer className="w-full border-t border-black/5 dark:border-white/10">
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-2 px-6 py-6 text-sm text-zinc-500 sm:flex-row">
        <span>
          © {new Date().getFullYear()} {APP_NAME}
        </span>
        <a className="underline-offset-2 hover:underline" href={`mailto:${SUPPORT_EMAIL}`}>
          {SUPPORT_EMAIL}
        </a>
      </div>
    </footer>
  );
}
