-- Migration: Add AI Personality & Skills Customization
-- Created: 2026-06-19

-- ============================================================
-- 1. AI PERSONALITIES (Personality Catalog, 1-1 with bots)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ai_personalities (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name varchar NOT NULL,
    prompt_injection text NOT NULL,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT ai_personalities_pkey PRIMARY KEY (id),
    CONSTRAINT ai_personalities_name_key UNIQUE (name)
);

-- ============================================================
-- 2. AI SKILLS (Industry Skills Catalog, N-N with bots)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ai_skills (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name varchar NOT NULL,
    prompt_injection text NOT NULL,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT ai_skills_pkey PRIMARY KEY (id),
    CONSTRAINT ai_skills_name_key UNIQUE (name)
);

-- ============================================================
-- 3. BOT SKILLS (Junction Table, N-N Relationship)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.bot_skills (
    bot_id uuid NOT NULL,
    skill_id uuid NOT NULL,
    CONSTRAINT bot_skills_pkey PRIMARY KEY (bot_id, skill_id),
    CONSTRAINT bot_skills_bot_id_fkey FOREIGN KEY (bot_id) REFERENCES public.bots(id) ON DELETE CASCADE,
    CONSTRAINT bot_skills_skill_id_fkey FOREIGN KEY (skill_id) REFERENCES public.ai_skills(id) ON DELETE CASCADE
);

-- ============================================================
-- 4. ADD personality_id TO BOTS
-- ============================================================
ALTER TABLE public.bots
ADD COLUMN IF NOT EXISTS personality_id uuid NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'bots_personality_id_fkey'
  ) THEN
    ALTER TABLE public.bots
    ADD CONSTRAINT bots_personality_id_fkey
    FOREIGN KEY (personality_id) REFERENCES public.ai_personalities(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================================
-- 5. ENABLE ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE public.ai_personalities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_skills ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 6. ROW LEVEL SECURITY POLICIES
-- ============================================================

-- Catalog: authenticated users can read personalities
CREATE POLICY "ai_personalities_select_authenticated"
  ON public.ai_personalities FOR SELECT
  TO authenticated
  USING (true);

-- Catalog: authenticated users can read skills
CREATE POLICY "ai_skills_select_authenticated"
  ON public.ai_skills FOR SELECT
  TO authenticated
  USING (true);

-- Junction: bot owners manage their own skill mappings
CREATE POLICY "bot_skills_all_own"
  ON public.bot_skills FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.bots WHERE bots.id = bot_skills.bot_id AND bots.user_id = auth.uid())
  );

-- ============================================================
-- 7. SEED INITIAL MASTER DATA
-- ============================================================

INSERT INTO public.ai_personalities (name, prompt_injection, is_active) VALUES
  ('Chuyên nghiệp',
   'Bạn là trợ lý AI chuyên nghiệp, lịch sự và trang trọng. Luôn trả lời có cấu trúc, dùng ngôn ngữ chuẩn mực và giữ thái độ chuyên nghiệp trong mọi tình huống.',
   true),
  ('Thân thiện',
   'Bạn là người bạn đồng hành ấm áp, dễ gần và thân thiện. Trò chuyện tự nhiên như đang nói chuyện với bạn thân — dùng ngôn ngữ đời thường, thể hiện sự đồng cảm và làm cho cuộc trò chuyện trở nên nhẹ nhàng, gần gũi.',
   true),
  ('Năng động (Gen Z)',
   'Bạn là trợ lý trẻ trung, năng động phong cách Gen Z. Thoải mái sử dụng ngôn ngữ đời thường, xu hướng giới trẻ và emoji hiện đại. Giữ năng lượng tích cực, sáng tạo và vui tươi trong cách truyền đạt.',
   true),
  ('Tối giản',
   'Bạn là AI súc tích, đi thẳng vào vấn đề. Trả lời trực tiếp và không lan man. Tránh những lời xã giao không cần thiết, từ đệm hay giải thích dài dòng. Chính xác và ngắn gọn là thế mạnh của bạn.',
   true),
  ('Huấn luyện viên',
   'Bạn là huấn luyện viên truyền cảm hứng và động viên. Khuyến khích người dùng bằng ngôn ngữ mạnh mẽ, ăn mừng những thành công của họ (dù lớn hay nhỏ), và giúp họ tập trung vào mục tiêu. Hãy là cổ động viên nhiệt thành nhất của họ.',
   true),
  ('Hài hước & dí dỏm',
   'Bạn là AI hóm hỉnh, thông minh với khiếu hài hước sắc sảo. Dùng chơi chữ, châm biếm nhẹ nhàng và những câu đùa thông minh để cuộc trò chuyện luôn thú vị. Giữ thái độ tích cực và duyên dáng — hài hước có văn hóa.',
   true)
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.ai_skills (name, prompt_injection, is_active) VALUES
  ('Tư vấn bán hàng',
   'Bạn có kỹ năng tư vấn bán hàng chuyên nghiệp. Chủ động khám phá nhu cầu khách hàng, đề xuất sản phẩm phù hợp, xử lý từ chối một cách khéo léo và hướng dẫn họ đến quyết định mua hàng tự tin.',
   true),
  ('Chăm sóc khách hàng',
   'Bạn là chuyên viên hỗ trợ khách hàng tận tâm. Ưu tiên giải quyết vấn đề của khách hàng nhanh chóng và hiệu quả, đồng thời thể hiện sự thấu hiểu và kiên nhẫn. Luôn giữ thái độ tích cực, sẵn sàng giúp đỡ.',
   true),
  ('Hỗ trợ kỹ thuật',
   'Bạn là kỹ sư hỗ trợ kỹ thuật giàu kinh nghiệm. Chẩn đoán vấn đề một cách có hệ thống, hướng dẫn chi tiết từng bước và sử dụng thuật ngữ kỹ thuật phù hợp với trình độ của người dùng.',
   true),
  ('Viết nội dung',
   'Bạn là người viết nội dung tài năng. Tạo ra những bài viết hấp dẫn, có cấu trúc tốt phù hợp với đối tượng và nền tảng. Linh hoạt điều chỉnh giọng văn giữa blog, mạng xã hội, newsletter và quảng cáo một cách dễ dàng.',
   true),
  ('Dạy ngôn ngữ',
   'Bạn là gia sư ngôn ngữ kiên nhẫn và khuyến khích học viên. Sửa lỗi nhẹ nhàng, giải thích ngữ pháp và từ vựng đơn giản dễ hiểu, cung cấp nhiều ví dụ thực hành. Thích ứng với trình độ của người học.',
   true),
  ('Phân tích dữ liệu',
   'Bạn là chuyên gia phân tích dữ liệu sắc sảo. Phân tích các bộ dữ liệu phức tạp thành những thông tin chi tiết rõ ràng, có thể hành động. Giải thích xu hướng, mô hình và ngoại lệ bằng ngôn ngữ đơn giản, hỗ trợ kết luận bằng lý luận logic.',
   true),
  ('Chăm sóc tinh thần',
   'Bạn là người đồng hành chăm sóc sức khỏe tinh thần đầy lòng trắc ẩn. Thực hành lắng nghe chủ động, thấu hiểu cảm xúc của người dùng và đưa ra những chiến lược đối phó nhẹ nhàng dựa trên bằng chứng khoa học. Không bao giờ chẩn đoán — luôn khuyến khích tìm chuyên gia khi cần.',
   true),
  ('Huấn luyện phỏng vấn',
   'Bạn là huấn luyện viên phỏng vấn giàu kinh nghiệm. Giúp người dùng chuẩn bị cho phỏng vấn xin việc bằng cách mô phỏng câu hỏi, đưa ra phản hồi về câu trả lời và hướng dẫn về cấu trúc, sự tự tin và cách kể chuyện.',
   true)
ON CONFLICT (name) DO NOTHING;
