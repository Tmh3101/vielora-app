"use client";

import { useState, useRef, useCallback, type KeyboardEvent, type ClipboardEvent } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { EMAIL_REGEX, MAX_INVOICE_EMAILS } from "@/lib/utils/invoice-validation";

interface EmailChipsInputProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  maxEmails?: number;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

function parseEmails(raw: string): string[] {
  return raw
    .split(/[,;]+/)
    .map((e) => e.trim())
    .filter((e) => e.length > 0);
}

function toRawString(emails: string[]): string {
  return emails.join(", ");
}

export function EmailChipsInput({
  value,
  onChange,
  onBlur,
  maxEmails = MAX_INVOICE_EMAILS,
  disabled = false,
  placeholder = " Nhập email và nhấn Enter",
  className,
}: EmailChipsInputProps) {
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const emails = parseEmails(value);
  const isMaxed = emails.length >= maxEmails;

  const addEmail = useCallback(
    (raw: string) => {
      const trimmed = raw.trim().replace(/[,;]+$/, "");
      if (!trimmed || !EMAIL_REGEX.test(trimmed)) return false;

      const currentEmails = parseEmails(value);
      if (currentEmails.length >= maxEmails) return false;
      if (currentEmails.some((e) => e.toLowerCase() === trimmed.toLowerCase())) return false;

      onChange(toRawString([...currentEmails, trimmed]));
      return true;
    },
    [value, maxEmails, onChange]
  );

  const removeEmail = useCallback(
    (index: number) => {
      const currentEmails = parseEmails(value);
      onChange(toRawString(currentEmails.filter((_, i) => i !== index)));
    },
    [value, onChange]
  );

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    const pasted = e.clipboardData.getData("text");
    if (pasted && /[,;]/.test(pasted)) {
      e.preventDefault();
      const candidates = parseEmails(pasted);
      const currentEmails = parseEmails(value);
      const updated = [...currentEmails];

      for (const addr of candidates) {
        if (updated.length >= maxEmails) break;
        if (!EMAIL_REGEX.test(addr)) continue;
        if (updated.some((e) => e.toLowerCase() === addr.toLowerCase())) continue;
        updated.push(addr);
      }

      onChange(toRawString(updated));
      setInputValue("");
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      if (addEmail(inputValue)) {
        setInputValue("");
      }
    } else if (e.key === "Backspace" && inputValue === "" && emails.length > 0) {
      removeEmail(emails.length - 1);
    }
  };

  const handleBlur = () => {
    if (inputValue.trim()) {
      addEmail(inputValue);
      setInputValue("");
    }
    // Defer onBlur to the next tick to allow parent state updates from onChange to propagate first
    setTimeout(() => {
      onBlur?.();
    }, 0);
  };

  const focusInput = () => {
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} onClick={focusInput}>
      <div
        className={cn(
          "flex min-h-[42px] w-full flex-wrap items-center gap-1.5 rounded-md border border-input bg-background px-2.5 py-1.5 text-sm ring-offset-background",
          "focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
      >
        {emails.map((email, index) => (
          <Badge
            key={`${email}-${index}`}
            variant="secondary"
            className="gap-1 pr-1 text-xs font-normal"
          >
            {email}
            <button
              type="button"
              disabled={disabled}
              onClick={(e) => {
                e.stopPropagation();
                removeEmail(index);
              }}
              className="ml-0.5 rounded-full p-0.5 hover:bg-destructive/20 hover:text-destructive"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        {!isMaxed && (
          <input
            ref={inputRef}
            type="email"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            onBlur={handleBlur}
            disabled={disabled}
            placeholder={emails.length === 0 ? placeholder : ""}
            className="min-w-[120px] flex-1 bg-transparent py-0.5 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
          />
        )}
      </div>
    </div>
  );
}
