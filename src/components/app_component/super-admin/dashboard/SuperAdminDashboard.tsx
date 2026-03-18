"use client";

import React from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";
import {
  Mail,
  TrendingDown,
  TrendingUp,
  UserPlus,
  ArrowRight,
} from "lucide-react";

type StatCardProps = {
  value: string;
  label: string;
  bg: string; // tailwind bg color class
  Icon: React.ElementType;
};

function StatCard({ value, label, bg, Icon }: StatCardProps) {
  return (
    <div className={`${bg} text-white rounded-lg shadow-sm overflow-hidden`}>
      <div className="p-4 sm:p-5 flex items-start justify-between min-h-[108px]">
        <div>
          <div className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            {value}
          </div>
          <div className="mt-2 text-sm sm:text-base opacity-95">{label}</div>
        </div>
        <div className="opacity-20">
          <Icon className="h-14 w-14 sm:h-16 sm:w-16" />
        </div>
      </div>

      <button
        type="button"
        className="w-full bg-black/10 hover:bg-black/15 transition px-4 py-3 flex items-center justify-center gap-2 text-sm font-semibold"
      >
        More info <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}

export default function SuperAdminDashboardPage() {
  // ----- demo numbers (replace with API data) -----
  const totalQuota = 30000;
  const totalSent = 15470;

  const bounceRate = 48; // %
  const successRate = 52; // %

  const registrations = 0;
  const registrationsQuota = 1040;

  // For donut:
  const bounced = Math.round((totalSent * bounceRate) / 100);
  const delivered = totalSent - bounced;
  const remaining = Math.max(totalQuota - totalSent, 0);

  const donutData = [
    { name: "Email Send Successfully", value: delivered },
    { name: "Bounce Mails", value: bounced },
    { name: "Remain Mails", value: remaining },
  ];

  // NOTE: We intentionally do NOT set specific colors (your UI can set CSS vars if needed)
  const defaultCells = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)"];

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="mx-auto w-full max-w-7xl px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
        {/* Top Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            value={`${totalSent}/${totalQuota}`}
            label="Total Email Send"
            bg="bg-cyan-600"
            Icon={Mail}
          />
          <StatCard
            value={`${bounceRate}%`}
            label="Bounce Rate"
            bg="bg-red-500"
            Icon={TrendingDown}
          />
          <StatCard
            value={`${successRate}%`}
            label="Success Rate"
            bg="bg-green-600"
            Icon={TrendingUp}
          />
          <StatCard
            value={`${registrations}/${registrationsQuota}`}
            label="User Registrations"
            bg="bg-yellow-500 text-black"
            Icon={UserPlus}
          />
        </div>

        {/* Chart Card */}
        <div className="mt-5 sm:mt-6 bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-100">
            <div className="text-base sm:text-lg font-semibold text-gray-800">
              Email Summary
            </div>
            <div className="text-xs sm:text-sm text-gray-500 mt-1">
              Delivered vs Bounce vs Remaining quota
            </div>
          </div>

          <div className="p-3 sm:p-6">
            <div className="w-full h-[320px] sm:h-[380px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Legend
                    verticalAlign="top"
                    height={48}
                    wrapperStyle={{
                      fontSize: 14,
                      color: "#374151",
                    }}
                  />
                  <Tooltip />
                  <Pie
                    data={donutData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius="60%"
                    outerRadius="90%"
                    paddingAngle={1}
                    strokeWidth={0}
                  >
                    {donutData.map((_, idx) => (
                      <Cell key={idx} fill={defaultCells[idx % defaultCells.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Mobile-friendly quick stats under chart */}
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-md border border-gray-200 p-3">
                <div className="text-xs text-gray-500">Delivered</div>
                <div className="text-lg font-bold text-gray-900">{delivered}</div>
              </div>
              <div className="rounded-md border border-gray-200 p-3">
                <div className="text-xs text-gray-500">Bounced</div>
                <div className="text-lg font-bold text-gray-900">{bounced}</div>
              </div>
              <div className="rounded-md border border-gray-200 p-3">
                <div className="text-xs text-gray-500">Remaining</div>
                <div className="text-lg font-bold text-gray-900">{remaining}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Optional: CSS vars for chart colors (matches your card vibe) */}
        <style jsx global>{`
          :root {
            --chart-1: #3b82f6; /* blue */
            --chart-2: #fb7185; /* pink/red */
            --chart-3: #fbbf24; /* yellow */
          }
        `}</style>
      </div>
    </div>
  );
}
