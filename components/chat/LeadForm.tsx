"use client";

import { useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, CheckCircle2, X } from "lucide-react";

interface LeadFormProps {
  botId: string;
  visitorId: string;
  conversationId: string;
  originalQuestion: string;
  primaryColor: string;
  headerTextColor: string;
  onSuccess: () => void;
  onClose?: () => void;
}

type FormState = "idle" | "submitting" | "submitted" | "error";

export function LeadForm({
  botId,
  visitorId,
  conversationId,
  originalQuestion,
  primaryColor,
  headerTextColor,
  onSuccess,
  onClose,
}: LeadFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [formState, setFormState] = useState<FormState>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    const nameTrimmed = name.trim();
    const emailTrimmed = email.trim();

    if (!nameTrimmed || nameTrimmed.length < 2) {
      setErrorMessage("Vui lòng nhập tên của bạn (ít nhất 2 ký tự)");
      return;
    }

    if (!emailTrimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed)) {
      setErrorMessage("Vui lòng nhập email hợp lệ");
      return;
    }

    setFormState("submitting");

    try {
      const response = await fetch("/api/widget/lead", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-bot-id": botId,
          "x-visitor-id": visitorId,
        },
        body: JSON.stringify({
          botId,
          visitorId,
          conversationId,
          question: originalQuestion,
          name: nameTrimmed,
          email: emailTrimmed,
          phone: phone.trim() || undefined,
          note: note.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to submit");
      }

      setFormState("submitted");
      onSuccess();
    } catch (error) {
      setFormState("error");
      setErrorMessage(
        error instanceof Error ? error.message : "Có lỗi xảy ra, vui lòng thử lại sau"
      );
    }
  };

  if (formState === "submitted") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-start"
      >
        <div className="max-w-[85%] rounded-2xl rounded-bl-sm bg-muted px-4 py-3 shadow-sm">
          <div className="flex items-center gap-2 font-medium text-green-600">
            <CheckCircle2 className="h-5 w-5" />
            <span>Cảm ơn bạn!</span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Thông tin của bạn đã được gửi thành công. Đội ngũ hỗ trợ sẽ liên hệ với bạn sớm nhất!
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex justify-start"
    >
      <div className="relative max-w-[85%] rounded-2xl rounded-bl-sm bg-muted px-4 py-3 shadow-sm">
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted-foreground/10 hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        <p className="mb-1 text-sm font-medium">Vui lòng để lại thông tin:</p>
        <p className="mb-3 text-xs italic text-muted-foreground">
          &ldquo;{originalQuestion.slice(0, 100)}
          {originalQuestion.length > 100 ? "..." : ""}&rdquo;
        </p>
        <form onSubmit={handleSubmit} className="space-y-2">
          <Input
            placeholder="Họ và tên *"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={formState === "submitting"}
            maxLength={100}
            className="rounded-xl text-sm"
            required
          />
          <Input
            type="email"
            placeholder="Email *"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={formState === "submitting"}
            maxLength={200}
            className="rounded-xl text-sm"
            required
          />
          <Input
            type="tel"
            placeholder="Số điện thoại"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            disabled={formState === "submitting"}
            maxLength={15}
            className="rounded-xl text-sm"
          />
          <textarea
            placeholder="Ghi chú thêm"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            disabled={formState === "submitting"}
            maxLength={500}
            className="w-full resize-none rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            rows={2}
          />
          {errorMessage && <p className="text-xs text-red-500">{errorMessage}</p>}
          <Button
            type="submit"
            disabled={formState === "submitting"}
            className="w-full rounded-xl text-sm font-medium"
            style={{ backgroundColor: primaryColor, color: headerTextColor }}
          >
            {formState === "submitting" ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Đang gửi...
              </>
            ) : (
              "Gửi thông tin"
            )}
          </Button>
        </form>
      </div>
    </motion.div>
  );
}
