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
    headline: "1-click biến chatbot thành Mobile App",
    description:
      'Tối ưu hóa trải nghiệm khách hàng với công nghệ PWA. Người dùng có thể "Cài đặt" chatbot trực tiếp lên màn hình chính của điện thoại dưới dạng một ứng dụng độc lập.',
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
    headline: "Quản trị dữ liệu trực quan",
    description:
      "Hệ thống Dashboard trực quan cập nhật real-time, giúp doanh nghiệp tối ưu hóa chiến lược kinh doanh dựa trên số liệu thực.",
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

export const LEFT_IDS = new Set(["website", "blog", "news"]);
export const RIGHT_IDS = new Set(["pdf", "docx", "md", "csv", "txt"]);
export const SPINE_GAP = 28;
export const CR = 16;
export const CONVERGE_BIAS_X = 0.3;
export const CONVERGE_BIAS_Y = 0.85;
export const SAMPLE_COUNT = 100;
