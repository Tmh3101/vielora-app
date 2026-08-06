const UNITS = ["", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"];
const PLACE_VALUES = ["", "nghìn", "triệu", "tỷ", "nghìn tỷ", "triệu tỷ"];

function readThreeDigits(digits: number, showZeroHundred: boolean): string {
  const hundreds = Math.floor(digits / 100);
  const tens = Math.floor((digits % 100) / 10);
  const ones = digits % 10;
  let text = "";

  if (hundreds > 0) {
    text += `${UNITS[hundreds]} trăm `;
  } else if (showZeroHundred) {
    text += "không trăm ";
  }

  if (tens > 1) {
    text += `${UNITS[tens]} mươi `;
  } else if (tens === 1) {
    text += "mười ";
  } else if (tens === 0 && ones > 0 && (hundreds > 0 || showZeroHundred)) {
    text += "lẻ ";
  }

  if (ones === 1 && tens > 1) {
    text += "mốt";
  } else if (ones === 5 && tens > 0) {
    text += "lăm";
  } else if (ones > 0) {
    text += UNITS[ones];
  }

  return text.trim();
}

/**
 * Converts a numeric amount into standard Vietnamese currency text.
 * Example: 5000000 -> "Năm triệu đồng"
 */
export function convertNumberToVietnameseWords(amount: number): string {
  if (amount === 0) return "Không đồng";

  let tempAmount = Math.abs(Math.floor(amount));
  const groups: number[] = [];

  while (tempAmount > 0) {
    groups.push(tempAmount % 1000);
    tempAmount = Math.floor(tempAmount / 1000);
  }

  let result = "";
  for (let i = groups.length - 1; i >= 0; i--) {
    const groupVal = groups[i];
    if (groupVal === 0) continue;

    // Show zero hundred reading for intermediate groups
    const showZeroHundred = i < groups.length - 1;
    const groupText = readThreeDigits(groupVal, showZeroHundred);

    result += `${groupText} ${PLACE_VALUES[i]} `;
  }

  // Format clean response: capitalized start, appended "đồng"
  const cleanResult = `${result.trim()} đồng`;
  return cleanResult.charAt(0).toUpperCase() + cleanResult.slice(1);
}
