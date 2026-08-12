export interface SessionData {
  cookies: Record<string, string>;
  params: Record<string, string>;
  createdAt: number;
  lastUsed: number;
}

export class SessionManager {
  private sessions = new Map<string, SessionData>();
  private defaultExpiry: number;

  constructor(defaultExpiry = 300_000) {
    this.defaultExpiry = defaultExpiry;
  }

  getSession(key: string): SessionData | undefined {
    const session = this.sessions.get(key);
    if (!session) return undefined;
    if (Date.now() - session.createdAt > this.defaultExpiry) {
      this.sessions.delete(key);
      return undefined;
    }
    session.lastUsed = Date.now();
    return session;
  }

  setCookies(key: string, cookies: Record<string, string>): void {
    let session = this.sessions.get(key);
    if (!session) {
      session = {
        cookies: {},
        params: {},
        createdAt: Date.now(),
        lastUsed: Date.now(),
      };
      this.sessions.set(key, session);
    }
    Object.assign(session.cookies, cookies);
    session.lastUsed = Date.now();
  }

  setParam(key: string, paramKey: string, value: string): void {
    let session = this.sessions.get(key);
    if (!session) {
      session = {
        cookies: {},
        params: {},
        createdAt: Date.now(),
        lastUsed: Date.now(),
      };
      this.sessions.set(key, session);
    }
    session.params[paramKey] = value;
  }

  resetSession(key: string): void {
    this.sessions.delete(key);
  }

  clearExpired(): void {
    const now = Date.now();
    for (const [key, session] of this.sessions) {
      if (now - session.createdAt > this.defaultExpiry) {
        this.sessions.delete(key);
      }
    }
  }
}
