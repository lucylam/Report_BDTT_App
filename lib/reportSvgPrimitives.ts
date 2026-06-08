export const svgText = (
  value: string,
  x: number,
  y: number,
  size: number,
  weight: number,
  color: string
): string => {
  return `<text x="${x}" y="${y}" fill="${color}" font-family="Arial, Helvetica, sans-serif" font-size="${size}" font-weight="${weight}">${escapeXml(value)}</text>`;
};

export const svgCard = (x: number, y: number, w: number, h: number): string => {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="28" fill="#ffffff" stroke="#eadfce"/>`;
};

export const svgPill = (
  label: string,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
  fill: string
): string => {
  return [
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${h / 2}" fill="${fill}" stroke="#d9eadf"/>`,
    svgText(label, x + 24, y + 29, 15, 800, color)
  ].join("");
};

export const svgLegendItem = (
  label: string,
  x: number,
  y: number,
  color: string,
  muted: string
): string => {
  return [
    `<rect x="${x}" y="${y}" width="12" height="12" rx="4" fill="${color}"/>`,
    svgText(label, x + 18, y + 11, 12, 700, muted)
  ].join("");
};

export const formatViNumber = (value: number): string => {
  return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 }).format(value);
};

const escapeXml = (value: string): string => {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
};
