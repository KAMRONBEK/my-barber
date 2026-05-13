import { APP_NAME } from '@my-barber/config';

export function Hero() {
  return (
    <section className="mx-auto flex max-w-5xl flex-col items-center gap-6 px-6 py-24 text-center sm:py-32">
      <h1 className="text-4xl font-semibold tracking-tight sm:text-6xl">
        {APP_NAME}
      </h1>
      <p className="max-w-xl text-lg text-zinc-600 dark:text-zinc-400">
        Book a barber in seconds. Manage your shop with a tap.
      </p>
      <div className="flex gap-3">
        <a
          href="#"
          className="rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background"
        >
          Download the app
        </a>
        <a
          href="#"
          className="rounded-full border border-black/10 px-5 py-2.5 text-sm font-medium dark:border-white/15"
        >
          For barbers
        </a>
      </div>
    </section>
  );
}
