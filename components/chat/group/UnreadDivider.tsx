"use client";

interface UnreadDividerProps {
  count?: number;
}

export function UnreadDivider({ count }: UnreadDividerProps) {
  return (
    <div
      id="unread-divider"
      data-testid="unread-divider"
      className="relative my-4 flex items-center justify-center"
    >
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-border/60" />
      </div>
      <div className="shadow-2xs backdrop-blur-xs relative flex items-center gap-1.5 rounded-full border border-border/60 bg-background/90 px-3 py-0.5 text-[11px] font-medium text-muted-foreground">
        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
        Tin nhắn chưa đọc {count ? `(${count})` : ""}
      </div>
    </div>
  );
}
