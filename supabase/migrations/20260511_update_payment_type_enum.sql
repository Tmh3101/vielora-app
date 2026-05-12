-- Thêm các giá trị mới cho enum payment_type
ALTER TYPE "public"."payment_type" ADD VALUE IF NOT EXISTS 'subscription_upgrade';
ALTER TYPE "public"."payment_type" ADD VALUE IF NOT EXISTS 'subscription_renew';
