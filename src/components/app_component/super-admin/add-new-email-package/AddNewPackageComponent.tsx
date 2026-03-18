"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Pencil, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { token } from "../../common/http";
import { showToast } from "../../common/toastHelper";

// if backend returns featured_image as filename only, set base url
const IMAGE_BASE_URL = "http://localhost:8000/uploads/package";

const getAuthHeaders = () => ({
  Accept: "application/json",
  Authorization: `Bearer ${token()}`,
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

  // edit-only fields (backend supports)
  status: string; // "1" | "0"
  hideBuyBtn: string; // "1" | "0"

  // backend optional keys to prevent undefined key errors
  packageSubheading: string;
  amenitiesHeading: string;
  allAmenities: string;
  allBlockAmenities: string;
  yearlyPrice: string;
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

  packageSubheading: "",
  amenitiesHeading: "",
  allAmenities: "",
  allBlockAmenities: "",
  yearlyPrice: "",
};

function resolveImageUrl(img?: string) {
  if (!img) return "";
  if (img.startsWith("http://") || img.startsWith("https://") || img.startsWith("blob:"))
    return img;
  return `${IMAGE_BASE_URL}/${img}`;
}

export default function AddNewPackagesPage() {
  const [previewUrl, setPreviewUrl] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null); // only used in ADD mode UI
  const [form, setForm] = useState<PackageForm>(EMPTY_FORM);

  const [rows, setRows] = useState<PackageRow[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [saving, setSaving] = useState(false);

  const [editingId, setEditingId] = useState<number | null>(null);
  const isEditMode = editingId !== null;

  // only 2 states for search & pagination
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const ITEMS_PER_PAGE = 10;

  /* =======================
     GET: List Packages
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
        showToast('error',`${data?.message || "Failed to load packages"}`)
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
      showToast('success',`Data fetched successfully`)
    } catch (err: any) {
      showToast('error',`${err?.message || "Network error"}`)
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    fetchPackages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* =======================
     File preview (ADD only)
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
     GET: Single Package (Edit)
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
        showToast('error',`${data?.message || "Failed to load package"}`)
        return;
      }

      const p = data?.data ?? data?.package ?? data;

      setEditingId(id);

      setForm({
        packageName: String(p.package_name ?? ""),
        packagePrice: String(p.price ?? ""),
        validDays: String(p.package_valid_days ?? ""),
        emailLimit: String(p.mail_limit ?? ""),
        emailPerHour: String(p.mail_per_hour ?? ""),
        features: String(p.features ?? ""),
        dedicatedIp: p.dedicated_ip || 0,
        app: p.free_sending_app || 0,
        domain:p.free_sending_domain || 0,
        googleAdwordTagId: String(p.g_ad_id ?? ""),

        // edit-only fields
        status: String(p.status ?? "0"),
        hideBuyBtn: String(p.hide_buy_btn ?? "0"),

        // optional keys
        packageSubheading: String(p.package_subheading ?? ""),
        amenitiesHeading: String(p.amenities_heading ?? ""),
        allAmenities: String(p.all_amenities ?? ""),
        allBlockAmenities: String(p.all_block_amenities ?? ""),
        yearlyPrice: String(p.yearly_price ?? ""),
      });


      

      // edit mode: image cannot be changed (as your screenshot)
      setImageFile(null);

      showToast('success',"Edit mode enabled");
    } catch (err: any) {
      showToast('error',`${err?.message || "Network error"}`)
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
  };

  /* =======================
     POST / PUT (JSON payload)
  ======================= */
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const isCreating = !isEditMode;
    setSaving(true);

    try {
      // ✅ Always send keys backend expects (avoid undefined array key)
      // ✅ Only include status/hide_buy_btn when EDIT mode (to match your UI difference)
      const payload: any = {
        package_name: form.packageName,
        package_subheading: form.packageSubheading || "",
        amenities_heading: form.amenitiesHeading || "",
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
      };

      // edit-only fields (like your screenshot)
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
        showToast('error',`${msg}`)
        return;
      }

      showToast('success',`${data?.message || (isCreating ? "Package created" : "Package updated")}`)

      resetForm();
      await fetchPackages();
    } catch (err: any) {
      showToast('error',`${err?.message || "Network error"}`)
    } finally {
      setSaving(false);
    }
  };

  /* =======================
     Search + Pagination
  ======================= */
  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.name.toLowerCase().includes(q) || r.status.toLowerCase().includes(q));
  }, [rows, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / ITEMS_PER_PAGE));
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedRows = filteredRows.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalPages]);

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
              {/* only show in edit mode (like screenshot) */}
              {isEditMode ? (
                <div className="rounded-md border-2 border-rose-200 bg-gradient-to-r from-orange-50 to-white px-3 py-2 text-xs font-semibold text-yellow-800">
                  You Can't Edit Package Image
                </div>
              ) : null}

              {/* image */}
              <div className="flex items-center justify-center">
                <div className="w-full max-w-sm rounded-lg border border-gray-200 bg-gray-50 p-6">
                  <div className="flex flex-col items-center gap-2">
                    <div className="relative h-20 w-20 overflow-hidden rounded-lg bg-white border border-gray-200 flex items-center justify-center">
                      {previewUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={previewUrl} alt="Preview" className="h-full w-full object-cover" />
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
                <Switch label="Dedicated IP" checked={form.dedicatedIp} onChange={(v) => setForm({ ...form, dedicatedIp: v })} />
                <Switch label="App" checked={form.app} onChange={(v) => setForm({ ...form, app: v })} />
                <Switch label="Domain" checked={form.domain} onChange={(v) => setForm({ ...form, domain: v })} />
                  
              </div>

              <FieldLabel label="Google AdWord Tag ID" />
              <input
                value={form.googleAdwordTagId}
                onChange={(e) => setForm({ ...form, googleAdwordTagId: e.target.value })}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                placeholder="Enter google adword tag unique ID"
              />

              {/* ✅ EDIT MODE ONLY fields (difference you want) */}
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
                {saving ? "Saving..." : isEditMode ? "Update" : "Submit"}
              </button>
            </form>
          </section>

          {/* RIGHT */}
          <section className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="border-b border-gray-200 px-4 sm:px-6 py-4 bg-gradient-to-r from-orange-50 to-white">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm sm:text-base font-semibold ">All Packages</h2>
                  <p className="text-xs  mt-1">Found {filteredRows.length} packages</p>
                </div>

                <button
                  onClick={fetchPackages}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Refresh
                </button>
              </div>

              <div className="mt-3 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 " />
                <input
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Search packages..."
                  className="w-full rounded-md border border-black bg-white/15   pl-9 pr-3 py-2 text-sm outline-none focus:border-white/40"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr className="border-b border-gray-200">
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">#</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Package Name</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Image</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Status</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Action</th>
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
                              // eslint-disable-next-line @next/next/no-img-element
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
                              r.status === "Show" ? "bg-green-600 text-white" : "bg-red-500 text-white",
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
                <div>Page {currentPage} of {totalPages}</div>
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

/* =======================
   Small helpers
======================= */
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
