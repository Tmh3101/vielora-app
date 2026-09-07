"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Code, Copy, Plug, Tag } from "lucide-react";
import { Framework, type FrameworkType } from "@/lib/constants";
import { getEmbededScript } from "@/lib/helpers";
import { useTranslations } from "next-intl";

export interface IntegrationTabProps {
  botId: string;
  appUrl: string;
  onCopyScript: (framework: FrameworkType, copiedLabel?: string) => void;
}

export function IntegrationTab({ botId, appUrl, onCopyScript }: IntegrationTabProps) {
  const t = useTranslations("dashboard.botDetail.integrationTab");
  const tCommon = useTranslations("dashboard.common");

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <p className="text-muted-foreground">{t("embedDescription")}</p>
      </div>

      <Tabs defaultValue="snippet" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 bg-muted/60">
          <TabsTrigger value="gtm" className="flex items-center gap-2">
            <Tag className="h-4 w-4" />
            <span className="hidden sm:inline">{t("tabs.gtm")}</span>
            <span className="sm:hidden">{t("tabs.gtmShort")}</span>
          </TabsTrigger>
          <TabsTrigger value="snippet" className="flex items-center gap-2">
            <Code className="h-4 w-4" />
            <span className="hidden sm:inline">{t("copyCode")}</span>
            <span className="sm:hidden">{t("tabs.codeShort")}</span>
          </TabsTrigger>
          <TabsTrigger value="wordpress" className="flex items-center gap-2">
            <Plug className="h-4 w-4" />
            <span>{t("tabs.wordpress")}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="gtm">
          <Card className="glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Tag className="h-5 w-5 text-primary" />
                {t("gtm.title")}
              </CardTitle>
              <CardDescription>{t("gtm.description")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary">
                    1
                  </div>
                  <div>
                    <h4 className="mb-1 font-medium">{t("gtm.step1.title")}</h4>
                    <p className="text-sm text-muted-foreground">
                      {t("gtm.step1.descriptionPrefix")}{" "}
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
                    <h4 className="mb-1 font-medium">{t("gtm.step2.title")}</h4>
                    <p className="text-sm text-muted-foreground">{t("gtm.step2.description")}</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary">
                    3
                  </div>
                  <div>
                    <h4 className="mb-1 font-medium">{t("gtm.step3.title")}</h4>
                    <p className="text-sm text-muted-foreground">{t("gtm.step3.description")}</p>
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
                  {tCommon("copy")}
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
                {t("snippet.title")}
              </CardTitle>
              <CardDescription>{t("snippet.description")}</CardDescription>
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
                    {t("snippet.frameworkTabs.react")}
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
                    {t("snippet.frameworkTabs.vue")}
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
                    {t("snippet.frameworkTabs.php")}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="html" className="space-y-3">
                  <p className="text-sm text-muted-foreground">{t("snippet.html.description")}</p>
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
                      {tCommon("copy")}
                    </Button>
                  </div>
                  <div className="space-y-3 pt-2">
                    <h4 className="text-sm font-medium">{t("snippet.commonLocationsTitle")}</h4>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <div className="rounded-lg border border-border/60 p-3">
                        <p className="mb-0.5 text-sm font-medium">
                          {t("snippet.locations.nextApp.title")}
                        </p>
                        <code className="text-xs text-muted-foreground">
                          {t("snippet.locations.nextApp.code")}
                        </code>
                      </div>
                      <div className="rounded-lg border border-border/60 p-3">
                        <p className="mb-0.5 text-sm font-medium">
                          {t("snippet.locations.nextPages.title")}
                        </p>
                        <code className="text-xs text-muted-foreground">
                          {t("snippet.locations.nextPages.code")}
                        </code>
                      </div>
                      <div className="rounded-lg border border-border/60 p-3">
                        <p className="mb-0.5 text-sm font-medium">
                          {t("snippet.locations.reactVite.title")}
                        </p>
                        <code className="text-xs text-muted-foreground">
                          {t("snippet.locations.reactVite.code")}
                        </code>
                      </div>
                      <div className="rounded-lg border border-border/60 p-3">
                        <p className="mb-0.5 text-sm font-medium">
                          {t("snippet.locations.htmlPure.title")}
                        </p>
                        <code className="text-xs text-muted-foreground">
                          {t("snippet.locations.htmlPure.code")}
                        </code>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="vue" className="space-y-3">
                  <p className="text-sm text-muted-foreground">{t("snippet.vue.description")}</p>
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
                      {tCommon("copy")}
                    </Button>
                  </div>
                  <div className="space-y-3 pt-2">
                    <h4 className="text-sm font-medium">{t("snippet.commonLocationsTitle")}</h4>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <div className="rounded-lg border border-border/60 p-3">
                        <p className="mb-0.5 text-sm font-medium">
                          {t("snippet.locations.vue3Vite.title")}
                        </p>
                        <code className="text-xs text-muted-foreground">
                          {t("snippet.locations.vue3Vite.code")}
                        </code>
                      </div>
                      <div className="rounded-lg border border-border/60 p-3">
                        <p className="mb-0.5 text-sm font-medium">
                          {t("snippet.locations.nuxt3.title")}
                        </p>
                        <code className="text-xs text-muted-foreground">
                          {t("snippet.locations.nuxt3.code")}
                        </code>
                      </div>
                      <div className="rounded-lg border border-border/60 p-3">
                        <p className="mb-0.5 text-sm font-medium">
                          {t("snippet.locations.vue2Cli.title")}
                        </p>
                        <code className="text-xs text-muted-foreground">
                          {t("snippet.locations.vue2Cli.code")}
                        </code>
                      </div>
                      <div className="rounded-lg border border-border/60 p-3">
                        <p className="mb-0.5 text-sm font-medium">
                          {t("snippet.locations.vueQuasar.title")}
                        </p>
                        <code className="text-xs text-muted-foreground">
                          {t("snippet.locations.vueQuasar.code")}
                        </code>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="php" className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    {t("snippet.php.descriptionPrefix")}{" "}
                    <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                      {t("snippet.php.descriptionCode")}
                    </code>
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
                      {tCommon("copy")}
                    </Button>
                  </div>
                  <div className="space-y-3 pt-2">
                    <h4 className="text-sm font-medium">{t("snippet.commonLocationsTitle")}</h4>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <div className="rounded-lg border border-border/60 p-3">
                        <p className="mb-0.5 text-sm font-medium">
                          {t("snippet.locations.laravel.title")}
                        </p>
                        <code className="text-xs text-muted-foreground">
                          {t("snippet.locations.laravel.code")}
                        </code>
                      </div>
                      <div className="rounded-lg border border-border/60 p-3">
                        <p className="mb-0.5 text-sm font-medium">
                          {t("snippet.locations.codeigniter.title")}
                        </p>
                        <code className="text-xs text-muted-foreground">
                          {t("snippet.locations.codeigniter.code")}
                        </code>
                      </div>
                      <div className="rounded-lg border border-border/60 p-3">
                        <p className="mb-0.5 text-sm font-medium">
                          {t("snippet.locations.wordpressTheme.title")}
                        </p>
                        <code className="text-xs text-muted-foreground">
                          {t("snippet.locations.wordpressTheme.code")}
                        </code>
                      </div>
                      <div className="rounded-lg border border-border/60 p-3">
                        <p className="mb-0.5 text-sm font-medium">
                          {t("snippet.locations.phpPure.title")}
                        </p>
                        <code className="text-xs text-muted-foreground">
                          {t("snippet.locations.phpPure.code")}
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
                {t("wordpress.title")}
              </CardTitle>
              <CardDescription>
                {t("wordpress.descriptionPrefix")}{" "}
                <a
                  href="https://wordpress.org/plugins/insert-headers-and-footers/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-primary hover:underline"
                >
                  {t("wordpress.descriptionLink")}
                </a>{" "}
                {t("wordpress.descriptionSuffix")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                <p className="mb-3 text-sm font-medium text-foreground">
                  {t("wordpress.scriptLabel")}
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
                    {tCommon("copy")}
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
                        <h4 className="font-semibold">{t("wordpress.step1.title")}</h4>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {t("wordpress.step1.descriptionPrefix")}{" "}
                          <a
                            href="https://wordpress.org/plugins/insert-headers-and-footers/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium text-primary hover:underline"
                          >
                            {t("wordpress.step1.descriptionLink")}
                          </a>{" "}
                          {t("wordpress.step1.descriptionMiddle")}{" "}
                          <strong>{t("wordpress.step1.download")}</strong>{" "}
                          {t("wordpress.step1.descriptionMiddle2")}{" "}
                          <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                            {t("wordpress.step1.code")}
                          </code>{" "}
                          {t("wordpress.step1.descriptionSuffix")}
                        </p>
                      </div>
                      <div className="overflow-hidden rounded-lg border border-border/40">
                        <Image
                          src="/images/guides/wordpress/Step1.webp"
                          alt={t("wordpress.step1.alt")}
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
                        <h4 className="font-semibold">{t("wordpress.step2.title")}</h4>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {t("wordpress.step2.description")}
                        </p>
                      </div>
                      <div className="overflow-hidden rounded-lg border border-border/40">
                        <Image
                          src="/images/guides/wordpress/Step2.webp"
                          alt={t("wordpress.step2.alt")}
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
                        <h4 className="font-semibold">{t("wordpress.step3.title")}</h4>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {t("wordpress.step3.description")}
                        </p>
                      </div>
                      <div className="overflow-hidden rounded-lg border border-border/40">
                        <Image
                          src="/images/guides/wordpress/Step3.webp"
                          alt={t("wordpress.step3.alt")}
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
                        <h4 className="font-semibold">{t("wordpress.step4.title")}</h4>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {t("wordpress.step4.descriptionPrefix")}{" "}
                          <em>{t("wordpress.step4.exampleName")}</em>{" "}
                          {t("wordpress.step4.descriptionMiddle")}{" "}
                          <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                            {t("wordpress.step4.codeType")}
                          </code>{" "}
                          {t("wordpress.step4.descriptionMiddle2")}{" "}
                          <strong>{t("wordpress.step4.codePreview")}</strong>
                          {t("wordpress.step4.descriptionSuffix")}
                        </p>
                      </div>
                      <div className="overflow-hidden rounded-lg border border-border/40">
                        <Image
                          src="/images/guides/wordpress/Step4.webp"
                          alt={t("wordpress.step4.alt")}
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
                        <h4 className="font-semibold">{t("wordpress.step5.title")}</h4>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {t("wordpress.step5.description")}
                        </p>
                      </div>
                      <div className="overflow-hidden rounded-lg border border-border/40">
                        <Image
                          src="/images/guides/wordpress/Step5.webp"
                          alt={t("wordpress.step5.alt")}
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
                  <strong className="text-foreground">{t("wordpress.note.label")}</strong>{" "}
                  {t("wordpress.note.description")}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
