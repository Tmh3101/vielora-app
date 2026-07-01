import { Search, BrainCircuit, UserPlus, Smartphone, Layers, BarChart3 } from "lucide-react";

export const FEATURES = [
  {
    icon: Search,
    tag: "CRAWL TỰ ĐỘNG",
    headline: "Tự động học từ Website & tài liệu của bạn",
    description:
      "Chỉ cần nhập URL website của bạn, tự động thu thập và học nội dung từ toàn bộ website của bạn. Hỗ trợ tải lên file dữ liệu (PDF, DOCX, .MD, .TXT,...) để AI tự động học và tổng hợp kiến thức.",
  },
  {
    icon: BrainCircuit,
    tag: "CÁ TÍNH RIÊNG",
    headline: "Tùy biến phong cách cho AI",
    description:
      "Không còn là những chatbot rập khuôn. Giờ đây, bạn có thể thiết lập tính cách và các kỹ năng chuyên sâu. Tùy chỉnh giao diện chat để tạo trải nghiệm đồng bộ với nhận diện thương hiệu của bạn.",
  },
  {
    icon: Layers,
    tag: "CHIA SẺ KHUNG CHAT",
    headline: "Chia sẻ và tích hợp đa phương thức",
    description:
      "Nhúng widget chat vào bất kỳ website nào chỉ với một script duy nhất. Tích hợp sẵn Google Tag Manager, WordPress Plugin, Shopify App Embed. Chia sẻ trang chat độc lập với link chia sẻ công khai & mã QR.",
  },
  {
    icon: Smartphone,
    tag: "MOBILE APP",
    headline: "1-Click Biến Chatbot Thành Ứng Dụng Mobile Native",
    description:
      'Tối ưu hóa trải nghiệm khách hàng với công nghệ PWA cao cấp. Người dùng có thể "Cài đặt" chatbot trực tiếp lên màn hình chính của điện thoại (iOS & Android) dưới dạng một ứng dụng độc lập, chạy mượt mà mà không cần thông qua App Store.',
  },
  {
    icon: UserPlus,
    tag: "LEAD FORM",
    headline: "Biến Hội thoại thành Doanh thu tự động",
    description:
      "Tích hợp trực tiếp biểu mẫu thu thập thông tin (Họ tên, Số điện thoại, Email, Nhu cầu) ngay trong luồng chat tự nhiên. Tự động lưu trữ và đồng bộ hóa tức thì về hệ thống CRM của bạn mà không làm đứt gãy trải nghiệm khách hàng.",
  },
  {
    icon: BarChart3,
    tag: "PHÂN TÍCH",
    headline: "Quản trị Dữ liệu & Đo lường ROI Minh bạch",
    description:
      "Hệ thống Dashboard trực quan cập nhật liên tục lượng tin nhắn, tỷ lệ hoàn thành Lead Form, và hiệu suất chuyển đổi của từng kịch bản AI, giúp doanh nghiệp tối ưu hóa chiến lược kinh doanh dựa trên số liệu thực.",
  },
];

export const COOLDOWN_MS = 600;
export const TOUCHPAD_THRESHOLD = 15;
export const EXIT_GRACE_MS = 250;

export const SectionMode = {
  NORMAL: "normal",
  LOCKED: "locked",
  EXITING: "exiting",
} as const;

export type Mode = "normal" | "locked" | "exiting";
