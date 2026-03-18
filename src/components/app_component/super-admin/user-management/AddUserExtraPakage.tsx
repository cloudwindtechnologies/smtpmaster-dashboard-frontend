"use client";

import React, { useMemo, useState } from "react";
import { Calendar, Info, ArrowRight, Sparkles, Hash } from "lucide-react";
import { useParams } from "next/navigation";
import { token } from "../../common/http";
import { showToast } from "../../common/toastHelper";

type Props = {
  // if already added then lock (no edit)
  existingExtraEmail?: number | string | null;
};

export default function ExtraEmailSetupCard({ existingExtraEmail = null }: Props) {
  const locked =
    existingExtraEmail !== null &&
    existingExtraEmail !== undefined &&
    String(existingExtraEmail).trim() !== "";

  const params = useParams();
  const id = (params as any)?.id as string | undefined;

  const [startDate, setStartDate] = useState<string>(""); // yyyy-mm-dd
  const [endDate, setEndDate] = useState<string>(""); // yyyy-mm-dd
  const [extraValue, setExtraValue] = useState<string>(""); // number as string for input
  const [loading, setLoading] = useState(false);

  // ---------- validations ----------
  const datesFilled = useMemo(() => !!startDate && !!endDate, [startDate, endDate]);

  const dateOk = useMemo(() => {
    if (!startDate || !endDate) return false;
    return new Date(startDate).getTime() <= new Date(endDate).getTime();
  }, [startDate, endDate]);

  const extraNumber = useMemo(() => {
    const v = extraValue.trim();
    if (!v) return null;
    const n = Number(v);
    if (!Number.isFinite(n)) return null;
    return n;
  }, [extraValue]);

  const extraOk = useMemo(() => extraNumber !== null && extraNumber >= 1, [extraNumber]);

  const canSubmit = !locked && datesFilled && dateOk && extraOk && !loading;

  // ---------- submit ----------
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    if (!id) {
      alert("User id not found in route params.");
      return;
    }

    // IMPORTANT: keys must match backend (pgsql date columns)
    const payload = {
      extra_email: extraNumber as number,
      extra_email_start_date: startDate || null,
      extra_email_end_date: endDate || null,
      status: 1,
    };

    try {
      setLoading(true);
      const res = await fetch(`/api/user-management/list-users/add-packages/add-extra-pakages?id=${id}`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${token()}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const msg =
          data?.message ||
          (data?.errors ? Object.values(data.errors).flat().join(" | ") : "Submit failed");
        showToast('error',msg)
        return;
      }
      showToast('success',data?.message)

    } catch (err: any) {
      console.error(err);
      alert(err?.message || "Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full">
      <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 overflow-hidden">
        {/* Header */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-amber-100 to-red-50" />
          <div className="relative p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ring-1 text-black">
                  <Sparkles className="h-4 w-4" />
                  Extra Package Setup
                </div>

                <h2 className="mt-3 text-3xl text-black font-semibold tracking-tight">
                  Add Extra Package
                </h2>

                <p className="mt-2 text-sm text-black">
                  You can add only one time. No edit option available.
                </p>
              </div>

              {/* Tip box */}
              <div className="hidden sm:flex items-center gap-3 rounded-2xl bg-gray-100 px-5 py-4 ring-1 ring-white/20">
                <div className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/20">
                  <Info className="h-5 w-5 text-black" />
                </div>
                <div className="leading-tight">
                  <div className="text-sm font-semibold text-black">Tip</div>
                  <div className="text-sm text-black">Set dates first, then enter value.</div>
                </div>
              </div>
            </div>

            {locked && (
              <div className="mt-4 rounded-xl bg-white/15 p-3 ring-1 ring-white/20">
                <div className="text-sm text-black">
                  <span className="font-semibold">Already added:</span>{" "}
                  <span className="font-mono">{String(existingExtraEmail)}</span>
                </div>
                <div className="text-xs text-slate-600 mt-1">
                  This option is locked because extra package already exists.
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Start Date */}
            <Field label="Start Date" icon={<Calendar className="h-5 w-5" />} locked={locked}>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                disabled={locked}
                className={inputCls(locked)}
              />
              {!locked && !startDate ? (
                <p className="mt-2 text-xs text-slate-500">Start date is required.</p>
              ) : null}
            </Field>

            {/* End Date */}
            <Field label="End Date" icon={<Calendar className="h-5 w-5" />} locked={locked}>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                disabled={locked}
                className={inputCls(locked, !!(startDate && endDate && !dateOk))}
              />
              {!locked && !endDate ? (
                <p className="mt-2 text-xs text-slate-500">End date is required.</p>
              ) : null}
              {startDate && endDate && !dateOk && (
                <p className="mt-2 text-xs text-red-600">End date must be same or after start date.</p>
              )}
            </Field>

            {/* Extra Value */}
            <div className="md:col-span-2">
              <Field label="Extra Package Value" icon={<Hash className="h-5 w-5" />} locked={locked}>
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  step={1}
                  placeholder="Enter number (min 1)"
                  value={extraValue}
                  onChange={(e) => setExtraValue(e.target.value)}
                  disabled={locked}
                  className={inputCls(locked, !!(extraValue.length > 0 && !extraOk))}
                />

                <p className="mt-3 text-sm text-slate-500">
                  {extraValue.length > 0 && !extraOk
                    ? "Please enter a valid number (minimum 1)."
                    : "This value will be saved in extra_email column."}
                </p>
              </Field>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3 text-sm text-slate-500">
              <span className={`h-2.5 w-2.5 rounded-full ${canSubmit ? "bg-emerald-500" : "bg-amber-400"}`} />
              {locked
                ? "Extra package already added."
                : canSubmit
                ? "Ready to add extra package."
                : "Fill all fields correctly to enable button."}
            </div>

            <button
              type="submit"
              disabled={!canSubmit}
              className={[
                "inline-flex items-center gap-3 rounded-2xl px-7 py-4 text-sm font-semibold transition",
                "shadow-sm ring-1",
                canSubmit
                  ? "bg-gradient-to-r from-indigo-600 via-fuchsia-600 to-amber-500 text-white ring-transparent hover:brightness-110"
                  : "bg-slate-100 text-slate-400 ring-slate-200 cursor-not-allowed",
              ].join(" ")}
            >
              {loading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/60 border-t-white" />
                  Adding...
                </>
              ) : (
                <>
                  Add Extra Package
                  <ArrowRight className="h-5 w-5" />
                </>
              )}
            </button>
          </div>

          {!id ? (
            <p className="mt-4 text-xs text-amber-700">
              Route param <span className="font-mono">id</span> is missing. Your route should be like{" "}
              <span className="font-mono">/admin/users/[id]/...</span>
            </p>
          ) : null}
        </form>
      </div>
    </div>
  );
}

/* ---------------- UI helpers ---------------- */

function Field({
  label,
  icon,
  locked,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  locked?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-3 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-50 ring-1 ring-slate-200 text-slate-700">
          {icon}
        </div>
        <div className="flex items-center gap-3">
          <div className="text-lg font-semibold text-slate-800">{label}</div>
          {locked ? (
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500 ring-1 ring-slate-200">
              Locked
            </span>
          ) : null}
        </div>
      </div>
      {children}
    </div>
  );
}

function inputCls(locked?: boolean, invalid?: boolean) {
  return [
    "w-full rounded-2xl border bg-white px-5 py-4 text-sm text-slate-800 outline-none transition",
    "placeholder:text-slate-400",
    invalid
      ? "border-red-300 focus:border-red-400 focus:ring-4 focus:ring-red-100"
      : "border-slate-200 focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100",
    locked ? "bg-slate-50 text-slate-400 cursor-not-allowed" : "",
  ].join(" ");
}
