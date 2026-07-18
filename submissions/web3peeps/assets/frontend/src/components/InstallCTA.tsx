import { Zap } from "lucide-react";

interface Props {
  size?: "sm" | "lg";
  label?: string;
  className?: string;
}

export const INSTALL_URL = "http://localhost:8080";

export function InstallCTA({ size = "lg", label = "Install the Extension", className = "" }: Props) {
  const sizing =
    size === "lg"
      ? "px-7 py-4 text-lg"
      : "px-4 py-2 text-sm";
  return (
    <a
      href={INSTALL_URL}
      className={`inline-flex items-center gap-2 rounded-xl bg-zap font-display font-bold text-zap-foreground ink-border hard-shadow transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0 active:translate-y-0 ${sizing} ${className}`}
    >
      <Zap className="size-5 fill-ink" strokeWidth={2.5} />
      {label}
    </a>
  );
}
