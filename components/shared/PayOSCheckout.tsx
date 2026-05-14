"use client";

import { useEffect, memo } from "react";
import { Button } from "@/components/ui/button";
import { usePayOS, PayOSConfig } from "@payos/payos-checkout";

export const PayOSCheckout = memo(
  ({
    url,
    returnUrl,
    paymentId,
    onCancelPayment,
    onPayOSInternalExit,
  }: {
    url: string;
    returnUrl: string;
    paymentId: string;
    onCancelPayment: () => void;
    onPayOSInternalExit: (_event?: unknown) => void;
  }) => {
    const payOSConfig = {
      RETURN_URL: returnUrl,
      ELEMENT_ID: "payos-checkout-frame",
      CHECKOUT_URL: url,
      embedded: true,
      onSuccess: (event: Record<string, unknown>) => {
        console.log("PayOS onSuccess event:", event);
        const params = new URLSearchParams({
          paymentId: paymentId,
          code: "00",
          status: "PAID",
          orderCode: String(event?.orderCode || ""),
        });
        window.location.href = `/api/payment/payos-return?${params.toString()}`;
      },
      onCancel: (event: Record<string, unknown>) => {
        console.log("PayOS onCancel event:", event);
        onPayOSInternalExit(event);
      },
      onExit: (event: Record<string, unknown>) => {
        console.log("PayOS onExit event:", event);
        onPayOSInternalExit(event);
      },
    } satisfies PayOSConfig;

    const { open, exit } = usePayOS(payOSConfig);

    useEffect(() => {
      open();

      return () => {
        exit();
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [url, returnUrl, paymentId]);

    return (
      <div className="relative flex w-full flex-col items-center justify-center bg-white">
        <div
          id="payos-checkout-frame"
          className="relative z-20 flex h-[400px] w-full items-center justify-center overflow-hidden"
          style={{ margin: "-10px 0" }}
        ></div>

        <Button
          variant="ghost"
          size="sm"
          onClick={onCancelPayment}
          className="relative z-20 mb-4 mt-2 text-muted-foreground hover:text-foreground"
        >
          Hủy thanh toán
        </Button>
      </div>
    );
  }
);

PayOSCheckout.displayName = "PayOSCheckout";
