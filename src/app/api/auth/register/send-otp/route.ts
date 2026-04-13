import { apiURL } from "@/components/app_component/common/http";
import { NextResponse } from "next/server";

const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 3;
const RATE_LIMIT_KEY_PREFIX =
  process.env.RATE_LIMIT_KEY_PREFIX || "smtp:register-send-otp";
const REDIS_REST_URL =
  process.env.UPSTASH_REDIS_REST_URL || process.env.REDIS_REST_URL || "";
const REDIS_REST_TOKEN =
  process.env.UPSTASH_REDIS_REST_TOKEN || process.env.REDIS_REST_TOKEN || "";

type RateLimitEntry = { count: number; resetAt: number };
type RateLimitResult = { allowed: boolean; retryAfter: number };
type RateLimitStore = {
  kind: "memory" | "redis";
  usesTtl: boolean;
  get: (key: string) => Promise<RateLimitEntry | undefined>;
  set: (key: string, value: RateLimitEntry) => Promise<void>;
  delete: (key: string) => Promise<void>;
  entries: () => Promise<Array<[string, RateLimitEntry]>>;
  check?: (key: string) => Promise<RateLimitResult>;
};

const memoryRateLimitMap = new Map<string, RateLimitEntry>();
const memoryRateLimitStore: RateLimitStore = {
  kind: "memory",
  usesTtl: false,
  get: async (key) => memoryRateLimitMap.get(key),
  set: async (key, value) => {
    memoryRateLimitMap.set(key, value);
  },
  delete: async (key) => {
    memoryRateLimitMap.delete(key);
  },
  entries: async () => Array.from(memoryRateLimitMap.entries()),
};

type RedisRestResponse = { result?: unknown; error?: string };

function redisRateLimitKey(key: string) {
  return `${RATE_LIMIT_KEY_PREFIX}:${key}`;
}

async function redisCommand(command: Array<string | number>) {
  const response = await fetch(REDIS_REST_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${REDIS_REST_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
  });

  const data = (await response.json().catch(() => ({}))) as RedisRestResponse;

  if (!response.ok || data.error) {
    throw new Error(data.error || "Redis rate limit store failed");
  }

  return data.result;
}

function toNumber(value: unknown) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

const redisRateLimitStore: RateLimitStore = {
  kind: "redis",
  usesTtl: true,
  get: async (key) => {
    const redisKey = redisRateLimitKey(key);
    const [countResult, ttlResult] = await Promise.all([
      redisCommand(["GET", redisKey]),
      redisCommand(["PTTL", redisKey]),
    ]);
    const count = toNumber(countResult);
    const ttl = toNumber(ttlResult);

    if (!count || ttl <= 0) {
      return undefined;
    }

    return { count, resetAt: Date.now() + ttl };
  },
  set: async (key, value) => {
    const ttl = Math.max(1, value.resetAt - Date.now());
    await redisCommand(["SET", redisRateLimitKey(key), String(value.count), "PX", ttl]);
  },
  delete: async (key) => {
    await redisCommand(["DEL", redisRateLimitKey(key)]);
  },
  entries: async () => [],
  check: async (key) => {
    const redisKey = redisRateLimitKey(key);
    const count = toNumber(await redisCommand(["INCR", redisKey]));

    if (count === 1) {
      await redisCommand(["PEXPIRE", redisKey, RATE_LIMIT_WINDOW_MS]);
    }

    if (count > RATE_LIMIT_MAX_REQUESTS) {
      const ttl = toNumber(await redisCommand(["PTTL", redisKey]));

      return {
        allowed: false,
        retryAfter: Math.max(1, Math.ceil(ttl / 1000)),
      };
    }

    return { allowed: true, retryAfter: 0 };
  },
};

const rateLimitStore =
  REDIS_REST_URL && REDIS_REST_TOKEN ? redisRateLimitStore : memoryRateLimitStore;

let cleanupIntervalStarted = false;

async function purgeExpiredRateLimitEntries(store: RateLimitStore = rateLimitStore) {
  if (store.usesTtl) return;

  const now = Date.now();

  for (const [key, entry] of await store.entries()) {
    if (entry.resetAt <= now) {
      await store.delete(key);
    }
  }
}

function startRateLimitCleanup(store: RateLimitStore = rateLimitStore) {
  if (store.usesTtl) return;
  if (cleanupIntervalStarted) return;

  cleanupIntervalStarted = true;
  const timer = setInterval(
    () => purgeExpiredRateLimitEntries(),
    RATE_LIMIT_WINDOW_MS
  );
  const maybeTimer = timer as { unref?: () => void };
  maybeTimer.unref?.();
}

startRateLimitCleanup();

function getCookieValue(cookieHeader: string, key: string): string {
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${key}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : "";
}

function getAuthToken(req: Request): string {
  const bearerToken = (req.headers.get("authorization") || "")
    .replace(/^Bearer\s+/i, "")
    .trim();

  if (bearerToken) {
    return bearerToken;
  }

  return getCookieValue(req.headers.get("cookie") || "", "token");
}

type RequestWithPeerInfo = Request & {
  ip?: string;
  socket?: { remoteAddress?: string | null };
  connection?: { remoteAddress?: string | null };
};

function normalizeIp(value: string | null | undefined) {
  const ip = value?.trim();
  if (!ip) return "";
  return ip.replace(/^::ffff:/, "");
}

function getTrustedProxyIps() {
  return (process.env.TRUSTED_PROXY_IPS || "")
    .split(",")
    .map(normalizeIp)
    .filter(Boolean);
}

function getRequestPeerIp(req: Request) {
  const peerReq = req as RequestWithPeerInfo;

  return (
    normalizeIp(peerReq.ip) ||
    normalizeIp(peerReq.socket?.remoteAddress) ||
    normalizeIp(peerReq.connection?.remoteAddress) ||
    "unknown"
  );
}

function getForwardedClientIp(req: Request) {
  return (
    normalizeIp(req.headers.get("x-forwarded-for")?.split(",")[0]) ||
    normalizeIp(req.headers.get("x-real-ip"))
  );
}

function getClientIp(req: Request) {
  const peerIp = getRequestPeerIp(req);
  const trustedProxyIps = getTrustedProxyIps();

  if (
    trustedProxyIps.includes("*") ||
    (peerIp !== "unknown" && trustedProxyIps.includes(peerIp))
  ) {
    return getForwardedClientIp(req) || peerIp;
  }

  return peerIp;
}

async function checkRateLimit(key: string, store: RateLimitStore = rateLimitStore) {
  if (store.check) {
    return store.check(key);
  }

  const now = Date.now();
  const current = await store.get(key);

  if (!current || current.resetAt <= now) {
    await store.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, retryAfter: 0 };
  }

  if (current.count >= RATE_LIMIT_MAX_REQUESTS) {
    return {
      allowed: false,
      retryAfter: Math.ceil((current.resetAt - now) / 1000),
    };
  }

  await store.set(key, { ...current, count: current.count + 1 });
  return { allowed: true, retryAfter: 0 };
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(req: Request) {
  try {
    await purgeExpiredRateLimitEntries();
    const body = await req.json();
    const token = getAuthToken(req);
    const dest = String(body?.dest || "").trim().toLowerCase();
    const type = String(body?.type || "").trim().toLowerCase();

    if (!token) {
      return NextResponse.json(
        { success: false, message: "Unauthorized (token missing)" },
        { status: 401 }
      );
    }

    if (type !== "email" || !isValidEmail(dest)) {
      return NextResponse.json(
        { success: false, message: "Valid email destination is required" },
        { status: 400 }
      );
    }

    const clientIp = getClientIp(req);
    const ipRateLimit = await checkRateLimit(`ip:${clientIp}`);

    if (!ipRateLimit.allowed) {
      return NextResponse.json(
        { success: false, message: "Too many OTP requests. Please wait before trying again." },
        {
          status: 429,
          headers: { "Retry-After": String(ipRateLimit.retryAfter) },
        }
      );
    }

    const destRateLimit = await checkRateLimit(`dest:${clientIp}:${dest}`);

    if (!destRateLimit.allowed) {
      return NextResponse.json(
        { success: false, message: "Too many OTP requests. Please wait before trying again." },
        {
          status: 429,
          headers: { "Retry-After": String(destRateLimit.retryAfter) },
        }
      );
    }


    const url = `${apiURL}/api/v1/sendOTP`;

    const laravelRes = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ ...body, dest, type }),
    });

    const data = await laravelRes.json().catch(() => ({}));
    return NextResponse.json(data, { status: laravelRes.status });
  } catch (e: unknown) {
    return NextResponse.json(
      { success: false, message: e instanceof Error ? e.message : "Server error" },
      { status: 503 }
    );
  }
}


