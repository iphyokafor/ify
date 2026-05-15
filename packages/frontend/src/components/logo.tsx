// Wordmark + mark, used in the topbar and auth screen.
export const Logotype = ({ className }: Readonly<{ className?: string }>) => (
  <span
    className={`inline-flex items-baseline font-serif font-semibold tracking-tight text-slate-100 ${className ?? ""}`}
  >
    <span>ify</span>
    <span
      aria-hidden="true"
      className="ml-0.5 inline-block h-[0.35em] w-[0.35em] translate-y-[-0.05em] rounded-full bg-violet-400"
    />
  </span>
);

