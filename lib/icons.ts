/**
 * Icon SVG definitions and utilities
 */

export const getIconSVG = (presetId: string): string => {
  const iconMap: { [key: string]: string } = {
    messagecircle:
      '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>',
    headphones:
      '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 13.565C2 11.512 4 11 6 11v9a4 4 0 0 1-4-4zm20 0C22 11.512 20 11 18 11v9a4 4 0 0 0 4-4zM6 20V10a6 6 0 1 1 12 0v10"></path></svg>',
    help: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4"></path><path d="M12 8h.01"></path></svg>',
    comment:
      '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>',
    bot: '<svg width="24" height="24" viewBox="0 0 32 32" fill="currentColor"><path d="M18 10h2v2h-2zm-6 0h2v2h-2z"></path><path d="M26 20h-5v-2h1a2 2 0 0 0 2-2v-4h2v-2h-2V8a2 2 0 0 0-2-2h-2V2h-2v4h-4V2h-2v4h-2a2 2 0 0 0-2 2v2H6v2h2v4a2 2 0 0 0 2 2h1v2H6a2 2 0 0 0-2 2v8h2v-8h20v8h2v-8a2 2 0 0 0-2-2M10 8h12v8H10Zm3 10h6v2h-6Z"></path></svg>',
    sparkles:
      '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3l3.5 7h7.5l-6 4.5 2.5 8-7-5-7 5 2.5-8-6-4.5h7.5z"></path></svg>',
    zap: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>',
    smile:
      '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><path d="M8 14s1.5 2 4 2 4-2 4-2"></path><line x1="9" y1="9" x2="9.01" y2="9"></line><line x1="15" y1="9" x2="15.01" y2="9"></line></svg>',
    "briefcase-business":
      '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 12h.01"></path><path d="M16 6V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"></path><path d="M22 13a18.15 18.15 0 0 1-20 0"></path><rect width="20" height="14" x="2" y="6" rx="2"></rect></svg>',
    "square-arrow-out-up-left":
      '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-6"></path><path d="m3 3 9 9"></path><path d="M3 9V3h6"></path></svg>',
    "users-round":
      '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 21a8 8 0 0 0-16 0"></path><circle cx="10" cy="8" r="5"></circle><path d="M22 20c0-3.37-2-6.5-4-8a5 5 0 0 0-.45-8.3"></path></svg>',
    "badge-info":
      '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"></path><line x1="12" x2="12" y1="16" y2="12"></line><line x1="12" x2="12.01" y1="8" y2="8"></line></svg>',
    inbox:
      '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"></polyline><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"></path></svg>',
    "square-user-round":
      '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 21a6 6 0 0 0-12 0"></path><circle cx="12" cy="11" r="4"></circle><rect width="18" height="18" x="3" y="3" rx="2"></rect></svg>',
    "user-round-cog":
      '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m14.305 19.53.923-.382"></path><path d="m15.228 16.852-.923-.383"></path><path d="m16.852 15.228-.383-.923"></path><path d="m16.852 20.772-.383.924"></path><path d="m19.148 15.228.383-.923"></path><path d="m19.53 21.696-.382-.924"></path><path d="M2 21a8 8 0 0 1 10.434-7.62"></path><path d="m20.772 16.852.924-.383"></path><path d="m20.772 19.148.924.383"></path><circle cx="10" cy="8" r="5"></circle><circle cx="18" cy="18" r="3"></circle></svg>',
    settings:
      '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915"></path><circle cx="12" cy="12" r="3"></circle></svg>',
    "sliders-horizontal":
      '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 5H3"></path><path d="M12 19H3"></path><path d="M14 3v4"></path><path d="M16 17v4"></path><path d="M21 12h-9"></path><path d="M21 19h-5"></path><path d="M21 5h-7"></path><path d="M8 10v4"></path><path d="M8 12H3"></path></svg>',
    handshake:
      '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m11 17 2 2a1 1 0 1 0 3-3"></path><path d="m14 14 2.5 2.5a1 1 0 1 0 3-3l-3.88-3.88a3 3 0 0 0-4.24 0l-.88.88a1 1 0 1 1-3-3l2.81-2.81a5.79 5.79 0 0 1 7.06-.87l.47.28a2 2 0 0 0 1.42.25L21 4"></path><path d="m21 3 1 11h-2"></path><path d="M3 3 2 14l6.5 6.5a1 1 0 1 0 3-3"></path><path d="M3 4h8"></path></svg>',
    "app-window":
      '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"></rect><path d="M10 4v4"></path><path d="M2 8h20"></path><path d="M6 4v4"></path></svg>',
    "hand-grab":
      '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 11.5V9a2 2 0 0 0-2-2a2 2 0 0 0-2 2v1.4"></path><path d="M14 10V8a2 2 0 0 0-2-2a2 2 0 0 0-2 2v2"></path><path d="M10 9.9V9a2 2 0 0 0-2-2a2 2 0 0 0-2 2v5"></path><path d="M6 14a2 2 0 0 0-2-2a2 2 0 0 0-2 2"></path><path d="M18 11a2 2 0 1 1 4 0v3a8 8 0 0 1-8 8h-4a8 8 0 0 1-8-8 2 2 0 1 1 4 0"></path></svg>',
    "loader-pinwheel":
      '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12a1 1 0 0 1-10 0 1 1 0 0 0-10 0"></path><path d="M7 20.7a1 1 0 1 1 5-8.7 1 1 0 1 0 5-8.6"></path><path d="M7 3.3a1 1 0 1 1 5 8.6 1 1 0 1 0 5 8.6"></path><circle cx="12" cy="12" r="10"></circle></svg>',
    android:
      '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M17.532 15.106a1.003 1.003 0 1 1 .001-2.007a1.003 1.003 0 0 1 0 2.007m-11.044 0a1.003 1.003 0 1 1 .001-2.007a1.003 1.003 0 0 1 0 2.007m11.4-6.018l2.006-3.459a.413.413 0 1 0-.721-.407l-2.027 3.5a12.2 12.2 0 0 0-5.13-1.108c-1.85 0-3.595.398-5.141 1.098l-2.027-3.5a.413.413 0 1 0-.72.407l1.995 3.458C2.696 10.947.345 14.417 0 18.523h24c-.334-4.096-2.675-7.565-6.112-9.435"></path></svg>',
    triangle:
      '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.293 4.793c.78-1.277 2.634-1.277 3.414 0l7.433 12.164C21.955 18.29 20.996 20 19.434 20H4.566c-1.562 0-2.52-1.71-1.706-3.043z"></path></svg>',
    api: '<svg width="24" height="24" viewBox="0 0 32 32" fill="currentColor"><path d="M26 22a3.86 3.86 0 0 0-2 .57l-3.09-3.1a6 6 0 0 0 0-6.94L24 9.43a3.86 3.86 0 0 0 2 .57a4 4 0 1 0-4-4a3.86 3.86 0 0 0 .57 2l-3.1 3.09a6 6 0 0 0-6.94 0L9.43 8A3.86 3.86 0 0 0 10 6a4 4 0 1 0-4 4a3.86 3.86 0 0 0 2-.57l3.09 3.1a6 6 0 0 0 0 6.94L8 22.57A3.86 3.86 0 0 0 6 22a4 4 0 1 0 4 4a3.86 3.86 0 0 0-.57-2l3.1-3.09a6 6 0 0 0 6.94 0l3.1 3.09a3.86 3.86 0 0 0-.57 2a4 4 0 1 0 4-4m0-18a2 2 0 1 1-2 2a2 2 0 0 1 2-2M4 6a2 2 0 1 1 2 2a2 2 0 0 1-2-2m2 22a2 2 0 1 1 2-2a2 2 0 0 1-2 2m10-8a4 4 0 1 1 4-4a4 4 0 0 1-4 4m10 8a2 2 0 1 1 2-2a2 2 0 0 1-2 2"></path></svg>',
    code: '<svg width="24" height="24" viewBox="0 0 32 32" fill="currentColor"><path d="m31 16l-7 7l-1.41-1.41L28.17 16l-5.58-5.59L24 9zM1 16l7-7l1.41 1.41L3.83 16l5.58 5.59L8 23zm11.42 9.484L17.64 6l1.932.517L14.352 26z"></path></svg>',
    cube: '<svg width="24" height="24" viewBox="0 0 32 32" fill="currentColor"><path d="m28.504 8.136l-12-7a1 1 0 0 0-1.008 0l-12 7A1 1 0 0 0 3 9v14a1 1 0 0 0 .496.864l12 7a1 1 0 0 0 1.008 0l12-7A1 1 0 0 0 29 23V9a1 1 0 0 0-.496-.864M16 3.158L26.016 9L16 14.842L5.984 9ZM5 10.74l10 5.833V28.26L5 22.426Zm12 17.52V16.574l10-5.833v11.685Z"></path></svg>',
    "ai-agent":
      '<svg width="24" height="24" viewBox="0 0 32 32" fill="currentColor"><path d="M28 13a2.995 2.995 0 0 0-2.816 2h-4.46a2 2 0 0 0-.31-.415l-.793-.792l3.094-3.094c.39.188.823.3 1.285.3c1.654 0 3-1.345 3-3s-1.346-3-3-3s-3 1.347-3 3c0 .463.113.895.3 1.286l-3.093 3.094l-.793-.793a2 2 0 0 0-.414-.31v-4.46A2.995 2.995 0 0 0 19 4c0-1.654-1.346-3-3-3s-3 1.346-3 3c0 1.302.838 2.401 2 2.815v4.462a2 2 0 0 0-.414.309l-.793.793L10.7 9.285c.187-.39.3-.823.3-1.285c0-1.654-1.346-3-3-3S5 6.346 5 8s1.346 3 3 3c.462 0 .894-.113 1.285-.3l3.094 3.093l-.793.792a2 2 0 0 0-.31.415h-4.46A2.995 2.995 0 0 0 4 13c-1.654 0-3 1.346-3 3s1.346 3 3 3a2.995 2.995 0 0 0 2.816-2h4.46c.087.148.185.29.31.414l.793.793L9.285 21.3A3 3 0 0 0 8 21c-1.654 0-3 1.346-3 3s1.346 3 3 3s3-1.346 3-3c0-.462-.114-.894-.3-1.285l3.093-3.094l.793.793c.125.126.267.224.414.31v4.46A2.995 2.995 0 0 0 13 28c0 1.654 1.346 3 3 3s3-1.346 3-3a2.995 2.995 0 0 0-2-2.816v-4.46c.147-.086.288-.184.414-.31l.793-.793l3.094 3.094c-.187.391-.3.823-.3 1.285c0 1.655 1.345 3 3 3s3-1.345 3-3s-1.347-3-3-3a2.96 2.96 0 0 0-1.286.301l-3.094-3.094l.793-.793c.125-.124.223-.266.31-.414h4.46A2.995 2.995 0 0 0 28 19c1.654 0 3-1.346 3-3s-1.346-3-3-3m-4-6a1 1 0 1 1-.002 2.002A1 1 0 0 1 24 7M7 8a1 1 0 1 1 2.002.002A1 1 0 0 1 7 8m1 17a1 1 0 1 1 .002-2.002A1 1 0 0 1 8 25m17-1a1 1 0 1 1-2.002-.002A1 1 0 0 1 25 24M16 3a1 1 0 1 1-.002 2.002A1 1 0 0 1 16 3M4 17a1 1 0 0 1 0-2c.551 0 .999.448 1 .999v.002A1 1 0 0 1 4 17m12 12a1 1 0 1 1 .002-2.002A1 1 0 0 1 16 29m0-10l-3-3l3-3l3 3zm12-2a1 1 0 1 1 .002-2.002A1 1 0 0 1 28 17"></path></svg>',
    ai: '<svg width="24" height="24" viewBox="0 0 32 32" fill="currentColor"><path d="M17 11h3v10h-3v2h8v-2h-3V11h3V9h-8zm-4-2H9c-1.103 0-2 .897-2 2v12h2v-5h4v5h2V11c0-1.103-.897-2-2-2m-4 7v-5h4v5z"></path></svg>',
  };
  return iconMap[presetId] || iconMap["messagecircle"];
};

/**
 * Get icon SVG with custom width/height for different contexts
 */
export const getIconSVGWithSize = (
  presetId: string,
  width: string = "24",
  height: string = "24"
): string => {
  const svg = getIconSVG(presetId);
  // Replace the width and height attributes in the SVG
  return svg
    .replace(/width="(\d+)"/, `width="${width}"`)
    .replace(/height="(\d+)"/, `height="${height}"`);
};
