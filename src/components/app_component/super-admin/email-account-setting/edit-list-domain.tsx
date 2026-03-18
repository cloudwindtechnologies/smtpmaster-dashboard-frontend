"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Loader2, ChevronDown } from "lucide-react";
import { token } from "../../common/http";
import toast from "react-hot-toast";

/* =======================
   Types (matches your API)
======================= */

type ApiResponse = {
  user_info: {
    first_name: string;
    last_name: string;
    email: string;
  };
  domain_details: {
    id: number;
    user_id: number;
    domain_name: string;

    spf_type: string | null;
    spf_host: string | null;
    spf_record: string | null;
    spf_priority: string | null;

    dkim_type: string | null;
    dkim_host: string | null;
    dkim_record: string | null;
    dkim_private_key: string | null;
    dkim_priority: string | null;

    dmarc_type: string | null;
    dmarc_host: string | null;
    dmarc_record: string | null;
    dmarc_priority: string | null;

    cname_type: string | null;
    cname_host: string | null;
    cname_record: string | null;
    cname_priority: string | null;

    mx_type: string | null;
    mx_host: string | null;
    mx_record: string | null;
    mx_priority: string | null;
  };
};

type DomainDetails = ApiResponse["domain_details"];
type UserInfo = ApiResponse["user_info"];

/* =======================
   Small UI helpers
======================= */

function RequiredStar() {
  return <span className="text-red-500">*</span>;
}
function Label({ children }: { children: React.ReactNode }) {
  return <label className="text-sm font-medium text-gray-700">{children}</label>;
}
function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="mt-2 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
    />
  );
}
function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className="mt-2 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
    />
  );
}
function Select({
  value,
  onChange,
  placeholder,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="relative mt-2">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none rounded-md border border-gray-300 bg-white px-3 py-2 pr-10 text-sm outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="">{placeholder}</option>
        {options.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
    </div>
  );
}

/* =======================
   Component
======================= */

export default function EditDomainTxtRecordForm() {
  const params = useParams();

  const domainId = useMemo(() => {
    const raw = (params as any)?.id;
    const idNumber = Number(raw);
    return Number.isFinite(idNumber) ? idNumber : null;
  }, [params]);

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [domainDetails, setDomainDetails] = useState<DomainDetails | null>(null);

  // ✅ store initial snapshot (for "no change => disable submit")
  const [initialDomainDetails, setInitialDomainDetails] = useState<DomainDetails | null>(null);

  // ✅ minimal normalize so "10" and 10 compare same
  const normalize = (d: DomainDetails) => ({
    ...d,
    spf_priority: d.spf_priority === "" || d.spf_priority == null ? null : Number(d.spf_priority),
    dkim_priority: d.dkim_priority === "" || d.dkim_priority == null ? null : Number(d.dkim_priority),
    dmarc_priority:
      d.dmarc_priority === "" || d.dmarc_priority == null ? null : Number(d.dmarc_priority),
    cname_priority:
      d.cname_priority === "" || d.cname_priority == null ? null : Number(d.cname_priority),
    mx_priority: d.mx_priority === "" || d.mx_priority == null ? null : Number(d.mx_priority),
  });

  // ✅ changed or not
  const isDirty = useMemo(() => {
    if (!domainDetails || !initialDomainDetails) return false;
    return JSON.stringify(normalize(domainDetails)) !== JSON.stringify(normalize(initialDomainDetails));
  }, [domainDetails, initialDomainDetails]);

  const submitDisabled = !isDirty || isSubmitting || isLoading;

  async function loadDomainTxtRecordById(id: number) {
    try {
      setIsLoading(true);
      setErrorMessage(null);

      const response = await fetch(
        `/api/email-account-setting/list-sender-domain/listDomainsDetails?id=${id}`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
            authorization: `Bearer ${token()}`,
          },
        }
      );

      const json = await response.json();

      if (!response.ok || !json?.success) {
        throw new Error(json?.data?.message || json?.message || "Failed to load record");
      }

      const backendData = json.data;

      setUserInfo(backendData.user_info);
      setDomainDetails(backendData.domain_details);
      setInitialDomainDetails(backendData.domain_details); // ✅ snapshot

      toast.success("Edit Domain details page loaded", {
        position: "top-center",
        style: { border: "3px solid blue" },
      });
    } catch (error: any) {
      console.error(error);
      toast.error("Failed to load domain");
      setErrorMessage(error?.message ?? "Failed to load data.");
      setUserInfo(null);
      setDomainDetails(null);
      setInitialDomainDetails(null);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (domainId === null) {
      setIsLoading(false);
      setErrorMessage("Invalid Domain ID in URL.");
      return;
    }
    loadDomainTxtRecordById(domainId);
  }, [domainId]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!domainDetails) return;

    // ✅ No changes => don't submit
    if (!isDirty) {
      toast("No changes to update.", { position: "top-center" });
      return;
    }

    setIsSubmitting(true);
    const toastId = toast.loading("Updating domain record...");

    const body = {
      edit_for: domainDetails.id,
      domain_name: domainDetails.domain_name ?? "",

      spf_type: domainDetails.spf_type ?? "TXT",
      spf_host: domainDetails.spf_host ?? "@",
      spf_priority: domainDetails.spf_priority === "" || domainDetails.spf_priority == null ? null : Number(domainDetails.spf_priority),
      spf_record: domainDetails.spf_record ?? "",

      dkim_type: domainDetails.dkim_type ?? "TXT",
      dkim_host: domainDetails.dkim_host ?? "default._domainkey",
      dkim_priority: domainDetails.dkim_priority === "" || domainDetails.dkim_priority == null ? null : Number(domainDetails.dkim_priority),
      dkim_record: domainDetails.dkim_record ?? "",
      dkim_private_key: domainDetails.dkim_private_key ?? "",

      dmarc_type: domainDetails.dmarc_type ?? "TXT",
      dmarc_host: domainDetails.dmarc_host ?? "_dmarc",
      dmarc_priority: domainDetails.dmarc_priority === "" || domainDetails.dmarc_priority == null ? null : Number(domainDetails.dmarc_priority),
      dmarc_record: domainDetails.dmarc_record ?? "",

      cname_type: domainDetails.cname_type ?? "CNAME",
      cname_host: domainDetails.cname_host ?? "",
      cname_priority: domainDetails.cname_priority === "" || domainDetails.cname_priority == null ? null : Number(domainDetails.cname_priority),
      cname_record: domainDetails.cname_record ?? "",

      mx_type: domainDetails.mx_type ?? null,
      mx_host: domainDetails.mx_host ?? null,
      mx_record: domainDetails.mx_record ?? null,
      mx_priority: domainDetails.mx_priority === "" || domainDetails.mx_priority == null ? null : Number(domainDetails.mx_priority),
    };

    try {
      const res = await fetch(`/api/email-account-setting/list-sender-domain/edit-domain-txt-record`, {
        method: "PUT",
        headers: {
          accept: "application/json",
          "Content-Type": "application/json",
          authorization: `Bearer ${token()}`,
        },
        body: JSON.stringify(body),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const msg =
          data?.message ||
          (data?.errors ? Object.values(data.errors).flat().join(" & ") : "Update failed");
        toast.error(msg, { id: toastId, style: { border: "3px solid red" } });
        return;
      }

      toast.success(`${data.message ?? "Updated successfully"}`, { id: toastId });

      // ✅ after success, update snapshot => disable submit again
      setInitialDomainDetails(domainDetails);
    } catch (error) {
      console.error(error);
      toast.error("Failed to update record", { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="p-10 flex items-center justify-center gap-2 text-gray-700">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading...
      </div>
    );
  }

  if (errorMessage || !domainDetails || !userInfo) {
    return <div className="p-10 text-red-600">{errorMessage ?? "No data found"}</div>;
  }

  return (
    <div className="bg-gray-100 min-h-screen py-6">
      <div className="mx-auto max-w-6xl px-4">
        <div className="rounded-lg border border-gray-200 bg-white">
          <div className="border-b px-5 py-3">
            <h2 className="text-sm font-semibold text-gray-900">Edit Domain TXT record</h2>
          </div>

          <div className="p-5">
            <form onSubmit={handleSubmit} autoComplete="off" className="space-y-6">
              {/* top row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="text-sm text-gray-800">
                    <div className="font-semibold">
                      Modification Domain Configuration For :{" "}
                      <span className="font-normal">
                        {userInfo.first_name} {userInfo.last_name}
                      </span>
                    </div>
                    <div className="mt-1">
                      <span className="font-semibold">Email ID:</span>{" "}
                      <span className="font-normal">{userInfo.email}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <Label>
                    Domain <RequiredStar />
                  </Label>
                  <Input
                    value={domainDetails.domain_name ?? ""}
                    placeholder="Enter Domain"
                    onChange={(e) =>
                      setDomainDetails((p) => (p ? { ...p, domain_name: e.target.value } : p))
                    }
                  />
                </div>
              </div>

              {/* SPF */}
              <div>
                <h6 className="text-sm font-semibold text-gray-900">Add SPF Credentials</h6>
                <hr className="mt-2" />

                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <Label>
                      SPF Type <RequiredStar />
                    </Label>
                    <Select
                      value={domainDetails.spf_type ?? ""}
                      placeholder="Select Type"
                      options={[{ value: "TXT", label: "TXT" },{ value: "MX", label: "MX" }]}
                      onChange={(v) => setDomainDetails((p) => (p ? { ...p, spf_type: v } : p))}
                    />
                  </div>

                  <div>
                    <Label>
                      Host <RequiredStar />
                    </Label>
                    <Input
                      value={domainDetails.spf_host ?? ""}
                      placeholder="Enter Host"
                      onChange={(e) =>
                        setDomainDetails((p) => (p ? { ...p, spf_host: e.target.value } : p))
                      }
                    />
                  </div>

                  <div>
                    <Label>Priority</Label>
                    <Input
                      type="number"
                      value={domainDetails.spf_priority ?? ""}
                      placeholder="Enter Priority"
                      onChange={(e) =>
                        setDomainDetails((p) => (p ? { ...p, spf_priority: e.target.value } : p))
                      }
                    />
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label>
                      Add SPF Record <RequiredStar />
                    </Label>
                    <TextArea
                      rows={5}
                      value={domainDetails.spf_record ?? ""}
                      onChange={(e) =>
                        setDomainDetails((p) => (p ? { ...p, spf_record: e.target.value } : p))
                      }
                    />
                  </div>
                </div>
              </div>

              {/* DKIM */}
              <div>
                <h6 className="text-sm font-semibold text-gray-900">Add DKIM Credentials</h6>
                <hr className="mt-2" />

                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <Label>
                      DKIM Type <RequiredStar />
                    </Label>
                    <Select
                      value={domainDetails.dkim_type ?? ""}
                      placeholder="Select Type"
                      options={[{ value: "TXT", label: "TXT" },{ value: "MX", label: "MX" }]}
                      onChange={(v) => setDomainDetails((p) => (p ? { ...p, dkim_type: v } : p))}
                    />
                  </div>

                  <div>
                    <Label>
                      Host <RequiredStar />
                    </Label>
                    <Input
                      value={domainDetails.dkim_host ?? ""}
                      placeholder="Enter Host"
                      onChange={(e) =>
                        setDomainDetails((p) => (p ? { ...p, dkim_host: e.target.value } : p))
                      }
                    />
                  </div>

                  <div>
                    <Label>Priority</Label>
                    <Input
                      type="number"
                      value={domainDetails.dkim_priority ?? ""}
                      placeholder="Enter Priority"
                      onChange={(e) =>
                        setDomainDetails((p) => (p ? { ...p, dkim_priority: e.target.value } : p))
                      }
                    />
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label>
                      Add DKIM Record <RequiredStar />
                    </Label>
                    <TextArea
                      rows={5}
                      value={domainDetails.dkim_record ?? ""}
                      onChange={(e) =>
                        setDomainDetails((p) => (p ? { ...p, dkim_record: e.target.value } : p))
                      }
                    />
                  </div>

                  <div>
                    <Label>
                      Add DKIM Private Key <RequiredStar />
                    </Label>
                    <TextArea
                      rows={5}
                      value={domainDetails.dkim_private_key ?? ""}
                      onChange={(e) =>
                        setDomainDetails((p) =>
                          p ? { ...p, dkim_private_key: e.target.value } : p
                        )
                      }
                    />
                  </div>
                </div>
              </div>

              {/* DMARC */}
              <div>
                <h6 className="text-sm font-semibold text-gray-900">Add DMARC Credentials</h6>
                <hr className="mt-2" />

                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <Label>
                      DMARC Type <RequiredStar />
                    </Label>
                    <Select
                      value={domainDetails.dmarc_type ?? ""}
                      placeholder="Select Type"
                      options={[{ value: "TXT", label: "TXT" },{ value: "MX", label: "MX" }]}
                      onChange={(v) => setDomainDetails((p) => (p ? { ...p, dmarc_type: v } : p))}
                    />
                  </div>

                  <div>
                    <Label>
                      Host <RequiredStar />
                    </Label>
                    <Input
                      value={domainDetails.dmarc_host ?? ""}
                      placeholder="Enter Host"
                      onChange={(e) =>
                        setDomainDetails((p) => (p ? { ...p, dmarc_host: e.target.value } : p))
                      }
                    />
                  </div>

                  <div>
                    <Label>Priority</Label>
                    <Input
                      value={domainDetails.dmarc_priority ?? ""}
                      placeholder="Enter Priority"
                      onChange={(e) =>
                        setDomainDetails((p) => (p ? { ...p, dmarc_priority: e.target.value } : p))
                      }
                    />
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label>
                      Add DMARC Record <RequiredStar />
                    </Label>
                    <TextArea
                      rows={5}
                      value={domainDetails.dmarc_record ?? ""}
                      onChange={(e) =>
                        setDomainDetails((p) => (p ? { ...p, dmarc_record: e.target.value } : p))
                      }
                    />
                  </div>
                </div>
              </div>

              {/* CNAME */}
              <div>
                <h6 className="text-sm font-semibold text-gray-900">Add CNAME Credentials</h6>
                <hr className="mt-2" />

                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <Label>CNAME Type</Label>
                    <Select
                      value={domainDetails.cname_type ?? ""}
                      placeholder="Select Type"
                      options={[{ value: "TXT", label: "TXT" },{ value: "MX", label: "MX" },{ value: "CNAME", label: "CNAME" }]}
                      onChange={(v) => setDomainDetails((p) => (p ? { ...p, cname_type: v } : p))}
                    />
                  </div>

                  <div>
                    <Label>Host</Label>
                    <Input
                      value={domainDetails.cname_host ?? ""}
                      placeholder="Enter Host"
                      onChange={(e) =>
                        setDomainDetails((p) => (p ? { ...p, cname_host: e.target.value } : p))
                      }
                    />
                  </div>

                  <div>
                    <Label>Priority</Label>
                    <Input
                      type="number"
                      value={domainDetails.cname_priority ?? ""}
                      placeholder="Enter Priority"
                      onChange={(e) =>
                        setDomainDetails((p) => (p ? { ...p, cname_priority: e.target.value } : p))
                      }
                    />
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label>Add CNAME Record</Label>
                    <TextArea
                      rows={5}
                      value={domainDetails.cname_record ?? ""}
                      onChange={(e) =>
                        setDomainDetails((p) => (p ? { ...p, cname_record: e.target.value } : p))
                      }
                    />
                  </div>
                </div>
              </div>

              {/* MX */}
              <div>
                <h6 className="text-sm font-semibold text-gray-900">Add MX Credentials</h6>
                <hr className="mt-2" />

                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <Label>MX Type</Label>
                    <Select
                      value={domainDetails.mx_type ?? ""}
                      placeholder="Select Type"
                      options={[{ value: "TXT", label: "TXT" },{ value: "MX", label: "MX" },{ value: "CNAME", label: "CNAME" }]}
                      onChange={(v) => setDomainDetails((p) => (p ? { ...p, mx_type: v } : p))}
                    />
                  </div>

                  <div>
                    <Label>Host</Label>
                    <Input
                      value={domainDetails.mx_host ?? ""}
                      placeholder="Enter Host"
                      onChange={(e) =>
                        setDomainDetails((p) => (p ? { ...p, mx_host: e.target.value } : p))
                      }
                    />
                  </div>

                  <div>
                    <Label>Priority</Label>
                    <Input
                      type="number"
                      value={domainDetails.mx_priority ?? ""}
                      placeholder="Enter Priority"
                      onChange={(e) =>
                        setDomainDetails((p) => (p ? { ...p, mx_priority: e.target.value } : p))
                      }
                    />
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label>Add MX Record</Label>
                    <TextArea
                      rows={5}
                      value={domainDetails.mx_record ?? ""}
                      onChange={(e) =>
                        setDomainDetails((p) => (p ? { ...p, mx_record: e.target.value } : p))
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Submit */}
              <div className="pt-2 flex items-center gap-3">
                <button
                  type="submit"
                  disabled={submitDisabled}
                  className={`rounded px-4 py-2 text-sm font-semibold text-white ${
                    submitDisabled ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
                  }`}
                >
                  {isSubmitting ? "Updateing..." : "Update"}
                </button>

                {!isDirty && (
                  <span className="text-xs text-gray-500">No changes yet</span>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
