"use client";

import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";
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

function toNumber(value: string | number | null | undefined) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function normalizeText(value?: string | null) {
  return (value || "")
    .toString()
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");
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

function roundMoney(value: number) {
  return Math.round(Number(value) || 0);
}

function formatInvoiceMoney(value: number, currency: "INR" | "USD") {
  const safeValue = roundMoney(value);

  if (currency === "INR") {
    return `Rs.${safeValue}/-`;
  }

  return `$${safeValue}`;
}

function numberToWords(num: number, currency: "INR" | "USD") {
  if (!Number.isFinite(num)) return "-";

  const belowTwenty = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];

  const tens = [
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety",
  ];

  const toWords = (n: number): string => {
    if (n < 20) return belowTwenty[n];
    if (n < 100) {
      return tens[Math.floor(n / 10)] + (n % 10 ? ` ${belowTwenty[n % 10]}` : "");
    }
    if (n < 1000) {
      return (
        belowTwenty[Math.floor(n / 100)] +
        " Hundred" +
        (n % 100 ? ` ${toWords(n % 100)}` : "")
      );
    }
    if (n < 100000) {
      return (
        toWords(Math.floor(n / 1000)) +
        " Thousand" +
        (n % 1000 ? ` ${toWords(n % 1000)}` : "")
      );
    }
    if (n < 10000000) {
      return (
        toWords(Math.floor(n / 100000)) +
        " Lakh" +
        (n % 100000 ? ` ${toWords(n % 100000)}` : "")
      );
    }
    return (
      toWords(Math.floor(n / 10000000)) +
      " Crore" +
      (n % 10000000 ? ` ${toWords(n % 10000000)}` : "")
    );
  };

  const rounded = Math.round(num);
  return `${toWords(rounded)} ${currency === "INR" ? "Only" : "Only"}`;
}

function InvoiceSkeleton() {
  return (
    <div className="min-h-screen bg-gray-100 py-4 sm:py-8 px-2 sm:px-4 print:bg-white print:p-0">
      <div className="max-w-4xl mx-auto bg-white shadow-lg print:shadow-none animate-pulse">
        <div className="bg-gray-300 h-24 sm:h-32" />
        <div className="bg-gray-400 h-4" />
        <div className="py-4 sm:py-6 flex justify-center">
          <div className="h-6 sm:h-8 w-48 sm:w-72 bg-gray-300 rounded" />
        </div>
        <div className="px-4 sm:px-8 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row justify-between gap-4 sm:gap-10">
            <div className="w-full sm:w-1/2 space-y-2 sm:space-y-3">
              <div className="h-4 w-40 sm:w-48 bg-gray-300 rounded" />
              <div className="h-4 w-56 sm:w-64 bg-gray-300 rounded" />
              <div className="h-4 w-32 sm:w-40 bg-gray-300 rounded" />
              <div className="h-4 w-48 sm:w-56 bg-gray-300 rounded" />
            </div>
            <div className="w-full sm:w-1/2 space-y-2 sm:space-y-3 flex flex-col items-start sm:items-end">
              <div className="h-4 w-36 sm:w-40 bg-gray-300 rounded" />
              <div className="h-4 w-32 sm:w-36 bg-gray-300 rounded" />
              <div className="h-4 w-32 sm:w-36 bg-gray-300 rounded" />
            </div>
          </div>
        </div>
        <div className="px-4 sm:px-8 py-3 sm:py-4">
          <div className="h-64 sm:h-80 w-full bg-gray-300 rounded" />
        </div>
      </div>
    </div>
  );
}

function sanitizeFileNamePart(value: string) {
  return value
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, "_")
    .trim();
}

function makeDownloadFileName(invoiceId: string, invoiceNo?: string | null) {
  const now = new Date();

  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");

  const hh = String(now.getHours()).padStart(2, "0");
  const min = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");

  const safeInvoiceId = sanitizeFileNamePart(invoiceId || "unknown");
  const safeInvoiceNo = sanitizeFileNamePart(invoiceNo || safeInvoiceId);

  return `invoice_${safeInvoiceNo}_${safeInvoiceId}_${yyyy}-${mm}-${dd}_${hh}-${min}-${ss}.pdf`;
}

export default function InvoicePage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [data, setData] = useState<InvoiceApiData | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

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
          "payment_info" in json && json.payment_info
            ? json.payment_info
            : (json as InvoiceApiData);

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

  const invoice = data;

  const company = {
    legalName: "CLOUDWIND TECHNOLOGIES LLP",
    phone: "+91 7439680211",
    llp: "LLP Identification Number: AAT-7224",
    website: "www.cloudwind.in",
    email: "info@cloudwind.in",
    office:
      "OFFICE:- 5, Shahid Khudiram Bose Sarani, Opposite Ajanta Apartment Ichapur, Howrah, West Bengal, India, 711104",
    gstin: "GST-IN- 19AAPFC6989D1ZS",
    footerTerms: "https://smtpmaster.com/terms-of-use/",
  };

  const normalizedCountry = normalizeText(invoice?.country);
  const normalizedState = normalizeText(invoice?.state);

  const isIndia = normalizedCountry === "india";
  const isWestBengal = isIndia && ["westbengal", "wb"].includes(normalizedState);
  const displayCurrency: "INR" | "USD" = isIndia ? "INR" : "USD";

  const quantity = Math.max(1, Math.round(toNumber(invoice?.quantity || 1)));

  const totalAmount = roundMoney(toNumber(invoice?.amount));
  const discount = roundMoney(toNumber(invoice?.discount));
  const tax = roundMoney(toNumber(invoice?.tax));

  const subtotalAfterDiscount = roundMoney(Math.max(totalAmount - tax, 0));
  const planPrice = roundMoney(subtotalAfterDiscount + discount);

  const unitPrice = quantity > 0 ? roundMoney(planPrice / quantity) : planPrice;

  const cgst = isWestBengal ? roundMoney(tax / 2) : 0;
  const sgst = isWestBengal ? roundMoney(tax / 2) : 0;
  const igst = isIndia && !isWestBengal ? roundMoney(tax) : 0;

  const invoiceNo = invoice?.invoice_id_new || invoice?.invoice_id || "-";
  const billToName = invoice?.user_or_company_name || invoice?.email || "-";
  const planName = invoice?.plane_name || "Email Marketing Plan";

  const addressText = [
    invoice?.address,
    invoice?.city,
    invoice?.state,
    titleCase(invoice?.country),
  ]
    .filter(Boolean)
    .join(", ");

  const totalInWords = useMemo(
    () => numberToWords(totalAmount, displayCurrency),
    [totalAmount, displayCurrency]
  );

  const showIGST = isIndia && !isWestBengal;
  const showCGSTSGST = isWestBengal;

  const handelDwonload = async (invoiceId: string) => {
    try {
      if (!invoiceId) {
        alert("Invoice ID not found");
        return;
      }

      if (downloading) return;

      setDownloading(true);

      const res = await fetch(`/api/order_history/dwonload_invoice?id=${invoiceId}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token()}`,
          Accept: "application/pdf",
        },
        cache: "no-store",
      });

      if (res.status === 401) {
        router.replace("/login");
        return;
      }

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(txt || "Download failed");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);

      const fileName = makeDownloadFileName(invoiceId, invoiceNo);

      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();

      window.URL.revokeObjectURL(url);
    } catch (e: any) {
      alert(e?.message || "Something went wrong");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-4 sm:py-8 px-2 sm:px-4 print:bg-white print:p-0">
      {loading && <InvoiceSkeleton />}

      {!loading && err && (
        <div className="max-w-4xl mx-auto bg-white shadow-lg p-4 sm:p-8">
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {err}
          </div>
        </div>
      )}

      {!loading && !err && invoice && (
        <div className="max-w-4xl mx-auto bg-white shadow-lg print:shadow-none relative">
          <div className="relative w-full h-[120px] sm:h-[170px] font-bold flex overflow-hidden">
            <div
              className="absolute left-0 top-0 mr-2 h-full sm:w-[60%] bg-white z-10"
              style={{
                clipPath: "polygon(0 0, 100% 0, 85% 110%, 0% 100%)",
              }}
            >
              <div className="h-full flex flex-col justify-center px-3 sm:px-4">
                <div className="relative w-[250px] sm:w-[350px] md:w-[400px] h-[50px] sm:h-[70px] md:h-[80px]">
                  <Image
                    src="/CloudwindLogo.png"
                    alt="Cloudwind Logo"
                    fill
                    className="object-contain object-left"
                    priority
                    unoptimized
                  />
                </div>
                <p className="truncate">CLOUDWIND TECHNOLOGIES LLP</p>
                <p className="truncate">
                  CERTIFIED BY STARTUP INDIA-DIPP68039, GOVT. OF INDIA
                </p>
              </div>
            </div>

            <div className="w-full h-full bg-blue-600 flex justify-end items-center sm:px-6 text-white text-right">
              <div className="w-[55%] sm:w-[45%] text-white py-2 sm:py-4 text-right text-[10px] sm:text-xs space-y-0.5 sm:space-y-1 leading-4 sm:leading-5">
                <p className="truncate text-[1.01rem]">{company.phone}</p>
                <p className="truncate text-[1.01rem] hidden xs:block">{company.llp}</p>
                <p className="truncate text-[1.01rem]">{company.website}</p>
                <p className="truncate text-[1.01rem]">{company.email}</p>
                <p className="mt-1 text-[1.01rem]">
                  "OFFICE:- 5, Shahid Khudiram Bose Sarani,<br /> Opposite Ajanta
                  Apartment Ichapur, <br /> Howrah, West Bengal, India, 711104",
                </p>
                <p className="truncate text-[1.01rem] mb-1">{company.gstin}</p>
              </div>
            </div>
          </div>

          <div className="h-6 sm:h-8 bg-blue-900"></div>

          <div className="text-center py-4 sm:py-6">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800 px-4">
              {planName}
            </h2>
          </div>

          <div className="px-4 sm:px-8 py-3 sm:py-4">
            <div className="flex flex-col sm:flex-row justify-between gap-4 sm:gap-8">
              <div className="w-full sm:w-1/2 space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
                <div className="flex">
                  <span className="font-bold w-20 sm:w-24 flex-shrink-0">Bill To:</span>
                  <span className="break-words">{billToName}</span>
                </div>
                <div className="flex">
                  <span className="font-bold w-20 sm:w-24 flex-shrink-0">Address:</span>
                  <span className="whitespace-pre-line break-words">
                    {addressText || "-"}
                  </span>
                </div>
                <div className="flex">
                  <span className="font-bold w-20 sm:w-24 flex-shrink-0">Zip Code:</span>
                  <span>{invoice.pin || "-"}</span>
                </div>
                <div className="flex">
                  <span className="font-bold w-20 sm:w-24 flex-shrink-0">GSTIN:</span>
                  <span className="break-words">{invoice.gst_in || ""}</span>
                </div>
                <div className="flex">
                  <span className="font-bold w-20 sm:w-24 flex-shrink-0">Email:</span>
                  <span className="break-words">{invoice.email || "-"}</span>
                </div>
                <div className="flex">
                  <span className="font-bold w-20 sm:w-24 flex-shrink-0">Ph.No.:</span>
                  <span>{invoice.contact || "-"}</span>
                </div>
              </div>

              <div className="w-full sm:w-1/2 space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
                <div className="flex justify-start sm:justify-end">
                  <span className="font-bold w-24 sm:w-32 flex-shrink-0">Invoice:</span>
                  <span className="sm:w-48 truncate">{invoiceNo}</span>
                </div>
                <div className="flex justify-start sm:justify-end">
                  <span className="font-bold w-24 sm:w-32 flex-shrink-0">
                    Invoice Date:
                  </span>
                  <span className="sm:w-48">{formatDate(invoice.created_on)}</span>
                </div>
                <div className="flex justify-start sm:justify-end">
                  <span className="font-bold w-24 sm:w-32 flex-shrink-0">Due Date:</span>
                  <span className="sm:w-48">{formatDate(invoice.created_on)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="px-2 sm:px-8 py-3 sm:py-4 relative overflow-x-auto">
            <table className="w-full border-collapse border border-gray-800 min-w-[600px]">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-800 px-2 sm:px-4 py-2 text-left text-xs sm:text-sm font-bold">
                    ID
                  </th>
                  <th className="border border-gray-800 px-2 sm:px-4 py-2 text-left text-xs sm:text-sm font-bold">
                    DESCRIPTION
                  </th>
                  <th className="border border-gray-800 px-2 sm:px-4 py-2 text-center text-xs sm:text-sm font-bold">
                    QTY
                  </th>
                  <th className="border border-gray-800 px-2 sm:px-4 py-2 text-left text-xs sm:text-sm font-bold">
                    UNIT PRICE
                  </th>
                  <th className="border border-gray-800 px-2 sm:px-4 py-2 text-right text-xs sm:text-sm font-bold">
                    AMOUNT({displayCurrency === "INR" ? "inr" : "usd"})
                  </th>
                </tr>
              </thead>

              <tbody>
                <tr>
                  <td className="border border-gray-800 px-2 sm:px-4 py-2 text-xs sm:text-sm">
                    1
                  </td>
                  <td className="border border-gray-800 px-2 sm:px-4 py-2 text-xs sm:text-sm uppercase">
                    {planName}
                  </td>
                  <td className="border border-gray-800 px-2 sm:px-4 py-2 text-xs sm:text-sm text-center">
                    {quantity}
                  </td>
                  <td className="border border-gray-800 px-2 sm:px-4 py-2 text-xs sm:text-sm">
                    {formatInvoiceMoney(unitPrice, displayCurrency)}
                  </td>
                  <td className="border border-gray-800 px-2 sm:px-4 py-2 text-xs sm:text-sm text-right">
                    {formatInvoiceMoney(planPrice, displayCurrency)}
                  </td>
                </tr>

                <tr>
                  <td className="border border-gray-800 px-2 sm:px-4 py-2" colSpan={4}>
                    <span className="float-right text-xs sm:text-sm">Discount</span>
                  </td>
                  <td className="border border-gray-800 px-2 sm:px-4 py-2 text-right text-xs sm:text-sm">
                    - {formatInvoiceMoney(discount, displayCurrency)}
                  </td>
                </tr>

                {[...Array(4)].map((_, i) => (
                  <tr key={`empty-${i}`}>
                    <td className="border border-gray-800 px-2 sm:px-4 py-3 sm:py-5">
                      &nbsp;
                    </td>
                    <td className="border border-gray-800 px-2 sm:px-4 py-3 sm:py-5">
                      &nbsp;
                    </td>
                    <td className="border border-gray-800 px-2 sm:px-4 py-3 sm:py-5">
                      &nbsp;
                    </td>
                    <td className="border border-gray-800 px-2 sm:px-4 py-3 sm:py-5">
                      &nbsp;
                    </td>
                    <td className="border border-gray-800 px-2 sm:px-4 py-3 sm:py-5">
                      &nbsp;
                    </td>
                  </tr>
                ))}

                <tr>
                  <td className="border border-gray-800 px-2 sm:px-4 py-2" colSpan={4}>
                    <span className="float-right font-semibold text-xs sm:text-sm">
                      Taxable Value
                    </span>
                  </td>
                  <td className="border border-gray-800 px-2 sm:px-4 py-2 text-right text-xs sm:text-sm">
                    {formatInvoiceMoney(subtotalAfterDiscount, displayCurrency)}
                  </td>
                </tr>

                {showIGST && (
                  <tr>
                    <td className="border border-gray-800 px-2 sm:px-4 py-2" colSpan={4}>
                      <span className="float-right text-xs sm:text-sm">IGST @ 18%</span>
                    </td>
                    <td className="border border-gray-800 px-2 sm:px-4 py-2 text-right text-xs sm:text-sm">
                      {formatInvoiceMoney(igst, displayCurrency)}
                    </td>
                  </tr>
                )}

                {showCGSTSGST && (
                  <>
                    <tr>
                      <td className="border border-gray-800 px-2 sm:px-4 py-2" colSpan={4}>
                        <span className="float-right text-xs sm:text-sm">CGST @ 9%</span>
                      </td>
                      <td className="border border-gray-800 px-2 sm:px-4 py-2 text-right text-xs sm:text-sm">
                        {formatInvoiceMoney(cgst, displayCurrency)}
                      </td>
                    </tr>

                    <tr>
                      <td className="border border-gray-800 px-2 sm:px-4 py-2" colSpan={4}>
                        <span className="float-right text-xs sm:text-sm">SGST @ 9%</span>
                      </td>
                      <td className="border border-gray-800 px-2 sm:px-4 py-2 text-right text-xs sm:text-sm">
                        {formatInvoiceMoney(sgst, displayCurrency)}
                      </td>
                    </tr>
                  </>
                )}

                <tr>
                  <td className="border border-gray-800 px-2 sm:px-4 py-2" colSpan={4}>
                    <span className="float-right font-bold text-xs sm:text-sm">Total</span>
                  </td>
                  <td className="border border-gray-800 px-2 sm:px-4 py-2 text-right font-bold text-xs sm:text-sm">
                    {formatInvoiceMoney(totalAmount, displayCurrency)}
                  </td>
                </tr>
              </tbody>
            </table>

            <div className="pointer-events-none absolute left-[20%] sm:left-[24%] top-[40%] sm:top-[52%] -translate-x-1/2 -translate-y-1/2 rotate-[-15deg] border-2 sm:border-4 border-red-600 px-3 sm:px-6 py-1 sm:py-2 text-xl sm:text-3xl font-bold text-red-600 opacity-75 print:opacity-100 whitespace-nowrap">
              PAID
            </div>
          </div>

          <div className="px-4 sm:px-8 py-3 sm:py-4">
            <p className="text-xs sm:text-sm">
              <span className="font-bold">Total In Words:</span> {totalInWords}
            </p>
          </div>

          <div className="px-4 sm:px-8 py-4 sm:py-6 border-t border-gray-300 mt-4 sm:mt-8">
            <p className="text-[10px] sm:text-xs mb-3 sm:mb-4">
              <span className="font-bold">T&C:</span>{" "}
              <a
                href={company.footerTerms}
                className="text-blue-600 underline break-all"
                target="_blank"
                rel="noreferrer"
              >
                {company.footerTerms}
              </a>
            </p>

            <p className="text-[10px] sm:text-xs text-center text-gray-600">
              This is computer generated invoice for Project SMTPMaster (smtpmaster.com).
            </p>

            <div className="flex justify-center mt-3 sm:mt-4">
              <div className="relative w-[100px] sm:w-[140px] mb-[-1.5rem] sm:mb-[-2rem]">
                <Image
                  src="/LoginLogo.png"
                  alt="SMTP Master"
                  width={120}
                  height={32}
                  className="w-[10rem] sm:w-[13rem] object-contain"
                  priority
                  unoptimized
                />
              </div>
            </div>
          </div>

          <div className="px-4 sm:px-8 py-4 text-center sm:text-right no-print">
            <button
              onClick={() => handelDwonload(id)}
              disabled={downloading}
              className={`px-4 sm:px-6 py-2 rounded transition-colors text-sm sm:text-base w-full sm:w-auto inline-flex items-center justify-center gap-2 ${
                downloading
                  ? "bg-gray-400 text-white cursor-not-allowed"
                  : "bg-blue-600 text-white hover:bg-blue-700"
              }`}
            >
              {downloading && (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              )}
              {downloading ? "Downloading..." : "Download Invoice"}
            </button>
          </div>
        </div>
      )}

      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }

          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
        }

        @media (min-width: 475px) {
          .xs\\:block {
            display: block;
          }
        }
      `}</style>
    </div>
  );
}