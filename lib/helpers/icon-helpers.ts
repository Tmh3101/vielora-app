export const getIconColorBasedOnBg = (bgColor: string): string => {
  const hex = bgColor.replace("#", "");
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
  return luminance > 186 ? "#000000" : "#ffffff";
};

export const getIconSVG = (presetId: string): string => {
  const iconMap: Record<string, string> = {
    messagecircle:
      '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>',
    headphones:
      '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 18v-6a9 9 0 0 1 18 0v6"></path><path d="M9 18h.01"></path><path d="M15 18h.01"></path></svg>',
    help: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4"></path><path d="M12 8h.01"></path></svg>',
    comment:
      '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>',
    bot: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="2" width="16" height="20" rx="2"></rect><path d="M9 7h6"></path><path d="M9 15h6"></path><circle cx="9.5" cy="11" r="1"></circle><circle cx="14.5" cy="11" r="1"></circle></svg>',
    sparkles:
      '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3l3.5 7h7.5l-6 4.5 2.5 8-7-5-7 5 2.5-8-6-4.5h7.5z"></path></svg>',
    zap: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>',
    smile:
      '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><path d="M8 14s1.5 2 4 2 4-2 4-2"></path><line x1="9" y1="9" x2="9.01" y2="9"></line><line x1="15" y1="9" x2="15.01" y2="9"></line></svg>',
  };
  return iconMap[presetId] || iconMap["messagecircle"];
};

export const generateGradientCSS = (bgType: string, bgValue: string, bgOpacity: number): string => {
  if (bgType === "solid") {
    const hex = bgValue;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const opacity = bgOpacity / 100;
    return `background-color: rgba(${r}, ${g}, ${b}, ${opacity});`;
  } else if (bgType === "gradient") {
    const overlayOpacity = 1 - bgOpacity / 100;
    return `background: ${bgValue}; background-color: rgba(255, 255, 255, ${overlayOpacity}); background-blend-mode: lighten; background-size: cover;`;
  } else if (bgType === "image") {
    const overlayOpacity = 1 - bgOpacity / 100;
    return `background-image: url("${bgValue}"); background-color: rgba(255, 255, 255, ${overlayOpacity}); background-blend-mode: lighten; background-size: cover; background-position: center; background-repeat: no-repeat;`;
  }
  return "";
};
