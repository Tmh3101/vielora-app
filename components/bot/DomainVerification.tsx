"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import {
  Globe,
  Loader2,
  CheckCircle,
  AlertCircle,
  ShieldCheck,
  Copy,
  Check,
  RefreshCw,
  ExternalLink,
  Code,
  FileText,
} from "lucide-react";

type VerificationMethod = "meta" | "file" | "dns";

interface VerificationData {
  domain: string;
  verificationToken: string;
  dnsRecord: {
    type: string;
    name: string;
    value: string;
  };
  metaTag: string;
  fileName: string;
  fileContent: string;
}

interface DomainVerificationProps {
  botId: string;
  verifiedAt: string | null;
  onVerified: () => void;
}

const DomainVerification = ({ botId, verifiedAt, onVerified }: DomainVerificationProps) => {
  const { toast } = useToast();
  const { session } = useAuth();
  const [verificationData, setVerificationData] = useState<VerificationData | null>(null);
  const [verificationMethod, setVerificationMethod] = useState<VerificationMethod>("meta");
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const generateVerificationToken = useCallback(async () => {
    if (!session?.access_token) return;

    setIsLoading(true);
    try {
      const response = await fetch("/api/verify-domain", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ botId, action: "generate" }),
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data?.error || "Failed to generate token");

      if (data?.success) {
        setVerificationData(data.data);
      } else {
        throw new Error(data?.error || "Failed to generate token");
      }
    } catch (error: unknown) {
      console.error("Error generating verification token:", error);
      const errorMessage = error instanceof Error ? error.message : "";
      toast({
        title: "Lỗi",
        description: errorMessage || "Không thể tạo mã xác thực, vui lòng thử lại.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [botId, session?.access_token, toast]);

  useEffect(() => {
    if (!verifiedAt && session?.access_token) {
      generateVerificationToken();
    }
  }, [verifiedAt, session?.access_token, generateVerificationToken]);

  const handleVerifyDomain = async () => {
    if (!session?.access_token) return;

    setIsVerifying(true);

    try {
      const response = await fetch("/api/verify-domain", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ botId, action: "verify", method: verificationMethod }),
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data?.error || "Verification failed");

      if (data?.success && data?.data?.verified) {
        toast({
          title: "Xác thực thành công!",
          description: "Domain đã được xác thực.",
        });
        onVerified();
      } else {
        toast({
          title: "Chưa xác thực được",
          description: data?.data?.message || "Vui lòng kiểm tra và thử lại.",
          variant: "destructive",
        });
      }
    } catch (error: unknown) {
      console.error("Verification error:", error);
      const errorMessage = error instanceof Error ? error.message : "";
      toast({
        title: "Lỗi xác thực",
        description: errorMessage || "Không thể xác thực domain.",
        variant: "destructive",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleCopyValue = (value: string, field: string) => {
    navigator.clipboard.writeText(value);
    setCopiedField(field);
    toast({
      title: "Đã copy!",
      description: "Giá trị đã được copy vào clipboard.",
    });
    setTimeout(() => setCopiedField(null), 2000);
  };

  if (verifiedAt) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Xác thực Domain
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
            <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
            <div>
              <p className="font-medium text-green-700 dark:text-green-300">
                Domain đã được xác thực
              </p>
              <p className="text-sm text-green-600 dark:text-green-400">
                Xác thực lúc: {new Date(verifiedAt).toLocaleString("vi-VN")}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Xác thực Domain
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          Xác thực Domain (Tuỳ chọn)
        </CardTitle>
        <CardDescription>
          Xác thực quyền sở hữu website để tăng cường bảo mật. Widget đã được bảo vệ bởi Origin
          Verification tự động.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
          <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600 dark:text-amber-400" />
          <div>
            <p className="font-medium text-amber-700 dark:text-amber-300">
              Domain chưa được xác thực
            </p>
            <p className="text-sm text-amber-600 dark:text-amber-400">
              Xác thực domain để đảm bảo chỉ chủ sở hữu website mới có thể sử dụng bot.
            </p>
          </div>
        </div>

        {verificationData && (
          <>
            <Tabs
              value={verificationMethod}
              onValueChange={(v) => setVerificationMethod(v as VerificationMethod)}
            >
              <TabsList className="grid w-full grid-cols-3 bg-muted/60">
                <TabsTrigger value="meta" className="flex items-center gap-1.5">
                  <Code className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Meta Tag</span>
                  <span className="sm:hidden">Meta</span>
                </TabsTrigger>
                <TabsTrigger value="file" className="flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Upload File</span>
                  <span className="sm:hidden">File</span>
                </TabsTrigger>
                <TabsTrigger value="dns" className="flex items-center gap-1.5">
                  <Globe className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">DNS Record</span>
                  <span className="sm:hidden">DNS</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="meta" className="mt-4 space-y-4">
                <div className="rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-900/20">
                  <p className="flex items-center gap-2 text-sm text-green-700 dark:text-green-300">
                    <CheckCircle className="h-4 w-4" />
                    <strong>Dễ nhất</strong> - Chỉ cần copy paste vào HTML
                  </p>
                </div>

                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Thêm thẻ meta sau vào phần{" "}
                    <code className="rounded bg-muted px-1">&lt;head&gt;</code> của trang chủ:
                  </p>
                  <div className="rounded-lg border bg-muted p-3">
                    <div className="mb-1 flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">Meta Tag</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopyValue(verificationData.metaTag, "meta")}
                      >
                        {copiedField === "meta" ? (
                          <Check className="h-3 w-3" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                    <pre className="overflow-x-auto whitespace-pre-wrap break-all font-mono text-sm">
                      {verificationData.metaTag}
                    </pre>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="file" className="mt-4 space-y-4">
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-900/20">
                  <p className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300">
                    <FileText className="h-4 w-4" />
                    <strong>Đơn giản</strong> - Upload 1 file text
                  </p>
                </div>

                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Tạo file{" "}
                    <code className="rounded bg-muted px-1">{verificationData.fileName}</code> về
                    upload lên thư mục gốc:
                  </p>

                  <div className="rounded-lg border bg-muted p-3">
                    <div className="mb-1 flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">Tên file</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopyValue(verificationData.fileName, "filename")}
                      >
                        {copiedField === "filename" ? (
                          <Check className="h-3 w-3" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                    <p className="font-mono text-sm">{verificationData.fileName}</p>
                  </div>

                  <div className="rounded-lg border bg-muted p-3">
                    <div className="mb-1 flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">Nội dung file</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopyValue(verificationData.fileContent, "filecontent")}
                      >
                        {copiedField === "filecontent" ? (
                          <Check className="h-3 w-3" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                    <p className="break-all font-mono text-sm">{verificationData.fileContent}</p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="dns" className="mt-4 space-y-4">
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-900/20">
                  <p className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-300">
                    <AlertCircle className="h-4 w-4" />
                    <strong>Nâng cao</strong> - Cần truy cập DNS, mất 5-48 giở
                  </p>
                </div>

                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Thêm TXT record vào DNS của domain:
                  </p>

                  <div className="rounded-lg border bg-muted p-3">
                    <p className="mb-1 text-xs text-muted-foreground">Type</p>
                    <p className="font-mono text-sm font-medium">TXT</p>
                  </div>

                  <div className="rounded-lg border bg-muted p-3">
                    <div className="mb-1 flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">Name / Host</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopyValue(verificationData.dnsRecord.name, "dnsname")}
                      >
                        {copiedField === "dnsname" ? (
                          <Check className="h-3 w-3" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                    <p className="break-all font-mono text-sm font-medium">
                      {verificationData.dnsRecord.name}
                    </p>
                  </div>

                  <div className="rounded-lg border bg-muted p-3">
                    <div className="mb-1 flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">Value</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          handleCopyValue(verificationData.verificationToken, "dnsvalue")
                        }
                      >
                        {copiedField === "dnsvalue" ? (
                          <Check className="h-3 w-3" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                    <p className="break-all font-mono text-sm font-medium">
                      {verificationData.verificationToken}
                    </p>
                  </div>

                  <a
                    href="https://dnschecker.org"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Kiểm tra DNS propagation
                  </a>
                </div>
              </TabsContent>
            </Tabs>

            <Button className="w-full" onClick={handleVerifyDomain} disabled={isVerifying}>
              {isVerifying ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Đang kiểm tra...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Xác thực ngay
                </>
              )}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default DomainVerification;
