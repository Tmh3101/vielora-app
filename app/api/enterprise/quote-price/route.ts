import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, isAuthError } from "@/lib/helpers/auth-helpers";
import {
  calculateEnterprisePrice,
  ENTERPRISE_PRICE,
  clampValue,
} from "@/config/pricing-enterprise";
import { ESubscriptionCycle } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    if (isAuthError(authResult)) return authResult;

    const body = await request.json();
    const { botsLimit, monthlyCredits, billingCycle } = body;

    const bots = Number(botsLimit || ENTERPRISE_PRICE.bots.min);
    const credits = Number(monthlyCredits || ENTERPRISE_PRICE.monthlyCredits.min);
    const cycle =
      billingCycle === ESubscriptionCycle.Yearly
        ? ESubscriptionCycle.Yearly
        : ESubscriptionCycle.Monthly;

    const validBots = clampValue(bots, ENTERPRISE_PRICE.bots.min, ENTERPRISE_PRICE.bots.max);
    const validCredits = clampValue(
      credits,
      ENTERPRISE_PRICE.monthlyCredits.min,
      ENTERPRISE_PRICE.monthlyCredits.max
    );

    const price = calculateEnterprisePrice(validBots, validCredits, cycle);

    return NextResponse.json({
      success: true,
      data: {
        price,
        currency: ENTERPRISE_PRICE.currency,
        botsLimit: validBots,
        monthlyCredits: validCredits,
        billingCycle: cycle,
      },
    });
  } catch (error) {
    console.error("Error calculating enterprise price:", error);
    return NextResponse.json({ error: "Failed to calculate enterprise price" }, { status: 500 });
  }
}
