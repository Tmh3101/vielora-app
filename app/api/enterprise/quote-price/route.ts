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

    // Fetch active enterprise plan from DB
    const { data: enterprisePlan } = await authResult.supabase
      .from("plans")
      .select("code, bots_limit, monthly_credits, pricing")
      .eq("code", "enterprise")
      .maybeSingle();

    const minBots = enterprisePlan?.bots_limit ?? ENTERPRISE_PRICE.bots.min;
    const minCredits = enterprisePlan?.monthly_credits ?? ENTERPRISE_PRICE.monthlyCredits.min;

    const bots = Number(botsLimit || minBots);
    const credits = Number(monthlyCredits || minCredits);
    const cycle =
      billingCycle === ESubscriptionCycle.Yearly
        ? ESubscriptionCycle.Yearly
        : ESubscriptionCycle.Monthly;

    const validBots = clampValue(bots, minBots, ENTERPRISE_PRICE.bots.max);
    const validCredits = clampValue(credits, minCredits, ENTERPRISE_PRICE.monthlyCredits.max);

    const price = calculateEnterprisePrice(validBots, validCredits, cycle, {
      pricing: enterprisePlan?.pricing as Record<string, Record<string, number>> | null,
      minBots,
      minCredits,
    });

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
