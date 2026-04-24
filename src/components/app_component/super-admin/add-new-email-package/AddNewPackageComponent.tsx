"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Pencil,
  Search,
  ChevronLeft,
  ChevronRight,
  X,
  ChevronDown,
  Loader2,
  UserPlus2,
} from "lucide-react";
import { token } from "../../common/http";
import { showToast } from "../../common/toastHelper";

const IMAGE_BASE_URL = "http://localhost:8000/uploads/package";

const getAuthHeaders = () => ({
  Accept: "application/json",
  "Content-Type": "application/json",
  authorization: `Bearer ${token()}`,
});

/* =======================
   Types
======================= */
type PackageRow = {
  id: number;
  name: string;
  image?: string;
  status: "Show" | "Hidden";
};

type PackageForm = {
  packageName: string;
  packagePrice: string;
  validDays: string;
  emailLimit: string;
  emailPerHour: string;
  features: string;
  dedicatedIp: boolean;
  app: boolean;
  domain: boolean;
  googleAdwordTagId: string;

  status: string;
  hideBuyBtn: string;

  allAmenities: string;
  allBlockAmenities: string;
  yearlyPrice: string;

  isCustom: boolean;
  dedicatedUserIds: string[];
};

type ClientOption = {
  id: string | number;
  email?: string | null;
  mobile?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  name?: string | null;
};

const EMPTY_FORM: PackageForm = {
  packageName: "",
  packagePrice: "",
  validDays: "",
  emailLimit: "",
  emailPerHour: "",
  features: "",
  dedicatedIp: false,
  app: false,
  domain: false,
  googleAdwordTagId: "",
  status: "0",
  hideBuyBtn: "0",
  allAmenities: "",
  allBlockAmenities: "",
  yearlyPrice: "",
  isCustom: false,
  dedicatedUserIds: [],
};

function resolveImageUrl(img?: string) {
  if (!img) return "";
  if (
    img.startsWith("http://") ||
    img.startsWith("https://") ||
    img.startsWith("blob:")
  ) {
    return img;
  }
  return `${IMAGE_BASE_URL}/${img}`;
}

function normalizeBool(value: unknown): boolean {
  return value === true || value === 1 || value === "1";
}

function parseDedicatedUserIds(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map(String).filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
  }

  return [];
}

function clientLabel(c: ClientOption) {
  const fullName =
    c.first_name || c.last_name
      ? `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim()
      : (c.name ?? "").trim();

  const email = c.email ?? "";
  const mobile = c.mobile ?? "";

  const main = fullName || email || mobile || `Client #${c.id}`;
  const tailParts = [];
  if (email && main !== email) tailParts.push(email);
  if (mobile) tailParts.push(mobile);

  return tailParts.length ? `${main} (${tailParts.join(" / ")})` : main;
}

function ClientSkeletonItem() {
  return (
    <div className="border-b border-gray-100 px-4 py-3 last:border-b-0">
      <div className="h-4 w-2/3 animate-pulse rounded bg-gray-200" />
      <div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-gray-100" />
    </div>
  );
}

function ClientDropdownSkeleton() {
  return (
    <div className="py-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <ClientSkeletonItem key={i} />
      ))}
    </div>
  );
}

export default function AddNewPackagesPage() {
  const [previewUrl, setPreviewUrl] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [form, setForm] = useState<PackageForm>(EMPTY_FORM);

  const [rows, setRows] = useState<PackageRow[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [saving, setSaving] = useState(false);

  const [editingId, setEditingId] = useState<number | null>(null);
  const isEditMode = editingId !== null;

  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  /* =======================
     User dropdown
  ======================= */
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [selectedClientsMap, setSelectedClientsMap] = useState<Record<string, ClientOption>>({});

  const [clientOpen, setClientOpen] = useState(false);
  const [clientSearch, setClientSearch] = useState("");
  const [debouncedClientQ, setDebouncedClientQ] = useState("");
  const [clientPage, setClientPage] = useState(1);
  const [clientPerPage] = useState(10);
  const [clientLastPage, setClientLastPage] = useState(1);

  const clientDropdownRef = useRef<HTMLDivElement | null>(null);

  /* =======================
     Derived
  ======================= */
  const selectedClients = useMemo(() => {
    return form.dedicatedUserIds.map((id) => {
      return (
        selectedClientsMap[id] || {
          id,
          name: `User ${id}`,
        }
      );
    }) as ClientOption[];
  }, [form.dedicatedUserIds, selectedClientsMap]);

  const filteredUnselectedClients = useMemo(() => {
    return clients.filter((c) => !form.dedicatedUserIds.includes(String(c.id)));
  }, [clients, form.dedicatedUserIds]);

  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) => r.name.toLowerCase().includes(q) || r.status.toLowerCase().includes(q)
    );
  }, [rows, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / ITEMS_PER_PAGE));
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedRows = filteredRows.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  /* =======================
     Effects
  ======================= */
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedClientQ(clientSearch);
      setClientPage(1);
    }, 400);

    return () => clearTimeout(t);
  }, [clientSearch]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        clientDropdownRef.current &&
        !clientDropdownRef.current.contains(event.target as Node)
      ) {
        setClientOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    fetchPackages();
  }, []);

  useEffect(() => {
    if (form.isCustom) {
      fetchClients();
    }
  }, [clientPage, debouncedClientQ, form.isCustom]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [totalPages, currentPage]);

  /* =======================
     API
  ======================= */
  const fetchPackages = async () => {
    setLoadingList(true);

    try {
      const res = await fetch(`/api/email-pakage-config/get-all-pakages`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          authorization: `Bearer ${token()}`,
        },
        cache: "no-store",
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        showToast("error", `${data?.message || "Failed to load packages"}`);
        return;
      }

      const list = (data?.data ?? data?.packages ?? []) as any[];

      const mapped: PackageRow[] = list.map((p) => ({
        id: Number(p.id),
        name: String(p.package_name ?? p.packageName ?? p.name ?? ""),
        image: p.featured_image ?? p.featuredImage ?? p.image ?? undefined,
        status: String(p.status ?? "0") === "1" ? "Show" : "Hidden",
      }));

      setRows(mapped);
      setCurrentPage(1);
    } catch (err: any) {
      showToast("error", `${err?.message || "Network error"}`);
    } finally {
      setLoadingList(false);
    }
  };

  const fetchClients = async () => {
    if (!form.isCustom) return;

    setLoadingClients(true);
    try {
      const qs = new URLSearchParams();
      if (debouncedClientQ.trim()) qs.set("q", debouncedClientQ.trim());
      qs.set("page", String(clientPage));
      qs.set("per_page", String(clientPerPage));

      const res = await fetch(
        `/api/email-account-setting/email-configuration/getUser?${qs.toString()}`,
        {
          method: "GET",
          headers: getAuthHeaders(),
          cache: "no-store",
        }
      );

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setClients([]);
        setClientLastPage(1);
        return;
      }

      const finalData = data?.data?.data?.data || [];
      const meta = data?.data?.data || {};

      const safeClients = Array.isArray(finalData) ? finalData : [];
      setClients(safeClients);
      setClientLastPage(Number(meta?.last_page ?? 1));

      setSelectedClientsMap((prev) => {
        const next = { ...prev };
        safeClients.forEach((client: ClientOption) => {
          next[String(client.id)] = client;
        });
        return next;
      });
    } catch {
      setClients([]);
      setClientLastPage(1);
    } finally {
      setLoadingClients(false);
    }
  };

  /* =======================
     File preview
  ======================= */
  const handleFile = (file?: File | null) => {
    if (!file) {
      setPreviewUrl("");
      setImageFile(null);
      return;
    }
    setPreviewUrl(URL.createObjectURL(file));
    setImageFile(file);
  };

  /* =======================
     Select / Remove User
  ======================= */
  const addClient = (client: ClientOption) => {
    const id = String(client.id);

    setSelectedClientsMap((prev) => ({
      ...prev,
      [id]: client,
    }));

    setForm((prev) => ({
      ...prev,
      dedicatedUserIds: prev.dedicatedUserIds.includes(id)
        ? prev.dedicatedUserIds
        : [...prev.dedicatedUserIds, id],
    }));

    setClientSearch("");
    setDebouncedClientQ("");
    setClientPage(1);
    setClientOpen(true);
  };

  const removeSelectedUser = (id: string | number) => {
    const stringId = String(id);

    setForm((prev) => ({
      ...prev,
      dedicatedUserIds: prev.dedicatedUserIds.filter((item) => item !== stringId),
    }));

    setSelectedClientsMap((prev) => {
      const next = { ...prev };
      delete next[stringId];
      return next;
    });
  };

  /* =======================
     Edit package
  ======================= */
  const onEdit = async (id: number) => {
    setSaving(true);

    try {
      const res = await fetch(`/api/email-pakage-config/get-single-user?id=${id}`, {
        method: "GET",
        headers: getAuthHeaders(),
        cache: "no-store",
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        showToast("error", `${data?.message || "Failed to load package"}`);
        return;
      }

      const p = data?.data ?? data?.package ?? data;
      const parsedDedicatedUsers = parseDedicatedUserIds(
        p.dedicated_user_ids ?? p.dedicated_user_ids_array ?? []
      );

      setEditingId(id);

      setForm({
        packageName: String(p.package_name ?? ""),
        packagePrice: String(p.price ?? ""),
        validDays: String(p.package_valid_days ?? ""),
        emailLimit: String(p.mail_limit ?? ""),
        emailPerHour: String(p.mail_per_hour ?? ""),
        features: String(p.features ?? ""),
        dedicatedIp: normalizeBool(p.dedicated_ip),
        app: normalizeBool(p.free_sending_app),
        domain: normalizeBool(p.free_sending_domain),
        googleAdwordTagId: String(p.g_ad_id ?? ""),
        status: String(p.status ?? "0"),
        hideBuyBtn: String(p.hide_buy_btn ?? "0"),
        allAmenities: String(p.all_amenities ?? ""),
        allBlockAmenities: String(p.all_block_amenities ?? ""),
        yearlyPrice: String(p.yearly_price ?? ""),
        isCustom: normalizeBool(p.is_custom),
        dedicatedUserIds: normalizeBool(p.is_custom) ? parsedDedicatedUsers : [],
      });

      if (normalizeBool(p.is_custom)) {
        const initialMap: Record<string, ClientOption> = {};
        parsedDedicatedUsers.forEach((userId) => {
          initialMap[userId] = {
            id: userId,
            name: `User ${userId}`,
          };
        });
        setSelectedClientsMap(initialMap);
      } else {
        setSelectedClientsMap({});
      }

      setImageFile(null);
      setClientSearch("");
      setDebouncedClientQ("");
      setClientPage(1);
      setClientOpen(false);

      showToast("success", "Edit mode enabled");
    } catch (err: any) {
      showToast("error", `${err?.message || "Network error"}`);
    } finally {
      setSaving(false);
    }
  };

  /* =======================
     Reset
  ======================= */
  const resetForm = () => {
    setForm(EMPTY_FORM);
    setPreviewUrl("");
    setImageFile(null);
    setEditingId(null);
    setClientSearch("");
    setDebouncedClientQ("");
    setClientPage(1);
    setClientOpen(false);
    setSelectedClientsMap({});
  };

  /* =======================
     Submit
  ======================= */
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const isCreating = !isEditMode;
    setSaving(true);

    try {
      const payload: any = {
        package_name: form.packageName,
        all_amenities: form.allAmenities || "",
        all_block_amenities: form.allBlockAmenities || "",
        package_valid_days: form.validDays === "" ? null : Number(form.validDays),
        mail_limit: form.emailLimit === "" ? null : Number(form.emailLimit),
        mail_per_hour: form.emailPerHour === "" ? null : Number(form.emailPerHour),
        features: form.features || "",
        dedicated_ip: form.dedicatedIp ? 1 : 0,
        free_sending_app: form.app ? 1 : 0,
        free_sending_domain: form.domain ? 1 : 0,
        price: form.packagePrice === "" ? null : Number(form.packagePrice),
        yearly_price: form.yearlyPrice === "" ? null : Number(form.yearlyPrice),
        g_ad_id: form.googleAdwordTagId || "",

        // new columns
        is_custom: form.isCustom ? 1 : 0,
        dedicated_user_ids: form.isCustom ? form.dedicatedUserIds : [],
      };

      if (!isCreating) {
        payload.status = form.status === "" ? null : Number(form.status);
        payload.hide_buy_btn = form.hideBuyBtn === "" ? null : Number(form.hideBuyBtn);
      }

      const url = isCreating
        ? `/api/email-pakage-config/create-pakage`
        : `/api/email-pakage-config/edit-pakage?id=${editingId}`;

      const res = await fetch(url, {
        method: isCreating ? "POST" : "PUT",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const msg =
          data?.message ||
          (data?.error ? JSON.stringify(data.error) : null) ||
          (isCreating ? "Create failed" : "Update failed");
        showToast("error", `${msg}`);
        return;
      }

      showToast(
        "success",
        `${data?.message || (isCreating ? "Package created" : "Package updated")}`
      );

      resetForm();
      await fetchPackages();
    } catch (err: any) {
      showToast("error", `${err?.message || "Network error"}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30">
      <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 py-5 sm:py-8">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {/* LEFT */}
          <section className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="border-b border-gray-200 px-4 sm:px-6 py-3 bg-gradient-to-r from-orange-50 to-white flex items-center justify-between">
              <h2 className="text-sm sm:text-base font-semibold text-gray-800">
                {isEditMode ? "Edit Package" : "Add New Package"}
              </h2>

              {isEditMode ? (
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-xs font-semibold text-gray-600 hover:text-gray-900"
                >
                  Cancel Edit
                </button>
              ) : null}
            </div>

            <form onSubmit={onSubmit} className="p-4 sm:p-6 space-y-4">
              {isEditMode ? (
                <div className="rounded-md border-2 border-rose-200 bg-gradient-to-r from-orange-50 to-white px-3 py-2 text-xs font-semibold text-yellow-800">
                  You Can't Edit Package Image
                </div>
              ) : null}

              {/* Image */}
              <div className="flex items-center justify-center">
                <div className="w-full max-w-sm rounded-lg border border-gray-200 bg-gray-50 p-6">
                  <div className="flex flex-col items-center gap-2">
                    <div className="relative h-20 w-20 overflow-hidden rounded-lg bg-white border border-gray-200 flex items-center justify-center">
                      {previewUrl ? (
                        <img
                          src={previewUrl}
                          alt="Preview"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="text-center text-xs text-gray-400">
                          <div className="mx-auto mb-2 h-8 w-8 rounded bg-gray-200" />
                          No Image
                        </div>
                      )}
                    </div>

                    <div className="w-full">
                      <label className="block text-xs text-gray-600 mb-1">
                        Featured Image
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFile(e.target.files?.[0])}
                        disabled={isEditMode}
                        className={[
                          "block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-gray-100 file:px-3 file:py-2 file:text-gray-700 hover:file:bg-gray-200",
                          isEditMode ? "opacity-60 cursor-not-allowed" : "",
                        ].join(" ")}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <FieldLabel label="Package Name" required />
              <input
                value={form.packageName}
                onChange={(e) => setForm({ ...form, packageName: e.target.value })}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                placeholder="Enter Package Name"
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <FieldLabel label="Package Price" required />
                  <div className="flex">
                    <span className="inline-flex items-center rounded-l-md border border-gray-300 bg-gray-100 px-3 text-sm text-gray-600">
                      $
                    </span>
                    <input
                      value={form.packagePrice}
                      onChange={(e) => setForm({ ...form, packagePrice: e.target.value })}
                      className="w-full rounded-r-md border border-l-0 border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <FieldLabel label="Package Valid Days" required />
                  <div className="flex">
                    <span className="inline-flex items-center rounded-l-md border border-gray-300 bg-gray-100 px-3 text-sm text-gray-600">
                      🗓️
                    </span>
                    <input
                      value={form.validDays}
                      onChange={(e) => setForm({ ...form, validDays: e.target.value })}
                      className="w-full rounded-r-md border border-l-0 border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <FieldLabel label="Email Limit" required />
                  <div className="flex">
                    <span className="inline-flex items-center rounded-l-md border border-gray-300 bg-gray-100 px-3 text-sm text-gray-600">
                      ≡
                    </span>
                    <input
                      value={form.emailLimit}
                      onChange={(e) => setForm({ ...form, emailLimit: e.target.value })}
                      className="w-full rounded-r-md border border-l-0 border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <FieldLabel label="Email Per Hour" required />
                  <div className="flex">
                    <span className="inline-flex items-center rounded-l-md border border-gray-300 bg-gray-100 px-3 text-sm text-gray-600">
                      ⏳
                    </span>
                    <input
                      value={form.emailPerHour}
                      onChange={(e) => setForm({ ...form, emailPerHour: e.target.value })}
                      className="w-full rounded-r-md border border-l-0 border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              <FieldLabel label="Features" required />
              <input
                value={form.features}
                onChange={(e) => setForm({ ...form, features: e.target.value })}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                placeholder="Enter Features like spf,dkim"
              />

              <div className="flex flex-wrap items-center gap-6 pt-1">
                <Switch
                  label="Dedicated IP"
                  checked={form.dedicatedIp}
                  onChange={(v) => setForm({ ...form, dedicatedIp: v })}
                />
                <Switch
                  label="App"
                  checked={form.app}
                  onChange={(v) => setForm({ ...form, app: v })}
                />
                <Switch
                  label="Domain"
                  checked={form.domain}
                  onChange={(v) => setForm({ ...form, domain: v })}
                />
              </div>

              {/* Custom Plan Toggle */}
              <div className="rounded-xl border border-orange-200 bg-orange-50/60 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">Create Custom Plan</p>
                    <p className="text-xs text-gray-600 mt-1">
                      Turn this on to assign this package to selected users only.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const nextValue = !form.isCustom;
                      setForm((prev) => ({
                        ...prev,
                        isCustom: nextValue,
                        dedicatedUserIds: nextValue ? prev.dedicatedUserIds : [],
                      }));

                      if (!nextValue) {
                        setSelectedClientsMap({});
                        setClientSearch("");
                        setDebouncedClientQ("");
                        setClientPage(1);
                        setClientOpen(false);
                      }
                    }}
                    className={[
                      "relative inline-flex h-6 w-12 items-center rounded-full transition",
                      form.isCustom ? "bg-blue-600" : "bg-gray-300",
                    ].join(" ")}
                  >
                    <span
                      className={[
                        "inline-block h-5 w-5 transform rounded-full bg-white transition",
                        form.isCustom ? "translate-x-6" : "translate-x-1",
                      ].join(" ")}
                    />
                  </button>
                </div>
              </div>

              {/* Custom User Section */}
              {form.isCustom ? (
                <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-4 space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-800">Select User</h3>
                    <p className="text-xs text-gray-600 mt-1">
                      You can add or remove users. Selected IDs are stored in{" "}
                      <b>dedicated_user_ids</b>.
                    </p>
                  </div>

                  {/* Selected Users */}
                  <div className="rounded-xl border border-blue-100 bg-white p-3">
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <div className="text-sm font-semibold text-gray-800">
                        Selected Users
                      </div>
                      <div className="text-xs text-gray-500">
                        {form.dedicatedUserIds.length} selected
                      </div>
                    </div>

                    {selectedClients.length > 0 ? (
                      <div className="flex max-h-36 flex-wrap gap-2 overflow-y-auto pr-1">
                        {selectedClients.map((client) => (
                          <div
                            key={String(client.id)}
                            className="inline-flex max-w-full items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700"
                          >
                            <span className="truncate max-w-[240px]">
                              {clientLabel(client)} (ID: {client.id})
                            </span>
                            <button
                              type="button"
                              onClick={() => removeSelectedUser(client.id)}
                              className="shrink-0 rounded-full bg-white p-0.5 hover:bg-blue-100"
                              title="Remove user"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-md border border-dashed border-gray-300 bg-gray-50 px-3 py-3 text-xs text-gray-500">
                        No user selected yet.
                      </div>
                    )}
                  </div>

                  {/* Add User Dropdown */}
                  <div ref={clientDropdownRef} className="relative">
                    <label className="mb-2 block text-sm font-semibold text-gray-800">
                      Add User
                    </label>

                    <button
                      type="button"
                      onClick={() => setClientOpen((prev) => !prev)}
                      className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-left text-sm shadow-sm flex items-center justify-between hover:border-blue-400"
                    >
                      <span className="truncate text-gray-700">Select users</span>
                      <ChevronDown
                        className={`h-4 w-4 text-gray-500 transition ${
                          clientOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>

                    {clientOpen ? (
                      <div className="absolute z-50 mt-2 w-full rounded-xl border border-gray-200 bg-white shadow-xl overflow-hidden">
                        <div className="border-b border-gray-100 p-3">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                              type="text"
                              value={clientSearch}
                              onChange={(e) => setClientSearch(e.target.value)}
                              placeholder="Search user..."
                              className="w-full rounded-md border border-gray-300 pl-9 pr-3 py-2.5 text-sm outline-none focus:border-blue-500"
                            />
                          </div>
                        </div>

                        <div className="max-h-64 overflow-y-auto">
                          {loadingClients ? (
                            <ClientDropdownSkeleton />
                          ) : filteredUnselectedClients.length === 0 ? (
                            <div className="px-4 py-6 text-sm text-gray-500 text-center">
                              No users found
                            </div>
                          ) : (
                            filteredUnselectedClients.map((client) => (
                              <button
                                key={String(client.id)}
                                type="button"
                                onClick={() => addClient(client)}
                                className="w-full border-b border-gray-100 px-4 py-3 text-left hover:bg-blue-50 last:border-b-0"
                              >
                                <div className="text-sm font-medium text-gray-800">
                                  {clientLabel(client)}
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                  ID: {client.id}
                                </div>
                              </button>
                            ))
                          )}
                        </div>

                        <div className="flex items-center justify-between gap-2 border-t border-gray-100 px-3 py-3 text-xs bg-gray-50">
                          <button
                            type="button"
                            onClick={() => setClientPage((p) => Math.max(1, p - 1))}
                            disabled={clientPage === 1 || loadingClients}
                            className="inline-flex min-w-[90px] items-center justify-center gap-1 rounded-md border border-gray-200 bg-white px-3 py-2 text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                          >
                            <ChevronLeft className="h-3.5 w-3.5" />
                            Prev
                          </button>

                          <span className="text-gray-600 font-medium">
                            Page {clientPage} of {clientLastPage}
                          </span>

                          <button
                            type="button"
                            onClick={() =>
                              setClientPage((p) => Math.min(clientLastPage, p + 1))
                            }
                            disabled={clientPage === clientLastPage || loadingClients}
                            className="inline-flex min-w-[90px] items-center justify-center gap-1 rounded-md border border-gray-200 bg-white px-3 py-2 text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                          >
                            Next
                            <ChevronRight className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <FieldLabel label="is_custom" />
                      <input
                        value={form.isCustom ? "1" : "0"}
                        readOnly
                        className="w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm outline-none"
                      />
                    </div>

                    <div>
                      <FieldLabel label="dedicated_user_ids" />
                      <input
                        value={form.dedicatedUserIds.join(",")}
                        readOnly
                        className="w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm outline-none"
                      />
                    </div>
                  </div>
                </div>
              ) : null}

              <FieldLabel label="Google AdWord Tag ID" />
              <input
                value={form.googleAdwordTagId}
                onChange={(e) =>
                  setForm({ ...form, googleAdwordTagId: e.target.value })
                }
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                placeholder="Enter google adword tag unique ID"
              />

              {isEditMode ? (
                <>
                  <FieldLabel label="Status" required />
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 bg-white"
                  >
                    <option value="1">Show</option>
                    <option value="0">Hidden</option>
                  </select>

                  <FieldLabel label="Hide Buy Now Button" required />
                  <select
                    value={form.hideBuyBtn}
                    onChange={(e) => setForm({ ...form, hideBuyBtn: e.target.value })}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 bg-white"
                  >
                    <option value="0">No</option>
                    <option value="1">Yes</option>
                  </select>
                </>
              ) : null}

              <button
                type="submit"
                disabled={saving}
                className={[
                  "inline-flex items-center justify-center rounded-md bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700",
                  saving ? "opacity-70 cursor-not-allowed" : "",
                ].join(" ")}
              >
                {saving ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </span>
                ) : isEditMode ? (
                  "Update"
                ) : (
                  "Submit"
                )}
              </button>
            </form>
          </section>

          {/* RIGHT */}
          <section className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="border-b border-gray-200 px-4 sm:px-6 py-4 bg-gradient-to-r from-orange-50 to-white">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm sm:text-base font-semibold">All Packages</h2>
                  <p className="text-xs mt-1">Found {filteredRows.length} packages</p>
                </div>

                <button
                  onClick={fetchPackages}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Refresh
                </button>
              </div>

              <div className="mt-3 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" />
                <input
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Search packages..."
                  className="w-full rounded-md border border-black bg-white/15 pl-9 pr-3 py-2 text-sm outline-none focus:border-white/40"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr className="border-b border-gray-200">
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">#</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">
                      Package Name
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">
                      Image
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {loadingList ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                        Loading...
                      </td>
                    </tr>
                  ) : paginatedRows.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                        No packages found
                      </td>
                    </tr>
                  ) : (
                    paginatedRows.map((r, idx) => (
                      <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-700">{startIndex + idx + 1}.</td>
                        <td className="px-4 py-3 text-gray-800 font-medium">{r.name}</td>

                        <td className="px-4 py-3">
                          <div className="relative h-8 w-8 overflow-hidden rounded bg-gray-100 border border-gray-200">
                            {r.image ? (
                              <img
                                src={resolveImageUrl(r.image)}
                                alt={r.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center text-[10px] text-gray-400">
                                —
                              </div>
                            )}
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <span
                            className={[
                              "inline-flex items-center rounded px-2 py-1 text-xs font-semibold",
                              r.status === "Show"
                                ? "bg-green-600 text-white"
                                : "bg-red-500 text-white",
                            ].join(" ")}
                          >
                            {r.status}
                          </span>
                        </td>

                        <td className="px-4 py-3">
                          <button
                            onClick={() => onEdit(r.id)}
                            disabled={saving}
                            className="h-8 w-8 rounded hover:bg-gray-100 flex items-center justify-center disabled:opacity-50"
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4 text-blue-600" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {filteredRows.length > ITEMS_PER_PAGE ? (
              <div className="border-t border-gray-200 px-4 sm:px-6 py-3 flex items-center justify-between text-xs text-gray-600">
                <div>
                  Page {currentPage} of {totalPages}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-2 rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ) : null}
          </section>
        </div>
      </div>
    </div>
  );
}

function FieldLabel({ label, required }: { label: string; required?: boolean }) {
  return (
    <label className="block text-sm font-semibold text-gray-800">
      {label} {required ? <span className="text-red-500">*</span> : null}
    </label>
  );
}

function Switch({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={[
          "relative inline-flex h-5 w-10 items-center rounded-full transition",
          checked ? "bg-blue-600" : "bg-gray-300",
        ].join(" ")}
        aria-pressed={checked}
      >
        <span
          className={[
            "inline-block h-4 w-4 transform rounded-full bg-white transition",
            checked ? "translate-x-5" : "translate-x-1",
          ].join(" ")}
        />
      </button>
      <span className="text-sm font-semibold text-gray-800">{label}</span>
    </div>
  );
}