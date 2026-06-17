"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Code, Copy, Plug, Tag } from "lucide-react";
import { Framework, type FrameworkType } from "@/lib/constants";
import { getEmbededScript } from "@/lib/helpers";

export interface IntegrationTabProps {
  botId: string;
  appUrl: string;
  onCopyScript: (framework: FrameworkType, copiedLabel?: string) => void;
}

export function IntegrationTab({ botId, appUrl, onCopyScript }: IntegrationTabProps) {
  return (
    <div className="space-y-6">
      <div className="mb-6">
        <p className="text-muted-foreground">Chọn cách cài đặt phù hợp với website của bạn</p>
      </div>

      <Tabs defaultValue="snippet" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 bg-muted/60">
          <TabsTrigger value="gtm" className="flex items-center gap-2">
            <Tag className="h-4 w-4" />
            <span className="hidden sm:inline">Google Tag Manager</span>
            <span className="sm:hidden">GTM</span>
          </TabsTrigger>
          <TabsTrigger value="snippet" className="flex items-center gap-2">
            <Code className="h-4 w-4" />
            <span className="hidden sm:inline">Copy Code</span>
            <span className="sm:hidden">Code</span>
          </TabsTrigger>
          <TabsTrigger value="wordpress" className="flex items-center gap-2">
            <Plug className="h-4 w-4" />
            <span>WordPress</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="gtm">
          <Card className="glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Tag className="h-5 w-5 text-primary" />
                Cài đặt qua Google Tag Manager
              </CardTitle>
              <CardDescription>Cách dễ nhất nếu bạn đã dùng GTM</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary">
                    1
                  </div>
                  <div>
                    <h4 className="mb-1 font-medium">Mở Google Tag Manager</h4>
                    <p className="text-sm text-muted-foreground">
                      Đăng nhập vào{" "}
                      <a
                        href="https://tagmanager.google.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        tagmanager.google.com
                      </a>
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary">
                    2
                  </div>
                  <div>
                    <h4 className="mb-1 font-medium">Tạo Tag mới</h4>
                    <p className="text-sm text-muted-foreground">
                      Chọn &quot;Tags&quot; → &quot;New&quot; → &quot;Custom HTML&quot;
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary">
                    3
                  </div>
                  <div>
                    <h4 className="mb-1 font-medium">Dán code và lưu</h4>
                    <p className="text-sm text-muted-foreground">
                      Dán đoạn code bên dưới, chọn Trigger &quot;All Pages&quot;, sau đó Publish
                    </p>
                  </div>
                </div>
              </div>

              <div className="relative">
                <pre className="overflow-x-auto rounded-lg bg-muted p-4 text-sm">
                  <code>{getEmbededScript(botId, appUrl, Framework.GTM)}</code>
                </pre>
                <Button
                  size="sm"
                  variant="secondary"
                  className="absolute right-2 top-2"
                  onClick={() => onCopyScript(Framework.GTM, "Code")}
                >
                  <Copy className="mr-1 h-4 w-4" />
                  Copy
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="snippet">
          <Card className="glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="h-5 w-5 text-primary" />
                Copy code trực tiếp
              </CardTitle>
              <CardDescription>Dán code vào website của bạn</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Tabs defaultValue="html" className="space-y-4">
                <TabsList className="grid w-full grid-cols-3 bg-muted/60">
                  <TabsTrigger value="html" className="flex items-center gap-2">
                    <svg className="h-4 w-4" viewBox="-11.5 -10.232 23 20.463" fill="currentColor">
                      <circle r="2.05" />
                      <g stroke="currentColor" fill="none" strokeWidth="1">
                        <ellipse rx="11" ry="4.2" />
                        <ellipse rx="11" ry="4.2" transform="rotate(60)" />
                        <ellipse rx="11" ry="4.2" transform="rotate(120)" />
                      </g>
                    </svg>
                    React / HTML
                  </TabsTrigger>
                  <TabsTrigger value="vue" className="flex items-center gap-2">
                    <svg className="h-4 w-4" viewBox="0 0 261.76 226.69" fill="none">
                      <path
                        d="M161.096.001l-30.224 52.35L100.647.001H0l130.872 226.688L261.76.001z"
                        fill="#41B883"
                      />
                      <path
                        d="M161.096.001l-30.224 52.35L100.647.001H52.346l78.526 136.01L209.398.001z"
                        fill="#34495E"
                      />
                    </svg>
                    VueJS
                  </TabsTrigger>
                  <TabsTrigger value="php" className="flex items-center gap-2">
                    <svg className="h-4 w-4" viewBox="0 0 256 134" fill="none">
                      <ellipse cx="128" cy="67" rx="128" ry="67" fill="#8892BF" />
                      <text
                        x="128"
                        y="85"
                        textAnchor="middle"
                        fontSize="80"
                        fontWeight="bold"
                        fontFamily="Arial"
                        fill="#232531"
                      >
                        php
                      </text>
                    </svg>
                    PHP
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="html" className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Dán đoạn code sau vào file HTML hoặc component React của bạn (trước thẻ{" "}
                    {"</body>"})
                  </p>
                  <div className="relative">
                    <pre className="overflow-x-auto rounded-lg bg-muted p-4 text-sm">
                      <code>{getEmbededScript(botId, appUrl, Framework.REACT)}</code>
                    </pre>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="absolute right-2 top-2"
                      onClick={() => onCopyScript(Framework.REACT, "Code")}
                    >
                      <Copy className="mr-1 h-4 w-4" />
                      Copy
                    </Button>
                  </div>
                  <div className="space-y-3 pt-2">
                    <h4 className="text-sm font-medium">Vị trí đặt code phổ biến:</h4>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <div className="rounded-lg border border-border/60 p-3">
                        <p className="mb-0.5 text-sm font-medium">Next.js (App Router)</p>
                        <code className="text-xs text-muted-foreground">
                          app/layout.tsx (trước {"</body>"})
                        </code>
                      </div>
                      <div className="rounded-lg border border-border/60 p-3">
                        <p className="mb-0.5 text-sm font-medium">Next.js (Pages Router)</p>
                        <code className="text-xs text-muted-foreground">pages/_document.tsx</code>
                      </div>
                      <div className="rounded-lg border border-border/60 p-3">
                        <p className="mb-0.5 text-sm font-medium">React (Vite / CRA)</p>
                        <code className="text-xs text-muted-foreground">
                          index.html (trước {"</body>"})
                        </code>
                      </div>
                      <div className="rounded-lg border border-border/60 p-3">
                        <p className="mb-0.5 text-sm font-medium">HTML thuần</p>
                        <code className="text-xs text-muted-foreground">
                          index.html (trước {"</body>"})
                        </code>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="vue" className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Thêm đoạn code sau vào component chính (App.vue hoặc layout)
                  </p>
                  <div className="relative">
                    <pre className="overflow-x-auto rounded-lg bg-muted p-4 text-sm">
                      <code>{getEmbededScript(botId, appUrl, Framework.VUE)}</code>
                    </pre>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="absolute right-2 top-2"
                      onClick={() => onCopyScript(Framework.VUE, "Code")}
                    >
                      <Copy className="mr-1 h-4 w-4" />
                      Copy
                    </Button>
                  </div>
                  <div className="space-y-3 pt-2">
                    <h4 className="text-sm font-medium">Vị trí đặt code phổ biến:</h4>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <div className="rounded-lg border border-border/60 p-3">
                        <p className="mb-0.5 text-sm font-medium">Vue 3 (Vite)</p>
                        <code className="text-xs text-muted-foreground">
                          index.html (trước {"</body>"})
                        </code>
                      </div>
                      <div className="rounded-lg border border-border/60 p-3">
                        <p className="mb-0.5 text-sm font-medium">Nuxt 3</p>
                        <code className="text-xs text-muted-foreground">app.vue</code>
                      </div>
                      <div className="rounded-lg border border-border/60 p-3">
                        <p className="mb-0.5 text-sm font-medium">Vue 2 (CLI)</p>
                        <code className="text-xs text-muted-foreground">public/index.html</code>
                      </div>
                      <div className="rounded-lg border border-border/60 p-3">
                        <p className="mb-0.5 text-sm font-medium">Vue + Quasar</p>
                        <code className="text-xs text-muted-foreground">
                          src/App.vue hoặc src/layouts/MainLayout.vue
                        </code>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="php" className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Dán đoạn code sau vào file layout chính, ngay trước thẻ{" "}
                    <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{"</body>"}</code>
                  </p>
                  <div className="relative">
                    <pre className="overflow-x-auto rounded-lg bg-muted p-4 text-sm">
                      <code>{getEmbededScript(botId, appUrl, Framework.PHP)}</code>
                    </pre>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="absolute right-2 top-2"
                      onClick={() => onCopyScript(Framework.PHP, "Code")}
                    >
                      <Copy className="mr-1 h-4 w-4" />
                      Copy
                    </Button>
                  </div>
                  <div className="space-y-3 pt-2">
                    <h4 className="text-sm font-medium">Vị trí đặt code phổ biến:</h4>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <div className="rounded-lg border border-border/60 p-3">
                        <p className="mb-0.5 text-sm font-medium">Laravel</p>
                        <code className="text-xs text-muted-foreground">
                          resources/views/layouts/app.blade.php
                        </code>
                      </div>
                      <div className="rounded-lg border border-border/60 p-3">
                        <p className="mb-0.5 text-sm font-medium">CodeIgniter</p>
                        <code className="text-xs text-muted-foreground">
                          application/views/templates/footer.php
                        </code>
                      </div>
                      <div className="rounded-lg border border-border/60 p-3">
                        <p className="mb-0.5 text-sm font-medium">WordPress Theme</p>
                        <code className="text-xs text-muted-foreground">
                          wp-content/themes/your-theme/footer.php
                        </code>
                      </div>
                      <div className="rounded-lg border border-border/60 p-3">
                        <p className="mb-0.5 text-sm font-medium">PHP thuần</p>
                        <code className="text-xs text-muted-foreground">
                          includes/footer.php hoặc index.php
                        </code>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="wordpress">
          <Card className="glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plug className="h-5 w-5 text-primary" />
                Cài đặt qua WordPress (WPCode)
              </CardTitle>
              <CardDescription>
                Hướng dẫn từng bước nhúng chatbot vào website WordPress bằng plugin{" "}
                <a
                  href="https://wordpress.org/plugins/insert-headers-and-footers/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-primary hover:underline"
                >
                  WPCode
                </a>{" "}
                — không cần chỉnh sửa code theme.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                <p className="mb-3 text-sm font-medium text-foreground">
                  Script cần dán vào WPCode (sẽ sử dụng ở Bước 4):
                </p>
                <div className="relative">
                  <pre className="overflow-x-auto rounded-lg bg-muted p-4 text-sm">
                    <code>{getEmbededScript(botId, appUrl, Framework.REACT)}</code>
                  </pre>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="absolute right-2 top-2"
                    onClick={() => onCopyScript(Framework.REACT, "Script")}
                  >
                    <Copy className="mr-1 h-4 w-4" />
                    Copy
                  </Button>
                </div>
              </div>

              <div className="space-y-6">
                <div className="rounded-xl border border-border/60 bg-card p-5 transition-shadow hover:shadow-md">
                  <div className="flex items-start gap-4">
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary font-bold text-primary-foreground">
                      1
                    </div>
                    <div className="flex-1 space-y-3">
                      <div>
                        <h4 className="font-semibold">Tải plugin WPCode</h4>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Truy cập{" "}
                          <a
                            href="https://wordpress.org/plugins/insert-headers-and-footers/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium text-primary hover:underline"
                          >
                            wordpress.org/plugins → WPCode
                          </a>{" "}
                          và nhấn nút <strong>Download</strong> để tải file{" "}
                          <code className="rounded bg-muted px-1.5 py-0.5 text-xs">.zip</code> về
                          máy.
                        </p>
                      </div>
                      <div className="overflow-hidden rounded-lg border border-border/40">
                        <Image
                          src="/images/guides/wordpress/Step1.png"
                          alt="Trang tải WPCode trên WordPress.org"
                          width={800}
                          height={600}
                          className="w-full"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-border/60 bg-card p-5 transition-shadow hover:shadow-md">
                  <div className="flex items-start gap-4">
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary font-bold text-primary-foreground">
                      2
                    </div>
                    <div className="flex-1 space-y-3">
                      <div>
                        <h4 className="font-semibold">Cài đặt plugin vào WordPress</h4>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Đăng nhập vào trang Admin WordPress → <strong>Plugin</strong> →{" "}
                          <strong>Thêm Plugin</strong> → <strong>Tải plugin lên</strong> → chọn file{" "}
                          <code className="rounded bg-muted px-1.5 py-0.5 text-xs">.zip</code> vừa
                          tải → nhấn <strong>Cài đặt ngay</strong> → <strong>Kích hoạt</strong>.
                        </p>
                      </div>
                      <div className="overflow-hidden rounded-lg border border-border/40">
                        <Image
                          src="/images/guides/wordpress/Step2.png"
                          alt="Upload plugin WPCode trên WordPress Admin"
                          width={800}
                          height={600}
                          className="w-full"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-border/60 bg-card p-5 transition-shadow hover:shadow-md">
                  <div className="flex items-start gap-4">
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary font-bold text-primary-foreground">
                      3
                    </div>
                    <div className="flex-1 space-y-3">
                      <div>
                        <h4 className="font-semibold">Tạo Custom Snippet mới</h4>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Trong menu WordPress, chọn <strong>Code Snippets</strong> →{" "}
                          <strong>+ Add Snippet</strong> → nhấn nút{" "}
                          <strong>&quot;Add Your Custom Code (New Snippet)&quot;</strong> để bắt đầu
                          tạo snippet mới.
                        </p>
                      </div>
                      <div className="overflow-hidden rounded-lg border border-border/40">
                        <Image
                          src="/images/guides/wordpress/Step3.png"
                          alt="Tạo Custom Snippet mới trong WPCode"
                          width={800}
                          height={600}
                          className="w-full"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-border/60 bg-card p-5 transition-shadow hover:shadow-md">
                  <div className="flex items-start gap-4">
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary font-bold text-primary-foreground">
                      4
                    </div>
                    <div className="flex-1 space-y-3">
                      <div>
                        <h4 className="font-semibold">Dán script Vielora vào snippet</h4>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Đặt tên cho snippet (ví dụ: <em>&quot;Vielora Chatbot&quot;</em>) → chọn{" "}
                          <strong>Code Type</strong> là{" "}
                          <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                            HTML Snippet
                          </code>{" "}
                          → dán đoạn script Vielora (đã copy ở trên) vào ô{" "}
                          <strong>Code Preview</strong>.
                        </p>
                      </div>
                      <div className="overflow-hidden rounded-lg border border-border/40">
                        <Image
                          src="/images/guides/wordpress/Step4.png"
                          alt="Dán script Vielora vào Code Preview"
                          width={800}
                          height={600}
                          className="w-full"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-border/60 bg-card p-5 transition-shadow hover:shadow-md">
                  <div className="flex items-start gap-4">
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary font-bold text-primary-foreground">
                      5
                    </div>
                    <div className="flex-1 space-y-3">
                      <div>
                        <h4 className="font-semibold">Cấu hình Insertion và kích hoạt</h4>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Kéo xuống phần <strong>Insertion</strong>: chọn Insert Method là{" "}
                          <strong>Auto Insert</strong>, Location là{" "}
                          <strong>Site Wide Footer</strong>. Cuối cùng, chuyển trạng thái từ{" "}
                          <em>Inactive</em> sang <strong className="text-green-600">Active</strong>{" "}
                          và nhấn <strong>Save Snippet</strong>.
                        </p>
                      </div>
                      <div className="overflow-hidden rounded-lg border border-border/40">
                        <Image
                          src="/images/guides/wordpress/Step5.png"
                          alt="Cấu hình Auto Insert và Site Wide Footer"
                          width={800}
                          height={600}
                          className="w-full"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-border/60 bg-muted/40 p-4">
                <p className="text-sm text-muted-foreground">
                  <strong className="text-foreground">Lưu ý:</strong> Sau khi lưu snippet, chatbot
                  sẽ xuất hiện trên toàn bộ website WordPress của bạn. Nếu chưa thấy, hãy xóa cache
                  trình duyệt hoặc cache plugin (nếu có) rồi tải lại trang.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
