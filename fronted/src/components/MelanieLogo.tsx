import type { FC } from "react";

interface MelanieLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  variant?: "dark" | "light"; // "dark" = for dark backgrounds (white text), "light" = for light backgrounds (violet text)
  className?: string;
}

export const MelanieMark: FC<{ className?: string; alt?: string }> = ({
  className = "w-8 h-8",
  alt = "Melanie MultiCatálogo Logo",
}) => (
  <svg
    viewBox="0 0 100 100"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    role="img"
    aria-label={alt}
  >
    {/* Left vertical block - deep violet */}
    <rect x="15" y="15" width="22" height="70" rx="1.5" fill="#371F76" />

    {/* Right vertical block - vibrant coral */}
    <rect x="63" y="15" width="22" height="70" rx="1.5" fill="#F05043" />

    {/* Left diagonal facet - solid coral */}
    <path
      d="M15 36 L50 68 L50 48 L28 26 L15 36 Z"
      fill="#F05043"
    />

    {/* Right diagonal facet - deep royal violet */}
    <path
      d="M50 48 L50 68 L72 36 L63 26 Z"
      fill="#281466"
    />

    {/* Upper central fold - contrasting violet */}
    <path
      d="M37 15 L50 36 L63 15 Z"
      fill="#4A289D"
    />

    {/* Crisp minimalist white facet in right column */}
    <path
      d="M63 36 L85 36 L63 56 Z"
      fill="#FFFFFF"
    />
  </svg>
);

export const MelanieLogo: FC<MelanieLogoProps> = ({
  size = "md",
  showText = true,
  variant = "light",
  className = "",
}) => {
  const markSizes = {
    sm: "w-6 h-6",
    md: "w-9 h-9",
    lg: "w-12 h-12",
    xl: "w-16 h-16",
  };

  const textColors = {
    light: {
      brand: "text-[#371F76]",
      sub: "text-[#F05043]",
    },
    dark: {
      brand: "text-white",
      sub: "text-coral-300 text-[#FFA399]",
    },
  };

  const currentColors = textColors[variant];

  return (
    <div className={`inline-flex items-center gap-3 select-none ${className}`}>
      <MelanieMark className={`${markSizes[size]} shrink-0`} />
      {showText && (
        <div className="flex flex-col justify-center leading-tight">
          <span
            className={`font-black tracking-wider text-base ${currentColors.brand} uppercase font-sans`}
          >
            MELANIE
          </span>
          <span
            className={`font-bold tracking-widest text-[9px] ${currentColors.sub} uppercase`}
          >
            MULTICATÁLOGO
          </span>
        </div>
      )}
    </div>
  );
};

export default MelanieLogo;
