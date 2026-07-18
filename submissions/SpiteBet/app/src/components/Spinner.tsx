/** 3D cube loader (Uiverse.io by bociKond), restyled to the neo palette. */
export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-8 py-12">
      <div className="spinner" role="status" aria-label={label ?? 'Loading'}>
        <div />
        <div />
        <div />
        <div />
        <div />
        <div />
      </div>
      {label && <p className="font-black uppercase text-sm tracking-wide">{label}</p>}
    </div>
  );
}
