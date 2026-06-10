export const formatLocalTime = (date_time: string): string => {
  return new Date(date_time).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
};
