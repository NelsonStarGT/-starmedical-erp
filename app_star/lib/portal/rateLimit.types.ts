export type PortalRateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
  resetAtMs: number;
};

export type PortalRateLimitConsumeOptions = {
  limit: number;
  windowMs: number;
  nowMs?: number;
};

export type PortalRateLimitStore = {
  consume: (key: string, options: PortalRateLimitConsumeOptions) => Promise<PortalRateLimitResult>;
  clearForTests: () => Promise<void>;
};
