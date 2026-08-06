import { createHash, randomUUID } from "crypto";
import { buildInvoiceXml, InvoiceXmlPayload } from "@/lib/helpers/easyinvoice-xml-builder";

export function generateEasyInvoiceAuthHeader(
  httpMethod: "GET" | "POST",
  username: string,
  password: string,
  taxCode: string
): string {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = randomUUID().replace(/-/g, "").toLowerCase();
  const signatureRawData = `${httpMethod.toUpperCase()}${timestamp}${nonce}`;
  const signature = createHash("md5").update(signatureRawData, "utf8").digest("base64");
  return `${signature}:${nonce}:${timestamp}:${username}:${password}:${taxCode}`;
}

export interface EasyInvoicePublishResponse {
  Status: string;
  Message: string;
  ErrorCode: string;
  Data?: {
    Pattern: string;
    Serial: string;
    KeyInvoiceNo?: Record<string, string>;
    KeyInvoiceMsg?: Record<string, string>;
    Invoices?: Array<{
      InvoiceStatus: number;
      No: string;
      LookupCode: string;
      Ikey: string;
      LinkView: string;
      TCTCheckStatus: string;
      TCTErrorMessage: string;
    }>;
  };
}

export async function publishInvoice(data: InvoiceXmlPayload): Promise<EasyInvoicePublishResponse> {
  const baseUrl = process.env.EASYINVOICE_API_BASE_URL || "https://api.easyinvoice.vn";
  const username = process.env.EASYINVOICE_USERNAME;
  const password = process.env.EASYINVOICE_PASSWORD;
  const sellerTaxCode = process.env.EASYINVOICE_TAX_CODE;
  const pattern = process.env.EASYINVOICE_PATTERN;
  const serial = process.env.EASYINVOICE_SERIAL || "";

  if (!username || !password || !sellerTaxCode || !pattern) {
    throw new Error("Missing EasyInvoice configuration environment variables.");
  }

  const authHeader = generateEasyInvoiceAuthHeader("POST", username, password, sellerTaxCode);
  const xmlData = buildInvoiceXml(data);

  console.log("data:", data);
  console.log("xmlData:", xmlData);

  const response = await fetch(`${baseUrl}/api/publish/importAndIssueInvoice`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authentication: authHeader,
    },
    body: JSON.stringify({
      XmlData: xmlData,
      Pattern: pattern,
      Serial: serial,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "unable to read body");
    console.error(
      `EasyInvoice API error: ${response.status} ${response.statusText} — ${errorBody}`
    );
    throw new Error(
      JSON.parse(errorBody).Message ||
        `EasyInvoice API request failed with status ${response.status} ${response.statusText}`
    );
  }

  const result: EasyInvoicePublishResponse = await response.json();
  return result;
}

export interface EasyInvoiceQueryResponse {
  Status: string | number;
  Message: string;
  ErrorCode: string;
  Data?: {
    Invoices?: Array<{
      InvoiceStatus: number;
      No: string;
      LookupCode: string;
      Ikey: string;
      LinkView: string;
      Pattern?: string;
      Serial?: string;
      TCTCheckStatus?: string;
      TCTErrorMessage?: string;
    }>;
  };
}

export async function getInvoiceByIkey(ikey: string): Promise<EasyInvoiceQueryResponse> {
  const baseUrl = process.env.EASYINVOICE_API_BASE_URL || "https://api.easyinvoice.vn";
  const username = process.env.EASYINVOICE_USERNAME;
  const password = process.env.EASYINVOICE_PASSWORD;
  const sellerTaxCode = process.env.EASYINVOICE_TAX_CODE;

  if (!username || !password || !sellerTaxCode) {
    throw new Error("Missing EasyInvoice configuration environment variables.");
  }

  const authHeader = generateEasyInvoiceAuthHeader("POST", username, password, sellerTaxCode);

  const response = await fetch(`${baseUrl}/api/publish/getInvoicesByIkeys`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authentication: authHeader,
    },
    body: JSON.stringify({
      Ikeys: [ikey],
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "unable to read body");
    console.error(
      `EasyInvoice getInvoicesByIkeys error: ${response.status} ${response.statusText} — ${errorBody}`
    );
    throw new Error(`EasyInvoice getInvoicesByIkeys failed with status ${response.status}`);
  }

  const result: EasyInvoiceQueryResponse = await response.json();
  return result;
}
