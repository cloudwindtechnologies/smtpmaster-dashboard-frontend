"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  Search,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import toast from "react-hot-toast";
import { token } from "../../common/http";
import { useRouter } from "next/navigation";

type ClientOption = {
  id: string;
  label: string;
  email?: string | null;
  mobile?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  name?: string | null;
};

type Option = { value: string; label: string };

const recordTypeOptions: Option[] = [
  { value: "", label: "Select type" },
  { value: "TXT", label: "TXT" },
  { value: "CNAME", label: "CNAME" },
  { value: "MX", label: "MX" },
];

/* ===== UI (small + reusable) ===== */
function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-gray-200 rounded shadow-sm overflow-visible">
      <div className="px-4 py-3 border-b border-gray-200">
        <h2 className="text-sm font-semibold text-gray-800">{title}</h2>
      </div>
      <div className="p-4 overflow-visible">{children}</div>
    </div>
  );
}

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-[11px] font-semibold text-gray-800">
      {children}
      {required ? <span className="text-red-500">&nbsp;*</span> : null}
    </label>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="mt-1 w-full rounded border border-gray-300 bg-white px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
    />
  );
}

function TextArea({
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="mt-1 w-full rounded border border-gray-300 bg-white px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
    />
  );
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: Option[];
}) {
  return (
    <div className="relative mt-1">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none rounded border border-gray-300 bg-white px-2 py-2 pr-8 text-sm outline-none focus:ring-2 focus:ring-blue-500"
      >
        {options.map((o) => (
          <option key={o.value + o.label} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-5">
      <div className="text-[11px] font-semibold text-gray-700">{title}</div>
      <hr className="mt-2" />
      <div className="mt-3">{children}</div>
    </div>
  );
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

export default function AddNewDomainPage() {
  const router = useRouter();

  const [clientOptions, setClientOptions] = useState<ClientOption[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // ✅ custom client dropdown states
  const [clientOpen, setClientOpen] = useState(false);
  const [clientSearch, setClientSearch] = useState("");
  const [debouncedClientQ, setDebouncedClientQ] = useState("");
  const [clientPage, setClientPage] = useState(1);
  const [clientPerPage] = useState(10);
  const [clientLastPage, setClientLastPage] = useState(1);
  const clientDropdownRef = useRef<HTMLDivElement | null>(null);

  // Top
  const [clientId, setClientId] = useState("");
  const [domain, setDomain] = useState("");

  // SPF
  const [spfType, setSpfType] = useState("TXT");
  const [spfHost, setSpfHost] = useState("@");
  const [spfPriority, setSpfPriority] = useState("0");
  const [spfRecord, setSpfRecord] = useState("");

  // DKIM
  const [dkimType, setDkimType] = useState("TXT");
  const [dkimHost, setDkimHost] = useState("default._domainkey");
  const [dkimPriority, setDkimPriority] = useState("0");
  const [dkimRecord, setDkimRecord] = useState("");
  const [dkimPrivateKey, setDkimPrivateKey] = useState("");

  // DMARC
  const [dmarcType, setDmarcType] = useState("TXT");
  const [dmarcHost, setDmarcHost] = useState("_dmarc");
  const [dmarcPriority, setDmarcPriority] = useState("0");
  const [dmarcRecord, setDmarcRecord] = useState("");

  // CNAME
  const [cnameType, setCnameType] = useState("CNAME");
  const [cnameHost, setCnameHost] = useState("");
  const [cnamePriority, setCnamePriority] = useState("");
  const [cnameRecord, setCnameRecord] = useState("");

  // MX
  const [mxType, setMxType] = useState("MX");
  const [mxHost, setMxHost] = useState("");
  const [mxPriority, setMxPriority] = useState("");
  const [mxRecord, setMxRecord] = useState("");

  const makeClientLabel = (u: any) => {
    const fullName = `${u?.first_name ?? ""} ${u?.last_name ?? ""}`.trim();
    const email = u?.email ?? "";
    const mobile = u?.mobile ?? "";
    if (fullName && email) return `${fullName} (${email})`;
    if (email && mobile) return `${email} (${mobile})`;
    return email || mobile || `User #${u?.id ?? ""}`;
  };

  const selectedClient = useMemo(() => {
    return clientOptions.find((c) => String(c.id) === String(clientId)) || null;
  }, [clientOptions, clientId]);

  // ✅ payload exactly like your edit page API fields
  const payload = useMemo(() => {
    const n = (v: string) => (v.trim() === "" ? null : Number(v));
    const s = (v: string) => (v.trim() === "" ? null : v.trim());

    return {
      user_id: clientId ? Number(clientId) : null,
      domain_name: domain.trim(),

      spf_type: spfType || "TXT",
      spf_host: spfHost || "@",
      spf_priority: n(spfPriority),
      spf_record: spfRecord.trim(),

      dkim_type: dkimType || "TXT",
      dkim_host: dkimHost || "default._domainkey",
      dkim_priority: n(dkimPriority),
      dkim_record: dkimRecord.trim(),
      dkim_private_key: dkimPrivateKey.trim(),

      dmarc_type: dmarcType || "TXT",
      dmarc_host: dmarcHost || "_dmarc",
      dmarc_priority: n(dmarcPriority),
      dmarc_record: dmarcRecord.trim(),

      cname_type: cnameType || "CNAME",
      cname_host: s(cnameHost) ?? "",
      cname_priority: n(cnamePriority),
      cname_record: s(cnameRecord) ?? "",

      mx_type: mxType || "MX",
      mx_host: s(mxHost),
      mx_priority: n(mxPriority),
      mx_record: s(mxRecord),
    };
  }, [
    clientId,
    domain,
    spfType,
    spfHost,
    spfPriority,
    spfRecord,
    dkimType,
    dkimHost,
    dkimPriority,
    dkimRecord,
    dkimPrivateKey,
    dmarcType,
    dmarcHost,
    dmarcPriority,
    dmarcRecord,
    cnameType,
    cnameHost,
    cnamePriority,
    cnameRecord,
    mxType,
    mxHost,
    mxPriority,
    mxRecord,
  ]);

  const canSubmit =
    !!payload.user_id &&
    payload.domain_name.length > 0 &&
    payload.spf_record.length > 0 &&
    payload.dkim_record.length > 0 &&
    payload.dkim_private_key.length > 0 &&
    payload.dmarc_record.length > 0 &&
    !loadingClients &&
    !submitting;

  // ✅ same fetch concept as your users page
  async function fetchClients() {
    try {
      setLoadingClients(true);

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
            Authorization: `Bearer ${token()}`,
          },
          cache: "no-store",
        }
      );

      if (res.status === 401) {
        router.push("/login");
        return;
      }

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(json?.message || "Failed to load clients");
        setClientOptions([]);
        setClientLastPage(1);
        return;
      }

      const list: any[] = json?.data?.data?.data ?? [];
      const meta = json?.data?.data ?? {};

      setClientOptions(
        (Array.isArray(list) ? list : []).map((u: any) => ({
          id: String(u?.id),
          label: makeClientLabel(u),
          email: u?.email ?? "",
          mobile: u?.mobile ?? "",
          first_name: u?.first_name ?? "",
          last_name: u?.last_name ?? "",
          name: `${u?.first_name ?? ""} ${u?.last_name ?? ""}`.trim(),
        }))
      );

      setClientLastPage(Number(meta?.last_page ?? 1));
    } catch (e) {
      console.error(e);
      toast.error("Failed to load clients");
      setClientOptions([]);
      setClientLastPage(1);
    } finally {
      setLoadingClients(false);
    }
  }

  useEffect(() => {
    fetchClients();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientPage, debouncedClientQ]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedClientQ(clientSearch.trim()), 300);
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

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) {
      toast.error("Please fill all required fields.");
      return;
    }

    const toastId = toast.loading("Creating domain record...");
    setSubmitting(true);

    try {
      const res = await fetch(`/api/email-account-setting/add-sender-domain/add`, {
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
          (data?.errors ? Object.values(data.errors).flat().join(" & ") : "Create failed");
        toast.error(msg, { id: toastId });
        console.log("payload", payload);
        return;
      }

      toast.success(data?.message ?? "Domain record created", {
        id: toastId,
        style: { border: "3px solid green" },
      });

      setDomain("");
      setSpfRecord("");
      setDkimRecord("");
      setDkimPrivateKey("");
      setDmarcRecord("");
    } catch (err) {
      console.error(err);
      toast.error("Something went wrong", { id: toastId });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 p-3 sm:p-6">
      <div className="mx-auto w-full max-w-4xl">
        <Card title="Add New Domain">
          <form onSubmit={onSubmit}>
            {/* Top row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 overflow-visible">
              <div className="relative">
                <Label required>Select Client</Label>

                <div className="mt-1 relative" ref={clientDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setClientOpen((p) => !p)}
                    disabled={loadingClients}
                    className="flex w-full items-center justify-between rounded border border-gray-300 bg-white px-3 py-2 text-left text-sm outline-none transition focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                  >
                    <span className={selectedClient ? "text-gray-900" : "text-gray-500"}>
                      {selectedClient ? selectedClient.label : "Select client"}
                    </span>

                    <div className="ml-3 shrink-0">
                      {loadingClients ? (
                        <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
                      ) : (
                        <ChevronDown
                          className={`h-4 w-4 text-gray-500 transition-transform ${
                            clientOpen ? "rotate-180" : ""
                          }`}
                        />
                      )}
                    </div>
                  </button>

                  {clientOpen && (
                    <div className="absolute left-0 right-0 top-full z-[100] mt-2 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-[0_20px_50px_-12px_rgba(0,0,0,0.18)]">
                      {/* Search */}
                      <div className="border-b border-gray-100 bg-white p-3">
                        <div className="relative">
                          <input
                            type="text"
                            value={clientSearch}
                            onChange={(e) => setClientSearch(e.target.value)}
                            className="w-full rounded-lg border border-gray-300 pl-9 pr-3 py-2 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                            placeholder="Search client"
                          />
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        </div>
                      </div>

                      {/* List */}
                      <div className="max-h-[260px] overflow-y-auto bg-white">
                        {loadingClients ? (
                          <ClientDropdownSkeleton />
                        ) : clientOptions.length === 0 ? (
                          <div className="px-4 py-10 text-center text-sm text-gray-500">
                            No clients found
                          </div>
                        ) : (
                          clientOptions.map((c) => (
                            <button
                              key={String(c.id)}
                              type="button"
                              onClick={() => {
                                setClientId(String(c.id));
                                setClientOpen(false);
                              }}
                              className={`block w-full border-b border-gray-100 px-4 py-3 text-left transition last:border-b-0 ${
                                String(clientId) === String(c.id)
                                  ? "bg-blue-50"
                                  : "bg-white hover:bg-gray-50"
                              }`}
                            >
                              <div
                                className={`truncate text-sm font-semibold ${
                                  String(clientId) === String(c.id) ? "text-blue-700" : "text-gray-800"
                                }`}
                              >
                                {c.label}
                              </div>

                              {c.email ? (
                                <div className="mt-1 truncate text-xs text-gray-500">{c.email}</div>
                              ) : null}
                            </button>
                          ))
                        )}
                      </div>

                      {/* Footer */}
                      <div className="sticky bottom-0 flex items-center justify-between border-t border-gray-200 bg-gray-50 px-3 py-3">
                        <button
                          type="button"
                          onClick={() => setClientPage((p) => Math.max(1, p - 1))}
                          disabled={clientPage === 1 || loadingClients}
                          className="inline-flex min-w-[84px] items-center justify-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <ChevronLeft className="h-3.5 w-3.5" />
                          Prev
                        </button>

                        <span className="text-xs font-medium text-gray-600">
                          Page <span className="text-gray-900">{clientPage}</span> / {clientLastPage}
                        </span>

                        <button
                          type="button"
                          onClick={() => setClientPage((p) => Math.min(clientLastPage, p + 1))}
                          disabled={clientPage === clientLastPage || loadingClients}
                          className="inline-flex min-w-[84px] items-center justify-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Next
                          <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <Label required>Domain</Label>
                <TextInput value={domain} onChange={setDomain} placeholder="example.com" />
              </div>
            </div>

            {/* SPF */}
            <Section title="Add SPF Credentials">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label required>SPF Type</Label>
                  <Select value={spfType} onChange={setSpfType} options={recordTypeOptions} />
                </div>
                <div>
                  <Label required>Host</Label>
                  <TextInput value={spfHost} onChange={setSpfHost} placeholder="@" />
                </div>
                <div>
                  <Label>Priority</Label>
                  <TextInput value={spfPriority} onChange={setSpfPriority} placeholder="10" />
                </div>
              </div>
              <div className="mt-3">
                <Label required>Add SPF Record</Label>
                <TextArea value={spfRecord} onChange={setSpfRecord} rows={3} />
              </div>
            </Section>

            {/* DKIM */}
            <Section title="Add DKIM Credentials">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label required>DKIM Type</Label>
                  <Select value={dkimType} onChange={setDkimType} options={recordTypeOptions} />
                </div>
                <div>
                  <Label required>Host</Label>
                  <TextInput value={dkimHost} onChange={setDkimHost} />
                </div>
                <div>
                  <Label>Priority</Label>
                  <TextInput value={dkimPriority} onChange={setDkimPriority} placeholder="10" />
                </div>
              </div>

              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label required>Add DKIM Record</Label>
                  <TextArea value={dkimRecord} onChange={setDkimRecord} rows={3} />
                </div>
                <div>
                  <Label required>Add DKIM Private Key</Label>
                  <TextArea value={dkimPrivateKey} onChange={setDkimPrivateKey} rows={3} />
                </div>
              </div>
            </Section>

            {/* DMARC */}
            <Section title="Add DMARC Credentials">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label required>DMARC Type</Label>
                  <Select value={dmarcType} onChange={setDmarcType} options={recordTypeOptions} />
                </div>
                <div>
                  <Label required>Host</Label>
                  <TextInput value={dmarcHost} onChange={setDmarcHost} />
                </div>
                <div>
                  <Label>Priority</Label>
                  <TextInput value={dmarcPriority} onChange={setDmarcPriority} placeholder="10" />
                </div>
              </div>
              <div className="mt-3">
                <Label required>Add DMARC Record</Label>
                <TextArea value={dmarcRecord} onChange={setDmarcRecord} rows={3} />
              </div>
            </Section>

            {/* Optional CNAME */}
            <Section title="Add CNAME Credentials (Optional)">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>CNAME Type</Label>
                  <Select value={cnameType} onChange={setCnameType} options={recordTypeOptions} />
                </div>
                <div>
                  <Label>Host</Label>
                  <TextInput value={cnameHost} onChange={setCnameHost} />
                </div>
                <div>
                  <Label>Priority</Label>
                  <TextInput value={cnamePriority} onChange={setCnamePriority} placeholder="10" />
                </div>
              </div>
              <div className="mt-3">
                <Label>Add CNAME Record</Label>
                <TextArea value={cnameRecord} onChange={setCnameRecord} rows={3} />
              </div>
            </Section>

            {/* Optional MX */}
            <Section title="Add MX Credentials (Optional)">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>MX Type</Label>
                  <Select value={mxType} onChange={setMxType} options={recordTypeOptions} />
                </div>
                <div>
                  <Label>Host</Label>
                  <TextInput value={mxHost} onChange={setMxHost} />
                </div>
                <div>
                  <Label>Priority</Label>
                  <TextInput value={mxPriority} onChange={setMxPriority} placeholder="10" />
                </div>
              </div>
              <div className="mt-3">
                <Label>Add MX Record</Label>
                <TextArea value={mxRecord} onChange={setMxRecord} rows={3} />
              </div>
            </Section>

            {/* Submit */}
            <button
              type="submit"
              disabled={!canSubmit}
              className={`mt-6 inline-flex items-center justify-center rounded px-4 py-2 text-xs font-semibold text-white transition ${
                canSubmit ? "bg-blue-600 hover:bg-blue-700" : "bg-gray-400 cursor-not-allowed"
              }`}
            >
              {submitting ? "Saving..." : "Add Domain Record"}
            </button>
          </form>
        </Card>
      </div>
    </div>
  );
}