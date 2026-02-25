import type { CSSProperties } from "react";
import type { TenantThemeSnapshot } from "@/lib/config-central/theme";

const HEX_6_REGEX = /^#([0-9a-fA-F]{6})$/;

export function isValidHexColor(value: string) {
  return HEX_6_REGEX.test(String(value || "").trim());
}

export function hexToRgbTuple(value: string): [number, number, number] | null {
  const normalized = String(value || "").trim();
  const parsed = HEX_6_REGEX.exec(normalized);
  if (!parsed) return null;

  const hex = parsed[1];
  return [
    Number.parseInt(hex.slice(0, 2), 16),
    Number.parseInt(hex.slice(2, 4), 16),
    Number.parseInt(hex.slice(4, 6), 16)
  ];
}

export function rgbTupleToVar(tuple: [number, number, number]) {
  return `${tuple[0]} ${tuple[1]} ${tuple[2]}`;
}

function toLinearChannel(channel: number) {
  const normalized = channel / 255;
  if (normalized <= 0.03928) {
    return normalized / 12.92;
  }
  return ((normalized + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string) {
  const rgb = hexToRgbTuple(hex);
  if (!rgb) return 0;
  const [r, g, b] = rgb;
  return 0.2126 * toLinearChannel(r) + 0.7152 * toLinearChannel(g) + 0.0722 * toLinearChannel(b);
}

export function contrastRatio(foregroundHex: string, backgroundHex: string) {
  const l1 = luminance(foregroundHex);
  const l2 = luminance(backgroundHex);
  const brightest = Math.max(l1, l2);
  const darkest = Math.min(l1, l2);
  return Number(((brightest + 0.05) / (darkest + 0.05)).toFixed(2));
}

export function isRecommendedContrast(foregroundHex: string, backgroundHex: string, minimum = 4.5) {
  return contrastRatio(foregroundHex, backgroundHex) >= minimum;
}

export function buildThemeCssVariables(snapshot: TenantThemeSnapshot): CSSProperties {
  const palette = snapshot.theme;
  const primaryRgb = hexToRgbTuple(palette.primary) || [74, 165, 156];
  const accentRgb = hexToRgbTuple(palette.accent) || [74, 173, 245];
  const structureRgb = hexToRgbTuple(palette.structure) || [46, 117, 186];
  const bgRgb = hexToRgbTuple(palette.bg) || [248, 250, 252];
  const surfaceRgb = hexToRgbTuple(palette.surface) || [255, 255, 255];
  const textRgb = hexToRgbTuple(palette.text) || [15, 23, 42];
  const borderRgb = hexToRgbTuple(palette.border) || [219, 230, 240];

  return {
    "--color-primary": palette.primary,
    "--color-accent": palette.accent,
    "--color-structure": palette.structure,
    "--bg": palette.bg,
    "--surface": palette.surface,
    "--text": palette.text,
    "--muted": palette.muted,
    "--border": palette.border,
    "--ring": palette.ring,
    "--color-primary-rgb": rgbTupleToVar(primaryRgb),
    "--color-accent-rgb": rgbTupleToVar(accentRgb),
    "--color-structure-rgb": rgbTupleToVar(structureRgb),
    "--bg-rgb": rgbTupleToVar(bgRgb),
    "--surface-rgb": rgbTupleToVar(surfaceRgb),
    "--text-rgb": rgbTupleToVar(textRgb),
    "--border-rgb": rgbTupleToVar(borderRgb),
    "--font-heading":
      snapshot.fontHeadingKey === "poppins"
        ? '"Poppins", "Montserrat", "Inter", system-ui, sans-serif'
        : '"Montserrat", "Poppins", "Inter", system-ui, sans-serif',
    "--font-sans":
      snapshot.fontBodyKey === "inter"
        ? '"Inter", "Nunito Sans", system-ui, sans-serif'
        : '"Nunito Sans", "Inter", system-ui, sans-serif',
    "--density-scale": snapshot.densityDefault === "compact" ? "0.88" : "1"
  } as CSSProperties;
}
