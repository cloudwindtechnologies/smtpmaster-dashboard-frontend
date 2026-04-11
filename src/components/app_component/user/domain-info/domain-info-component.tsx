"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Loader2,
  Plus,
  CheckCircle,
  XCircle,
  Copy,
  RefreshCw,
  Shield,
  Search,
  ChevronDown,
  ChevronUp,
  Globe,
  ShieldAlert,
  Zap,
  Clock,
  AlertCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import { token } from "../../common/http";

type DomainItem = {
  id: number;
  domain_name: string;
  spf_type?: string;
  spf_record?: string;
  spf_priority?: string;
  spf_is_valid?: string;
  dkim_type?: string;
  dkim_host?: string;
  dkim_record?: string;
  dkim_priority?: string;
  dkim_is_valid?: string;
  dmarc_type?: string;
  dmarc_host?: string;
  dmarc_record?: string;
  dmarc_priority?: string;
  dmarc_is_valid?: string;
};

type ApiResponse = {
  code: number;
  message: string;
  data: { domainList: DomainItem[] };
};

type RecordType = "SPF" | "DKIM" | "DMARC";

const RECORD_META: Record<
  RecordType,
  {
    color: string;
    bgSoft: string;
    borderColor: string;
    icon: React.ReactNode;
  }
> = {
  SPF: {
    color: "text-[var(--info)]",
    bgSoft: "bg-[var(--info-soft)]",
    borderColor: "border-[var(--info)]/20",
    icon: <Shield className="h-5 w-5" />,
  },
  DKIM: {
    color: "text-[var(--violet)]",
    bgSoft: "bg-[var(--violet-soft)]",
    borderColor: "border-[var(--violet)]/20",
    icon: <Shield className="h-5 w-5" />,
  },
  DMARC: {
    color: "text-[var(--warning)]",
    bgSoft: "bg-[var(--warning-soft)]",
    borderColor: "border-[var(--warning)]/20",
    icon: <Shield className="h-5 w-5" />,
  },
};

const CHECK_API: Record<RecordType, { url: string }> = {
  SPF: { url: "/api/domain-info/check-spf" },
  DKIM: { url: "/api/domain-info/check-dkim" },
  DMARC: { url: "/api/domain-info/check-dmark" },
};

const sanitizeDomain = (value: string) => {
  return value.trim().replace(/^https?:\/\//i, "");
};

const isValidDomain = (d: string) =>
  /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(d.trim());

export default function UserInfo() {
  const [domainList, setDomainList] = useState<DomainItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [newDomain, setNewDomain] = useState("");
  const [adding, setAdding] = useState(false);

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingDomain, setPendingDomain] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const [expandedDomainId, setExpandedDomainId] = useState<number | null>(null);

  const [checking, setChecking] = useState<Record<RecordType, boolean>>({
    SPF: false,
    DKIM: false,
    DMARC: false,
  });

  const [cooldowns, setCooldowns] = useState<Record<string, number>>({});
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setTick((t) => t + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchDomains = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      setRefreshing(true);

      const res = await fetch("api/domain-info", {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token()}`,
        },
        cache: "no-store",
      });

      const json: ApiResponse = await res.json();

      if (!res.ok || json?.code !== 200) {
        throw new Error(json?.message || "Failed to load domains");
      }

      const list = Array.isArray(json?.data?.domainList)
        ? json.data.domainList
        : [];

      setDomainList(list);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load domains");
      setDomainList([]);
    } finally {
      if (showLoading) setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDomains(true);
  }, [fetchDomains]);

  const openConfirmPopup = () => {
    const typedDomain = newDomain.trim();

    if (!typedDomain) {
      toast.error("Please enter a domain name");
      return;
    }

    const cleanedDomain = sanitizeDomain(typedDomain);

    if (!isValidDomain(cleanedDomain)) {
      toast.error("Please enter a valid domain name");
      return;
    }

    setPendingDomain(cleanedDomain);
    setShowConfirmModal(true);
  };

  const handleAddDomain = async () => {
    const domain = sanitizeDomain(pendingDomain);

    if (!domain) {
      toast.error("Please enter a domain name");
      return;
    }

    if (!isValidDomain(domain)) {
      toast.error("Please enter a valid domain name");
      return;
    }

    try {
      setAdding(true);

      const res = await fetch("/api/domain-info/add", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${token()}`,
        },
        body: JSON.stringify({ domain_name: domain }),
      });

      const json: any = await res.json();

      if (!res.ok || json?.code !== 200) {
        throw new Error(json?.message || "Failed to add domain");
      }

      toast.success(json?.data || json?.message || "Domain added");
      setNewDomain("");
      setPendingDomain("");
      setShowConfirmModal(false);
      await fetchDomains(false);
    } catch (e: any) {
      toast.error(e?.message || "Failed to add domain");
    } finally {
      setAdding(false);
    }
  };

  const handleCopy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied`);
    } catch {
      toast.error("Copy failed");
    }
  };

  const handleCheckNow = async (type: RecordType, domainId: number) => {
    const cooldownKey = `${domainId}-${type}`;
    const now = Date.now();

    if (cooldowns[cooldownKey] && now - cooldowns[cooldownKey] < 30000) {
      const remaining = Math.ceil((30000 - (now - cooldowns[cooldownKey])) / 1000);
      toast.error(`Please wait ${remaining}s before checking again`);
      return;
    }

    if (checking[type]) return;

    try {
      setChecking((p) => ({ ...p, [type]: true }));
      setCooldowns((prev) => ({ ...prev, [cooldownKey]: now }));

      const url = new URL(CHECK_API[type].url, window.location.origin);
      url.searchParams.set("domain_id", String(domainId));

      const res = await fetch(url.toString(), {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token()}`,
        },
        cache: "no-store",
      });

      const json: any = await res.json();

      if (!res.ok || json?.code !== 200) {
        throw new Error(json?.message || `Failed to check ${type}`);
      }

      toast.success(json?.message || `${type} checked`);
      await fetchDomains(false);
    } catch (e: any) {
      toast.error(e?.message || `Failed to check ${type}`);
    } finally {
      setChecking((p) => ({ ...p, [type]: false }));
    }
  };

  const toggleExpand = (domainId: number) => {
    setExpandedDomainId((prev) => (prev === domainId ? null : domainId));
  };

  const filteredDomains = useMemo(() => {
    return domainList.filter((d) =>
      d.domain_name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [domainList, searchQuery]);

  const totalPages = Math.ceil(filteredDomains.length / itemsPerPage);

  const paginatedDomains = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredDomains.slice(start, start + itemsPerPage);
  }, [filteredDomains, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const getStatusBadge = (isValid?: string) => {
    const valid = isValid === "1";

    return valid ? (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--success)]/20 bg-[var(--success-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--success)]">
        <CheckCircle className="h-3.5 w-3.5" />
        Valid
      </span>
    ) : (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--danger)]/20 bg-[var(--danger-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--danger)]">
        <XCircle className="h-3.5 w-3.5" />
        Invalid
      </span>
    );
  };

  const getHealthScore = (domain: DomainItem) => {
    let score = 0;
    if (domain.spf_is_valid === "1") score += 33;
    if (domain.dkim_is_valid === "1") score += 33;
    if (domain.dmarc_is_valid === "1") score += 34;
    return score;
  };

  return (
    <>
      <div
        className="min-h-screen bg-[var(--page-bg)]"
        style={{ borderRadius: "var(--page-radius)" }}
      >
        <div
          className="bg-[var(--brand)] text-[var(--text-on-dark)]"
          style={{ borderRadius: "var(--page-radius)" }}
        >
          <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
            <h1 className="text-xl font-bold tracking-tight">Domain Management</h1>
            <p className="mt-2 text-sm text-[var(--text-on-dark)]/80">
              Manage sender domains and verify DNS records for optimal deliverability
            </p>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div
            className="mb-6 border border-[var(--line-soft)] bg-[var(--surface)] p-6 shadow-[var(--shadow-panel)]"
            style={{ borderRadius: "var(--page-radius)" }}
          >
            <div className="flex flex-col items-end gap-4 md:flex-row">
              <div className="w-full flex-1">
                <label className="mb-2 block text-sm font-medium text-[var(--text-soft)]">
                  Add New Domain <span className="text-[var(--danger)]">*</span>
                </label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--text-faint)]" />
                  <input
                    value={newDomain}
                    onChange={(e) => setNewDomain(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        openConfirmPopup();
                      }
                    }}
                    placeholder="example.com"
                    className="w-full border border-[var(--line-soft)] bg-[var(--surface)] pl-10 pr-4 py-3 text-sm text-[var(--text-strong)] outline-none transition focus:border-[var(--line-strong)] focus:ring-2 focus:ring-[var(--ring)]"
                    style={{ borderRadius: "var(--page-radius)" }}
                    disabled={adding}
                  />
                </div>
              </div>

              <button
                onClick={openConfirmPopup}
                disabled={adding || !newDomain.trim()}
                className="inline-flex w-full items-center justify-center gap-2 bg-[var(--brand)] px-6 py-3 text-sm font-semibold text-[var(--text-on-dark)] shadow-sm transition hover:bg-[var(--brand-strong)] disabled:opacity-50 disabled:cursor-not-allowed md:w-auto"
                style={{ borderRadius: "var(--page-radius)" }}
              >
                {adding ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                Add Domain
              </button>
            </div>
          </div>

          <div
            className="border border-[var(--line-soft)] bg-[var(--surface)] shadow-[var(--shadow-panel)] overflow-hidden"
            style={{ borderRadius: "var(--page-radius)" }}
          >
            <div className="border-b border-[var(--line-soft)] bg-[var(--surface-2)] p-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative w-full sm:w-96">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-faint)]" />
                  <input
                    type="text"
                    placeholder="Search domains..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full border border-[var(--line-soft)] bg-[var(--surface)] py-2.5 pl-10 pr-4 text-sm text-[var(--text-strong)] outline-none transition focus:border-[var(--line-strong)] focus:ring-2 focus:ring-[var(--ring)]"
                    style={{ borderRadius: "var(--page-radius)" }}
                  />
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-sm text-[var(--text-soft)]">
                    Showing <span className="font-semibold text-[var(--text-strong)]">{paginatedDomains.length}</span> of{" "}
                    <span className="font-semibold text-[var(--text-strong)]">{filteredDomains.length}</span> domains
                  </span>
                  <button
                    onClick={() => fetchDomains(false)}
                    disabled={refreshing}
                    className="inline-flex items-center justify-center border border-[var(--line-soft)] bg-[var(--surface)] px-4 py-2 text-sm font-medium text-[var(--text-body)] shadow-sm transition hover:bg-[var(--surface-soft)] disabled:opacity-50"
                    style={{ borderRadius: "var(--page-radius)" }}
                    title="Refresh"
                  >
                    <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                  </button>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--line-soft)] bg-[var(--surface-2)]">
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-soft)]">
                      Domain Name
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider text-[var(--text-soft)]">
                      SPF
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider text-[var(--text-soft)]">
                      DKIM
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider text-[var(--text-soft)]">
                      DMARC
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider text-[var(--text-soft)]">
                      Completed
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-[var(--text-soft)]">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[var(--line-soft)]">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-16 text-center">
                        <Loader2 className="mx-auto h-8 w-8 animate-spin text-[var(--brand)]" />
                        <p className="mt-2 text-[var(--text-soft)]">Loading domains...</p>
                      </td>
                    </tr>
                  ) : paginatedDomains.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-16 text-center text-[var(--text-soft)]">
                        <div className="flex flex-col items-center gap-2">
                          <Globe className="h-12 w-12 text-[var(--line-soft)]" />
                          <p>No domains found. Add one to get started.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedDomains.map((domain) => {
                      const isExpanded = expandedDomainId === domain.id;
                      const healthScore = getHealthScore(domain);

                      return (
                        <React.Fragment key={domain.id}>
                          <tr
                            className={`transition-colors hover:bg-[var(--surface-soft)] ${
                              isExpanded ? "bg-[var(--brand-soft)]" : ""
                            }`}
                          >
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div
                                  className={`p-2 ${
                                    isExpanded
                                      ? "bg-[var(--brand)] text-[var(--text-on-dark)]"
                                      : "bg-[var(--surface-soft)] text-[var(--text-soft)]"
                                  }`}
                                  style={{ borderRadius: "var(--page-radius)" }}
                                >
                                  <Globe className="h-5 w-5" />
                                </div>
                                <div>
                                  <p className="font-semibold text-[var(--text-strong)]">{domain.domain_name}</p>
                                  <p className="text-xs text-[var(--text-faint)] mt-0.5">Click to manage records</p>
                                </div>
                              </div>
                            </td>

                            <td className="px-6 py-4 text-center">{getStatusBadge(domain.spf_is_valid)}</td>
                            <td className="px-6 py-4 text-center">{getStatusBadge(domain.dkim_is_valid)}</td>
                            <td className="px-6 py-4 text-center">{getStatusBadge(domain.dmarc_is_valid)}</td>

                            <td className="px-6 py-4 text-center">
                              <div className="flex flex-col items-center gap-1">
                                <div className="flex items-center gap-2">
                                  <div className="h-2 w-16 rounded-full bg-[var(--surface-soft-2)] overflow-hidden">
                                    <div
                                      className={`h-full transition-all duration-500 ${
                                        healthScore === 100
                                          ? "bg-[var(--success)]"
                                          : healthScore >= 66
                                          ? "bg-[var(--warning)]"
                                          : "bg-[var(--danger)]"
                                      }`}
                                      style={{
                                        width: `${healthScore}%`,
                                        borderRadius: "var(--page-radius)",
                                      }}
                                    />
                                  </div>
                                  <span className="text-xs font-semibold text-[var(--text-body)]">
                                    {healthScore}%
                                  </span>
                                </div>
                              </div>
                            </td>

                            <td className="px-6 py-4 text-right">
                              <button
                                onClick={() => toggleExpand(domain.id)}
                                className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium transition-all ${
                                  isExpanded
                                    ? "bg-[var(--brand)] text-[var(--text-on-dark)] shadow-sm hover:bg-[var(--brand-strong)]"
                                    : "bg-[var(--surface-soft)] text-[var(--text-body)] hover:bg-[var(--surface-soft-2)]"
                                }`}
                                style={{ borderRadius: "var(--page-radius)" }}
                              >
                                {isExpanded ? (
                                  <>
                                    <ChevronUp className="h-4 w-4" />
                                    Close
                                  </>
                                ) : (
                                  <>
                                    <ChevronDown className="h-4 w-4" />
                                    Manage
                                  </>
                                )}
                              </button>
                            </td>
                          </tr>

                          <tr>
                            <td colSpan={6} className="p-0">
                              <div
                                className={`overflow-hidden transition-all duration-300 ease-in-out ${
                                  isExpanded ? "max-h-[800px] opacity-100" : "max-h-0 opacity-0"
                                }`}
                              >
                                <div className="border-t border-[var(--brand)]/20 bg-[var(--surface-2)] p-6">
                                  <div className="mb-4 flex items-center justify-between">
                                    <h3 className="text-lg font-semibold text-[var(--text-strong)] flex items-center gap-2">
                                      <Zap className="h-5 w-5 text-[var(--brand)]" />
                                      DNS Configuration
                                    </h3>
                                    <div className="flex items-center gap-2 text-xs text-[var(--text-soft)]">
                                      <Clock className="h-4 w-4" />
                                      Last updated: Just now
                                    </div>
                                  </div>

                                  <div className="grid gap-4 lg:grid-cols-3">
                                    <RecordCard
                                      type="SPF"
                                      domain={domain}
                                      recordValue={domain.spf_record}
                                      recordType={domain.spf_type}
                                      isValid={domain.spf_is_valid === "1"}
                                      onCheck={() => handleCheckNow("SPF", domain.id)}
                                      checking={checking.SPF}
                                      cooldownKey={`${domain.id}-SPF`}
                                      cooldowns={cooldowns}
                                      onCopy={handleCopy}
                                      tick={tick}
                                    />

                                    <RecordCard
                                      type="DKIM"
                                      domain={domain}
                                      recordValue={domain.dkim_record}
                                      recordType={domain.dkim_type}
                                      host={domain.dkim_host}
                                      isValid={domain.dkim_is_valid === "1"}
                                      onCheck={() => handleCheckNow("DKIM", domain.id)}
                                      checking={checking.DKIM}
                                      cooldownKey={`${domain.id}-DKIM`}
                                      cooldowns={cooldowns}
                                      onCopy={handleCopy}
                                      tick={tick}
                                    />

                                    <RecordCard
                                      type="DMARC"
                                      domain={domain}
                                      recordValue={domain.dmarc_record}
                                      recordType={domain.dmarc_type}
                                      host={domain.dmarc_host}
                                      isValid={domain.dmarc_is_valid === "1"}
                                      onCheck={() => handleCheckNow("DMARC", domain.id)}
                                      checking={checking.DMARC}
                                      cooldownKey={`${domain.id}-DMARC`}
                                      cooldowns={cooldowns}
                                      onCopy={handleCopy}
                                      tick={tick}
                                    />
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-[var(--line-soft)] bg-[var(--surface-2)] px-6 py-4">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="inline-flex items-center gap-1 border border-[var(--line-soft)] bg-[var(--surface)] px-4 py-2 text-sm font-medium text-[var(--text-body)] transition hover:bg-[var(--surface-soft)] disabled:cursor-not-allowed disabled:opacity-50"
                  style={{ borderRadius: "var(--page-radius)" }}
                >
                  <ChevronUp className="h-4 w-4 rotate-[-90deg]" />
                  Previous
                </button>

                <div className="flex items-center gap-2">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`px-4 py-2 text-sm font-medium transition ${
                        currentPage === page
                          ? "bg-[var(--brand)] text-[var(--text-on-dark)] shadow-sm"
                          : "border border-[var(--line-soft)] bg-[var(--surface)] text-[var(--text-body)] hover:bg-[var(--surface-soft)]"
                      }`}
                      style={{ borderRadius: "var(--page-radius)" }}
                    >
                      {page}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="inline-flex items-center gap-1 border border-[var(--line-soft)] bg-[var(--surface)] px-4 py-2 text-sm font-medium text-[var(--text-body)] transition hover:bg-[var(--surface-soft)] disabled:cursor-not-allowed disabled:opacity-50"
                  style={{ borderRadius: "var(--page-radius)" }}
                >
                  Next
                  <ChevronUp className="h-4 w-4 rotate-90" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {showConfirmModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 px-4">
          <div
            className="w-full max-w-md border border-[var(--line-soft)] bg-white shadow-2xl"
            style={{ borderRadius: "var(--page-radius)" }}
          >
            <div className="border-b border-[var(--line-soft)] px-6 py-4">
              <h2 className="text-lg font-bold text-[var(--text-strong)]">
                Confirm Domain Addition
              </h2>
            </div>

            <div className="px-6 py-5">
              <p className="text-sm text-[var(--text-body)]">
                Are you sure you want to add{" "}
                <span className="font-semibold text-[var(--brand)]">{pendingDomain}</span>?
              </p>

              <p className="mt-3 text-sm leading-6 text-[var(--text-soft)]">
                Once added, your outgoing emails will be sent from this domain
                <br />
                <span className="font-medium text-[var(--text-body)]">
                  (e.g., name@{pendingDomain} or sales@{pendingDomain})
                </span>
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-[var(--line-soft)] px-6 py-4">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                disabled={adding}
                className="px-4 py-2 text-sm font-medium text-[var(--text-body)] border border-[var(--line-soft)] bg-[var(--surface)] hover:bg-[var(--surface-soft)] disabled:opacity-50"
                style={{ borderRadius: "var(--page-radius)" }}
              >
                Edit
              </button>

              <button
                type="button"
                onClick={handleAddDomain}
                disabled={adding}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-[var(--brand)] text-[var(--text-on-dark)] hover:bg-[var(--brand-strong)] disabled:opacity-50"
                style={{ borderRadius: "var(--page-radius)" }}
              >
                {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

interface RecordCardProps {
  type: RecordType;
  domain: DomainItem;
  recordValue?: string;
  recordType?: string;
  host?: string;
  isValid: boolean;
  onCheck: () => void;
  checking: boolean;
  cooldownKey: string;
  cooldowns: Record<string, number>;
  onCopy: (text: string, label: string) => void;
  tick: number;
}

function RecordCard({
  type,
  domain,
  recordValue,
  recordType,
  host,
  isValid,
  onCheck,
  checking,
  cooldownKey,
  cooldowns,
  onCopy,
  tick,
}: RecordCardProps) {
  const meta = RECORD_META[type];

  const fullHost =
    type === "SPF"
      ? domain.domain_name
      : `${host || (type === "DKIM" ? "default._domainkey" : "_dmarc")}.${domain.domain_name}`;

  const now = Date.now();
  const lastClicked = cooldowns[cooldownKey] || 0;
  const isCooldown = now - lastClicked < 30000;
  const remainingSeconds = isCooldown
    ? Math.ceil((30000 - (now - lastClicked)) / 1000)
    : 0;

  return (
    <div
      className={`border ${meta.borderColor} ${meta.bgSoft} p-4 transition-all hover:shadow-[var(--shadow-soft)]`}
      style={{ borderRadius: "var(--page-radius)" }}
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className={`bg-[var(--surface)] p-1.5 shadow-sm ${meta.color}`}
            style={{ borderRadius: "var(--page-radius)" }}
          >
            {meta.icon}
          </div>
          <h4 className={`font-bold ${meta.color}`}>{type} Record</h4>
        </div>

        {isValid ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-[var(--surface)] px-2.5 py-1 text-xs font-bold text-[var(--success)] shadow-sm border border-[var(--success)]/20">
            <CheckCircle className="h-3 w-3" />
            Active
          </span>
        ) : (
          <button
            onClick={onCheck}
            disabled={checking || isCooldown}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold transition-all ${
              isCooldown
                ? "bg-[var(--surface-soft-2)] text-[var(--text-faint)] cursor-not-allowed"
                : "bg-[var(--surface)] text-[var(--brand)] shadow-sm border border-[var(--brand)]/20 hover:bg-[var(--brand-soft)]"
            }`}
            style={{ borderRadius: "var(--page-radius)" }}
          >
            {checking ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : isCooldown ? (
              <span className="tabular-nums">Wait {remainingSeconds}s</span>
            ) : (
              <>
                <AlertCircle className="h-3 w-3" />
                Verify
              </>
            )}
          </button>
        )}
      </div>

      {recordValue ? (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[var(--text-soft)] uppercase tracking-wider">
              Host
            </label>
            <div
              className="flex items-center gap-2 border border-[var(--line-soft)] bg-[var(--surface)] p-2.5 shadow-[var(--shadow-soft)]"
              style={{ borderRadius: "var(--page-radius)" }}
            >
              <code className="flex-1 break-all text-xs text-[var(--text-body)] font-mono">
                {fullHost}
              </code>
              <button
                onClick={() => onCopy(fullHost, `${type} Host`)}
                className="rounded p-1.5 text-[var(--text-faint)] transition hover:bg-[var(--surface-soft)] hover:text-[var(--text-body)]"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[var(--text-soft)] uppercase tracking-wider">
              Type
            </label>
            <div
              className="border border-[var(--line-soft)] bg-[var(--surface)] px-3 py-2 text-xs font-mono text-[var(--text-body)] shadow-[var(--shadow-soft)]"
              style={{ borderRadius: "var(--page-radius)" }}
            >
              {recordType || "TXT"}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[var(--text-soft)] uppercase tracking-wider">
              Value
            </label>
            <div
              className="flex items-start gap-2 border border-[var(--line-soft)] bg-[var(--surface)] p-2.5 shadow-[var(--shadow-soft)]"
              style={{ borderRadius: "var(--page-radius)" }}
            >
              <code className="flex-1 break-all text-[11px] leading-relaxed text-[var(--text-soft)] font-mono max-h-24 overflow-y-auto">
                {recordValue}
              </code>
              <button
                onClick={() => onCopy(recordValue, `${type} Value`)}
                className="rounded p-1.5 text-[var(--text-faint)] transition hover:bg-[var(--surface-soft)] hover:text-[var(--text-body)] shrink-0"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div
          className="flex flex-col items-center justify-center gap-2 border border-dashed border-[var(--line-soft)] bg-[var(--surface)]/50 p-6 text-center"
          style={{ borderRadius: "var(--page-radius)" }}
        >
          <ShieldAlert className={`h-8 w-8 ${meta.color}`} />
          <p className="text-xs text-[var(--text-soft)] leading-relaxed">
            Record generation in progress. Please wait...
          </p>
        </div>
      )}
    </div>
  );
}