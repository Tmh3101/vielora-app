const HEX_COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/;

export const isHexColor = (color: string) => {
  return HEX_COLOR_REGEX.test(color);
};
