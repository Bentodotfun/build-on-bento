export function SiteFooter() {
  return (
    <footer className="border-t-2 border-ink bg-lilac">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 md:flex-row md:items-center md:justify-between md:px-8">
        <p className="font-display text-lg font-bold">Dibs</p>
        <p className="text-sm text-ink/70">
          Built with <span className="font-semibold">Bento</span> for in-tweet placement &{" "}
          <span className="font-semibold">Anakin</span> for research context.
        </p>
        <p className="font-mono text-xs text-ink/50">© {new Date().getFullYear()}</p>
      </div>
    </footer>
  );
}
