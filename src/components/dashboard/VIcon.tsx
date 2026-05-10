import vColor from "@/assets/v-color.svg";
import vWhite from "@/assets/v-white.svg";
import { cn } from "@/lib/utils";

interface VIconProps {
  active?: boolean;
  size?: number;
  className?: string;
}

/**
 * "V" icon used to mark a Proposta Principal.
 * - Inactive: white SVG @ 30% opacity (suave/transparente).
 * - Active: full-color brand SVG.
 * Both states render in the same square box to avoid layout jumps.
 */
export function VIcon({ active = false, size = 24, className }: VIconProps) {
  return (
    <span
      className={cn("inline-flex items-center justify-center shrink-0", className)}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <img
        src={active ? vColor : vWhite}
        alt=""
        width={size}
        height={size}
        style={{
          width: size,
          height: size,
          objectFit: "contain",
          opacity: active ? 1 : 0.3,
          // Make the white SVG visibly cinza-suave on light backgrounds when inactive
          filter: active ? undefined : "invert(60%)",
          transition: "opacity 150ms ease, transform 150ms ease",
        }}
      />
    </span>
  );
}
