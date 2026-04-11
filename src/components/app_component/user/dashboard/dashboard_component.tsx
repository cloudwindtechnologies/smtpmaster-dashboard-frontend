"use client";
//stop
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  Check,
  CheckCircle,
  ChevronDown,
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
type DomainInfoItem = {
  id: number;
  user_id: number;
  domain_name: string;
  spf_type?: string | null;
  spf_host?: string | null;
};

type DomainInfoResponse = {
  data?: {
    domainList?: DomainInfoItem[];
  };
};
type EmailStatsRow = {
  delivered_emails: number | null;
  bounce_mails: number | null;
  all_hard_bounce: number | null;
  all_soft_bounce: number | null;
  date: string;
};

type UserStatsData = {
  spamreport: any[];
  remain_mails: {
    remain: number | null;
    limit: number | null;
    package_name?: string | null;
  };
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
type NetworkStatus = "excellent" | "fair" | "poor" | "nutral";

const toNum = (v: number | null | undefined) => (typeof v === "number" ? v : 0);

const formatNumber = (num: number | null | undefined) => {
  const n = typeof num === "number" ? num : 0;
  return n.toLocaleString();
};

const formatPlanDate = (dateStr?: string | null) => {
  if (!dateStr) return "—";

  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr;

  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const getPlanExpiryDate = (plans: any[] = []) => {
  if (!Array.isArray(plans) || plans.length === 0) return null;

  const firstPlan = plans[0];
  return firstPlan?.extra_email_end_date || firstPlan?.end_date || null;
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

function getDaysBetweenDates(start: string, end: string): number {
  const startDate = new Date(start + "T00:00:00");
  const endDate = new Date(end + "T00:00:00");
  const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
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
      stroke: "var(--success)",
      fill: "var(--success)",
      iconBg: "bg-[var(--success-soft)]",
      iconText: "text-[var(--success)]",
    };
  }

  if (spamReportCount <= 2) {
    return {
      status: "poor" as AccountHealthStatus,
      label: "Poor",
      score: 48,
      stroke: "var(--warning)",
      fill: "var(--warning)",
      iconBg: "bg-[var(--warning-soft)]",
      iconText: "text-[var(--warning)]",
    };
  }

  return {
    status: "extremely_bad" as AccountHealthStatus,
    label: "Extremely Bad",
    score: 18,
    stroke: "var(--danger)",
    fill: "var(--danger)",
    iconBg: "bg-[var(--danger-soft)]",
    iconText: "text-[var(--danger)]",
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
      stroke: "var(--success)",
      fill: "var(--success)",
      iconBg: "bg-[var(--success-soft)]",
      iconText: "text-[var(--success)]",
    };
  }

  if (successRateNum >= 30) {
    return {
      status: "fair" as NetworkStatus,
      label: "Fair",
      stroke: "var(--warning)",
      fill: "var(--warning)",
      iconBg: "bg-[var(--warning-soft)]",
      iconText: "text-[var(--warning)]",
    };
  }
  if (successRateNum == 0) {
    return {
      status: "nutral" as NetworkStatus,
      label: "No Emails Sent",
      stroke: "var(--warning)",
      fill: "var(--warning)",
      iconBg: "bg-[var(--warning-soft)]",
      iconText: "text-[var(--warning)]",
    };
  }

  return {
    status: "poor" as NetworkStatus,
    label: "Poor",
    stroke: "var(--danger)",
    fill: "var(--danger)",
    iconBg: "bg-[var(--danger-soft)]",
    iconText: "text-[var(--danger)]",
  };
}
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
  const iconColorClasses = {
    blue: "bg-[var(--info-soft)] text-[var(--info)]",
    green: "bg-[var(--success-soft)] text-[var(--success)]",
    red: "bg-[var(--danger-soft)] text-[var(--danger)]",
    purple: "bg-[var(--violet-soft)] text-[var(--violet)]",
    orange: "bg-[var(--warning-soft)] text-[var(--warning)]",
    indigo: "bg-[var(--primary-soft)] text-[var(--primary)]",
    violet: "bg-[var(--violet-soft)] text-[var(--violet)]",
  };

  return (
    <div className="group relative overflow-hidden rounded-2xl bg-[var(--surface)] p-6 shadow-[var(--shadow-card)] transition-all duration-300">
      <div className="absolute inset-0 rounded-2xl border border-[color:var(--line-soft)] transition-colors group-hover:border-[color:var(--line-strong)]" />

      <div className="relative">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="mb-2 text-sm font-medium text-[var(--text-soft)]">{title}</p>
              {tooltip && !loading && (
                <div className="group relative">
                  <div className="flex h-4 w-4 cursor-help items-center justify-center rounded-full bg-[var(--surface-soft)] text-xs text-[var(--text-soft)]">
                    ?
                  </div>
                  <div className="absolute bottom-full left-1/2 z-10 mb-2 hidden w-48 -translate-x-1/2 rounded bg-[var(--tooltip-bg)] p-2 text-xs text-[var(--tooltip-text)] shadow-lg group-hover:block">
                    {tooltip}
                  </div>
                </div>
              )}
            </div>

            {loading ? (
              <>
                <div className="h-9 w-24 rounded-xl bg-[var(--surface-soft)] animate-pulse" />
                <div className="mt-3 h-4 w-32 rounded bg-[var(--surface-soft)] animate-pulse" />
              </>
            ) : (
              <>
                <p className="break-words text-3xl font-bold text-[var(--text-strong)]">
                  {value}
                </p>
                {subtitle && (
                  <p className="mt-2 text-sm text-[var(--text-soft)] sm:whitespace-nowrap">
                    {subtitle}
                  </p>
                )}
              </>
            )}
          </div>

          <div className="shrink-0">
            {loading ? (
              <div className="h-12 w-12 rounded-xl bg-[var(--surface-soft)] animate-pulse" />
            ) : (
              Icon && (
                <div className={`rounded-xl p-3 transition-transform duration-300 ${iconColorClasses[color]}`}>
                  <Icon className="h-6 w-6" />
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// function AlertCard({
//   domain,
//   message,
//   onDismiss,
// }: {
//   domain: string;
//   message: string;
//   onDismiss: () => void;
// }) {
//   return (
//     <div className="relative overflow-hidden rounded-xl border border-[var(--warning)]/30 bg-gradient-to-r from-[var(--warning-soft)] to-[var(--brand-soft)] p-4">
//       <div className="absolute -right-6 -top-6 h-16 w-16 rounded-full bg-gradient-to-br from-[var(--warning)] to-transparent opacity-10" />
//       <div className="relative flex items-start gap-3">
//         <div className="mt-0.5">
//           <AlertTriangle className="h-5 w-5 text-[var(--warning)]" />
//         </div>
//         <div className="flex-1">
//           <h4 className="font-semibold text-[var(--text-strong)]">
//             Domain Requires Validation: <span className="text-[var(--warning)]">{domain}</span>
//           </h4>
//           <p className="mt-1 text-sm text-[var(--text-soft)]">{message}</p>
//         </div>
//         <button
//           onClick={onDismiss}
//           className="text-[var(--text-faint)] transition-colors hover:text-[var(--text-soft)]"
//           aria-label="Dismiss"
//         >
//           <XCircle className="h-5 w-5" />
//         </button>
//       </div>
//     </div>
//   );
// }

function MonthlyOverviewCard({
  remaining,
  limit,
  sent,
  emailStats,
  successRateNum,
  spamReportCount,
  loading,
  packageName,
  expiryDate,
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
  packageName?: string | null;
  expiryDate?: string | null;
}) {
  const sortedStats = [...emailStats].sort((a, b) => a.date.localeCompare(b.date));
  const lastRows = sortedStats.slice(-8);

  const dailyTrendData = lastRows.map((item) => getDailyTotalSent(item));
  const accountHealthMeta = getAccountHealthMeta(spamReportCount);
  const accountHealthData = getAccountHealthSparkline(accountHealthMeta.score);
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

    const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

    const areaPath = [
      `M ${points[0]?.x || 0} ${height - padY}`,
      ...points.map((p) => `L ${p.x} ${p.y}`),
      `L ${points[points.length - 1]?.x || 0} ${height - padY}`,
      "Z",
    ].join(" ");

    return (
      <div className="h-[42px] w-full overflow-hidden rounded-full">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full" preserveAspectRatio="none">
          <path d={areaPath} fill={fill} opacity="0.12" />
          <path d={linePath} fill="none" stroke={stroke} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
          {showDots &&
            points.map((p, i) => (
              <circle key={i} cx={p.x} cy={p.y} r="3" fill={stroke} opacity="0.28" />
            ))}
        </svg>
      </div>
    );
  }

function Gauge({ value, leftValue }: { value: number; leftValue: number }) {
  const total = Math.max(value + leftValue, 1);

  // keep a small visible beige part like the reference
  const rawUsedPercent = (leftValue / total) * 100;
  const usedPercent = Math.max(4.2, Math.min(rawUsedPercent, 8));
  const remainingPercent = 100 - usedPercent;

  const width = 360;
  const height = 170;
  const cx = 190;
  const cy = 142;
  const r = 125;
  const stroke = 15;

  const arcPath = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`;

  // point where beige ends and gradient begins
  const joinAngle = Math.PI - (usedPercent / 100) * Math.PI;
  const joinX = cx + r * Math.cos(joinAngle);
  const joinY = cy - r * Math.sin(joinAngle);

  // left label / dot / line positions
  const dotX = 86;
  const dotY = 112;

  const textX = dotX-65;
  const textY = dotY+30;

  const lineStartX = dotX -25;
  const lineStartY = dotY+24;
  const lineEndX = joinX - 27;
  const lineEndY = joinY +10;

  return (
    <div className="relative h-[165px] w-[360px]">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="absolute inset-0 h-full w-full"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <linearGradient id="gaugeGradientExact" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ff6600" />
            <stop offset="100%" stopColor="#ff6600" />
          </linearGradient>
        </defs>

        {/* beige start segment */}
        <path
          d={arcPath}
          pathLength={100}
          fill="none"
          stroke="#c9b89d"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${usedPercent} ${100 - usedPercent}`}
        />

        {/* gradient starts after beige */}
        <path
          d={arcPath}
          pathLength={100}
          fill="none"
          stroke="url(#gaugeGradientExact)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${remainingPercent} ${100 - remainingPercent}`}
          strokeDashoffset={-usedPercent}
        />

        {/* connector line */}
        <line
          x1={lineStartX}
          y1={lineStartY}
          x2={lineEndX}
          y2={lineEndY}
          stroke="#c9b89d"
          strokeWidth="2.5"
          strokeLinecap="round"
        />

        {/* left value */}
        <text
          x={textX}
          y={textY}
          textAnchor="end"
          fontSize="18"
          fill="#9f927d"
          fontWeight="600"
        >
          {formatNumber(leftValue)}
        </text>

        {/* beige dot */}
        <circle cx={dotX-52} cy={dotY+24} r="8" fill="#c9b89d" />

        {/* center text */}
        <text
          x={190}
          y="78"
          textAnchor="middle"
          fontSize="18"
          fill="var(--text-strong)"
          fontWeight="500"
        >
          Remaining
        </text>

        <text
          x={190}
          y="116"
          textAnchor="middle"
          fontSize="38"
          fill="#22c55e"
          fontWeight="700"
        >
          {formatNumber(value)}
        </text>

        <text
          x={190}
          y="145"
          textAnchor="middle"
          fontSize="17"
          fill="var(--text-strong)"
          fontWeight="500"
        >
          Emails
        </text>
      </svg>
    </div>
  );
}

if (loading) {
  return (
    <div className="mb-6 rounded-[26px] border border-[color:var(--line-soft)] bg-[var(--surface)] px-4 py-5 shadow-[var(--shadow-panel)] sm:px-6 sm:py-6 lg:px-7">
      <div className="animate-pulse">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_420px] lg:items-center">
          <div className="min-w-0">
            <div className="mb-3 flex items-center gap-3">
              <div className="h-8 w-52 rounded-xl bg-[var(--surface-soft)]" />
              <div className="h-10 w-10 rounded-full bg-[var(--surface-soft)]" />
            </div>
            <div className="h-6 w-72 max-w-full rounded-xl bg-[var(--surface-soft)]" />
          </div>

          <div className="flex justify-center lg:justify-end">
            <div className="h-[165px] w-full max-w-[360px] rounded-3xl bg-[var(--surface-soft)]" />
          </div>
        </div>

        <div className="mt-5 h-px w-full bg-[var(--line-soft)]" />

        <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-3">
          <div className="space-y-3 overflow-hidden">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="h-5 w-32 rounded bg-[var(--surface-soft)]" />
                <div className="h-5 w-24 rounded bg-[var(--surface-soft)]" />
              </div>
              <div className="h-8 w-8 rounded-full bg-[var(--surface-soft)]" />
            </div>
            <div className="h-[42px] rounded-full bg-[var(--surface-soft)]" />
          </div>

          <div className="space-y-3 overflow-hidden">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="h-5 w-32 rounded bg-[var(--surface-soft)]" />
                <div className="h-5 w-24 rounded bg-[var(--surface-soft)]" />
              </div>
              <div className="h-8 w-8 rounded-full bg-[var(--surface-soft)]" />
            </div>
            <div className="h-[42px] rounded-full bg-[var(--surface-soft)]" />
          </div>

          <div className="space-y-3 overflow-hidden">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="h-5 w-32 rounded bg-[var(--surface-soft)]" />
                <div className="h-5 w-24 rounded bg-[var(--surface-soft)]" />
              </div>
              <div className="h-8 w-8 rounded-full bg-[var(--surface-soft)]" />
            </div>
            <div className="h-[42px] rounded-full bg-[var(--surface-soft)]" />
          </div>
        </div>
      </div>
    </div>
  );
}

  return (
    <div className="mb-6 rounded-[26px] border border-[color:var(--line-soft)] bg-[var(--surface)] px-7 py-6 shadow-[var(--shadow-panel)]">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_420px] lg:items-center">
        <div className="min-w-0">
          <div className="mb-1 flex items-center gap-3">
            <h2 className="text-[27px] font-bold leading-none text-[var(--text-strong)]">
              Email Sending Overview:
            </h2>
            <div className="flex mt-2 h-10 w-10 items-center justify-center rounded-full bg-[var(--violet-soft)] text-[var(--violet)]">
              <Mail className="h-5 w-5" />
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-[18px] leading-tight text-[var(--text-body)]">
              <span className="font-extrabold text-[var(--text-strong)]">{formatNumber(remaining)}</span>{" "}
              emails remaining out of <span className="font-medium">{formatNumber(limit)}</span>
            </p>

            <p className="text-sm font-medium text-[var(--text-soft)]">
              Plan:{" "}
              <span className="font-semibold text-[var(--text-strong)]">{packageName || "No Active plane "}</span>
              {" | "}
              Expires:{" "}
              <span className="font-semibold text-[var(--text-strong)]">{formatPlanDate(expiryDate) }</span>
            </p>
          </div>
        </div>

        <div className="flex justify-end">
          <Gauge value={remaining} leftValue={sent} />
        </div>
      </div>

      <div className="mt-2 h-px w-full bg-[var(--line-soft)]" />

      <div className="mt-4 grid grid-cols-1 gap-5 md:grid-cols-3">
        <div className="overflow-hidden">
          <div className="mb-1 flex items-start justify-between">
            <div>
              <h3 className="text-[18px] font-semibold text-[var(--text-strong)]">
                {formatNumber(sent)} mails used
              </h3>
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--gauge-accent-soft)] text-[var(--gauge-accent)]">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>

          <MiniLineChart data={dailyTrendData} stroke="var(--gauge-accent)" fill="var(--gauge-accent)" showDots />
        </div>

        <Link href="/spam-report">
          <div className="overflow-hidden">
            <div className="mb-1 flex items-start justify-between">
              <div>
                <h3 className="text-[18px] font-semibold text-[var(--text-strong)]">Account Health</h3>
                <p className="mt-2 text-[19px] font-bold leading-none text-[var(--text-strong)]">
                  {accountHealthMeta.label}
                </p>
              </div>

              <div className={`flex h-8 w-8 items-center justify-center rounded-full ${accountHealthMeta.iconBg} ${accountHealthMeta.iconText}`}>
                <Shield className="h-4 w-4" />
              </div>
            </div>

            <MiniLineChart data={accountHealthData} stroke={accountHealthMeta.stroke} fill={accountHealthMeta.fill} showDots={false} />
          </div>
        </Link>

        <Link href="/email-logs">
          <div className="overflow-hidden">
            <div className="mb-1 flex items-start justify-between">
              <div>
                <h3 className="text-[18px] font-semibold text-[var(--text-strong)]">Performance</h3>
                <p className="mt-2 text-[19px] font-bold leading-none text-[var(--text-strong)]">
                  {networkMeta.label}
                </p>
              </div>

              <div className={`flex h-8 w-8 items-center justify-center rounded-full ${networkMeta.iconBg} ${networkMeta.iconText}`}>
                <Network className="h-4 w-4" />
              </div>
            </div>

            <MiniLineChart data={networkPerformanceData} stroke={networkMeta.stroke} fill={networkMeta.fill} showDots={false} />
          </div>
        </Link>
      </div>
    </div>
  );
}

type PresetKey = "weekly" | "two_weeks" | "four_weeks" | "six_weeks" | "eight_weeks";

const PRESETS: { key: PresetKey; label: string; days: number }[] = [
  { key: "weekly", label: "Weekly", days: 7 },
  { key: "two_weeks", label: "2 Weeks", days: 14 },
  { key: "four_weeks", label: "4 Weeks", days: 28 },
  { key: "six_weeks", label: "6 Weeks", days: 42 },
  { key: "eight_weeks", label: "8 Weeks", days: 56 },
];

function getRangeFromPreset(preset: PresetKey, maxISO: string) {
  const end = maxISO;
  const presetConfig = PRESETS.find(p => p.key === preset);
  const days = presetConfig?.days || 7;
  return { start: addDaysISO(end, -days + 1), end };
}

export default function DashboardPage() {
  const [hasDomain, setHasDomain] = useState(true);
  const [domainLoading, setDomainLoading] = useState(true);
  const [stats, setStats] = useState<UserStatsData | null>(null);
  const [spamReportTotal, setSpamReportTotal] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [dateRangeError, setDateRangeError] = useState<string>("");

  const [periodOpen, setPeriodOpen] = useState(false);
  const [customDateOpen, setCustomDateOpen] = useState(false);
  const [preset, setPreset] = useState<PresetKey>("four_weeks");
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
  setDomainLoading(true);
  setError("");

  const userCtrl = new AbortController();
  const spamCtrl = new AbortController();
  const domainCtrl = new AbortController();

  const userTimeout = setTimeout(() => userCtrl.abort(), 20000);
  const spamTimeout = setTimeout(() => spamCtrl.abort(), 20000);
  const domainTimeout = setTimeout(() => domainCtrl.abort(), 20000);

  try {
    const authHeaders = {
      accept: "application/json",
      Authorization: `Bearer ${token()}`,
    };

    const userStatsPromise = fetch("/api/dashboard/userStats", {
      method: "GET",
      headers: authHeaders,
      signal: userCtrl.signal,
      cache: "no-store",
    });

    const spamPromise = fetch("/api/spam-report?page=1", {
      method: "GET",
      headers: authHeaders,
      signal: spamCtrl.signal,
      cache: "no-store",
    });

    const domainPromise = fetch("/api/domain-info", {
      method: "GET",
      headers: authHeaders,
      signal: domainCtrl.signal,
      cache: "no-store",
    });

    const [userStatsRes, spamReportRes, domainInfoRes] = await Promise.allSettled([
      userStatsPromise,
      spamPromise,
      domainPromise,
    ]);

    if (userStatsRes.status === "rejected") {
      throw new Error("Dashboard request timed out or failed");
    }

    const userStatsResponse = userStatsRes.value;

    if (userStatsResponse.status === 401) {
      router.replace("/login");
      return;
    }

    if (!userStatsResponse.ok) {
      throw new Error(`Failed to load data: ${userStatsResponse.status}`);
    }

    const json = await userStatsResponse.json();
    setStats(json?.data ?? null);

    if (domainInfoRes.status === "fulfilled" && domainInfoRes.value.ok) {
      const domainJson = await domainInfoRes.value.json();
      const domainList = domainJson?.data?.domainList;
      setHasDomain(Array.isArray(domainList) ? domainList.length > 0 : true);
    } else {
      setHasDomain(true);
    }

    if (spamReportRes.status === "fulfilled" && spamReportRes.value.ok) {
      const spamJson = await spamReportRes.value.json();
      setSpamReportTotal(toNum(spamJson?.data?.total));
    } else {
      setSpamReportTotal(0);
    }
  } catch (e: any) {
    setError(e?.message || "Failed to load dashboard data");
    setStats(null);
    setSpamReportTotal(0);
  } finally {
    clearTimeout(userTimeout);
    clearTimeout(spamTimeout);
    clearTimeout(domainTimeout);
    setLoading(false);
    setDomainLoading(false);
  }
}, [router]);

  useEffect(() => {
    getUserStats();
  }, [getUserStats]);

  const derived = useMemo(() => {
    const emailStats = Array.isArray(stats?.emailStats) ? stats!.emailStats : [];

    // const sumDeliveredRows = emailStats.reduce((acc, r) => acc + toNum(r.delivered_emails), 0);
    // const sumBounceRows = emailStats.reduce((acc, r) => acc + toNum(r.bounce_mails), 0);
    // const sumHardRows = emailStats.reduce((acc, r) => acc + toNum(r.all_hard_bounce), 0);
    // const sumSoftRows = emailStats.reduce((acc, r) => acc + toNum(r.all_soft_bounce), 0);

    const active = stats?.activeemailStats ?? null;

    const delivered = toNum(active?.sum_delivered_emails) || 0;
    const bounce = toNum(active?.sum_bounce_mails) || 0;
    const hard = toNum(active?.sum_all_hard_bounce) || 0;
    const soft = toNum(active?.sum_all_soft_bounce) || 0;
    const total =
      (toNum(active?.total_sum) > 0 ? toNum(active?.total_sum) : 0) || delivered + bounce;

    const successRate = total > 0 ? percent(delivered, total) : "0%";
    const hardRate = total > 0 ? percent(hard, total) : "0%";
    const softRate = total > 0 ? percent(soft, total) : "0%";

    const remainMails = stats?.remain_mails || { remain: null, limit: null };

    return {
      delivered,
      bounce,
      hard,
      soft,
      total,
      successRate,
      hardRate,
      softRate,
      emailStats,
      remainMails,
    };
  }, [stats]);

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
    const headerLabel = PRESETS.find((x) => x.key === preset)?.label || "4 Weeks";

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


  const applyPreset = (p: PresetKey) => {
    setPreset(p);
    const r = getRangeFromPreset(p, chart.maxISO || toISO(new Date()));
    setChartStart(r.start);
    setChartEnd(r.end);
    setDraftStart(r.start);
    setDraftEnd(r.end);
    setPeriodOpen(false);
    setDateRangeError(""); // Clear error when preset is applied
  };

  const applyCustom = () => {
    if (!draftStart || !draftEnd) return;

    const start = draftStart <= draftEnd ? draftStart : draftEnd;
    const end = draftStart <= draftEnd ? draftEnd : draftStart;

    // Check if the date range exceeds 2 months (60 days)
    const daysDifference = getDaysBetweenDates(start, end);
    if (daysDifference > 60) {
      setDateRangeError("Date range cannot exceed 2 months (60 days)");
      return;
    }

    setDateRangeError("");
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
          ? "border-[color:var(--line-strong)] bg-[var(--surface)] shadow-sm"
          : "border-[color:var(--line-soft)] bg-[var(--surface-soft)] opacity-70 hover:opacity-100",
      ].join(" ")}
    >
      <span
        className={[
          "flex h-6 w-6 items-center justify-center rounded-full",
          on ? "bg-[var(--surface-soft)] text-[var(--text-strong)]" : "bg-[var(--surface-soft-2)] text-[var(--text-faint)]",
        ].join(" ")}
      >
        {on ? <Check className="h-4 w-4" /> : null}
      </span>
      <span className="text-[var(--text-soft)]">{label}</span>
    </button>
  );

  const successRateNum =
    derived.total > 0 ? Number(((derived.delivered / derived.total) * 100).toFixed(1)) : 0;

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
    <div className="min-h-screen bg-[var(--page-bg)]" style={{borderRadius: "var(--page-radius)"}}>
      
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        
        {error && (
          <div className="mb-6 rounded-xl border border-[var(--danger)]/30 bg-gradient-to-r from-[var(--danger-soft)] to-[var(--surface)] p-4">
            <div className="flex items-center gap-3">
              <XCircle className="h-5 w-5 text-[var(--danger)]" />
              <div className="flex-1">
                <p className="font-medium text-[var(--text-strong)]">Error Loading Data</p>
                <p className="mt-1 text-sm text-[var(--danger)]">{error}</p>
              </div>
              <button
                onClick={getUserStats}
                className="rounded-lg border border-[var(--danger)]/35 bg-[var(--surface)] px-3 py-1.5 text-sm font-medium text-[var(--danger)] transition-colors hover:bg-[var(--danger-soft)]"
              >
                Retry
              </button>
            </div>
          </div>
        )}

{!domainLoading && !hasDomain && (
  <div className="relative mb-6">
    {/* Main floating card */}
    <div className="handkerchief-float relative overflow-hidden rounded-3xl border border-red-300 bg-gradient-to-r from-red-50 via-white to-red-100 shadow-[0_10px_30px_rgba(239,68,68,0.12)]">
      {/* background glow */}
      <div className="absolute -left-10 -top-10 h-40 w-40 rounded-full bg-red-200/40 blur-3xl" />
      <div className="absolute -right-10 -bottom-10 h-40 w-40 rounded-full bg-red-300/30 blur-3xl" />

      <div className="relative z-10 flex flex-col gap-5 p-6 sm:p-7 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-4">
          <div className="relative shrink-0">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-100 text-red-600 shadow-inner">
              <AlertTriangle className="h-7 w-7" />
            </div>
            <span className="absolute -right-1 -top-1 flex h-4 w-4">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex h-4 w-4 rounded-full bg-red-500" />
            </span>
          </div>

          <div>
            <h3 className="text-xl font-bold text-red-700">
              No domain added yet
            </h3>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-red-600">
              Add at least one sending domain to set up your email infrastructure properly.
              Without a domain, your account setup remains incomplete and you may miss
              important sending configuration steps.
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-red-200 bg-white/80 px-3 py-1 text-xs font-medium text-red-600">
                Domain required
              </span>
              <span className="rounded-full border border-red-200 bg-white/80 px-3 py-1 text-xs font-medium text-red-600">
                Setup incomplete
              </span>
              <span className="rounded-full border border-red-200 bg-white/80 px-3 py-1 text-xs font-medium text-red-600">
                Action needed
              </span>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center">
          <Link
            href="/domain-info"
            className="group inline-flex items-center justify-center gap-2 rounded-2xl bg-red-600 px-5 py-3 text-sm font-semibold text-white shadow-lg transition duration-300 hover:-translate-y-0.5 hover:bg-red-700"
          >
            <span>Add Domain Now</span>
            <ChevronDown className="h-4 w-4 -rotate-90 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </div>

    {/* Shadow that moves with the float */}
    <div className="handkerchief-shadow absolute -bottom-2 left-1/2 h-3 w-[90%] -translate-x-1/2 rounded-full bg-black/10 blur-md" />

    <style jsx>{`
      .handkerchief-float {
        animation: floatX 3s ease-in-out infinite;
        will-change: transform;
      }

      .handkerchief-shadow {
        animation: shadowFloat 3s ease-in-out infinite;
      }

      @keyframes floatX {
        0% {
          transform: translateX(0px) translateY(0px);
        }
        25% {
          transform: translateX(8px) translateY(-3px);
        }
        50% {
          transform: translateX(-8px) translateY(-5px);
        }
        75% {
          transform: translateX(4px) translateY(-3px);
        }
        100% {
          transform: translateX(0px) translateY(0px);
        }
      }

      @keyframes shadowFloat {
        0% {
          width: 90%;
          opacity: 0.15;
          transform: translateX(-50%);
        }
        25% {
          width: 85%;
          opacity: 0.1;
          transform: translateX(-45%);
        }
        50% {
          width: 95%;
          opacity: 0.2;
          transform: translateX(-55%);
        }
        75% {
          width: 88%;
          opacity: 0.12;
          transform: translateX(-48%);
        }
        100% {
          width: 90%;
          opacity: 0.15;
          transform: translateX(-50%);
        }
      }

      /* Fabric wave texture at bottom */
      .handkerchief-float::after {
        content: '';
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        height: 4px;
        background: linear-gradient(
          90deg,
          transparent 0%,
          rgba(239, 68, 68, 0.15) 20%,
          rgba(239, 68, 68, 0.08) 50%,
          rgba(239, 68, 68, 0.15) 80%,
          transparent 100%
        );
        animation: fabricShimmer 3s ease-in-out infinite;
      }

      @keyframes fabricShimmer {
        0%, 100% {
          opacity: 0.3;
        }
        50% {
          opacity: 0.6;
        }
      }
    `}</style>
  </div>
)}

        <MonthlyOverviewCard
          remaining={toNum(derived.remainMails.remain)}
          limit={toNum(derived.remainMails.limit)}
          sent={toNum(derived.total)}
          emailStats={overviewRows}
          domainValid={toNum(stats?.email_config?.valid)}
          successRateNum={successRateNum}
          bounceRateNum={0}
          spamReportCount={spamReportTotal}
          loading={loading}
          packageName={stats?.remain_mails?.package_name ?? null}
          expiryDate={getPlanExpiryDate(stats?.active_plans ?? [])}
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

        <div className="mb-8 rounded-2xl bg-[var(--surface)] p-6 shadow-[var(--shadow-card)]">
          <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-xl font-semibold text-[var(--text-strong)]">Email performance</h3>
              <p className="text-sm text-[var(--text-soft)]">For all campaigns • Updated a few seconds ago</p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <button
                  type="button"
                  title="Custom date filter"
                  onClick={() => {
                    setCustomDateOpen((v) => !v);
                    setPeriodOpen(false);
                    setDateRangeError(""); // Clear error when opening
                  }}
                  className="flex h-11 w-11 items-center justify-center rounded-xl border border-[color:var(--line-soft)] bg-[var(--surface)] shadow-sm transition hover:bg-[var(--surface-soft)]"
                >
                  <Filter className="h-5 w-5 text-[var(--text-soft)]" />
                </button>

                {customDateOpen && (
                  <div className="absolute right-0 z-50 mt-2 w-[340px] rounded-2xl border border-[color:var(--line-soft)] bg-[var(--surface)] p-4 shadow-xl">
                    <div className="mb-3">
                      <h4 className="text-sm font-semibold text-[var(--text-strong)]">Custom date range</h4>
                      <p className="mt-1 text-xs text-[var(--text-soft)]">Select start and end date (max 2 months)</p>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-[var(--text-soft)]">
                          Start date
                        </label>
                        <input
                          type="date"
                          value={draftStart}
                          onChange={(e) => setDraftStart(e.target.value)}
                          className="w-full rounded-xl border border-[color:var(--line-soft)] bg-[var(--surface)] px-3 py-2.5 text-sm text-[var(--text-strong)] outline-none focus:border-[var(--violet)]"
                          min={chart.minISO}
                          max={chart.maxISO}
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-xs font-medium text-[var(--text-soft)]">
                          End date
                        </label>
                        <input
                          type="date"
                          value={draftEnd}
                          onChange={(e) => setDraftEnd(e.target.value)}
                          className="w-full rounded-xl border border-[color:var(--line-soft)] bg-[var(--surface)] px-3 py-2.5 text-sm text-[var(--text-strong)] outline-none focus:border-[var(--violet)]"
                          min={chart.minISO}
                          max={chart.maxISO}
                        />
                      </div>
                    </div>

                    {dateRangeError && (
                      <div className="mt-3 rounded-lg bg-[var(--danger-soft)] p-2">
                        <p className="text-xs text-[var(--danger)]">{dateRangeError}</p>
                      </div>
                    )}

                    <div className="mt-4 flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setCustomDateOpen(false);
                          setDateRangeError("");
                        }}
                        className="rounded-xl border border-[color:var(--line-soft)] bg-[var(--surface)] px-4 py-2 text-sm font-medium text-[var(--text-soft)] hover:bg-[var(--surface-soft)]"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={applyCustom}
                        className="rounded-xl bg-[var(--violet)] px-4 py-2 text-sm font-medium text-[var(--text-on-dark)] hover:opacity-95"
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setPeriodOpen((v) => !v);
                    setCustomDateOpen(false);
                    setDateRangeError("");
                  }}
                  className="flex min-h-[44px] min-w-[180px] items-center justify-between gap-3 rounded-xl border border-[color:var(--line-soft)] bg-[var(--surface)] px-4 shadow-sm transition hover:bg-[var(--surface-soft)]"
                >
                  <span className="truncate text-sm font-medium text-[var(--text-body)]">
                    {chart.headerLabel}
                  </span>
                  <ChevronDown className="h-4 w-4 shrink-0 text-[var(--text-soft)]" />
                </button>

                {periodOpen && (
                  <div className="absolute right-0 z-50 mt-2 w-[220px] rounded-2xl border border-[color:var(--line-soft)] bg-[var(--surface)] p-2 shadow-xl">
                    <div className="grid gap-2">
                      {PRESETS.map((p) => (
                        <button
                          key={p.key}
                          type="button"
                          onClick={() => applyPreset(p.key)}
                          className={[
                            "flex min-h-[44px] w-full items-center rounded-xl px-4 text-left text-sm font-medium transition",
                            preset === p.key
                              ? "bg-[var(--violet-soft)] text-[var(--violet)]"
                              : "text-[var(--text-soft)] hover:bg-[var(--surface-soft)]",
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
                    setDateRangeError("");
                  }}
                  className="flex h-11 w-11 items-center justify-center rounded-xl border border-[color:var(--line-soft)] bg-[var(--surface)] shadow-sm transition hover:bg-[var(--surface-soft)]"
                  title="Close"
                >
                  <X className="h-5 w-5 text-[var(--text-soft)]" />
                </button>
              )}
            </div>
          </div>

          <div className="h-[360px]">
            {loading ? (
              <div className="flex h-full items-center justify-center text-[var(--text-soft)]">Loading chart…</div>
            ) : (chart.data?.length || 0) < 2 ? (
              <div className="flex h-full items-center justify-center text-[var(--text-soft)]">
                Not enough data for a line chart (need at least 2 days).
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chart.data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} />
                  <Tooltip formatter={(value: any, name: any) => [value, name]} labelFormatter={(label) => `Date: ${label}`} />
                  <Legend wrapperStyle={{ display: "none" }} />

                  {showDelivered && (
                    <Line type="monotone" dataKey="delivered" name="Delivered" stroke="var(--success)" strokeWidth={3} dot={false} activeDot={{ r: 5 }} />
                  )}

                  {showBounce && (
                    <Line type="monotone" dataKey="bounce" name="Bounce" stroke="var(--info)" strokeWidth={3} dot={false} activeDot={{ r: 5 }} />
                  )}

                  {showHard && (
                    <Line type="monotone" dataKey="hard" name="Hard bounce" stroke="var(--danger)" strokeWidth={3} dot={false} activeDot={{ r: 5 }} />
                  )}

                  {showSoft && (
                    <Line type="monotone" dataKey="soft" name="Soft bounce" stroke="var(--warning)" strokeWidth={3} dot={false} activeDot={{ r: 5 }} />
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

          <div className="mt-3 text-xs text-[var(--text-soft)]">
            Y-axis shows <span className="font-semibold">mail count</span> (not %).
          </div>
        </div>

        <div className="mt-8 border-t border-[color:var(--line-soft)] pt-8">
          <h3 className="mb-6 text-lg font-semibold text-[var(--text-strong)]">Quick Actions</h3>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <button className="flex flex-col items-center gap-3 rounded-xl border border-[color:var(--line-soft)] bg-[var(--surface)] p-5 transition-all hover:border-[color:var(--line-strong)] hover:shadow-md">
              <div className="rounded-lg bg-[var(--info-soft)] p-3 text-[var(--info)]">
                <Send className="h-6 w-6" />
              </div>
              <span className="font-medium text-[var(--text-strong)]">Create Campaign</span>
              <span className="text-sm text-[var(--text-soft)]">Start sending emails</span>
            </button>

            <Link
              href="/domain-info"
              className="flex flex-col items-center gap-3 rounded-xl border border-[color:var(--line-soft)] bg-[var(--surface)] p-5 transition-all hover:border-[color:var(--line-strong)] hover:shadow-md"
            >
              <div className="rounded-lg bg-[var(--success-soft)] p-3 text-[var(--success)]">
                <Shield className="h-6 w-6" />
              </div>
              <span className="font-medium text-[var(--text-strong)]">Domain Settings</span>
              <span className="text-sm text-[var(--text-soft)]">Manage domains</span>
            </Link>

            <Link
              href="/email-logs"
              className="flex flex-col items-center gap-3 rounded-xl border border-[color:var(--line-soft)] bg-[var(--surface)] p-5 transition-all hover:border-[color:var(--line-strong)] hover:shadow-md"
            >
              <div className="rounded-lg bg-[var(--violet-soft)] p-3 text-[var(--violet)]">
                <Eye className="h-6 w-6" />
              </div>
              <span className="font-medium text-[var(--text-strong)]">View Reports</span>
              <span className="text-sm text-[var(--text-soft)]">Analytics & insights</span>
            </Link>

            <Link
              href="https://smtpmaster.tawk.help/"
              className="flex flex-col items-center gap-3 rounded-xl border border-[color:var(--line-soft)] bg-[var(--surface)] p-5 transition-all hover:border-[color:var(--line-strong)] hover:shadow-md"
            >
              <div className="rounded-lg bg-[var(--warning-soft)] p-3 text-[var(--warning)]">
                <Users className="h-6 w-6" />
              </div>
              <span className="font-medium text-[var(--text-strong)]">Support</span>
              <span className="text-sm text-[var(--text-soft)]">Get help & support</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
