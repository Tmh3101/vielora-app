/**
 * Calculate the luminance of a hex color (0-255 scale)
 * Uses standard luminance formula: 0.299*R + 0.587*G + 0.114*B
 */
export function calculateLuminance(hex: string): number {
  const rgb = parseInt(hex.slice(1), 16);
  const r = (rgb >> 16) & 255;
  const g = (rgb >> 8) & 255;
  const b = rgb & 255;
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

/**
 * Get icon color (black or white) based on background color luminance
 * Returns white (#ffffff) for dark backgrounds, black (#000000) for light backgrounds
 */
export function getIconColorBasedOnBg(bgColor: string): string {
  const luminance = calculateLuminance(bgColor);
  return luminance > 186 ? "#000000" : "#ffffff";
}

/**
 * Get user message text color based on primary color luminance
 * Returns black (#000000) for light primary colors, white (#ffffff) for dark primary colors
 */
export function getUserMessageTextColor(primaryColor: string): string {
  const luminance = calculateLuminance(primaryColor);
  return luminance > 186 ? "#000000" : "#ffffff";
}

export function parseMarkdown(text: string) {
  if (!text) return "";

  let result = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  result = result.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer" style="color: #2563eb; text-decoration: underline; text-underline-offset: 2px; font-weight: 500;">$1</a>'
  );

  result = result.replace(
    /(^|\s)(https?:\/\/[^\s<]+)/g,
    '$1<a href="$2" target="_blank" rel="noopener noreferrer" style="color: #2563eb; text-decoration: underline; text-underline-offset: 2px; font-weight: 500;">$2</a>'
  );

  result = result
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(
      /`([^`]+)`/g,
      '<code style="background-color: #f3f4f6; padding: 2px 4px; border-radius: 4px; font-size: 0.9em;">$1</code>'
    )
    .replace(/\n/g, "<br>");

  return result;
}
