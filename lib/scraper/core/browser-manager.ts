import { BROWSER_ARGS, MAX_PAGES_PER_BROWSER, CLOSE_TIMEOUT_MS } from "@/config";

type PuppeteerLike = {
  launch: (options: unknown) => Promise<BrowserLike>;
  use?: (plugin: unknown) => void;
};

type BrowserLike = {
  newPage: () => Promise<PageLike>;
  close: () => Promise<void>;
  process?: () => { kill: (signal?: NodeJS.Signals | number) => void } | null;
};

type PageLike = {
  close: () => Promise<void>;
  once: (event: "close", handler: () => void) => void;
};

type BrowserInstance = {
  browser: BrowserLike;
  key: string;
  useStealth: boolean;
  proxyUrl?: string;
  totalPagesOpened: number;
  activePages: number;
  draining: boolean;
  closingPromise?: Promise<void>;
};

type BrowserBucket = {
  current?: BrowserInstance;
  draining: Set<BrowserInstance>;
  launchingPromise?: Promise<BrowserInstance>;
};

class BrowserManagerImpl {
  private buckets = new Map<string, BrowserBucket>();
  private pageOwners = new WeakMap<PageLike, BrowserInstance>();
  private stealthPuppeteerPromise?: Promise<PuppeteerLike>;
  private standardPuppeteerPromise?: Promise<PuppeteerLike>;

  async getPage(useStealth: boolean, proxyUrl?: string): Promise<PageLike> {
    const key = this.buildKey(useStealth, proxyUrl);
    const bucket = this.getOrCreateBucket(key);

    let instance = bucket.current;
    if (!instance || instance.draining) {
      instance = await this.ensureCurrentBrowser(key, useStealth, proxyUrl, bucket);
    }

    const page = await instance.browser.newPage();
    instance.activePages += 1;
    instance.totalPagesOpened += 1;
    this.pageOwners.set(page, instance);

    page.once("close", () => {
      this.handlePageClosed(page);
    });

    if (instance.totalPagesOpened > MAX_PAGES_PER_BROWSER && !instance.draining) {
      this.markDraining(instance);
      void this.ensureCurrentBrowser(key, useStealth, proxyUrl, bucket);
    }

    return page;
  }

  markPageZombie(page: PageLike): void {
    const owner = this.pageOwners.get(page);
    if (!owner) return;

    this.pageOwners.delete(page);
    owner.activePages = Math.max(0, owner.activePages - 1);
    this.markDraining(owner);
    void this.maybeCloseDraining(owner);
  }

  async closeAll(): Promise<void> {
    const closeTasks: Array<Promise<void>> = [];

    this.buckets.forEach((bucket) => {
      if (bucket.current) {
        closeTasks.push(this.closeInstance(bucket.current));
      }
      bucket.draining.forEach((instance) => {
        closeTasks.push(this.closeInstance(instance));
      });
    });

    await Promise.all(closeTasks);
    this.buckets.clear();
  }

  private buildKey(useStealth: boolean, proxyUrl?: string): string {
    const mode = useStealth ? "stealth" : "standard";
    return `${mode}::${proxyUrl ?? "__direct__"}`;
  }

  private getOrCreateBucket(key: string): BrowserBucket {
    let bucket = this.buckets.get(key);
    if (!bucket) {
      bucket = { draining: new Set<BrowserInstance>() };
      this.buckets.set(key, bucket);
    }
    return bucket;
  }

  private async ensureCurrentBrowser(
    key: string,
    useStealth: boolean,
    proxyUrl: string | undefined,
    bucket: BrowserBucket
  ): Promise<BrowserInstance> {
    if (bucket.current && !bucket.current.draining) {
      return bucket.current;
    }

    if (!bucket.launchingPromise) {
      bucket.launchingPromise = this.launchBrowserInstance(key, useStealth, proxyUrl).finally(
        () => {
          bucket.launchingPromise = undefined;
        }
      );
    }

    const nextInstance = await bucket.launchingPromise;
    if (!bucket.current || bucket.current.draining) {
      bucket.current = nextInstance;
    } else if (bucket.current !== nextInstance) {
      void this.closeInstance(nextInstance);
    }

    return bucket.current;
  }

  private async launchBrowserInstance(
    key: string,
    useStealth: boolean,
    proxyUrl?: string
  ): Promise<BrowserInstance> {
    const puppeteer = useStealth
      ? await this.loadStealthPuppeteer()
      : await this.loadStandardPuppeteer();
    const args = [...BROWSER_ARGS];
    if (proxyUrl) {
      args.push(`--proxy-server=${proxyUrl}`);
    }

    const browser = await puppeteer.launch({
      headless: "new",
      args,
    });

    return {
      browser,
      key,
      useStealth,
      proxyUrl,
      totalPagesOpened: 0,
      activePages: 0,
      draining: false,
    };
  }

  private async loadStealthPuppeteer(): Promise<PuppeteerLike> {
    if (!this.stealthPuppeteerPromise) {
      this.stealthPuppeteerPromise = (async () => {
        const puppeteerExtra = await import("puppeteer-extra");
        const StealthPlugin = await import("puppeteer-extra-plugin-stealth");
        puppeteerExtra.default.use(StealthPlugin.default());
        return puppeteerExtra.default as unknown as PuppeteerLike;
      })();
    }
    return this.stealthPuppeteerPromise;
  }

  private async loadStandardPuppeteer(): Promise<PuppeteerLike> {
    if (!this.standardPuppeteerPromise) {
      this.standardPuppeteerPromise = (async () => {
        const puppeteer = await import("puppeteer");
        return puppeteer.default as unknown as PuppeteerLike;
      })();
    }
    return this.standardPuppeteerPromise;
  }

  private handlePageClosed(page: PageLike): void {
    const owner = this.pageOwners.get(page);
    if (!owner) return;

    this.pageOwners.delete(page);
    owner.activePages = Math.max(0, owner.activePages - 1);
    void this.maybeCloseDraining(owner);
  }

  private markDraining(instance: BrowserInstance): void {
    if (instance.draining) return;

    instance.draining = true;
    const bucket = this.buckets.get(instance.key);
    if (!bucket) return;

    if (bucket.current === instance) {
      bucket.current = undefined;
    }
    bucket.draining.add(instance);
  }

  private async maybeCloseDraining(instance: BrowserInstance): Promise<void> {
    if (!instance.draining || instance.activePages > 0) return;
    await this.closeInstance(instance);
  }

  private async closeInstance(instance: BrowserInstance): Promise<void> {
    if (instance.closingPromise) {
      return instance.closingPromise;
    }

    instance.closingPromise = (async () => {
      try {
        await Promise.race([
          instance.browser.close(),
          new Promise<void>((_, reject) =>
            setTimeout(() => reject(new Error("browser.close() timed out")), CLOSE_TIMEOUT_MS)
          ),
        ]);
      } catch {
        try {
          instance.browser.process?.()?.kill("SIGKILL");
        } catch {
          // Ignore force-kill errors
        }
      } finally {
        const bucket = this.buckets.get(instance.key);
        if (bucket) {
          if (bucket.current === instance) {
            bucket.current = undefined;
          }
          bucket.draining.delete(instance);
        }
      }
    })();

    await instance.closingPromise;
  }
}

export const BrowserManager = new BrowserManagerImpl();
