"use client";

import { useState } from "react";
import { monogram } from "@/lib/flags";

export function Flag({
  name,
  iso,
  size = 64,
}: {
  name: string;
  iso: string | null;
  size?: number;
}) {
  const [broken, setBroken] = useState(false);
  const w = size >= 96 ? 320 : size >= 48 ? 160 : 80;
  const show = iso && !broken;
  const width = Math.round(size * 1.33); // rectangular, real flag shape

  return (
    <span
      className="relative inline-flex items-center justify-center overflow-hidden rounded-[3px] ring-1 ring-black/10 shadow-sm"
      style={{ width, height: size, background: "var(--wash)" }}
    >
      {show ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`https://flagcdn.com/w${w}/${iso}.png`}
          alt={name}
          onError={() => setBroken(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <span
          className="font-semibold text-ink/70"
          style={{ fontSize: size * 0.3 }}
        >
          {monogram(name)}
        </span>
      )}
    </span>
  );
}
