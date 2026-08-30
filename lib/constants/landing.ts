import {
  Search,
  BrainCircuit,
  LayoutGrid,
  Users,
  Layers,
  Smartphone,
  UserPlus,
  BarChart3,
} from "lucide-react";

export const FEATURES = [
  {
    icon: Search,
    tag: "CRAWL TỰ ĐỘNG",
    headline: "Tự động học từ Website và tài liệu của bạn",
    description:
      "Chỉ cần nhập URL website, hệ thống tự động thu thập và học nội dung toàn diện. Hỗ trợ tải lên đa dạng định dạng tệp để AI tổng hợp kho tri thức tức thì.",
  },
  {
    icon: BrainCircuit,
    tag: "CÁ TÍNH RIÊNG",
    headline: "Tùy biến phong cách và kỹ năng cho AI",
    description:
      "Không còn là những chatbot rập khuôn. Doanh nghiệp dễ dàng thiết lập tính cách, kỹ năng chuyên sâu và tùy chỉnh giao diện chat đồng bộ với nhận diện thương hiệu.",
  },
  {
    icon: LayoutGrid,
    tag: "SMART HOMEPAGE",
    headline: "Tự động điều hướng theo ý định",
    description:
      "Không để khách hàng lạc lối trong menu. Khi khách hỏi 'Xem bảng giá', AI tự động nhận diện ý định, chuyển hướng đến đúng trang đích và duy trì liên tục cuộc hội thoại.",
  },
  {
    icon: Users,
    tag: "CHAT NHÓM",
    headline: "Chatbot thông minh trong không gian hội thoại nhóm",
    description:
      "Tạo nhóm chat với AI. Trợ lý AI tự động tóm tắt nội dung, giải đáp thắc mắc chung và hỗ trợ phối hợp nhóm tức thì.",
  },
  {
    icon: Layers,
    tag: "CHIA SẺ KHUNG CHAT",
    headline: "Chia sẻ và tích hợp đa phương thức",
    description:
      "Nhúng vào bất kỳ website nào chỉ với một script duy nhất. Tích hợp sẵn Google Tag Manager, WordPress Plugin, Shopify App Embed và chia sẻ trang chat độc lập với mã QR.",
  },
  {
    icon: Smartphone,
    tag: "MOBILE APP",
    headline: "1-click biến chatbot thành Mobile App",
    description:
      "Tối ưu hóa trải nghiệm khách hàng với công nghệ PWA. Người dùng có thể cài đặt chatbot trực tiếp lên màn hình chính điện thoại dưới dạng ứng dụng độc lập mượt mà.",
  },
  {
    icon: UserPlus,
    tag: "LEAD FORM",
    headline: "Biến hội thoại thành Doanh thu tự động",
    description:
      "Tích hợp trực tiếp biểu mẫu thu thập thông tin ngay trong luồng chat tự nhiên. Tự động lưu trữ và đồng bộ hóa tức thì về hệ thống CRM của bạn.",
  },
  {
    icon: BarChart3,
    tag: "PHÂN TÍCH",
    headline: "Quản trị dữ liệu và hiệu suất trực quan",
    description:
      "Hệ thống Dashboard trực quan cập nhật real-time, giúp doanh nghiệp liên tục theo dõi xu hướng câu hỏi và tối ưu hóa tỷ lệ chuyển đổi dựa trên số liệu thực tế.",
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
