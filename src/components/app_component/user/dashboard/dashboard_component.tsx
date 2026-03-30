"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  Check,
  CheckCircle,
  ChevronDown,
  Download,
  Eye,
  Filter,
  Mail,
  Send,
  Shield,
  Users,
  X,
  XCircle,
  TrendingUp,
  Network,
} from "lucide-react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { token } from "../../common/http";
import { useRouter } from "next/navigation";
import Link from "next/link";

/** =========================
 * Types
 * ========================= */
type EmailStatsRow = {
  delivered_emails: number | null;
  bounce_mails: number | null;
  all_hard_bounce: number | null;
  all_soft_bounce: number | null;
  date: string;
};

type UserStatsData = {
  spamreport: any[];
  remain_mails: { remain: number | null; limit: number | null };
  email_config: { valid: number | null; domain_name: string | null };
  active_plans: any[];
  not_validate_domain_warning: { domain_name: string; message: string }[];
  emailStats: EmailStatsRow[];
  activeemailStats: {
    sum_delivered_emails: number | null;
    sum_bounce_mails: number | null;
    sum_all_hard_bounce: number | null;
    sum_all_soft_bounce: number | null;
    total_sum: number | null;
  } | null;
};

type UserStatsResponse = { message: string; data: UserStatsData };

type SpamReportItem = {
  title: string;
  content: string;
  is_unread: boolean;
  recipent_id: number;
  id: number;
};

type SpamReportPaginationData = {
  current_page: number;
  data: SpamReportItem[];
  first_page_url: string | null;
  from: number | null;
  last_page: number;
  last_page_url: string | null;
  links: Array<{
    url: string | null;
    label: string;
    active: boolean;
  }>;
  next_page_url: string | null;
  path: string | null;
  per_page: number;
  prev_page_url: string | null;
  to: number | null;
  total: number;
};

type SpamReportResponse = {
  data: SpamReportPaginationData;
  success: boolean;
  message: string;
  code: number;
};

type AccountHealthStatus = "good" | "poor" | "extremely_bad";
type NetworkStatus = "excellent" | "fair" | "poor";

const toNum = (v: number | null | undefined) => (typeof v === "number" ? v : 0);

const formatNumber = (num: number | null | undefined) => {
  const n = typeof num === "number" ? num : 0;
  return n.toLocaleString();
};

const percent = (part: number, total: number) => {
  if (!total || total <= 0) return "0%";
  return `${((part / total) * 100).toFixed(1)}%`;
};

const toISO = (d: Date) => d.toISOString().slice(0, 10);

function addDaysISO(iso: string, days: number) {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + days);
  return toISO(d);
}

function getDailyTotalSent(row: {
  delivered: number;
  bounce: number;
  hard: number;
  soft: number;
}) {
  return row.delivered + row.bounce;
}

function getDailyDeliveryRate(delivered: number, bounce: number) {
  const total = delivered + bounce;
  if (total <= 0) return 0;
  return Number(((delivered / total) * 100).toFixed(1));
}

function getAccountHealthMeta(spamReportCount: number) {
  if (spamReportCount <= 0) {
    return {
      status: "good" as AccountHealthStatus,
      label: "Good",
      score: 92,
      stroke: "#16a34a",
      fill: "#16a34a",
      iconBg: "bg-[#eefaf0]",
      iconText: "text-[#16a34a]",
    };
  }

  if (spamReportCount <= 2) {
    return {
      status: "poor" as AccountHealthStatus,
      label: "Poor",
      score: 48,
      stroke: "#c0841a",
      fill: "#c0841a",
      iconBg: "bg-[#fff6e8]",
      iconText: "text-[#c0841a]",
    };
  }

  return {
    status: "extremely_bad" as AccountHealthStatus,
    label: "Extremely Bad",
    score: 18,
    stroke: "#dc2626",
    fill: "#dc2626",
    iconBg: "bg-[#fff1f2]",
    iconText: "text-[#dc2626]",
  };
}

function getAccountHealthSparkline(score: number) {
  if (score >= 85) return [86, 88, 89, 90, 91, 92, 93, 92];
  if (score >= 40) return [54, 52, 50, 49, 48, 47, 46, 45];
  return [28, 26, 24, 22, 20, 19, 18, 17];
}

function getNetworkMeta(successRateNum: number) {
  if (successRateNum >= 70) {
    return {
      status: "excellent" as NetworkStatus,
      label: "Excellent",
      stroke: "#16a34a",
      fill: "#16a34a",
      iconBg: "bg-[#eefaf0]",
      iconText: "text-[#16a34a]",
    };
  }

  if (successRateNum >= 30) {
    return {
      status: "fair" as NetworkStatus,
      label: "Fair",
      stroke: "#c0841a",
      fill: "#c0841a",
      iconBg: "bg-[#fff6e8]",
      iconText: "text-[#c0841a]",
    };
  }

  return {
    status: "poor" as NetworkStatus,
    label: "Poor",
    stroke: "#dc2626",
    fill: "#dc2626",
    iconBg: "bg-[#fff1f2]",
    iconText: "text-[#dc2626]",
  };
}

/** =========================
 * Stat Card
 * ========================= */
function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color = "blue",
  loading = false,
  tooltip,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ElementType;
  color?: "blue" | "green" | "red" | "purple" | "orange" | "indigo" | "violet";
  loading?: boolean;
  tooltip?: string;
}) {
  const colorClasses = {
    blue: "from-blue-500 to-blue-600",
    green: "from-emerald-500 to-emerald-600",
    red: "from-rose-500 to-rose-600",
    purple: "from-violet-500 to-violet-600",
    orange: "from-amber-500 to-amber-600",
    indigo: "from-indigo-500 to-indigo-600",
    violet: "from-purple-500 to-purple-600",
  };

  const iconColorClasses = {
    blue: "bg-blue-100 text-blue-600",
    green: "bg-emerald-100 text-emerald-600",
    red: "bg-rose-100 text-rose-600",
    purple: "bg-violet-100 text-violet-600",
    orange: "bg-amber-100 text-amber-600",
    indigo: "bg-indigo-100 text-indigo-600",
    violet: "bg-purple-100 text-purple-600",
  };

  return (
    <div className="group relative overflow-hidden rounded-2xl bg-white p-6 shadow-lg transition-all duration-300 hover:shadow-xl">
      <div className="absolute inset-0 opacity-5">
        <div className={`absolute inset-0 bg-gradient-to-br ${colorClasses[color]}`} />
      </div>
      <div className="absolute inset-0 rounded-2xl border border-gray-200/50 transition-colors group-hover:border-gray-300" />

      <div className="relative">
        <div className="flex items-start justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="mb-2 text-sm font-medium text-gray-600">{title}</p>
              {tooltip && (
                <div className="group relative">
                  <div className="flex h-4 w-4 cursor-help items-center justify-center rounded-full bg-gray-200 text-xs text-gray-600">
                    ?
                  </div>
                  <div className="absolute bottom-full left-1/2 z-10 mb-2 hidden w-48 -translate-x-1/2 rounded bg-gray-900 p-2 text-xs text-white shadow-lg group-hover:block">
                    {tooltip}
                  </div>
                </div>
              )}
            </div>

            <p className="break-words text-3xl font-bold text-gray-900">
              {loading ? (
                <span className="inline-block h-8 w-24 animate-pulse rounded bg-gray-200" />
              ) : (
                value
              )}
            </p>

            {subtitle &&  <p className="mt-2 text-sm text-gray-500 whitespace-nowrap">{subtitle}</p>}
          </div>

          {Icon && (
            <div className={`rounded-xl p-3 transition-transform duration-300 ${iconColorClasses[color]}`}>
              <Icon className="h-6 w-6" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** =========================
 * Domain warning card
 * ========================= */
function AlertCard({
  domain,
  message,
  onDismiss,
}: {
  domain: string;
  message: string;
  onDismiss: () => void;
}) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-4">
      <div className="absolute -right-6 -top-6 h-16 w-16 rounded-full bg-gradient-to-br from-amber-500 to-transparent opacity-10" />
      <div className="relative flex items-start gap-3">
        <div className="mt-0.5">
          <AlertTriangle className="h-5 w-5 text-amber-600" />
        </div>
        <div className="flex-1">
          <h4 className="font-semibold text-gray-900">
            Domain Requires Validation: <span className="text-amber-700">{domain}</span>
          </h4>
          <p className="mt-1 text-sm text-gray-600">{message}</p>
        </div>
        <button
          onClick={onDismiss}
          className="text-gray-400 transition-colors hover:text-gray-600"
          aria-label="Dismiss"
        >
          <XCircle className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

/** =========================
 * Monthly overview card
 * ========================= */
function MonthlyOverviewCard({
  remaining,
  limit,
  sent,
  emailStats,
  domainValid,
  successRateNum,
  bounceRateNum,
  spamReportCount,
  loading,
}: {
  remaining: number;
  limit: number;
  sent: number;
  emailStats: { delivered: number; bounce: number; hard: number; soft: number; date: string }[];
  domainValid: number;
  successRateNum: number;
  bounceRateNum: number;
  spamReportCount: number;
  loading: boolean;
}) {
  const sortedStats = [...emailStats].sort((a, b) => a.date.localeCompare(b.date));
  const lastRows = sortedStats.slice(-8);

  /** Task 1: Daily Sending Trend depends on total send volume */
  const dailyTrendData = lastRows.map((item) => getDailyTotalSent(item));

  /** Task 2: Account Health depends on abuse/spam report count */
  const accountHealthMeta = getAccountHealthMeta(spamReportCount);
  const accountHealthData = getAccountHealthSparkline(accountHealthMeta.score);

  /** Task 3: Network Performance depends on delivered / total sent percentage */
  const networkMeta = getNetworkMeta(successRateNum);
  const networkPerformanceData = lastRows.map((item) =>
    getDailyDeliveryRate(item.delivered, item.bounce)
  );

  function MiniLineChart({
    data,
    stroke,
    fill,
    showDots = false,
  }: {
    data: number[];
    stroke: string;
    fill: string;
    showDots?: boolean;
  }) {
    const chartData = data.length ? data : [0, 0, 0, 0, 0, 0];
    const width = 280;
    const height = 42;
    const padX = 8;
    const padY = 8;

    const max = Math.max(...chartData, 1);
    const min = Math.min(...chartData, 0);
    const range = Math.max(max - min, 1);

    const points = chartData.map((value, index) => {
      const x = padX + (index * (width - padX * 2)) / Math.max(chartData.length - 1, 1);
      const y = height - padY - ((value - min) / range) * (height - padY * 2);
      return { x, y };
    });

    const linePath = points
      .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
      .join(" ");

    const areaPath = [
      `M ${points[0]?.x || 0} ${height - padY}`,
      ...points.map((p) => `L ${p.x} ${p.y}`),
      `L ${points[points.length - 1]?.x || 0} ${height - padY}`,
      "Z",
    ].join(" ");

    return (
      <div className="h-[42px] w-full overflow-hidden rounded-full">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-full w-full"
          preserveAspectRatio="none"
        >
          <path d={areaPath} fill={fill} opacity="0.12" />
          <path
            d={linePath}
            fill="none"
            stroke={stroke}
            strokeWidth="2.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {showDots &&
            points.map((p, i) => (
              <circle key={i} cx={p.x} cy={p.y} r="3" fill={stroke} opacity="0.28" />
            ))}
        </svg>
      </div>
    );
  }

  function Gauge({
    value,
    leftValue,
  }: {
    value: number;
    leftValue: number;
  }) {
    const total = Math.max(value + leftValue, 1);
    const usedPercent = Math.max(0, Math.min((leftValue / total) * 100, 100));
    const remainingPercent = 100 - usedPercent;

    const width = 360;
    const height = 170;

    const cx = 190;
    const cy = 142;
    const r = 125;
    const stroke = 15;

    const d = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`;

    const rightEndX = cx + r;
    const rightEndY = cy;

    return (
      <div className="relative h-[165px] w-[360px]">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="absolute inset-0 h-full w-full"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <linearGradient id="gaugeRemainingGradientStable" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#3b82f6" />
            </linearGradient>
          </defs>

          <path
            d={d}
            pathLength={100}
            fill="none"
            stroke="#c8b596"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${usedPercent} ${100 - usedPercent}`}
          />

          <path
            d={d}
            pathLength={100}
            fill="none"
            stroke="url(#gaugeRemainingGradientStable)"
            strokeWidth={stroke}
            strokeLinecap="butt"
            strokeDasharray={`${remainingPercent} ${usedPercent}`}
            strokeDashoffset={-usedPercent}
          />

          <circle cx={rightEndX} cy={rightEndY} r="10" fill="#e5e7eb" />

          <text
            x="190"
            y="78"
            textAnchor="middle"
            fontSize="18"
            fill="#111827"
            fontWeight="500"
          >
            Remaining
          </text>

          <text
            x="190"
            y="116"
            textAnchor="middle"
            fontSize="38"
            fill="#16a34a"
            fontWeight="700"
          >
            {formatNumber(value)}
          </text>

          <text
            x="190"
            y="145"
            textAnchor="middle"
            fontSize="17"
            fill="#111827"
            fontWeight="500"
          >
            Emails
          </text>
        </svg>

        <div className="absolute left-[-10] top-[96px] flex items-center gap-2 text-[17px] font-semibold text-[#aa9a86]">
          <span>{formatNumber(leftValue)}</span>
          <span className="h-3 w-3 rounded-full bg-[#d8ccb8]" />
          
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="mb-6 rounded-[26px] border border-[#ebebeb] bg-white px-7 py-6 shadow-[0_6px_24px_rgba(0,0,0,0.06)]">
        <div className="animate-pulse">
          <div className="mb-3 h-7 w-72 rounded bg-gray-200" />
          <div className="mb-4 h-7 w-80 rounded bg-gray-200" />
          <div className="mb-4 h-[140px] rounded-2xl bg-gray-100" />
          <div className="h-px bg-gray-200" />
          <div className="mt-4 grid grid-cols-1 gap-5 md:grid-cols-3">
            <div className="h-[85px] rounded-xl bg-gray-100" />
            <div className="h-[85px] rounded-xl bg-gray-100" />
            <div className="h-[85px] rounded-xl bg-gray-100" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6 rounded-[26px] border border-[#ebebeb] bg-white px-7 py-6 shadow-[0_6px_24px_rgba(0,0,0,0.06)]">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_420px] lg:items-center">
        <div className="min-w-0">
          <div className="mb-1 flex items-center gap-3">
            <h2 className="text-[27px] font-bold leading-none text-[#111111]">
              Email Sending Overview:
            </h2>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f3e8ff] text-[#7e22ce]">
              <Mail className="h-5 w-5" />
            </div>
          </div>

          <p className="text-[18px] leading-tight text-[#222]">
            <span className="font-extrabold text-black">{formatNumber(remaining)}</span>{" "}
            emails remaining out of <span className="font-medium">{formatNumber(limit)}</span>
          </p>
        </div>

        <div className="flex justify-end">
          <Gauge value={remaining} leftValue={sent} />
        </div>
      </div>

      <div className="mt-2 h-px w-full bg-[#e6e6e6]" />

      <div className="mt-4 grid grid-cols-1 gap-5 md:grid-cols-3">
        <div className="overflow-hidden">
          <div className="mb-1 flex items-start justify-between">
            <div>
              <h3 className="text-[18px] font-semibold text-[#111111]">{formatNumber(sent)} mails used</h3>
              
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#eef6fb] text-[#9fc5dd]">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>

          <MiniLineChart data={dailyTrendData} stroke="#9fc5dd" fill="#9fc5dd" showDots />
        </div>
        <Link href='/spam-report'>
        <div className="overflow-hidden">
          <div className="mb-1 flex items-start justify-between">
            
            <div>
              <h3 className="text-[18px] font-semibold text-[#111111]">Account Health</h3>
              <p className="mt-2 text-[19px] font-bold leading-none text-black">
                {accountHealthMeta.label}
              </p>
            </div>
            
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full ${accountHealthMeta.iconBg} ${accountHealthMeta.iconText}`}
            >
              <Shield className="h-4 w-4" />
            </div>
          </div>

          <MiniLineChart
            data={accountHealthData}
            stroke={accountHealthMeta.stroke}
            fill={accountHealthMeta.fill}
            showDots={false}
          />
        </div></Link>

        <Link href='/email-logs'>
        <div className="overflow-hidden">
          <div className="mb-1 flex items-start justify-between">
            
            <div>
              <h3 className="text-[18px] font-semibold text-[#111111]">Performance</h3>
              <p className="mt-2 text-[19px] font-bold leading-none text-black">
                {networkMeta.label}
              </p>
            </div>
            
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full ${networkMeta.iconBg} ${networkMeta.iconText}`}
            >
              <Network className="h-4 w-4" />
            </div>
          </div>

          <MiniLineChart
            data={networkPerformanceData}
            stroke={networkMeta.stroke}
            fill={networkMeta.fill}
            showDots={false}
          />
        </div></Link>
      </div>
    </div>
  );
}

/** =========================
 * Chart controls
 * ========================= */
type PresetKey = "weekly" | "monthly" | "quarterly" | "half_yearly";

const PRESETS: { key: PresetKey; label: string }[] = [
  { key: "weekly", label: "Weekly" },
  { key: "monthly", label: "Monthly" },
  { key: "quarterly", label: "Quarterly" },
  { key: "half_yearly", label: "Half Yearly" },
];

function getRangeFromPreset(preset: PresetKey, maxISO: string) {
  const end = maxISO;

  if (preset === "weekly") return { start: addDaysISO(end, -6), end };
  if (preset === "monthly") return { start: addDaysISO(end, -29), end };
  if (preset === "quarterly") return { start: addDaysISO(end, -89), end };
  if (preset === "half_yearly") return { start: addDaysISO(end, -179), end };

  return { start: addDaysISO(end, -29), end };
}

/** =========================
 * Main Component
 * ========================= */
export default function DashboardPage() {
  const [stats, setStats] = useState<UserStatsData | null>(null);
  const [spamReportTotal, setSpamReportTotal] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [dismissedDomains, setDismissedDomains] = useState<Set<string>>(new Set());

const [periodOpen, setPeriodOpen] = useState(false);
const [customDateOpen, setCustomDateOpen] = useState(false);
const [preset, setPreset] = useState<PresetKey>("monthly");
  const [draftStart, setDraftStart] = useState<string>("");
  const [draftEnd, setDraftEnd] = useState<string>("");
  const [chartStart, setChartStart] = useState<string>("");
  const [chartEnd, setChartEnd] = useState<string>("");

  const [showDelivered, setShowDelivered] = useState(true);
  const [showBounce, setShowBounce] = useState(true);
  const [showHard, setShowHard] = useState(false);
  const [showSoft, setShowSoft] = useState(false);

  const router = useRouter();

  const getUserStats = useCallback(async () => {
    setLoading(true);
    setError("");

    const ctrl = new AbortController();
    const timeoutId = setTimeout(() => ctrl.abort(), 10000);

    try {
      const authHeaders = {
        accept: "application/json",
        Authorization: `Bearer ${token()}`,
      };

      const [userStatsRes, spamReportRes] = await Promise.allSettled([
        fetch("/api/dashboard/userStats", {
          method: "GET",
          headers: authHeaders,
          signal: ctrl.signal,
          cache: "no-store",
        }),
        fetch("/api/spam-report?page=1", {
          method: "GET",
          headers: authHeaders,
          signal: ctrl.signal,
          cache: "no-store",
        }),
      ]);

      clearTimeout(timeoutId);

      if (userStatsRes.status === "rejected") {
        throw new Error("Failed to load dashboard data");
      }

      const userStatsResponse = userStatsRes.value;

      if (userStatsResponse.status === 401) {
        router.replace("/login");
        return;
      }

      if (!userStatsResponse.ok) {
        throw new Error(`Failed to load data: ${userStatsResponse.status}`);
      }

      const json = (await userStatsResponse.json()) as UserStatsResponse;
      setStats(json?.data ?? null);

      if (spamReportRes.status === "fulfilled") {
        const spamResponse = spamReportRes.value;

        if (spamResponse.status === 401) {
          router.replace("/login");
          return;
        }

        if (spamResponse.ok) {
          const spamJson = (await spamResponse.json()) as SpamReportResponse;
          setSpamReportTotal(toNum(spamJson?.data?.total));
        } else {
          setSpamReportTotal(0);
        }
      } else {
        setSpamReportTotal(0);
      }
    } catch (e: any) {
      setError(e?.message || "Failed to load dashboard data");
      setStats(null);
      setSpamReportTotal(0);
    } finally {
      setLoading(false);
    }

    return () => {
      clearTimeout(timeoutId);
      ctrl.abort();
    };
  }, [router]);

  useEffect(() => {
    getUserStats();
  }, [getUserStats]);

  const derived = useMemo(() => {
    const emailStats = Array.isArray(stats?.emailStats) ? stats!.emailStats : [];

    const sumDeliveredRows = emailStats.reduce((acc, r) => acc + toNum(r.delivered_emails), 0);
    const sumBounceRows = emailStats.reduce((acc, r) => acc + toNum(r.bounce_mails), 0);
    const sumHardRows = emailStats.reduce((acc, r) => acc + toNum(r.all_hard_bounce), 0);
    const sumSoftRows = emailStats.reduce((acc, r) => acc + toNum(r.all_soft_bounce), 0);

    const active = stats?.activeemailStats ?? null;

    const delivered = toNum(active?.sum_delivered_emails) || sumDeliveredRows;
    const bounce = toNum(active?.sum_bounce_mails) || sumBounceRows;
    const hard = toNum(active?.sum_all_hard_bounce) || sumHardRows;
    const soft = toNum(active?.sum_all_soft_bounce) || sumSoftRows;
    const total =
      (toNum(active?.total_sum) > 0 ? toNum(active?.total_sum) : 0) || delivered + bounce;

    const successRate = total > 0 ? percent(delivered, total) : "0%";
    const hardRate = total > 0 ? percent(hard, total) : "0%";
    const softRate = total > 0 ? percent(soft, total) : "0%";

    const warningsRaw = stats?.not_validate_domain_warning || [];
    const warnings = warningsRaw.filter((w) => !dismissedDomains.has(w.domain_name.toLowerCase()));

    const remainMails = stats?.remain_mails || { remain: null, limit: null };
    const usedEmails =
      typeof remainMails.limit === "number" && typeof remainMails.remain === "number"
        ? remainMails.limit - remainMails.remain
        : 0;

    return {
      delivered,
      bounce,
      hard,
      soft,
      total,
      successRate,
      hardRate,
      softRate,
      warnings,
      warningsCount: warnings.length,
      emailStats,
      remainMails,
      usedEmails,
    };
  }, [stats, dismissedDomains]);

  const chart = useMemo(() => {
    const rows = (derived.emailStats || [])
      .filter((r) => r?.date)
      .map((r) => ({
        date: r.date,
        delivered: toNum(r.delivered_emails),
        bounce: toNum(r.bounce_mails),
        hard: toNum(r.all_hard_bounce),
        soft: toNum(r.all_soft_bounce),
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const minISO = rows[0]?.date || toISO(new Date());
    const maxISO = rows[rows.length - 1]?.date || toISO(new Date());

    const appliedStart = chartStart || getRangeFromPreset(preset, maxISO).start;
    const appliedEnd = chartEnd || getRangeFromPreset(preset, maxISO).end;

    const filtered = rows.filter((r) => r.date >= appliedStart && r.date <= appliedEnd);

    const headerLabel = PRESETS.find((x) => x.key === preset)?.label || "Monthly";

    return {
      minISO,
      maxISO,
      data: filtered.length ? filtered : rows,
      appliedStart,
      appliedEnd,
      headerLabel,
    };
  }, [derived.emailStats, chartStart, chartEnd, preset]);

  useEffect(() => {
    if (!chartStart && chart.maxISO) {
      const r = getRangeFromPreset(preset, chart.maxISO);
      setChartStart(r.start);
      setChartEnd(r.end);
      setDraftStart(r.start);
      setDraftEnd(r.end);
    }
  }, [chart.maxISO, chartStart, preset]);

  const handleDismissDomain = (domain: string) => {
    setDismissedDomains((prev) => new Set([...prev, domain.toLowerCase()]));
  };

const applyPreset = (p: PresetKey) => {
  setPreset(p);

  const r = getRangeFromPreset(p, chart.maxISO || toISO(new Date()));
  setChartStart(r.start);
  setChartEnd(r.end);
  setDraftStart(r.start);
  setDraftEnd(r.end);
  setPeriodOpen(false);
};
const applyCustom = () => {
  if (!draftStart || !draftEnd) return;

  const start = draftStart <= draftEnd ? draftStart : draftEnd;
  const end = draftStart <= draftEnd ? draftEnd : draftStart;

  setChartStart(start);
  setChartEnd(end);
  setCustomDateOpen(false);
};

  const togglePill = (key: "delivered" | "bounce" | "hard" | "soft") => {
    if (key === "delivered") setShowDelivered((v) => !v);
    if (key === "bounce") setShowBounce((v) => !v);
    if (key === "hard") setShowHard((v) => !v);
    if (key === "soft") setShowSoft((v) => !v);
  };

  const Pill = ({
    on,
    label,
    onClick,
  }: {
    on: boolean;
    label: string;
    onClick: () => void;
  }) => (
    <button
      type="button"
      onClick={onClick}
      className={[
        "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition",
        on
          ? "border-gray-300 bg-white shadow-sm"
          : "border-gray-200 bg-gray-50 opacity-70 hover:opacity-100",
      ].join(" ")}
    >
      <span
        className={[
          "flex h-6 w-6 items-center justify-center rounded-full",
          on ? "bg-gray-100 text-gray-900" : "bg-gray-200 text-gray-500",
        ].join(" ")}
      >
        {on ? <Check className="h-4 w-4" /> : null}
      </span>
      <span className="text-gray-700">{label}</span>
    </button>
  );

  const successRateNum =
    derived.total > 0 ? Number(((derived.delivered / derived.total) * 100).toFixed(1)) : 0;

  const bounceRateNum =
    derived.total > 0 ? Number(((derived.bounce / derived.total) * 100).toFixed(1)) : 0;

  const overviewRows = (derived.emailStats || [])
    .map((r) => ({
      date: r.date,
      delivered: toNum(r.delivered_emails),
      bounce: toNum(r.bounce_mails),
      hard: toNum(r.all_hard_bounce),
      soft: toNum(r.all_soft_bounce),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {error && (
          <div className="mb-6 rounded-xl border border-rose-200 bg-gradient-to-r from-rose-50 to-rose-25 p-4">
            <div className="flex items-center gap-3">
              <XCircle className="h-5 w-5 text-rose-600" />
              <div className="flex-1">
                <p className="font-medium text-rose-900">Error Loading Data</p>
                <p className="mt-1 text-sm text-rose-700">{error}</p>
              </div>
              <button
                onClick={getUserStats}
                className="rounded-lg border border-rose-300 bg-white px-3 py-1.5 text-sm font-medium text-rose-700 transition-colors hover:bg-rose-50"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {!loading && derived.warningsCount > 0 && (
          <div className="mb-8">
            <div className="mb-4 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              <h2 className="text-lg font-semibold text-gray-900">
                Domain Validation Required ({derived.warningsCount})
              </h2>
            </div>

            <div className="grid gap-3">
              {derived.warnings.map((w, i) => (
                <AlertCard
                  key={`${w.domain_name}-${i}`}
                  domain={w.domain_name}
                  message={w.message}
                  onDismiss={() => handleDismissDomain(w.domain_name)}
                />
              ))}
            </div>
          </div>
        )}

        <MonthlyOverviewCard
          remaining={toNum(derived.remainMails.remain)}
          limit={toNum(derived.remainMails.limit)}
          sent={toNum(derived.total)}
          emailStats={overviewRows}
          domainValid={toNum(stats?.email_config?.valid)}
          successRateNum={successRateNum}
          bounceRateNum={bounceRateNum}
          spamReportCount={spamReportTotal}
          loading={loading}
        />

        <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Sent"
            value={loading ? "—" : formatNumber(derived.total)}
            subtitle="Delivered + Bounced"
            icon={Send}
            color="blue"
            loading={loading}
          />

          <StatCard
            title="Delivered"
            value={loading ? "—" : formatNumber(derived.delivered)}
            subtitle={`Success rate: ${derived.successRate}`}
            icon={CheckCircle}
            color="green"
            loading={loading}
          />

          <StatCard
            title="Hard Bounce"
            value={loading ? "—" : formatNumber(derived.hard)}
            subtitle={`Hard bounce rate: ${derived.hardRate}`}
            icon={XCircle}
            color="red"
            loading={loading}
          />

          <StatCard
            title="Soft Bounce"
            value={loading ? "—" : formatNumber(derived.soft)}
            subtitle={`Soft bounce rate: ${derived.softRate}`}
            icon={AlertCircle}
            color="orange"
            loading={loading}
          />
        </div>

        <div className="mb-8 rounded-2xl bg-white p-6 shadow-lg">
          <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-xl font-semibold text-gray-900">Email performance</h3>
              <p className="text-sm text-gray-600">For all campaigns • Updated a few seconds ago</p>
            </div>

           <div className="flex flex-wrap items-center gap-3">
                {/* Custom date filter */}
                <div className="relative">
                  <button
                    type="button"
                    title="Custom date filter"
                    onClick={() => {
                      setCustomDateOpen((v) => !v);
                      setPeriodOpen(false);
                    }}
                    className="flex h-11 w-11 items-center justify-center rounded-xl border border-gray-200 bg-white shadow-sm transition hover:bg-gray-50"
                  >
                    <Filter className="h-5 w-5 text-gray-700" />
                  </button>

                  {customDateOpen && (
                    <div className="absolute right-0 z-50 mt-2 w-[340px] rounded-2xl border border-gray-200 bg-white p-4 shadow-xl">
                      <div className="mb-3">
                        <h4 className="text-sm font-semibold text-gray-900">Custom date range</h4>
                        <p className="mt-1 text-xs text-gray-500">Select start and end date</p>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <label className="mb-1 block text-xs font-medium text-gray-600">Start date</label>
                          <input
                            type="date"
                            value={draftStart}
                            onChange={(e) => setDraftStart(e.target.value)}
                            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-violet-400"
                            min={chart.minISO}
                            max={chart.maxISO}
                          />
                        </div>

                        <div>
                          <label className="mb-1 block text-xs font-medium text-gray-600">End date</label>
                          <input
                            type="date"
                            value={draftEnd}
                            onChange={(e) => setDraftEnd(e.target.value)}
                            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-violet-400"
                            min={chart.minISO}
                            max={chart.maxISO}
                          />
                        </div>
                      </div>

                      <div className="mt-4 flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setCustomDateOpen(false)}
                          className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={applyCustom}
                          className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:opacity-95"
                        >
                          Apply
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Period selector */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setPeriodOpen((v) => !v);
                      setCustomDateOpen(false);
                    }}
                    className="flex min-h-[44px] min-w-[180px] items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-4 shadow-sm transition hover:bg-gray-50"
                  >
                    <span className="truncate text-sm font-medium text-gray-800">{chart.headerLabel}</span>
                    <ChevronDown className="h-4 w-4 shrink-0 text-gray-600" />
                  </button>

                  {periodOpen && (
                    <div className="absolute right-0 z-50 mt-2 w-[220px] rounded-2xl border border-gray-200 bg-white p-2 shadow-xl">
                      <div className="grid gap-2">
                        {PRESETS.map((p) => (
                          <button
                            key={p.key}
                            type="button"
                            onClick={() => applyPreset(p.key)}
                            className={[
                              "flex min-h-[44px] w-full items-center rounded-xl px-4 text-left text-sm font-medium transition",
                              preset === p.key
                                ? "bg-violet-50 text-violet-700"
                                : "text-gray-700 hover:bg-gray-50",
                            ].join(" ")}
                          >
                            {p.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {(periodOpen || customDateOpen) && (
                  <button
                    type="button"
                    onClick={() => {
                      setPeriodOpen(false);
                      setCustomDateOpen(false);
                    }}
                    className="flex h-11 w-11 items-center justify-center rounded-xl border border-gray-200 bg-white shadow-sm transition hover:bg-gray-50"
                    title="Close"
                  >
                    <X className="h-5 w-5 text-gray-700" />
                  </button>
                )}
              </div>
           </div>

          <div className="h-[360px]">
            {loading ? (
              <div className="flex h-full items-center justify-center text-gray-500">Loading chart…</div>
            ) : (chart.data?.length || 0) < 2 ? (
              <div className="flex h-full items-center justify-center text-gray-500">
                Not enough data for a line chart (need at least 2 days).
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chart.data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} />
                  <Tooltip
                    formatter={(value: any, name: any) => [value, name]}
                    labelFormatter={(label) => `Date: ${label}`}
                  />
                  <Legend wrapperStyle={{ display: "none" }} />

                  {showDelivered && (
                    <Line
                      type="monotone"
                      dataKey="delivered"
                      name="Delivered"
                      stroke="#16a34a"
                      strokeWidth={3}
                      dot={false}
                      activeDot={{ r: 5 }}
                    />
                  )}

                  {showBounce && (
                    <Line
                      type="monotone"
                      dataKey="bounce"
                      name="Bounce"
                      stroke="#2563eb"
                      strokeWidth={3}
                      dot={false}
                      activeDot={{ r: 5 }}
                    />
                  )}

                  {showHard && (
                    <Line
                      type="monotone"
                      dataKey="hard"
                      name="Hard bounce"
                      stroke="#dc2626"
                      strokeWidth={3}
                      dot={false}
                      activeDot={{ r: 5 }}
                    />
                  )}

                  {showSoft && (
                    <Line
                      type="monotone"
                      dataKey="soft"
                      name="Soft bounce"
                      stroke="#f59e0b"
                      strokeWidth={3}
                      dot={false}
                      activeDot={{ r: 5 }}
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <Pill on={showDelivered} label="Delivered" onClick={() => togglePill("delivered")} />
            <Pill on={showBounce} label="Bounce" onClick={() => togglePill("bounce")} />
            <Pill on={showHard} label="Hard bounce" onClick={() => togglePill("hard")} />
            <Pill on={showSoft} label="Soft bounce" onClick={() => togglePill("soft")} />
          </div>

          <div className="mt-3 text-xs text-gray-500">
            Y-axis shows <span className="font-semibold">mail count</span> (not %).
          </div>
        </div>

        <div className="mt-8 border-t border-gray-200 pt-8">
          <h3 className="mb-6 text-lg font-semibold text-gray-900">Quick Actions</h3>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <button className="flex flex-col items-center gap-3 rounded-xl border border-gray-200 bg-white p-5 transition-all hover:border-gray-300 hover:shadow-md">
              <div className="rounded-lg bg-blue-100 p-3 text-blue-600">
                <Send className="h-6 w-6" />
              </div>
              <span className="font-medium text-gray-900">Create Campaign</span>
              <span className="text-sm text-gray-500">Start sending emails</span>
            </button>

            <Link
              href="/domain-info"
              className="flex flex-col items-center gap-3 rounded-xl border border-gray-200 bg-white p-5 transition-all hover:border-gray-300 hover:shadow-md"
            >
              <div className="rounded-lg bg-emerald-100 p-3 text-emerald-600">
                <Shield className="h-6 w-6" />
              </div>
              <span className="font-medium text-gray-900">Domain Settings</span>
              <span className="text-sm text-gray-500">Manage domains</span>
            </Link>

            <Link
              href="/email-logs"
              className="flex flex-col items-center gap-3 rounded-xl border border-gray-200 bg-white p-5 transition-all hover:border-gray-300 hover:shadow-md"
            >
              <div className="rounded-lg bg-violet-100 p-3 text-violet-600">
                <Eye className="h-6 w-6" />
              </div>
              <span className="font-medium text-gray-900">View Reports</span>
              <span className="text-sm text-gray-500">Analytics & insights</span>
            </Link>

            <Link
              href="https://smtpmaster.tawk.help/"
              className="flex flex-col items-center gap-3 rounded-xl border border-gray-200 bg-white p-5 transition-all hover:border-gray-300 hover:shadow-md"
            >
              <div className="rounded-lg bg-amber-100 p-3 text-amber-600">
                <Users className="h-6 w-6" />
              </div>
              <span className="font-medium text-gray-900">Support</span>
              <span className="text-sm text-gray-500">Get help & support</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}