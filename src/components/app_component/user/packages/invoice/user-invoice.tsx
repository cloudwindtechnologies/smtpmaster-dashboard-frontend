"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  X,
  AlertCircle,
  CheckCircle2,
  Mail,
  Clock,
  Calendar,
  Cpu,
  MapPin,
  User,
  Building,
  Globe,
  Home,
  Percent,
  CreditCard,
  BadgeCheck,
  ShieldCheck,
  Wallet,
  ChevronDown,
  Phone,
  AwardIcon,
  BrickWallShieldIcon,
  ClockCheckIcon,
} from "lucide-react";
import { token } from "../../../common/http";
import { useUser } from "@/app/context/UserContext";
import { showToast } from "@/components/app_component/common/toastHelper";

declare global {
  interface Window {
    Razorpay: any;
  }
}

type ApiResponse = { data: PackageType | null; code?: number; message?: string };

type PackageType = {
  id: number;
  package_name: string;
  featured_image: string | null;
  package_valid_days: string | number | null;
  mail_limit: number | null;
  mail_per_hour: number | null;
  features: string | null;
  dedicated_ip: boolean | string | number | null;
  free_sending_app: boolean | string | number | null;
  free_sending_domain: boolean | string | number | null;
  price: string | number | null;
  hide_buy_btn: string | number | boolean | null;
  yearly_price: string | number | null;
  package_subheading: string | null;
  amenities_heading: string | null;
  all_amenities: string | null;
  all_block_amenities: string | null;
};

type ApplyCouponResponse = {
  code: number;
  message?: string;
  error?: any;
  data?: { price: number | string; payable_amount: number | string; coupon: string };
};

type CrsResponse = {
  code: number;
  data?: { id: number; type: string; value: number | string };
  message?: string;
};

type SaveBillingResponse = {
  code: number;
  message?: string;
  filldata?: {
    first_name?: string;
    last_name?: string;
    email?: string;
    country?: string;
    address?: string;
    zipcode?: string;
    city?: string;
    state?: string;
    user_type?: "individual" | "business" | null;
    company_name?: string | null;
    gst_in?: string | null;
    phone?: string | null;
    mobile?: string | null;
    login_user_mobile?: string | null;
  };
  errors?: Record<string, string[]>;
};

type RazorpayKeyResponse = {
  success: boolean;
  message?: string;
  apikey?: string;
};

type SubscribeResponse = {
  code: number;
  message?: string;
  error?: string;
  data?: {
    package_name?: string;
    package_id?: number;
    razorpay_payment_id?: string;
    invoice_id?: string;
  };
};

type FormErrors = Partial<Record<keyof BillingForm | "customerType", string>>;
type ToastType = "error" | "success" | "info";

type ToastState = {
  show: boolean;
  type: ToastType;
  message: string;
};

function toBool(v: any): boolean {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v === 1;
  if (typeof v === "string") return v === "1" || v.toLowerCase() === "true";
  return false;
}

function splitList(v?: string | null) {
  if (!v) return [];
  return v
    .split(/\r?\n|,|\|/g)
    .map((s) => s.trim())
    .filter(Boolean);
}

function toNum(v: any, fallback: number = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

async function safeJson(res: Response) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { __raw: text };
  }
}

function firstValidationMsg(err: any): string {
  const bag = err?.error || err?.errors;
  if (bag && typeof bag === "object" && !Array.isArray(bag)) {
    const k = Object.keys(bag)[0];
    const msg = bag?.[k]?.[0];
    if (msg) return msg;
  }
  if (typeof err?.error === "string") return err.error;
  if (typeof err?.message === "string") return err.message;
  return "";
}

function roundMoney(n: number): number {
  return Math.round(Number(n) || 0);
}

function money(n: number) {
  return roundMoney(n).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function normalizeGstin(input: string) {
  return String(input || "").trim().toUpperCase();
}

function isValidGSTIN(input: string) {
  const gst = normalizeGstin(input);
  return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(gst);
}

type PaymentMethod = "razorpay_card" | "crypto";
const CRYPTO_EXTRA_RATE = 0.32;

type CustomerType = "individual" | "business";

const READONLY_FIELDS = new Set<keyof BillingForm>([
  "zipCode",
  "country",
  "email",
  "lastName",
  "firstName",
  "phone",
]);

type BillingForm = {
  zipCode: string;
  country: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  customerType: CustomerType;
  companyName: string;
  addressLine1: string;
  city: string;
  state: string;
  gstin1: string;
};

const INDIA_STATES = [
  { value: "", label: "Select State" },
  { value: "Andhra Pradesh", label: "Andhra Pradesh" },
  { value: "Arunachal Pradesh", label: "Arunachal Pradesh" },
  { value: "Assam", label: "Assam" },
  { value: "Bihar", label: "Bihar" },
  { value: "Chhattisgarh", label: "Chhattisgarh" },
  { value: "Goa", label: "Goa" },
  { value: "Gujarat", label: "Gujarat" },
  { value: "Haryana", label: "Haryana" },
  { value: "Himachal Pradesh", label: "Himachal Pradesh" },
  { value: "Jharkhand", label: "Jharkhand" },
  { value: "Karnataka", label: "Karnataka" },
  { value: "Kerala", label: "Kerala" },
  { value: "Madhya Pradesh", label: "Madhya Pradesh" },
  { value: "Maharashtra", label: "Maharashtra" },
  { value: "Manipur", label: "Manipur" },
  { value: "Meghalaya", label: "Meghalaya" },
  { value: "Mizoram", label: "Mizoram" },
  { value: "Nagaland", label: "Nagaland" },
  { value: "Odisha", label: "Odisha" },
  { value: "Punjab", label: "Punjab" },
  { value: "Rajasthan", label: "Rajasthan" },
  { value: "Sikkim", label: "Sikkim" },
  { value: "Tamil Nadu", label: "Tamil Nadu" },
  { value: "Telangana", label: "Telangana" },
  { value: "Tripura", label: "Tripura" },
  { value: "Uttar Pradesh", label: "Uttar Pradesh" },
  { value: "Uttarakhand", label: "Uttarakhand" },
  { value: "West Bengal", label: "West Bengal" },
  { value: "Andaman and Nicobar Islands", label: "Andaman and Nicobar Islands" },
  { value: "Chandigarh", label: "Chandigarh" },
  { value: "Dadra and Nagar Haveli and Daman and Diu", label: "Dadra and Nagar Haveli and Daman and Diu" },
  { value: "Delhi", label: "Delhi" },
  { value: "Jammu and Kashmir", label: "Jammu and Kashmir" },
  { value: "Ladakh", label: "Ladakh" },
  { value: "Lakshadweep", label: "Lakshadweep" },
  { value: "Puducherry", label: "Puducherry" },
];

function normalizeCountry(input: any, fallback = "India") {
  const raw = String(input ?? "").trim();
  if (!raw) return fallback;
  const v = raw.toLowerCase();

  if (v === "usa" || v === "us" || v === "united states" || v === "united states of america") return "USA";
  if (v === "uk" || v === "u.k." || v === "united kingdom" || v === "great britain") return "UK";
  if (v === "india" || v === "in") return "India";

  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

function pickUserValue(u: any, keys: string[], fallback = "") {
  for (const k of keys) {
    const val = u?.[k];
    if (val !== undefined && val !== null && String(val).trim() !== "") return String(val);
  }
  return fallback;
}

function omitReadonlyForPayload(form: BillingForm) {
  const isIndia = normalizeCountry(form.country, "India") === "India";

  return {
    address: form.addressLine1 || "",
    zipcode: form.zipCode || "",
    city: form.city || "",
    state: isIndia ? form.state || "" : "",
    user_type: isIndia ? form.customerType : "",
    company_name: isIndia && form.customerType === "business" ? form.companyName || "" : "",
    gst_in: isIndia && form.customerType === "business" ? normalizeGstin(form.gstin1) : "",
  };
}

export default function PackageDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: userLoading } = useUser();

  const id = useMemo(() => String((params as any)?.id || ""), [params]);

  const [pkg, setPkg] = useState<PackageType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [billingForm, setBillingForm] = useState<BillingForm>({
    zipCode: "",
    country: "India",
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    customerType: "individual",
    companyName: "",
    addressLine1: "",
    city: "",
    state: "",
    gstin1: "",
  });

  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState("");
  const [toast, setToast] = useState<ToastState>({
    show: false,
    type: "info",
    message: "",
  });

  const fieldRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const [couponCode, setCouponCode] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState("");
  const [couponSuccess, setCouponSuccess] = useState("");
  const [discountData, setDiscountData] = useState<ApplyCouponResponse["data"] | null>(null);

  const [inrRate, setInrRate] = useState<number | null>(null);
  const [crsLoading, setCrsLoading] = useState(false);

  const [companyOpen, setCompanyOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("razorpay_card");
  const [billingSaving, setBillingSaving] = useState(false);

  const [razorpayKey, setRazorpayKey] = useState("");
  const [razorpayLoading, setRazorpayLoading] = useState(false);
  const [scriptReady, setScriptReady] = useState(false);
  const [paymentProcessing, setPaymentProcessing] = useState(false);

  const resolvedCountry = useMemo(() => {
    const u = user as any;
    const fromUser = normalizeCountry(
      pickUserValue(u, ["country", "login_user_country"], ""),
      ""
    );
    return fromUser || normalizeCountry(billingForm.country, "India");
  }, [user, billingForm.country]);

  const countryLower = resolvedCountry.trim().toLowerCase();
  const isIndia = countryLower === "india";
  const isBusiness = billingForm.customerType === "business";
  const cryptoAllowed = !isIndia;

  function hideToast() {
    setToast((prev) => ({ ...prev, show: false }));
  }

  useEffect(() => {
    if (!toast.show) return;
    const timer = setTimeout(() => {
      hideToast();
    }, 4500);
    return () => clearTimeout(timer);
  }, [toast.show]);

  function setFieldRef(name: string, el: HTMLDivElement | null) {
    fieldRefs.current[name] = el;
  }

  function scrollToField(name: string) {
    const el = fieldRefs.current[name];
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }

  function validateForm(): FormErrors {
    const errors: FormErrors = {};

    if (!billingForm.addressLine1.trim()) {
      errors.addressLine1 = "Address is required.";
    }

    if (!billingForm.city.trim()) {
      errors.city = "City is required.";
    }

    if (isIndia) {
      if (!billingForm.state.trim()) {
        errors.state = "State is required.";
      }

      if (!billingForm.customerType) {
        errors.customerType = "Customer type is required.";
      }

      if (billingForm.customerType === "business") {
        if (!billingForm.companyName.trim()) {
          errors.companyName = "Company name is required.";
        }

        if (!billingForm.gstin1.trim()) {
          errors.gstin1 = "GST number is required.";
        } else if (!isValidGSTIN(billingForm.gstin1)) {
          errors.gstin1 = "Please enter a valid GST number.";
        }
      }
    }

    return errors;
  }

  function applyBackendErrors(errors?: Record<string, string[]>): FormErrors {
    const mapped: FormErrors = {};
    if (!errors) return mapped;

    const mapKey = (key: string): keyof FormErrors | null => {
      switch (key) {
        case "address":
          return "addressLine1";
        case "city":
          return "city";
        case "state":
          return "state";
        case "user_type":
          return "customerType";
        case "company_name":
          return "companyName";
        case "gst_in":
          return "gstin1";
        default:
          return null;
      }
    };

    Object.keys(errors).forEach((k) => {
      const mk = mapKey(k);
      if (mk && errors[k]?.[0]) mapped[mk] = errors[k][0];
    });

    return mapped;
  }

  useEffect(() => {
    const existingScript = document.querySelector(
      'script[src="https://checkout.razorpay.com/v1/checkout.js"]'
    ) as HTMLScriptElement | null;

    if (existingScript) {
      setScriptReady(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => setScriptReady(true);
    script.onerror = () => setScriptReady(false);
    document.body.appendChild(script);

    return () => {};
  }, []);

  useEffect(() => {
    const t = token();
    if (!t) return;

    let cancelled = false;

    (async () => {
      try {
        setRazorpayLoading(true);

        const res = await fetch("/api/all-packages/payment/rezpaykey", {
          method: "GET",
          headers: {
            Accept: "application/json",
            authorization: `Bearer ${t}`,
          },
          cache: "no-store",
        });

        const json: RazorpayKeyResponse = await safeJson(res);
        console.log(json);
        
        if (!res.ok || json?.success !== true || !json?.apikey) {
          throw new Error(json?.message || "Unable to fetch Razorpay key.");
        }

        if (!cancelled) {
          setRazorpayKey(json.apikey);
        }
      } catch (e: any) {
        if (!cancelled) {
          setRazorpayKey("");
          showToast("error", e?.message || "Unable to fetch Razorpay key.");
        }
      } finally {
        if (!cancelled) setRazorpayLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (isIndia && paymentMethod === "crypto") setPaymentMethod("razorpay_card");
  }, [isIndia, paymentMethod]);

  useEffect(() => {
    if (!isIndia) {
      setBillingForm((prev) => ({
        ...prev,
        customerType: "individual",
        companyName: "",
        gstin1: "",
        state: "",
      }));
      setFormErrors((prev) => {
        const next = { ...prev };
        delete next.customerType;
        delete next.companyName;
        delete next.gstin1;
        delete next.state;
        return next;
      });
    }
  }, [isIndia]);

  useEffect(() => {
    if (isIndia && !isBusiness) {
      setBillingForm((prev) => ({
        ...prev,
        companyName: "",
        gstin1: "",
      }));
      setFormErrors((prev) => {
        const next = { ...prev };
        delete next.companyName;
        delete next.gstin1;
        return next;
      });
    }
  }, [isIndia, isBusiness]);

  useEffect(() => {
    if (userLoading) return;
    if (!user) return;

    const u = user as any;

    let savedBilling: Partial<BillingForm> = {};
    try {
      const raw = localStorage.getItem("sm_billing_v1");
      if (raw) savedBilling = JSON.parse(raw);
    } catch {}

    const prefill = {
      email: pickUserValue(u, ["login_user_email", "email"], ""),
      firstName: pickUserValue(u, ["login_user_first_name", "first_name", "firstname", "firstName"], ""),
      lastName: pickUserValue(u, ["login_user_last_name", "last_name", "lastname", "lastName"], ""),
      zipCode: pickUserValue(u, ["zipcode", "zip", "zip_code", "postal_code", "pin", "pincode"], ""),
      country: normalizeCountry(pickUserValue(u, ["country", "login_user_country"], ""), "India"),
      city: pickUserValue(u, ["city"], ""),
      addressLine1: pickUserValue(u, ["address", "addressLine1", "address_line1"], ""),
      state: pickUserValue(u, ["state", "province"], ""),
      companyName: pickUserValue(u, ["company_name", "companyName"], ""),
      gstin1: pickUserValue(u, ["gst_in", "gstin", "gstin1", "gst_number"], ""),
      customerType: (pickUserValue(u, ["user_type"], "") as CustomerType) || "individual",
      phone: pickUserValue(u, ["login_user_mobile", "mobile", "phone"], ""),
    };

    setBillingForm((p) => ({
      ...p,
      email: prefill.email || savedBilling.email || p.email || "",
      firstName: prefill.firstName || savedBilling.firstName || p.firstName || "",
      lastName: prefill.lastName || savedBilling.lastName || p.lastName || "",
      zipCode: prefill.zipCode || savedBilling.zipCode || p.zipCode || "",
      country: prefill.country || savedBilling.country || p.country || "India",
      city: savedBilling.city || prefill.city || p.city || "",
      addressLine1: savedBilling.addressLine1 || prefill.addressLine1 || p.addressLine1 || "",
      state: savedBilling.state || prefill.state || p.state || "",
      companyName: savedBilling.companyName || prefill.companyName || p.companyName || "",
      gstin1: savedBilling.gstin1 || prefill.gstin1 || p.gstin1 || "",
      customerType:
        savedBilling.customerType ||
        prefill.customerType ||
        p.customerType ||
        "individual",
      phone: prefill.phone || savedBilling.phone || p.phone || "",
    }));
  }, [userLoading, user]);

  useEffect(() => {
    if (!isIndia) {
      setInrRate(null);
      return;
    }

    const t = token();
    if (!t) {
      setInrRate(null);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        setCrsLoading(true);

        const res = await fetch(`/api/all-packages/crs`, {
          method: "GET",
          headers: {
            Accept: "application/json",
            authorization: `Bearer ${t}`,
          },
          cache: "no-store",
        });

        const json: CrsResponse = await safeJson(res);
        if (!res.ok) throw new Error(json?.message || `CRS request failed (${res.status})`);

        const rate = toNum(json?.data?.value, 0);
        if (!cancelled) setInrRate(rate > 0 ? rate : null);
      } catch {
        if (!cancelled) setInrRate(null);
      } finally {
        if (!cancelled) setCrsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isIndia]);

  useEffect(() => {
    if (!id) return;

    let cancelled = false;

    const loadPackage = async () => {
      try {
        setLoading(true);
        setError("");
        const res = await fetch(`/api/all-packages/userpackageById?id=${id}`, {
          method: "GET",
          headers: {
            Accept: "application/json",
            authorization: `Bearer ${token()}`,
          },
          cache: "no-store",
        });

        const json = (await res.json().catch(() => ({}))) as ApiResponse;
        if (!res.ok) throw new Error(json?.message || "Failed to load package");
        if (!json?.data) throw new Error("Package not found");
        if (!cancelled) setPkg(json.data);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Something went wrong");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadPackage();

    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    setCouponError("");
    setCouponSuccess("");
    setDiscountData(null);
  }, [couponCode]);

  const baseUsd = toNum(pkg?.price, 0);
  const payableUsd = discountData ? toNum(discountData.payable_amount, baseUsd) : baseUsd;

  const currencySymbol = isIndia ? "₹" : "$";
  const currencyLabel = isIndia ? "INR" : "USD";

  const toDisplay = (usd: number) => {
    if (isIndia) return usd * (inrRate || 0);
    return usd;
  };

const planPrice = roundMoney(toDisplay(baseUsd));
const subTotalAfterCoupon = roundMoney(toDisplay(payableUsd));
const discountAmount = roundMoney(Math.max(0, planPrice - subTotalAfterCoupon));
const paymentFee = roundMoney(
  !isIndia && paymentMethod === "crypto"
    ? subTotalAfterCoupon * CRYPTO_EXTRA_RATE
    : 0
);
const tax = roundMoney(
  isIndia ? (subTotalAfterCoupon + paymentFee) * 0.18 : 0
);
const total = roundMoney(subTotalAfterCoupon + paymentFee + tax);

  const featureList = splitList(pkg?.features);
  const hideBuy = toBool(pkg?.hide_buy_btn);

  async function applyCoupon() {
    if (!pkg) return;
    const code = couponCode.trim();
    if (!code) {
      setCouponError("Please enter a coupon code.");
      return;
    }

    setCouponLoading(true);
    setCouponError("");
    setCouponSuccess("");
    setDiscountData(null);

    try {
      const t = token();
      if (!t) {
        setCouponError("Please login to apply a coupon.");
        return;
      }

      const res = await fetch("/api/all-packages/applyCouponCode", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          authorization: `Bearer ${t}`,
        },
        body: JSON.stringify({ plan_id: pkg.id, couponcode: code }),
      });

      const json = (await res.json().catch(() => ({}))) as ApplyCouponResponse;
      
      if (json?.code !== 200 || !json?.data) throw new Error(json?.message || "Coupon code is not valid or expired");

      setDiscountData(json.data);
      setCouponSuccess(json.message || `Coupon "${code}" applied successfully.`);
    } catch (e: any) {
      setCouponError(e?.message || "Coupon code is not valid or expired");
    } finally {
      setCouponLoading(false);
    }
  }

  function clearCoupon() {
    setCouponCode("");
    setCouponError("");
    setCouponSuccess("");
    setDiscountData(null);
  }

  const handleBillingInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target as any;
    if (READONLY_FIELDS.has(name)) return;

    const nextValue = name === "gstin1" ? normalizeGstin(value) : value;

    setBillingForm((prev) => ({ ...prev, [name]: nextValue }));
    setSaveError("");
    setSaveSuccess("");

    setFormErrors((prev) => {
      const next = { ...prev };
      delete next[name as keyof FormErrors];
      return next;
    });

    if (name === "gstin1" && billingForm.customerType === "business") {
      if (!String(value).trim()) {
        showToast("error", "If u dont have gst then please select the individual mode.");
      }
    }
  };

  function setCustomerType(type: CustomerType) {
    setBillingForm((prev) => ({
      ...prev,
      customerType: type,
      companyName: type === "business" ? prev.companyName : "",
      gstin1: type === "business" ? prev.gstin1 : "",
    }));

    setFormErrors((prev) => {
      const next = { ...prev };
      delete next.customerType;
      if (type === "individual") {
        delete next.companyName;
        delete next.gstin1;
      }
      return next;
    });

    setSaveError("");
    setSaveSuccess("");

    if (type === "business" && !billingForm.gstin1.trim()) {
      showToast("info", "If u dont have gst then please select the individual mode.");
    }
  }

  async function saveBilling(): Promise<boolean> {
    setSaveError("");
    setSaveSuccess("");

    const clientErrors = validateForm();
    setFormErrors(clientErrors);

    if (Object.keys(clientErrors).length > 0) {
      const firstErrorKey = Object.keys(clientErrors)[0];
      scrollToField(firstErrorKey);

      if (billingForm.customerType === "business" && !billingForm.gstin1.trim()) {
        showToast("error", "If u dont have gst then please select the individual mode.");
      } else if (billingForm.customerType === "business" && billingForm.gstin1.trim() && !isValidGSTIN(billingForm.gstin1)) {
        showToast("error", "Please enter a valid GST number.");
      }

      return false;
    }

    try {
      const t = token();

      if (!t) {
        setSaveError("Please login first.");
        showToast("error", "Please login first.");
        return false;
      }

      setBillingSaving(true);

      const payload = omitReadonlyForPayload(billingForm);

      const res = await fetch("/api/all-packages/payment/savebillingaddress", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          authorization: `Bearer ${t}`,
        },
        body: JSON.stringify(payload),
      });

      const json: SaveBillingResponse = await safeJson(res);

      if (!res.ok || json?.code !== 200) {
        const mappedErrors = applyBackendErrors(json?.errors);
        if (Object.keys(mappedErrors).length > 0) {
          setFormErrors(mappedErrors);
          const firstErrorKey = Object.keys(mappedErrors)[0];
          scrollToField(firstErrorKey);
        }

        const message =
          json?.message ||
          (json?.errors ? Object.values(json.errors)?.[0]?.[0] : "") ||
          "Failed to save billing address.";

        setSaveError(message);
        showToast("error", message);

        if (
          (mappedErrors.gstin1 || json?.errors?.gst_in) &&
          billingForm.customerType === "business" &&
          !billingForm.gstin1.trim()
        ) {
          showToast("error", "If u dont have gst then please select the individual mode.");
        }

        return false;
      }

      const fill = json?.filldata;

      if (fill) {
        const nextForm: BillingForm = {
          zipCode: fill.zipcode || billingForm.zipCode || "",
          country: normalizeCountry(fill.country || billingForm.country || "India"),
          firstName: fill.first_name || billingForm.firstName || "",
          lastName: fill.last_name || billingForm.lastName || "",
          email: fill.email || billingForm.email || "",
          addressLine1: fill.address || "",
          city: fill.city || "",
          state: fill.state || "",
          customerType:
            fill.user_type === "business" || fill.user_type === "individual"
              ? fill.user_type
              : "individual",
          companyName: fill.company_name || "",
          gstin1: normalizeGstin(fill.gst_in || ""),
          phone:
            fill.phone ||
            fill.mobile ||
            fill.login_user_mobile ||
            billingForm.phone ||
            "",
        };

        setBillingForm(nextForm);
        localStorage.setItem("sm_billing_v1", JSON.stringify(nextForm));
        localStorage.setItem(
          "sm_billing_payload_v1",
          JSON.stringify({
            address: fill.address || "",
            zipcode: fill.zipcode || "",
            city: fill.city || "",
            state: fill.state || "",
            user_type: fill.user_type || "",
            company_name: fill.company_name || "",
            gst_in: normalizeGstin(fill.gst_in || ""),
          })
        );
      } else {
        localStorage.setItem("sm_billing_v1", JSON.stringify(billingForm));
        localStorage.setItem(
          "sm_billing_payload_v1",
          JSON.stringify(omitReadonlyForPayload(billingForm))
        );
      }

      setFormErrors({});
      const successMsg = json?.message || "Billing address updated successfully.";
      setSaveSuccess(successMsg);
      showToast("success", successMsg);
      return true;
    } catch {
      setSaveError("Unable to save billing address.");
      showToast("error", "Unable to save billing address.");
      return false;
    } finally {
      setBillingSaving(false);
    }
  }

  function persistBillingForCheckout() {
    try {
      localStorage.setItem("sm_billing_v1", JSON.stringify(billingForm));
      localStorage.setItem(
        "sm_billing_payload_v1",
        JSON.stringify(omitReadonlyForPayload(billingForm))
      );
    } catch {}
  }

  async function callSubscribeApi(razorpayPaymentId: string) {
    if (!pkg) throw new Error("Package not found.");

    const t = token();
    if (!t) throw new Error("Please login first.");

    const payload: Record<string, any> = {
      razorpay_payment_id: razorpayPaymentId,
      plan_id: pkg.id,
      discount: roundMoney(discountAmount),
      tax: roundMoney(tax),
      amount: roundMoney(total),
    };

    if (couponCode.trim()) {
      payload.couponcode = couponCode.trim();
    }

    const res = await fetch("/api/all-packages/payment/subscribe", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        authorization: `Bearer ${t}`,
      },
      body: JSON.stringify(payload),
    });

    const json: SubscribeResponse = await safeJson(res);

    if (!res.ok || json?.code !== 200) {
      throw new Error(json?.error || json?.message || "Subscription failed.");
    }

    return json;
  }

  async function openRazorpayCheckout() {
    if (!pkg) return;

    if (!scriptReady) {
      showToast("error", "Razorpay script is not loaded yet.");
      return;
    }

    if (!razorpayKey) {
      showToast("error", "Razorpay key not found.");
      return;
    }

    const amountInSmallestUnit = Math.round(total * 100);

    const options = {
      key: razorpayKey,
      amount: amountInSmallestUnit,
      currency: currencyLabel,
      name: "SMTPMaster",
      description: `${pkg.package_name} Subscription`,
      image: "",
      prefill: {
        name: `${billingForm.firstName} ${billingForm.lastName}`.trim(),
        email: billingForm.email,
        contact: billingForm.phone,
      },
      notes: {
        plan_id: String(pkg.id),
        package_name: pkg.package_name,
        couponcode: couponCode.trim() || "",
      },
      theme: {
        color: "#f97316",
      },
      handler: async function (response: any) {
        try {
          setPaymentProcessing(true);

          const razorpayPaymentId = response?.razorpay_payment_id;
          if (!razorpayPaymentId) {
            throw new Error("Razorpay payment ID not received.");
          }

          const subscribeRes = await callSubscribeApi(razorpayPaymentId);

         const invoiceId = subscribeRes?.data?.invoice_id || "";

          showToast(
            "success",
            subscribeRes?.message || "Payment successful and subscription activated."
          );

          setTimeout(() => {
            router.push(`/payment_success?invoice_id=${encodeURIComponent(invoiceId)}`);
          }, 1200);
        } catch (e: any) {
          showToast("error", e?.message || "Payment succeeded but subscription failed.");
        } finally {
          setPaymentProcessing(false);
        }
      },
      modal: {
        ondismiss: function () {
          showToast("info", "Payment popup closed.");
        },
      },
    };

    const razorpay = new window.Razorpay(options);

    razorpay.on("payment.failed", function (response: any) {
      const msg =
        response?.error?.description ||
        response?.error?.reason ||
        "Payment failed. Please try again.";
      showToast("error", msg);
    });

    razorpay.open();
  }

  const canPay =
    !hideBuy &&
    (!isIndia || (isIndia && !!inrRate)) &&
    !!razorpayKey &&
    scriptReady &&
    !razorpayLoading;

  async function payNow() {
    if (!pkg) return;
    if (!canPay) return;

    if (!cryptoAllowed && paymentMethod === "crypto") {
      showToast("error", "Crypto is not available for India.");
      return;
    }

    persistBillingForCheckout();

    const billingSaved = await saveBilling();
    if (!billingSaved) return;

    if (paymentMethod === "crypto") {
      showToast("info", "Crypto flow is not connected yet.");
      return;
    }

    await openRazorpayCheckout();
  }

  if (loading || userLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-600">
          <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
          <span className="text-sm">Loading...</span>
        </div>
      </div>
    );
  }

  if (error || !pkg) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 p-6 shadow-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
            <div>
              <div className="font-medium text-slate-900">{error || "Package Not Found"}</div>
              <button
                onClick={() => router.back()}
                className="mt-4 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Go Back
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <ToastBanner toast={toast} onClose={hideToast} />

      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
        <div className="mx-auto max-w-6xl px-4 py-8">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-4">
              <Card>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-xl font-semibold text-slate-900">{pkg.package_name}</div>
                    <div className="text-sm text-slate-500 mt-0.5">
                      {pkg.package_subheading || "Plan name and plan price"}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xs text-slate-500">Total ({currencyLabel})</div>
                    <div className="text-2xl font-bold text-blue-600">
                      {currencySymbol}
                      {money(total)}
                    </div>
                  </div>
                </div>
              </Card>

              <Card>
                <div className="text-sm font-medium text-slate-700 mb-3">Plan Details</div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <MiniStat icon={<Calendar className="h-4 w-4" />} label="Validity" value={pkg.package_valid_days ? `${pkg.package_valid_days} days` : "—"} />
                  <MiniStat icon={<Mail className="h-4 w-4" />} label="Mail Limit" value={pkg.mail_limit?.toLocaleString() ?? "—"} />
                  <MiniStat icon={<Clock className="h-4 w-4" />} label="Per Hour" value={String(pkg.mail_per_hour ?? "—")} />
                  <MiniStat icon={<Cpu className="h-4 w-4" />} label="IP Pool" value={toBool(pkg.dedicated_ip) ? "Dedicated" : "Shared"} />
                </div>
              </Card>

              <Card>
                <div className="text-sm font-medium text-slate-700 mb-3">Key Feature</div>
                {featureList.length ? (
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {featureList.map((f, i) => (
                      <div key={i} className="flex items-start gap-2 rounded-xl border border-slate-100 bg-white p-3">
                        <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                        <span className="text-sm text-slate-700">{f}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-slate-500">—</div>
                )}
              </Card>

              {/* <Card>
                <button
                  type="button"
                  onClick={() => setCompanyOpen((v) => !v)}
                  className="w-full flex items-center justify-between gap-3 text-left"
                >
                  <div>
                    <div className="text-sm font-medium text-slate-700">Our Company Address</div>
                    <div className="text-xs text-slate-500 mt-0.5">SMTPMaster • West Bengal, Kolkata</div>
                  </div>
                  <ChevronDown className={`h-4 w-4 text-slate-500 transition-transform ${companyOpen ? "rotate-180" : ""}`} />
                </button>

                {companyOpen && (
                  <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 leading-6">
                    <div className="font-semibold text-slate-900">SMTPMaster</div>
                    <div>West Bengal</div>
                    <div>Kolkata</div>
                  </div>
                )}
              </Card> */}

              <Card>
                <div className="text-sm font-medium text-slate-700 mb-3">Billing Address</div>

                {saveError && (
                  <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <span>{saveError}</span>
                    </div>
                  </div>
                )}

                {saveSuccess && (
                  <div className="mb-4 rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-700">
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <span>{saveSuccess}</span>
                    </div>
                  </div>
                )}

                {isIndia && (
                  <div ref={(el) => setFieldRef("customerType", el)} className="mb-5">
                    <div className="mb-2 text-xs font-medium text-slate-600">Customer Type</div>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setCustomerType("individual")}
                        className={`rounded-xl border px-4 py-3 text-sm font-medium transition-all ${
                          billingForm.customerType === "individual"
                            ? "border-blue-600 bg-blue-50 text-blue-700"
                            : formErrors.customerType
                            ? "border-red-400 bg-red-50 text-red-700"
                            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        Individual
                      </button>

                      <button
                        type="button"
                        onClick={() => setCustomerType("business")}
                        className={`rounded-xl border px-4 py-3 text-sm font-medium transition-all ${
                          billingForm.customerType === "business"
                            ? "border-blue-600 bg-blue-50 text-blue-700"
                            : formErrors.customerType
                            ? "border-red-400 bg-red-50 text-red-700"
                            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        Business
                      </button>
                    </div>
                    {formErrors.customerType && (
                      <p className="mt-1 text-xs text-red-600">{formErrors.customerType}</p>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field
                    refSetter={setFieldRef}
                    error={formErrors.firstName}
                    icon={<User className="h-4 w-4" />}
                    label="First Name"
                    name="firstName"
                    value={billingForm.firstName}
                    onChange={handleBillingInputChange as any}
                    readOnly
                  />

                  <Field
                    refSetter={setFieldRef}
                    error={formErrors.lastName}
                    icon={<User className="h-4 w-4" />}
                    label="Last Name"
                    name="lastName"
                    value={billingForm.lastName}
                    onChange={handleBillingInputChange as any}
                    readOnly
                  />

                  <Field
                    refSetter={setFieldRef}
                    error={formErrors.email}
                    icon={<Mail className="h-4 w-4" />}
                    label="Email"
                    name="email"
                    type="email"
                    value={billingForm.email}
                    onChange={handleBillingInputChange as any}
                    className="sm:col-span-2"
                    readOnly
                  />

                  <Field
                    refSetter={setFieldRef}
                    error={formErrors.phone}
                    icon={<Phone className="h-4 w-4" />}
                    label="Phone Number"
                    name="phone"
                    type="text"
                    value={billingForm.phone}
                    onChange={handleBillingInputChange as any}
                    className="sm:col-span-2"
                    readOnly
                  />

                  {isIndia && isBusiness && (
                    <Field
                      refSetter={setFieldRef}
                      error={formErrors.companyName}
                      icon={<Building className="h-4 w-4" />}
                      label="Company Name"
                      name="companyName"
                      value={billingForm.companyName}
                      onChange={handleBillingInputChange as any}
                      className="sm:col-span-2"
                    />
                  )}

                  {isIndia && isBusiness && (
                    <Field
                      refSetter={setFieldRef}
                      error={formErrors.gstin1}
                      icon={<Percent className="h-4 w-4" />}
                      label="GST Number"
                      name="gstin1"
                      value={billingForm.gstin1}
                      onChange={handleBillingInputChange as any}
                      className="sm:col-span-2"
                      placeholder="Example: 27ABCDE1234F1Z5"
                    />
                  )}

                  <Field
                    refSetter={setFieldRef}
                    error={formErrors.addressLine1}
                    icon={<Home className="h-4 w-4" />}
                    label="Address"
                    name="addressLine1"
                    value={billingForm.addressLine1}
                    onChange={handleBillingInputChange as any}
                    className="sm:col-span-2"
                  />

                  <Field
                    refSetter={setFieldRef}
                    error={formErrors.city}
                    icon={<MapPin className="h-4 w-4" />}
                    label="City"
                    name="city"
                    value={billingForm.city}
                    onChange={handleBillingInputChange as any}
                  />

                  <Field
                    refSetter={setFieldRef}
                    error={formErrors.zipCode}
                    icon={<MapPin className="h-4 w-4" />}
                    label="Zip Code"
                    name="zipCode"
                    value={billingForm.zipCode}
                    onChange={handleBillingInputChange as any}
                    readOnly
                  />

                  {isIndia && (
                    <SelectField
                      refSetter={setFieldRef}
                      error={formErrors.state}
                      icon={<MapPin className="h-4 w-4" />}
                      label="State"
                      name="state"
                      value={billingForm.state}
                      onChange={handleBillingInputChange as any}
                      options={INDIA_STATES}
                    />
                  )}

                  <Field
                    refSetter={setFieldRef}
                    error={formErrors.country}
                    icon={<Globe className="h-4 w-4" />}
                    label="Country"
                    name="country"
                    value={normalizeCountry(billingForm.country, "India")}
                    onChange={handleBillingInputChange as any}
                    readOnly
                  />
                </div>

                <div className="mt-6">
                  <button
                    type="button"
                    onClick={async () => {
                      await saveBilling();
                    }}
                    disabled={billingSaving}
                    className="w-full rounded-xl bg-black px-5 py-3.5 text-sm font-semibold text-white shadow-md hover:bg-orange-600 active:bg-orange-600 transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <span className="flex items-center justify-center gap-2">
                      {billingSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                      {billingSaving ? "Saving..." : "Save Billing Address"}
                    </span>
                  </button>
                </div>
              </Card>
            </div>

            <div className="space-y-4">
              {!hideBuy && (
                <div className="lg:sticky lg:top-6 space-y-4">
                  {!isIndia && (
                    <Card>
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium text-slate-700">Payment Method</div>
                        <div className="text-xs text-slate-500">Default: Razorpay (Card)</div>
                      </div>

                      <div className="mt-3 space-y-2">
                        <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3 cursor-pointer hover:bg-slate-50">
                          <input
                            type="radio"
                            name="pay_method"
                            className="mt-1"
                            checked={paymentMethod === "razorpay_card"}
                            onChange={() => setPaymentMethod("razorpay_card")}
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                              <CreditCard className="h-4 w-4 text-blue-600" />
                              Razorpay (Card)
                            </div>
                            <div className="text-xs text-slate-500 mt-0.5">Pay via Card / UPI / Netbanking</div>
                          </div>
                          {paymentMethod === "razorpay_card" && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
                              <ShieldCheck className="h-3 w-3" /> Selected
                            </span>
                          )}
                        </label>

                        <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3 cursor-pointer hover:bg-slate-50">
                          <input
                            type="radio"
                            name="pay_method"
                            className="mt-1"
                            checked={paymentMethod === "crypto"}
                            onChange={() => setPaymentMethod("crypto")}
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                              <Wallet className="h-4 w-4 text-purple-600" />
                              Crypto Payment
                            </div>
                            <div className="text-xs text-slate-500 mt-0.5">
                              Extra charge: <span className="font-semibold text-slate-700">+32%</span>
                            </div>
                          </div>
                        </label>
                      </div>

                      {!cryptoAllowed && (
                        <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-500">
                          Crypto is available only outside India.
                        </div>
                      )}
                    </Card>
                  )}

                  <Card>
                    <div className="text-sm font-medium text-slate-700 mb-3">Coupon</div>

                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input
                          value={couponCode}
                          onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                          placeholder="Enter coupon"
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-200 pr-9"
                          disabled={couponLoading}
                        />
                        {couponCode && (
                          <button
                            type="button"
                            onClick={() => setCouponCode("")}
                            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={applyCoupon}
                        disabled={couponLoading || !couponCode.trim()}
                        className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-medium text-white shadow-sm hover:bg-blue-700 active:bg-blue-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 min-w-[80px]"
                      >
                        {couponLoading ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "Apply"}
                      </button>
                    </div>

                    <div className="mt-3">
                      {couponError && (
                        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                          {couponError}
                        </div>
                      )}
                      {couponSuccess && discountData && (
                        <div className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-700">
                          <div className="flex items-start gap-2">
                            <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
                            <div className="flex-1">
                              {couponSuccess}
                              <div className="mt-1 text-xs text-green-600">Applied: {discountData.coupon}</div>
                            </div>
                            <button onClick={clearCoupon} className="text-xs text-red-600 hover:text-red-700 font-medium underline underline-offset-2">
                              Remove
                            </button>
                          </div>
                        </div>
                      )}
                      {!couponError && !(couponSuccess && discountData) && (
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-500">Coupon details will show here</div>
                      )}
                    </div>
                  </Card>

                  <Card>
                    <div className="flex items-center justify-center">
                      <div className="text-sm font-medium text-slate-700">Payment Summary</div>
                    </div>

                    <div className="mt-3 space-y-1">
                      <Row label="Plan price" value={`${currencySymbol}${money(planPrice)}`} />
                      <Row label="Discount" value={`- ${currencySymbol}${money(discountAmount)}`} muted={discountAmount === 0} />
                      <div className="my-2 border-t border-slate-100" />
                      <Row label="Subtotal (after coupon)" value={`${currencySymbol}${money(subTotalAfterCoupon)}`} />
                      <Row
                        label={!isIndia && paymentMethod === "crypto" ? "Payment fee (+32% crypto)" : "Payment fee"}
                        value={paymentFee > 0 ? `+ ${currencySymbol}${money(paymentFee)}` : `${currencySymbol}${money(0)}`}
                        muted={paymentFee === 0}
                      />
                      <div className="my-2 border-t border-slate-100" />
                      <Row label={isIndia ? "GST (18%)" : "Tax"} value={`${currencySymbol}${money(tax)}`} muted={!isIndia} />
                      <Row label="Total" value={`${currencySymbol}${money(total)}`} strong />
                    </div>

                    
                  </Card>

                  <SecureCheckoutCard />
                </div>
              )}
            </div>
          </div>

          {!hideBuy && (
            <div className="mt-8">
              <button
                type="button"
                onClick={payNow}
                disabled={!canPay || paymentProcessing || billingSaving}
                className={`w-full rounded-xl px-6 py-4 text-lg font-semibold text-white shadow-lg transition-all duration-200 transform focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${
                  canPay && !paymentProcessing && !billingSaving
                    ? "bg-orange-500 hover:shadow-xl hover:bg-orange-600  active:bg-orange-600 hover:scale-[1.02] active:scale-[0.98]"
                    : "bg-slate-300 cursor-not-allowed"
                }`}
              >
                <span className="flex items-center justify-center gap-3">
                  {paymentProcessing ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <CreditCard className="h-5 w-5" />
                  )}

                  {paymentProcessing
                    ? "Processing payment..."
                    : isIndia && !inrRate
                    ? "Waiting for INR rate..."
                    : razorpayLoading
                    ? "Loading Razorpay..."
                    : `Pay Now — ${currencySymbol}${money(total)}`}
                </span>
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <section className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">{children}</section>;
}

function MiniStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <span className="text-slate-400">{icon}</span>
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold text-slate-900">{value}</div>
    </div>
  );
}

function Row({ label, value, muted, strong }: { label: string; value: string; muted?: boolean; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between text-sm py-1">
      <div className={muted ? "text-slate-400" : strong ? "text-slate-900 font-medium" : "text-slate-600"}>{label}</div>
      <div className={muted ? "text-slate-400" : strong ? "text-slate-900 font-semibold" : "text-slate-700"}>{value}</div>
    </div>
  );
}

function Field(props: {
  icon: React.ReactNode;
  label: string;
  name: string;
  value: string;
  type?: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string;
  readOnly?: boolean;
  error?: string;
  refSetter?: (name: string, el: HTMLDivElement | null) => void;
  placeholder?: string;
}) {
  return (
    <div ref={(el) => props.refSetter?.(props.name, el)} className={`block ${props.className || ""}`}>
      <label className="block">
        <div className="mb-1 flex items-center gap-2 text-xs font-medium text-slate-600">
          <span className="text-slate-400">{props.icon}</span>
          {props.label}
        </div>
        <input
          type={props.type || "text"}
          name={props.name}
          value={props.value}
          onChange={props.onChange}
          readOnly={props.readOnly}
          placeholder={props.placeholder}
          className={`w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition-all ${
            props.error
              ? "border-red-400 bg-red-50 text-slate-900 focus:ring-2 focus:ring-red-200 focus:border-red-400"
              : "border-slate-200 bg-white focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
          } ${props.readOnly ? "bg-slate-50 text-slate-700 cursor-not-allowed" : ""}`}
        />
      </label>
      {props.error && <p className="mt-1 text-xs text-red-600">{props.error}</p>}
    </div>
  );
}

function SelectField(props: {
  icon: React.ReactNode;
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: { value: string; label: string }[];
  disabled?: boolean;
  className?: string;
  error?: string;
  refSetter?: (name: string, el: HTMLDivElement | null) => void;
}) {
  return (
    <div ref={(el) => props.refSetter?.(props.name, el)} className={`block ${props.className || ""}`}>
      <label className="block">
        <div className="mb-1 flex items-center gap-2 text-xs font-medium text-slate-600">
          <span className="text-slate-400">{props.icon}</span>
          {props.label}
        </div>
        <select
          name={props.name}
          value={props.value}
          onChange={props.onChange}
          disabled={props.disabled}
          className={`w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition-all ${
            props.error
              ? "border-red-400 bg-red-50 text-slate-900 focus:ring-2 focus:ring-red-200 focus:border-red-400"
              : "border-slate-200 bg-white focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
          } ${props.disabled ? "bg-slate-50 text-slate-700 cursor-not-allowed" : ""}`}
        >
          {props.options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      {props.error && <p className="mt-1 text-xs text-red-600">{props.error}</p>}
    </div>
  );
}

function SecureCheckoutCard() {
  return (
    <div className="rounded-xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 p-5 text-white shadow-lg">
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-white/20 p-2.5">
          <BadgeCheck className="h-5 w-5 text-white" />
        </div>
        <div>
          <div className="text-sm font-semibold">100% Secure Checkout</div>
          <div className="mt-1 text-xs text-white/90 leading-relaxed">
            Your payment information is encrypted and secure. We never store your card details.
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <div className="flex -space-x-2">
          <div className="h-10 w-10 rounded-full border-2 border-white/40 bg-white/20 flex items-center justify-center"><AwardIcon strokeWidth={2} color="#3dc52b" /></div>
          <div className="h-10 w-10 rounded-full border-2 border-white/40 bg-white/20 flex items-center justify-center"><BrickWallShieldIcon strokeWidth={2} color="#3dc52b" /></div>
          <div className="h-10 w-10 rounded-full border-2 border-white/40 bg-white/20 flex items-center justify-center"><ClockCheckIcon strokeWidth={2} color="#3dc52b" /></div>
        </div>
        <div className="text-xs text-white/90">
          Trusted by <span className="font-medium text-white">10k+</span> customers
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2 text-xs text-white/90">
        <ShieldCheck className="h-4 w-4" />
        Protected & encrypted checkout
      </div>
    </div>
  );
}

function ToastBanner({
  toast,
  onClose,
}: {
  toast: ToastState;
  onClose: () => void;
}) {
  if (!toast.show) return null;

  const theme =
    toast.type === "success"
      ? "border-green-200 bg-green-50 text-green-700"
      : toast.type === "info"
      ? "border-blue-200 bg-blue-50 text-blue-700"
      : "border-red-200 bg-red-50 text-red-700";

  const Icon =
    toast.type === "success"
      ? CheckCircle2
      : toast.type === "info"
      ? AlertCircle
      : AlertCircle;

  return (
    <div className="fixed top-4 right-4 z-[100] w-[calc(100%-2rem)] max-w-md">
      <div className={`rounded-xl border shadow-lg p-4 ${theme}`}>
        <div className="flex items-start gap-3">
          <Icon className="h-5 w-5 mt-0.5 flex-shrink-0" />
          <div className="flex-1 text-sm font-medium">{toast.message}</div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 hover:bg-black/5 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}