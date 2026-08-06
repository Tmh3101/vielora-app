import { convertNumberToVietnameseWords } from "@/lib/utils/number-to-words";

export interface InvoiceXmlPayload {
  invoiceId: string;
  companyName: string;
  companyTaxCode: string;
  companyAddress: string;
  recipientEmail: string;
  packageName: string;
  packageCode: string;
  amount: number;
  sendEasyInvoiceEmail?: boolean;
}

export function buildInvoiceXml(data: InvoiceXmlPayload): string {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const dateStr = formatter.format(now);

  const cleanCompanyName = data.companyName
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  const cleanCompanyAddress = data.companyAddress
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  const cleanPackageName = data.packageName
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  const amountWords = convertNumberToVietnameseWords(data.amount);
  const emails = data.recipientEmail
    .split(/[,;]+/)
    .map((e) => e.trim())
    .filter((e) => e.length > 0);
  const primaryEmail = data.sendEasyInvoiceEmail ? emails[0] || "" : "";
  const cusEmailsStr = data.sendEasyInvoiceEmail ? emails.join(",") : "";

  return `<?xml version="1.0" encoding="UTF-8"?>
<Invoices>
  <Inv>
    <Invoice>
      <Ikey>${data.invoiceId}</Ikey>
      <CusCode>${data.companyTaxCode}</CusCode>
      <Buyer>${cleanCompanyName}</Buyer>
      <CusName>${cleanCompanyName}</CusName>
      <CusAddress>${cleanCompanyAddress}</CusAddress>
      <CusTaxCode>${data.companyTaxCode}</CusTaxCode>
      <Email>${primaryEmail}</Email>
      <CusEmails>${cusEmailsStr}</CusEmails>
      <PaymentMethod>Chuyển khoản</PaymentMethod>
      <ArisingDate>${dateStr}</ArisingDate>
      <CurrencyUnit>VND</CurrencyUnit>
      <Products>
        <Product>
          <Code>${data.packageCode}</Code>
          <No>1</No>
          <Feature>1</Feature>
          <ProdName>${cleanPackageName}</ProdName>
          <ProdUnit>Lần</ProdUnit>
          <ProdQuantity>1</ProdQuantity>
          <ProdPrice>${data.amount}</ProdPrice>
          <Total>${data.amount}</Total>
           <VATRate>0</VATRate>
           <VATAmount>0</VATAmount>
           <Amount>${data.amount}</Amount>
        </Product>
      </Products>
      <Total>${data.amount}</Total>
      <VATRate>0</VATRate>
      <VATAmount>0</VATAmount>
      <Amount>${data.amount}</Amount>
      <AmountInWords>${amountWords}</AmountInWords>
    </Invoice>
  </Inv>
</Invoices>`.trim();
}
