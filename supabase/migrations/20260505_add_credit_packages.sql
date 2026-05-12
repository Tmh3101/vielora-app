-- Thêm transaction_type mới
ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'payg_purchase';

-- Tạo bảng credit_packages
CREATE TABLE IF NOT EXISTS public.credit_packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    credits_amount INT NOT NULL,
    price INT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Bật RLS
ALTER TABLE public.credit_packages ENABLE ROW LEVEL SECURITY;

-- Policy cho phép đọc các gói active (để show trên UI)
CREATE POLICY "Cho phép đọc các gói active" ON public.credit_packages
    FOR SELECT USING (is_active = true);

-- Trigger auto update updated_at
CREATE TRIGGER update_credit_packages_updated_at
    BEFORE UPDATE ON public.credit_packages
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Chèn dữ liệu mẫu
INSERT INTO public.credit_packages (name, credits_amount, price)
VALUES 
    ('Gói 1.000 Credits', 1000, 50000),
    ('Gói 5.000 Credits', 5000, 200000),
    ('Gói 10.000 Credits', 10000, 350000)
ON CONFLICT DO NOTHING;
