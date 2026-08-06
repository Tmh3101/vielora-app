import { NextRequest, NextResponse } from "next/server";
import { normalizeTaxCode, TAX_CODE_REGEX } from "@/lib/utils/invoice-validation";

export interface TaxLookupResponseData {
  companyTaxCode: string;
  companyName: string;
  companyAddress: string;
}

export interface TaxLookupApiResponse {
  success: boolean;
  data?: TaxLookupResponseData;
  error?: string;
}

export async function GET(request: NextRequest): Promise<NextResponse<TaxLookupApiResponse>> {
  const { searchParams } = new URL(request.url);
  const rawTaxCode = searchParams.get("taxCode") || "";
  const taxCode = normalizeTaxCode(rawTaxCode);

  if (!taxCode || !TAX_CODE_REGEX.test(taxCode)) {
    return NextResponse.json(
      {
        success: false,
        error: "Mã số thuế không đúng định dạng (10 chữ số hoặc 13 chữ số có dấu gạch ngang)",
      },
      { status: 400 }
    );
  }

  try {
    const response = await fetch(`https://api.vietqr.io/v2/business/${taxCode}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      // Cache response for 24 hours in Next.js fetch cache
      next: { revalidate: 86400 },
    });

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          error: "Không thể kết nối tới dịch vụ tra cứu mã số thuế. Vui lòng thử lại sau.",
        },
        { status: 502 }
      );
    }

    const result = await response.json();

    // VietQR return code "00" indicates success
    if (result.code === "00" && result.data && result.data.name) {
      return NextResponse.json({
        success: true,
        data: {
          companyTaxCode: result.data.id || taxCode,
          companyName: result.data.name,
          companyAddress: result.data.address || "Chưa cập nhật địa chỉ",
        },
      });
    }

    const errorMsg =
      result.desc || "Mã số thuế không tồn tại hoặc doanh nghiệp đã ngừng hoạt động.";
    return NextResponse.json({ success: false, error: errorMsg }, { status: 404 });
  } catch (error) {
    console.error("[TaxLookupAPI] Unexpected error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Lỗi hệ thống khi tra cứu mã số thuế. Vui lòng thử lại sau.",
      },
      { status: 500 }
    );
  }
}
