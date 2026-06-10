import type { Session } from "@shopify/shopify-api";
import type { SessionStorage } from "@shopify/shopify-app-session-storage";

export class InMemoryShopifySessionStorage implements SessionStorage {
  private sessions = new Map<string, Session>();

  public async storeSession(session: Session): Promise<boolean> {
    this.sessions.set(session.id, session);
    return true;
  }

  public async loadSession(id: string): Promise<Session | undefined> {
    return this.sessions.get(id);
  }

  public async deleteSession(id: string): Promise<boolean> {
    this.sessions.delete(id);
    return true;
  }

  public async deleteSessions(ids: string[]): Promise<boolean> {
    ids.forEach((id) => this.sessions.delete(id));
    return true;
  }

  public async findSessionsByShop(shop: string): Promise<Session[]> {
    return Array.from(this.sessions.values()).filter((session) => session.shop === shop);
  }
}
