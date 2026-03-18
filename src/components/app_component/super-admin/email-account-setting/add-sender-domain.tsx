"use client";

import React, { useEffect, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import toast from "react-hot-toast";
import { token } from "../../common/http";
import { useRouter } from "next/router";

type ClientOption = { id: string; label: string };
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
    <div className="bg-white border border-gray-200 rounded shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200">
        <h2 className="text-sm font-semibold text-gray-800">{title}</h2>
      </div>
      <div className="p-4">{children}</div>
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

export default function AddNewDomainPage() {
  const [clientOptions, setClientOptions] = useState<ClientOption[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);
  const [submitting, setSubmitting] = useState(false);

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
  
  // ✅ payload exactly like your edit page API fields (industry-level: predictable fields, nulls handled)
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

  // ✅ minimal required validation (industry-level: prevent bad submit)
  const canSubmit =
    !!payload.user_id &&
    payload.domain_name.length > 0 &&
    payload.spf_record.length > 0 &&
    payload.dkim_record.length > 0 &&
    payload.dkim_private_key.length > 0 &&
    payload.dmarc_record.length > 0 &&
    !loadingClients &&
    !submitting;

  // Clients load
  useEffect(() => {
    (async () => {
      try {
        setLoadingClients(true);
        const res = await fetch("/api/email-account-setting/email-configuration/get-searchAll-user", {
          method: "POST",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token()}`,
          },
        });
        const json = await res.json().catch(() => ({}));
        const list: any[] = Array.isArray(json?.data) ? json.data : [];

        const makeLabel = (u: any) => {
          const fullName = `${u?.first_name ?? ""} ${u?.last_name ?? ""}`.trim();
          const email = u?.email ?? "";
          const mobile = u?.mobile ?? "";
          if (fullName && email) return `${fullName} (${email})`;
          if (email && mobile) return `${email} (${mobile})`;
          return email || mobile || `User #${u?.id ?? ""}`;
        };

        setClientOptions(
          list.map((u: any) => ({
            id: String(u?.id),
            label: makeLabel(u),
          }))
        );
      } catch (e) {
        console.error(e);
        toast.error("Failed to load clients");
        setClientOptions([]);
      } finally {
        setLoadingClients(false);
      }
    })();
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
        console.log("payload",payload);
        return;
      }

      toast.success(data?.message ?? "Domain record created", { id: toastId,style:{border:"3px solid green"} });

      // optional: reset minimal fields
      setDomain("");
      setSpfRecord("");
      setDkimRecord("");
      setDkimPrivateKey("");
      setDmarcRecord("");
      // (keep client selected)
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label required>Select Client</Label>
                <Select
                  value={clientId}
                  onChange={setClientId}
                  options={[
                    { value: "", label: loadingClients ? "Loading..." : "Select client" },
                    ...clientOptions.map((c) => ({ value: c.id, label: c.label })),
                  ]}
                />
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
