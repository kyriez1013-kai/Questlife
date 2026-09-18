export type IdentitySession = { userId: string; email?: string };
export interface AuthDriver {
  session(): Promise<IdentitySession | null>;
  subscribe(listener: (session: IdentitySession | null) => void): () => void;
  requestOtp(email: string): Promise<void>;
  verifyOtp(email: string, token: string): Promise<void>;
  signOut(): Promise<void>;
}

/** Domain-facing identity boundary. No access/refresh tokens leave the driver. */
export class AuthService {
  constructor(private driver: AuthDriver) {}
  getSession() { return this.driver.session(); }
  async getUserId() { return (await this.getSession())?.userId ?? null; }
  subscribe(listener: (session: IdentitySession | null) => void) { return this.driver.subscribe(listener); }
  requestOtp(email: string) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return Promise.reject(new Error('invalid_email'));
    return this.driver.requestOtp(email.trim());
  }
  verifyOtp(email: string, token: string) {
    if (!/^\d{6,10}$/.test(token.trim())) return Promise.reject(new Error('invalid_otp'));
    return this.driver.verifyOtp(email.trim(), token.trim());
  }
  signOut() { return this.driver.signOut(); }
}
