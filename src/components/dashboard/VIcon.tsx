import vColor from "@/assets/v-color.svg";
import vWhite from "@/assets/v-white.svg";
import { cn } from "@/lib/utils";

interface VIconProps {
  active?: boolean;
  size?: number;
  className?: string;
  /** Bloqueado por status (Perdido/Arquivado): cinza fixo @ 20%, sem interação. */
  disabled?: boolean;
}

/**
 * "V" icon used to mark a Proposta Principal.
 * - Inactive: white SVG @ 30% opacity (suave/transparente).
 * - Active: full-color brand SVG.
 * Both states render in the same square box to avoid layout jumps.
 */
export function VIcon({ active = false, size = 24, className, disabled = false }: VIconProps) {
  const opacity = disabled ? 0.2 : active ? 1 : 0.3;
  return (
    <span
      className={cn("inline-flex items-center justify-center shrink-0", className)}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <img
        src={disabled || !active ? vWhite : vColor}
        alt=""
        width={size}
        height={size}
        style={{
          width: size,
          height: size,
          objectFit: "contain",
          opacity,
          filter: disabled || !active ? "invert(60%)" : undefined,
          transition: "opacity 150ms ease, transform 150ms ease",
        }}
      />
    </span>
  );
}
