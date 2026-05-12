-- Add suggested questions support to widget_settings
-- This migration adds a suggestedQuestions array field to store preset questions for bots

-- Update the default value for widget_settings to include suggestedQuestions
ALTER TABLE public.bots 
ALTER COLUMN widget_settings 
SET DEFAULT '{"position": "bottom-right", "primaryColor": "#3B82F6", "welcomeMessage": "Xin chào! Tôi có thể giúp gì cho bạn?", "suggestedQuestions": []}'::jsonb;

-- Update existing rows to include suggestedQuestions if not present
UPDATE public.bots 
SET widget_settings = COALESCE(widget_settings, '{}'::jsonb) || '{"suggestedQuestions": []}'::jsonb 
WHERE (widget_settings->'suggestedQuestions') IS NULL;
