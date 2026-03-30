"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Search, Pencil, Loader2, ChevronLeft, ChevronRight } from "lucide-react";

type EmailSendType = "smtp" | "app";

type ClientOption = {
  id: string;
  label: string;
  username: string;
  email?: string;
};

type TableApiRow = {
  user_id: number;
  first_name: string | null;
  last_name: string | null;
  email: string;
};

type UserApiRow = {
  id: number;
  first_name: string | null;
  last_name: string | null;
  email: string;
};

type TableRow = {
  id: string; // user_id
  name: string;
  email: string;
};

type ConfigDetails = {
  id: number;
  user_id: number;
  username: string | null;
  email_send_type: EmailSendType;
  host: string | null;
  port: string | number | null;
  app_url: string | null;
  without_hash: string | null;
};

/* =======================
   UI helpers (small, ok)
======================= */
function Card({
  title,
  subtitle,
  children,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white/90 backdrop-blur shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b bg-gradient-to-r from-orange-50 to-white">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
            {subtitle ? <p className="mt-1 text-xs text-gray-500">{subtitle}</p> : null}
          </div>
          {right ? <div className="shrink-0">{right}</div> : null}
        </div>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="text-sm font-medium text-gray-700">{children}</label>;
}
function RequiredStar() {
  return <span className="text-red-500 ml-0.5">*</span>;
}
function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="mt-2 text-xs text-red-600">{msg}</p>;
}
function Input(props: any) {
  return (
    <input
      {...props}
      className={
        "mt-2 w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm " +
        "focus:border-orange-400 focus:ring-2 focus:ring-orange-200 outline-none " +
        (props.className ?? "")
      }
    />
  );
}
function Select({
  value,
  onChange,
  placeholder,
  options,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  options: { value: string; label: string }[];
  disabled?: boolean;
}) {
  return (
    <div className="relative mt-2">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={
          "w-full appearance-none rounded-lg border border-gray-300 bg-white px-4 py-2.5 pr-10 text-sm " +
          "focus:border-orange-400 focus:ring-2 focus:ring-orange-200 outline-none " +
          (disabled ? "opacity-60 cursor-not-allowed" : "")
        }
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
    </div>
  );
}

function PrimaryButton({
  children,
  loading,
}: {
  children: React.ReactNode;
  loading?: boolean;
}) {
  return (
    <button
      type="submit"
      disabled={loading}
      className={
        "inline-flex items-center justify-center gap-2 rounded-lg bg-orange-500 px-6 py-2.5 " +
        "text-sm font-semibold text-white hover:bg-orange-600 transition " +
        "disabled:opacity-60 disabled:cursor-not-allowed"
      }
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      {children}
    </button>
  );
}

/* =======================
   Page
======================= */
export default function EmailConfigurationPage() {
  // ✅ minimal states
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingUserId, setEditingUserId] = useState("");
  const [editingEmail, setEditingEmail] = useState("");

  const [clientOptions, setClientOptions] = useState<ClientOption[]>([]);
  const [clientsLoading, setClientsLoading] = useState(false);
  const [clientsError, setClientsError] = useState<string | null>(null);

  // ✅ fixed Select Client states
  const [clientOpen, setClientOpen] = useState(false);
  const [clientSearch, setClientSearch] = useState("");
  const [debouncedClientQ, setDebouncedClientQ] = useState("");
  const [clientPage, setClientPage] = useState(1);
  const [clientPerPage] = useState(10);
  const [clientLastPage, setClientLastPage] = useState(1);
  const [selectedClientOption, setSelectedClientOption] = useState<ClientOption | null>(null);
  const clientDropdownRef = useRef<HTMLDivElement | null>(null);

  const [tableRows, setTableRows] = useState<TableRow[]>([]);
  const [tableLoading, setTableLoading] = useState(false);
  const [tableError, setTableError] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  // ✅ ONE form object only (no extra states)
  const [form, setForm] = useState({
    clientId: "",
    username: "",
    password: "",
    email_send_type: "" as "" | EmailSendType,
    host: "",
    port: "",
    app_url: "",
  });

  const [touched, setTouched] = useState({
    clientId: false,
    username: false,
    password: false,
    email_send_type: false,
    host: false,
    port: false,
    app_url: false,
  });

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  function resetAll() {
    setIsEditMode(false);
    setEditingUserId("");
    setEditingEmail("");
    setSelectedClientOption(null);
    setClientSearch("");
    setDebouncedClientQ("");
    setClientPage(1);
    setClientOpen(false);
    setForm({
      clientId: "",
      username: "",
      password: "",
      email_send_type: "",
      host: "",
      port: "",
      app_url: "",
    });
    setTouched({
      clientId: false,
      username: false,
      password: false,
      email_send_type: false,
      host: false,
      port: false,
      app_url: false,
    });
  }

  function makeClientLabel(u: any) {
    const first = u?.first_name ?? "";
    const last = u?.last_name ?? "";
    const fullName = `${first} ${last}`.trim();
    const email = u?.email ?? "";
    const mobile = u?.mobile ?? "";
    if (fullName && email) return `${fullName} (${email})`;
    if (email && mobile) return `${email} (${mobile})`;
    if (email) return email;
    if (mobile) return mobile;
    return `User #${u?.id ?? ""}`;
  }

  function pickUsername(u: any) {
    return `${u?.first_name ?? ""}${u?.last_name ?? ""}`.trim() || u?.email || u?.mobile || "";
  }

  function showApiError(json: any, fallback: string) {
    const errs = json?.errors;
    if (errs && typeof errs === "object") {
      const k = Object.keys(errs)[0];
      const msg = Array.isArray(errs[k]) ? errs[k][0] : errs[k];
      alert(msg || json?.message || fallback);
      return;
    }
    alert(json?.message || fallback);
  }

  // ✅ fixed client fetch with same concept as your users page
  async function fetchClients() {
    setClientsLoading(true);
    setClientsError(null);

    try {
      const qs = new URLSearchParams();
      if (debouncedClientQ.trim()) qs.set("q", debouncedClientQ.trim());
      qs.set("page", String(clientPage));
      qs.set("per_page", String(clientPerPage));

      const res = await fetch(
        `/api/email-account-setting/email-configuration/getUser?${qs.toString()}`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        }
      );

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(json?.message || "Failed to load clients");
      }

      const users: UserApiRow[] = json?.data?.data?.data ?? [];
      const meta = json?.data?.data ?? {};

      const opts: ClientOption[] = (Array.isArray(users) ? users : []).map((u: any) => ({
        id: String(u?.id),
        label: makeClientLabel(u),
        username: pickUsername(u),
        email: u?.email ?? undefined,
      }));

      setClientOptions(opts);
      setClientLastPage(Number(meta?.last_page ?? 1));
    } catch (e: any) {
      console.error(e);
      setClientOptions([]);
      setClientLastPage(1);
      setClientsError(e?.message || "Failed to load clients");
    } finally {
      setClientsLoading(false);
    }
  }

  async function fetchTable() {
    setTableLoading(true);
    setTableError(null);
    try {
      const res = await fetch(`/api/email-account-setting/email-configuration/get-email-config`, {
        method: "GET",
        headers: { authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      const users: TableApiRow[] = json?.email_config ?? [];

      const mapped: TableRow[] = (Array.isArray(users) ? users : []).map((u) => {
        const fullName = `${u.first_name ?? ""} ${u.last_name ?? ""}`.trim();
        return {
          id: String(u.user_id),
          name: fullName || u.email,
          email: u.email,
        };
      });

      setTableRows(mapped);
    } catch (e) {
      console.error(e);
      setTableRows([]);
      setTableError("Failed to load users. Please try again.");
    } finally {
      setTableLoading(false);
    }
  }

  useEffect(() => {
    fetchTable();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isEditMode) {
      fetchClients();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientPage, clientPerPage, debouncedClientQ, isEditMode]);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedClientQ(clientSearch.trim());
    }, 300);
    return () => clearTimeout(t);
  }, [clientSearch]);

  useEffect(() => {
    setClientPage(1);
  }, [debouncedClientQ]);

  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (!clientDropdownRef.current) return;
      if (!clientDropdownRef.current.contains(e.target as Node)) {
        setClientOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  // ✅ auto fill username when selecting client (create mode only)
  const selectedClient = useMemo(() => {
    if (selectedClientOption && selectedClientOption.id === form.clientId) return selectedClientOption;
    return clientOptions.find((c) => c.id === form.clientId) || null;
  }, [clientOptions, form.clientId, selectedClientOption]);

  useEffect(() => {
    if (!isEditMode && selectedClient?.username) {
      setForm((p) => ({ ...p, username: selectedClient.username }));
    }
  }, [selectedClient, isEditMode]);

  // ✅ when type changes, clear irrelevant fields
  useEffect(() => {
    if (form.email_send_type === "smtp") {
      setForm((p) => ({ ...p, app_url: "" }));
      setTouched((p) => ({ ...p, app_url: false }));
    }
    if (form.email_send_type === "app") {
      setForm((p) => ({ ...p, host: "", port: "" }));
      setTouched((p) => ({ ...p, host: false, port: false }));
    }
  }, [form.email_send_type]);

  const errors = {
    clientId: !isEditMode && touched.clientId && !form.clientId ? "This field is required!" : "",
    username: touched.username && !form.username.trim() ? "This field is required!" : "",
    password: touched.password && !form.password.trim() ? "This field is required!" : "",
    email_send_type: touched.email_send_type && !form.email_send_type ? "This field is required!" : "",
    host:
      form.email_send_type === "smtp" && touched.host && !form.host.trim() ? "This field is required!" : "",
    port:
      form.email_send_type === "smtp" && touched.port && !form.port.trim() ? "This field is required!" : "",
    app_url:
      form.email_send_type === "app" && touched.app_url && !form.app_url.trim() ? "This field is required!" : "",
  };

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tableRows;
    return tableRows.filter((r) => r.name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q));
  }, [tableRows, search]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(filteredRows.length / pageSize)), [
    filteredRows.length,
    pageSize,
  ]);

  const pagedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [search, pageSize, tableRows]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setTouched({
      clientId: true,
      username: true,
      password: true,
      email_send_type: true,
      host: true,
      port: true,
      app_url: true,
    });

    if (!isEditMode && !form.clientId) return;
    if (!form.username.trim()) return;
    if (!form.password.trim()) return;
    if (!form.email_send_type) return;

    if (form.email_send_type === "smtp") {
      if (!form.host.trim()) return;
      if (!form.port.trim()) return;
      if (Number.isNaN(Number(form.port))) {
        alert("Port must be a number");
        return;
      }
    }

    if (form.email_send_type === "app") {
      if (!form.app_url.trim()) return;
    }

    const payload: any = {
      username: form.username.trim(),
      password: form.password.trim(),
      email_send_type: form.email_send_type,
    };

    if (form.email_send_type === "smtp") {
      payload.host = form.host.trim();
      payload.port = Number(form.port);
    } else {
      payload.app_url = form.app_url.trim();
    }

    setSaving(true);
    try {
      if (!isEditMode) {
        const res = await fetch(`/api/email-account-setting/email-configuration/create-email-config`, {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            authorization: `Bearer ${token}`,
            "client-id": `${form.clientId}`,
          },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (!res.ok) return showApiError(json, "Failed to save configuration");
        alert(json?.message || "Configuration saved successfully");
      } else {
        const res = await fetch(`/api/email-account-setting/email-configuration/update-email-config`, {
          method: "PUT",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            authorization: `Bearer ${token}`,
            userId: editingUserId,
          },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (!res.ok) return showApiError(json, "Failed to update configuration");
        alert(json?.message || "Configuration updated successfully");
      }

      await fetchTable();
      resetAll();
    } finally {
      setSaving(false);
    }
  }

  async function handleEditClick(row: TableRow) {
    setIsEditMode(true);
    setEditingUserId(row.id);
    setEditingEmail(row.email);
    setSelectedClientOption(null);
    setClientOpen(false);

    setForm({
      clientId: "",
      username: row.email || "",
      password: "",
      email_send_type: "",
      host: "",
      port: "",
      app_url: "",
    });

    try {
      const res = await fetch(`/api/email-account-setting/email-configuration/get-config-details`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          authorization: `Bearer ${token}`,
          "user-Id": row.id,
        },
      });

      const json = await res.json();
      if (!res.ok) return showApiError(json, "Failed to load configuration details");

      let data: any = json;
      if (json?.email_config) data = json.email_config;
      if (Array.isArray(data)) data = data[0];

      const d = data as ConfigDetails;

      setForm((p) => ({
        ...p,
        username: (d?.username ?? row.email ?? "").toString(),
        password: (d?.without_hash ?? "").toString(),
        email_send_type: d?.email_send_type || "",
        host: d?.email_send_type === "smtp" ? (d?.host ?? "").toString() : "",
        port: d?.email_send_type === "smtp" ? (d?.port ?? "").toString() : "",
        app_url: d?.email_send_type === "app" ? (d?.app_url ?? "").toString() : "",
      }));

      setTouched({
        clientId: false,
        username: false,
        password: false,
        email_send_type: false,
        host: false,
        port: false,
        app_url: false,
      });
    } catch (e) {
      console.error(e);
      alert("Failed to load configuration details");
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 min-w-0">
          {/* LEFT */}
          <Card
            title={isEditMode ? "Configuration Modification" : "Email Configuration"}
            subtitle={isEditMode ? "Update sender configuration details" : "Add or update a sender configuration"}
            right={
              isEditMode ? (
                <button
                  type="button"
                  onClick={resetAll}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Cancel Edit
                </button>
              ) : null
            }
          >
            <form onSubmit={handleSubmit} className="space-y-5">
              {isEditMode ? (
                <div className="rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-900">
                  <b>Configuration Modification for :</b> {editingEmail || "-"}
                </div>
              ) : null}

              {!isEditMode ? (
                <div>
                  <Label>
                    Select Client <RequiredStar />
                  </Label>

                  <div className="relative mt-2" ref={clientDropdownRef}>
                    <button
                      type="button"
                      onClick={() => setClientOpen((p) => !p)}
                      disabled={clientsLoading}
                      className={
                        "flex w-full items-center justify-between rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm " +
                        "focus:border-orange-400 focus:ring-2 focus:ring-orange-200 outline-none " +
                        (clientsLoading ? "opacity-60 cursor-not-allowed" : "")
                      }
                    >
                      <span className={selectedClient ? "text-gray-900" : "text-gray-500"}>
                        {selectedClient?.label || "Select Username (Email/Mobile)"}
                      </span>
                      <ChevronDown className="h-4 w-4 text-gray-400" />
                    </button>

                    {clientOpen ? (
                      <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
                        <div className="border-b border-gray-100 p-3">
                          <div className="relative">
                            <input
                              value={clientSearch}
                              onChange={(e) => setClientSearch(e.target.value)}
                              placeholder="Search client by name or email..."
                              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 pr-9 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-200"
                            />
                            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                          </div>
                        </div>

                        <div className="max-h-72 overflow-y-auto">
                          {clientsLoading ? (
                            <div className="flex items-center justify-center gap-2 px-4 py-8 text-sm text-gray-600">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Loading clients...
                            </div>
                          ) : clientOptions.length === 0 ? (
                            <div className="px-4 py-8 text-center text-sm text-gray-500">No clients found</div>
                          ) : (
                            clientOptions.map((client) => (
                              <button
                                key={client.id}
                                type="button"
                                onClick={() => {
                                  setForm((p) => ({ ...p, clientId: client.id }));
                                  setTouched((p) => ({ ...p, clientId: true }));
                                  setSelectedClientOption(client);
                                  setClientOpen(false);
                                }}
                                className={[
                                  "block w-full border-b border-gray-100 px-4 py-3 text-left text-sm transition last:border-b-0",
                                  form.clientId === client.id
                                    ? "bg-orange-50 text-orange-700"
                                    : "text-gray-700 hover:bg-gray-50",
                                ].join(" ")}
                              >
                                <div className="font-medium">{client.label}</div>
                                {client.email ? (
                                  <div className="mt-0.5 text-xs text-gray-500">{client.email}</div>
                                ) : null}
                              </button>
                            ))
                          )}
                        </div>

                        <div className="flex items-center justify-between border-t border-gray-100 px-3 py-2">
                          <button
                            type="button"
                            onClick={() => setClientPage((p) => Math.max(1, p - 1))}
                            disabled={clientPage === 1 || clientsLoading}
                            className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                          >
                            <ChevronLeft className="h-3.5 w-3.5" />
                            Prev
                          </button>

                          <span className="text-xs text-gray-500">
                            Page <b>{clientPage}</b> / {clientLastPage}
                          </span>

                          <button
                            type="button"
                            onClick={() => setClientPage((p) => Math.min(clientLastPage, p + 1))}
                            disabled={clientPage === clientLastPage || clientsLoading}
                            className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                          >
                            Next
                            <ChevronRight className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <FieldError msg={errors.clientId || clientsError || undefined} />
                </div>
              ) : null}

              <div>
                <Label>
                  Username <RequiredStar />
                </Label>
                <Input
                  value={form.username}
                  onChange={(e: any) => setForm((p) => ({ ...p, username: e.target.value }))}
                  onBlur={() => setTouched((p) => ({ ...p, username: true }))}
                  placeholder="Enter username"
                />
                <FieldError msg={errors.username} />
              </div>

              <div>
                <Label>
                  Password <RequiredStar />
                </Label>
                <Input
                  value={form.password}
                  onChange={(e: any) => setForm((p) => ({ ...p, password: e.target.value }))}
                  onBlur={() => setTouched((p) => ({ ...p, password: true }))}
                  type="text"
                  placeholder="Enter password"
                />
                <FieldError msg={errors.password} />
              </div>

              <div>
                <Label>
                  Configuration Type <RequiredStar />
                </Label>
                <Select
                  value={form.email_send_type}
                  onChange={(v) => setForm((p) => ({ ...p, email_send_type: v as EmailSendType }))}
                  placeholder="Select configuration type"
                  options={[
                    { value: "smtp", label: "SMTP" },
                    { value: "app", label: "Application" },
                  ]}
                />
                <FieldError msg={errors.email_send_type} />
              </div>

              {form.email_send_type === "smtp" ? (
                <>
                  <div>
                    <Label>
                      Host <RequiredStar />
                    </Label>
                    <Input
                      value={form.host}
                      onChange={(e: any) => setForm((p) => ({ ...p, host: e.target.value }))}
                      onBlur={() => setTouched((p) => ({ ...p, host: true }))}
                      placeholder="smtp.yourdomain.com"
                    />
                    <FieldError msg={errors.host} />
                  </div>

                  <div>
                    <Label>
                      Port <RequiredStar />
                    </Label>
                    <Input
                      value={form.port}
                      type="number"
                      inputMode="numeric"
                      onChange={(e: any) => setForm((p) => ({ ...p, port: e.target.value }))}
                      onBlur={() => setTouched((p) => ({ ...p, port: true }))}
                      placeholder="587"
                    />
                    <FieldError msg={errors.port} />
                  </div>
                </>
              ) : null}

              {form.email_send_type === "app" ? (
                <div>
                  <Label>
                    App URL <RequiredStar />
                  </Label>
                  <Input
                    value={form.app_url}
                    onChange={(e: any) => setForm((p) => ({ ...p, app_url: e.target.value }))}
                    onBlur={() => setTouched((p) => ({ ...p, app_url: true }))}
                    placeholder="https://example.com/send-email"
                  />
                  <FieldError msg={errors.app_url} />
                </div>
              ) : null}

              <div className="pt-2 flex items-center gap-3">
                <PrimaryButton loading={saving}>
                  {isEditMode ? "Update Configuration" : "Save Configuration"}
                </PrimaryButton>

                <button
                  type="button"
                  onClick={resetAll}
                  className="rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Reset
                </button>
              </div>
            </form>
          </Card>

          {/* RIGHT */}
          <Card
            title="Configured Users"
            subtitle="Search, paginate and edit users"
            right={
              <button
                type="button"
                onClick={fetchTable}
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
              >
                Refresh
              </button>
            }
          >
            <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2 text-sm text-gray-700">
                <span className="font-medium">Show</span>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="h-9 rounded-md border border-gray-300 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-orange-200"
                >
                  {[10, 25, 50, 100].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
                <span className="font-medium">entries</span>
              </div>

              <div className="relative w-full sm:w-72 min-w-0">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search user or email"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 pr-9 text-sm focus:ring-2 focus:ring-orange-200 outline-none"
                />
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              </div>
            </div>

            {tableError ? (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {tableError}
              </div>
            ) : null}

            <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
              <div className="overflow-x-auto">
                <table className="w-full table-fixed text-sm">
                  <colgroup>
                    <col className="w-[42%]" />
                    <col className="w-[42%]" />
                    <col className="w-[16%]" />
                  </colgroup>

                  <thead className="bg-gray-50 text-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium">User</th>
                      <th className="px-4 py-3 text-left font-medium">Email</th>
                      <th className="px-4 py-3 text-right font-medium">Action</th>
                    </tr>
                  </thead>

                  <tbody>
                    {tableLoading ? (
                      <tr>
                        <td colSpan={3} className="py-10">
                          <div className="flex items-center justify-center gap-2 text-gray-600">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Loading...
                          </div>
                        </td>
                      </tr>
                    ) : pagedRows.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="py-10 text-center text-gray-500">
                          No records found
                        </td>
                      </tr>
                    ) : (
                      pagedRows.map((r, i) => (
                        <tr key={i} className="border-t hover:bg-orange-50/40">
                          <td className="px-4 py-3">
                            <div className="truncate text-gray-900" title={r.name}>
                              {r.name}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="truncate text-gray-700" title={r.email}>
                              {r.email}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => handleEditClick(r)}
                              className="inline-flex items-center gap-1 rounded-md border border-orange-200 px-3 py-1.5 text-xs font-semibold text-orange-700 hover:bg-orange-50"
                            >
                              <Pencil className="h-3 w-3" />
                              Edit
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="border-t border-gray-200 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="text-xs text-gray-600">
                  Showing {filteredRows.length === 0 ? 0 : (page - 1) * pageSize + 1} to{" "}
                  {Math.min(page * pageSize, filteredRows.length)} of {filteredRows.length} entries
                </div>

                <div className="flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="rounded-md border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Previous
                  </button>

                  <span className="text-xs text-gray-600">
                    Page <b>{page}</b> / {totalPages}
                  </span>

                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="rounded-md border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}