"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { token } from "../../common/http";

type InvoiceApiData = {
  member_id: number;
  amount: number | string;
  razorpay_payment_id: string;
  currency: string;
  status: string;
  method: string;
  card_id?: string | null;
  bank?: string | null;
  email: string;
  contact: string;
  bank_transaction_id?: string | null;
  id: number;
  created_on: string;
  plan_id: number;
  invoice_id: string;
  user_plan_id: number;
  coupon_applied?: string | null;
  plane_name?: string | null;
  quantity?: string | number | null;
  discount?: string | number | null;
  tax?: string | number | null;
  user_or_company_name?: string | null;
  address?: string | null;
  gst_in?: string | null;
  country?: string | null;
  state?: string | null;
  pin?: string | null;
  city?: string | null;
  coupon?: string | null;
  invoice_id_new?: string | null;
};

type OldApiResponse = {
  payment_info?: InvoiceApiData;
  code?: number;
  message?: string;
};

type ApiResponse = InvoiceApiData | OldApiResponse;

function formatMoney(value: number, currency = "INR") {
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

function toNumber(value: string | number | null | undefined) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function formatDate(dateStr?: string) {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function titleCase(text?: string | null) {
  if (!text) return "-";
  return text
    .toLowerCase()
    .split(" ")
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1) : ""))
    .join(" ");
}

export default function InvoicePage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [data, setData] = useState<InvoiceApiData | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const controller = new AbortController();

    (async () => {
      try {
        setLoading(true);
        setErr(null);

        const res = await fetch(`/api/order_history/invoice?id=${id}`, {
          method: "GET",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token()}`,
          },
          signal: controller.signal,
          cache: "no-store",
        });

        if (res.status === 401) {
          router.replace("/login");
          return;
        }

        if (!res.ok) {
          const txt = await res.text().catch(() => "");
          throw new Error(`API error: ${res.status} ${txt}`);
        }

        const json = (await res.json()) as ApiResponse;

        const normalized =
          "payment_info" in json && json.payment_info ? json.payment_info : (json as InvoiceApiData);

        if (!normalized?.invoice_id) {
          throw new Error("No invoice data found");
        }

        setData(normalized);
      } catch (e: any) {
        if (e?.name === "AbortError") return;
        setErr(e?.message || "Something went wrong");
      } finally {
        setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [id, router]);

  const company = {
    name: "SMTPMaster",
    legalName: "SMTPMaster Technologies",
    addressLine1: "Kolkata, West Bengal, India",
    phone: "+91 7439680211",
    email: "support@smtpmaster.com",
    website: "www.smtpmaster.com",
    gstin: "YOUR_GST_NUMBER",
  };

  const invoice = data;

  const quantity = toNumber(invoice?.quantity || 1) || 1;
  const totalAmount = toNumber(invoice?.amount);
  const discount = toNumber(invoice?.discount);
  const tax = toNumber(invoice?.tax);
  const taxableAmount = Math.max(totalAmount - tax, 0);
  const unitRate = quantity > 0 ? taxableAmount / quantity : taxableAmount;

  const billToName = invoice?.user_or_company_name || invoice?.email || "-";
  const fullAddress = [
    invoice?.address,
    invoice?.city,
    invoice?.state,
    invoice?.pin,
    titleCase(invoice?.country),
  ]
    .filter(Boolean)
    .join(", ");

  const invoiceNo = invoice?.invoice_id_new || invoice?.invoice_id || "-";
  const couponText = invoice?.coupon || invoice?.coupon_applied || "-";

  const taxBreakup = useMemo(() => {
    const half = tax / 2;
    return {
      cgst: half,
      sgst: half,
      igst: tax,
    };
  }, [tax]);

  return (
    <div className="min-h-screen bg-neutral-100 px-4 py-6 md:px-6 print:bg-white print:p-0">
      <div className="mx-auto mb-4 flex max-w-[900px] justify-end print:hidden">
        <button
          onClick={async () => {
            if (!id) return;

            try {
              const res = await fetch(`/api/order_history/dwonload_invoice?id=${id}`, {
                method: "GET",
                headers: {
                  Authorization: `Bearer ${token()}`,
                },
              });

              if (res.status === 401) {
                router.replace("/login");
                return;
              }

              if (!res.ok) {
                const txt = await res.text().catch(() => "");
                throw new Error(`Download failed: ${res.status} ${txt}`);
              }

              const blob = await res.blob();
              const cd = res.headers.get("content-disposition") || "";
              const match = cd.match(/filename\*?=(?:UTF-8'')?["']?([^"';]+)["']?/i);
              const filename = match?.[1]
                ? decodeURIComponent(match[1])
                : `${id}_invoice.pdf`;

              const url = window.URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = filename;
              document.body.appendChild(a);
              a.click();
              a.remove();
              window.URL.revokeObjectURL(url);
            } catch (err: any) {
              alert(err?.message || "Download error");
            }
          }}
          className="rounded-md bg-orange-600 px-5 py-2 text-sm font-medium text-white hover:bg-orange-700"
        >
          Download PDF
        </button>
      </div>

      <div className="mx-auto max-w-[900px] bg-white shadow print:max-w-none print:shadow-none">
        {loading && (
          <div className="p-8 text-sm text-gray-600">Loading invoice...</div>
        )}

        {!loading && err && (
          <div className="p-8">
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {err}
            </div>
          </div>
        )}

        {!loading && !err && invoice && (
          <div className="border border-black text-[11px] text-black">
            {/* Header */}
            <div className="border-b border-black px-4 py-3">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="text-[22px] font-bold leading-none">
                    Tax Invoice
                  </div>
                  <div className="mt-2 space-y-0.5 text-[10px]">
                    <p>
                      <span className="font-semibold">GSTIN:</span>{" "}
                      {company.gstin || "-"}
                    </p>
                    <p>
                      <span className="font-semibold">Invoice No:</span>{" "}
                      {invoiceNo}
                    </p>
                    <p>
                      <span className="font-semibold">Invoice Date:</span>{" "}
                      {formatDate(invoice.created_on)}
                    </p>
                  </div>
                </div>

                <div className="text-center md:text-right">
                  <div className="text-[30px] font-extrabold leading-none text-orange-600">
                    SMTP<span className="text-neutral-900">Master</span>
                  </div>
                  <div className="mt-1 text-[10px] text-gray-700">
                    {company.website}
                  </div>
                  <div className="mt-2 text-[10px] leading-4">
                    <p>{company.legalName}</p>
                    <p>{company.addressLine1}</p>
                    <p>
                      {company.phone} | {company.email}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Top info line */}
            <div className="grid grid-cols-1 border-b border-black md:grid-cols-3">
              <div className="border-b border-black p-2 md:border-b-0 md:border-r md:border-black">
                <p className="font-semibold">Payment Reference</p>
                <p>{invoice.razorpay_payment_id || "-"}</p>
              </div>
              <div className="border-b border-black p-2 md:border-b-0 md:border-r md:border-black">
                <p className="font-semibold">Payment Method</p>
                <p className="uppercase">{invoice.method || "-"}</p>
              </div>
              <div className="p-2">
                <p className="font-semibold">Payment Status</p>
                <p className="uppercase">{invoice.status || "-"}</p>
              </div>
            </div>

            {/* Billing blocks */}
            <div className="grid grid-cols-1 md:grid-cols-2">
              <div className="border-b border-black p-3 md:border-r md:border-black">
                <div className="mb-2 text-[11px] font-bold uppercase">Bill To</div>
                <div className="space-y-1 leading-4">
                  <p className="font-semibold">{billToName}</p>
                  <p>{fullAddress || "-"}</p>
                  <p>
                    <span className="font-semibold">Email:</span>{" "}
                    {invoice.email || "-"}
                  </p>
                  <p>
                    <span className="font-semibold">Phone:</span>{" "}
                    {invoice.contact || "-"}
                  </p>
                  <p>
                    <span className="font-semibold">GSTIN:</span>{" "}
                    {invoice.gst_in || "-"}
                  </p>
                </div>
              </div>

              <div className="border-b border-black p-3">
                <div className="mb-2 text-[11px] font-bold uppercase">
                  Invoice Details
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 leading-4">
                  <p className="font-semibold">Customer ID</p>
                  <p>{invoice.member_id || "-"}</p>

                  <p className="font-semibold">Plan ID</p>
                  <p>{invoice.plan_id || "-"}</p>

                  <p className="font-semibold">User Plan ID</p>
                  <p>{invoice.user_plan_id || "-"}</p>

                  <p className="font-semibold">Currency</p>
                  <p>{invoice.currency || "-"}</p>

                  <p className="font-semibold">Coupon</p>
                  <p>{couponText}</p>

                  <p className="font-semibold">Order Date</p>
                  <p>{formatDate(invoice.created_on)}</p>
                </div>
              </div>
            </div>

            {/* Item table */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[11px]">
                <thead>
                  <tr className="bg-neutral-100">
                    <th className="border-r border-b border-black p-2 text-left font-bold">
                      #
                    </th>
                    <th className="border-r border-b border-black p-2 text-left font-bold">
                      DESCRIPTION
                    </th>
                    <th className="border-r border-b border-black p-2 text-center font-bold">
                      QTY
                    </th>
                    <th className="border-r border-b border-black p-2 text-right font-bold">
                      RATE
                    </th>
                    <th className="border-r border-b border-black p-2 text-right font-bold">
                      DISCOUNT
                    </th>
                    <th className="border-r border-b border-black p-2 text-right font-bold">
                      TAXABLE
                    </th>
                    <th className="border-r border-b border-black p-2 text-right font-bold">
                      TAX
                    </th>
                    <th className="border-b border-black p-2 text-right font-bold">
                      TOTAL
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border-r border-b border-black p-2 align-top">
                      1
                    </td>
                    <td className="border-r border-b border-black p-2 align-top">
                      <div className="font-medium">
                        {invoice.plane_name || "Subscription Plan"}
                      </div>
                      <div className="mt-1 text-[10px] text-gray-700">
                        Invoice for subscribed package / service plan
                      </div>
                    </td>
                    <td className="border-r border-b border-black p-2 text-center align-top">
                      {quantity}
                    </td>
                    <td className="border-r border-b border-black p-2 text-right align-top">
                      {formatMoney(unitRate, invoice.currency)}
                    </td>
                    <td className="border-r border-b border-black p-2 text-right align-top">
                      {formatMoney(discount, invoice.currency)}
                    </td>
                    <td className="border-r border-b border-black p-2 text-right align-top">
                      {formatMoney(taxableAmount, invoice.currency)}
                    </td>
                    <td className="border-r border-b border-black p-2 text-right align-top">
                      {formatMoney(tax, invoice.currency)}
                    </td>
                    <td className="border-b border-black p-2 text-right align-top font-semibold">
                      {formatMoney(totalAmount, invoice.currency)}
                    </td>
                  </tr>

                  {Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i}>
                      <td className="border-r border-b border-black p-4">&nbsp;</td>
                      <td className="border-r border-b border-black p-4">&nbsp;</td>
                      <td className="border-r border-b border-black p-4">&nbsp;</td>
                      <td className="border-r border-b border-black p-4">&nbsp;</td>
                      <td className="border-r border-b border-black p-4">&nbsp;</td>
                      <td className="border-r border-b border-black p-4">&nbsp;</td>
                      <td className="border-r border-b border-black p-4">&nbsp;</td>
                      <td className="border-b border-black p-4">&nbsp;</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Bottom summary */}
            <div className="grid grid-cols-1 md:grid-cols-[1.3fr_0.9fr]">
              <div className="border-b border-black p-3 md:border-r md:border-black md:border-b-0">
                <div className="mb-2 text-[11px] font-bold uppercase">
                  Terms & Notes
                </div>
                <div className="space-y-1 text-[10px] leading-4 text-gray-800">
                  <p>Thank you for your business.</p>
                  <p>This is a computer-generated invoice.</p>
                  <p>
                    Service: {invoice.plane_name || "Plan Subscription"} | Payment ID:{" "}
                    {invoice.razorpay_payment_id || "-"}
                  </p>
                  <p>
                    Coupon Applied: {couponText} | Method:{" "}
                    {(invoice.method || "-").toUpperCase()}
                  </p>
                </div>

                <div className="mt-4 border-t border-black pt-2">
                  <div className="mb-1 text-[11px] font-bold uppercase">
                    Customer Address
                  </div>
                  <div className="text-[10px] leading-4">
                    <p>{billToName}</p>
                    <p>{fullAddress || "-"}</p>
                    <p>
                      {invoice.email || "-"} | {invoice.contact || "-"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-0">
                <table className="w-full border-collapse text-[11px]">
                  <tbody>
                    <tr>
                      <td className="border-b border-black p-2 font-semibold">
                        Taxable Amount
                      </td>
                      <td className="border-b border-black p-2 text-right">
                        {formatMoney(taxableAmount, invoice.currency)}
                      </td>
                    </tr>

                    <tr>
                      <td className="border-b border-black p-2 font-semibold">
                        Discount
                      </td>
                      <td className="border-b border-black p-2 text-right">
                        {formatMoney(discount, invoice.currency)}
                      </td>
                    </tr>

                    <tr>
                      <td className="border-b border-black p-2 font-semibold">
                        Tax
                      </td>
                      <td className="border-b border-black p-2 text-right">
                        {formatMoney(tax, invoice.currency)}
                      </td>
                    </tr>

                    <tr>
                      <td className="border-b border-black p-2 font-semibold">
                        CGST (50%)
                      </td>
                      <td className="border-b border-black p-2 text-right">
                        {formatMoney(taxBreakup.cgst, invoice.currency)}
                      </td>
                    </tr>

                    <tr>
                      <td className="border-b border-black p-2 font-semibold">
                        SGST (50%)
                      </td>
                      <td className="border-b border-black p-2 text-right">
                        {formatMoney(taxBreakup.sgst, invoice.currency)}
                      </td>
                    </tr>

                    <tr className="bg-neutral-100">
                      <td className="border-b border-black p-2 text-[12px] font-bold">
                        Grand Total
                      </td>
                      <td className="border-b border-black p-2 text-right text-[12px] font-bold">
                        {formatMoney(totalAmount, invoice.currency)}
                      </td>
                    </tr>
                  </tbody>
                </table>

                <div className="p-3">
                  <div className="text-right text-[10px]">
                    <p className="font-semibold">For {company.legalName}</p>
                    <div className="my-8" />
                    <p>Authorized Signatory</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-black px-4 py-2 text-[10px] text-gray-700">
              <p>Thank you for choosing SMTPMaster.</p>
              <p>Page 1 of 1</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}