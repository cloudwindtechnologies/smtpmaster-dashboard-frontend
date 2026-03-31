"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Bell,
  ShieldAlert,
  TriangleAlert,
  Loader2,
  ArrowRight,
} from "lucide-react";
import { apiURL, token } from "../../common/http";

type NotificationItem = {
  id: string;
  backend_id?: number;
  type: "invalid_domain" | "spam_report";
  title: string;
  message: string;
  date: string | null;
  href: string;
  is_unread: boolean;
};

type ApiResponse = {
  success?: boolean;
  message?: string;
  data?: {
    total: number;
    notifications: NotificationItem[];
  };
};

async function safeJson(res: Response) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return {};
  }
}

function formatDate(date?: string | null) {
  if (!date) return "No date";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "No date";
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function NotificationsComponent() {
  const [rows, setRows] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "invalid_domain" | "spam_report">("all");
  const [error, setError] = useState("");

  const loadNotifications = async () => {
    try {
      setLoading(true);
      setError("");

      const res = await fetch("/api/notifications", {
        method: "GET",
        headers: {
          Accept: "application/json",
          authorization: `Bearer ${token()}`,
        },
        cache: "no-store",
      });

      const json: ApiResponse = await safeJson(res);

      if (!res.ok) {
        throw new Error(json?.message || "Failed to load notifications");
      }

      setRows(json?.data?.notifications || []);
    } catch (e: any) {
      setRows([]);
      setError(e?.message || "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  };

  const markSpamAsRead = async (backendId?: number) => {
    if (!backendId) return;

    try {
      await fetch(`${apiURL}/api/v1/markSpamReportAsRead/${backendId}`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token()}`,
        },
      });

      setRows((prev) =>
        prev.map((item) =>
          item.type === "spam_report" && item.backend_id === backendId
            ? { ...item, is_unread: false }
            : item
        )
      );
    } catch (error) {
      console.error("Failed to mark spam report as read", error);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const filteredRows = useMemo(() => {
    if (filter === "all") return rows;
    return rows.filter((item) => item.type === filter);
  }, [rows, filter]);

  return (
    <div className="min-h-screen bg-[var(--page-bg)] p-4 md:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Notifications
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Invalid domain records and spam report alerts
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilter("all")}
              className={`rounded-lg border px-4 py-2 text-sm font-medium transition ${
                filter === "all"
                  ? "border-black bg-black text-white"
                  : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              All
            </button>

            <button
              onClick={() => setFilter("invalid_domain")}
              className={`rounded-lg border px-4 py-2 text-sm font-medium transition ${
                filter === "invalid_domain"
                  ? "border-black bg-black text-white"
                  : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              Invalid Domains
            </button>

            <button
              onClick={() => setFilter("spam_report")}
              className={`rounded-lg border px-4 py-2 text-sm font-medium transition ${
                filter === "spam_report"
                  ? "border-black bg-black text-white"
                  : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              Spam Reports
            </button>
          </div>
        </div>

        <div className="rounded-2xl border bg-white shadow-sm">
          {loading && (
            <div className="flex items-center justify-center gap-2 px-6 py-16 text-gray-600">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading notifications...
            </div>
          )}

          {!loading && error && (
            <div className="px-6 py-16 text-center text-red-600">{error}</div>
          )}

          {!loading && !error && filteredRows.length === 0 && (
            <div className="px-6 py-16 text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
                <Bell className="h-6 w-6 text-gray-500" />
              </div>
              <h2 className="text-lg font-semibold text-gray-800">
                No notifications found
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Everything looks good right now.
              </p>
            </div>
          )}

          {!loading && !error && filteredRows.length > 0 && (
            <div className="divide-y">
              {filteredRows.map((item) => (
                <div
                  key={item.id}
                  className={`flex flex-col gap-4 px-5 py-4 md:flex-row md:items-start md:justify-between ${
                    item.type === "spam_report" && item.is_unread
                      ? "bg-orange-50"
                      : "bg-white"
                  }`}
                >
                  <div className="flex gap-3">
                    <div
                      className={`mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                        item.type === "invalid_domain"
                          ? "bg-red-100 text-red-600"
                          : "bg-amber-100 text-amber-600"
                      }`}
                    >
                      {item.type === "invalid_domain" ? (
                        <ShieldAlert className="h-5 w-5" />
                      ) : (
                        <TriangleAlert className="h-5 w-5" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-semibold text-gray-900">
                          {item.title}
                        </h3>

                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                            item.type === "invalid_domain"
                              ? "bg-red-100 text-red-700"
                              : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {item.type === "invalid_domain"
                            ? "Invalid Domain"
                            : "Spam Report"}
                        </span>

                        {item.type === "spam_report" && item.is_unread && (
                          <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-1 text-[11px] font-semibold text-blue-700">
                            Unread
                          </span>
                        )}

                        {item.type === "spam_report" && !item.is_unread && (
                          <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-semibold text-gray-600">
                            Read
                          </span>
                        )}
                      </div>

                      <p className="mt-1 break-words text-sm text-gray-600">
                        {item.message}
                      </p>
                      <p className="mt-2 text-xs text-gray-400">
                        {formatDate(item.date)}
                      </p>
                    </div>
                  </div>

                  <div className="md:pl-4">
                    <Link
                      href={item.href}
                      onClick={() => {
                        if (item.type === "spam_report") {
                          markSpamAsRead(item.backend_id);
                        }
                      }}
                      className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      View
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}