"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { 
  ChevronDown, 
  Loader2, 
  Plus, 
  CheckCircle, 
  XCircle, 
  Copy, 
  RefreshCw, 
  Shield, 
  Search, 
  Eye, 
  X,
  ChevronLeft,
  ChevronRight,
  Globe,
  ShieldAlert
} from "lucide-react";
import toast from "react-hot-toast";
import { token } from "../../common/http";

// --- Types ---

type DomainItem = {
  id: number;
  domain_name: string;
  spf_type?: string;
  spf_record?: string;
  spf_priority?: string;
  spf_is_valid?: string; // "1" or "0"
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

// --- Constants & Helpers ---

const RECORD_META: Record<RecordType, { color: string; icon: React.ReactNode }> = {
  SPF: { color: "bg-blue-500/10 text-blue-700 border-blue-500/20", icon: <Shield className="h-4 w-4" /> },
  DKIM: { color: "bg-violet-500/10 text-violet-700 border-violet-500/20", icon: <Shield className="h-4 w-4" /> },
  DMARC: { color: "bg-amber-500/10 text-amber-700 border-amber-500/20", icon: <Shield className="h-4 w-4" /> },
};

const CHECK_API: Record<RecordType, { url: string }> = {
  SPF: { url: "/api/domain-info/check-spf" },
  DKIM: { url: "/api/domain-info/check-dkim" },
  DMARC: { url: "/api/domain-info/check-dmark" },
};

const normalizePriority = (p?: string) => {
  const v = (p ?? "").trim();
  if (!v || v === "—" || v === "-" || v.toLowerCase() === "null") return "";
  return v;
};

const isValidDomain = (d: string) => /^[a-z0-9.-]+\.[a-z]{2,}$/.test(d.trim().toLowerCase());

// --- Components ---

export default function UserInfo() {
  // -- State: Data --
  const [domainList, setDomainList] = useState<DomainItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // -- State: Add Domain --
  const [newDomain, setNewDomain] = useState("");
  const [adding, setAdding] = useState(false);

  // -- State: Table View --
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // -- State: Modal View --
  const [viewDomain, setViewDomain] = useState<DomainItem | null>(null);
  const [checking, setChecking] = useState<Record<RecordType, boolean>>({
    SPF: false, DKIM: false, DMARC: false,
  });
  // Cooldown state: stores timestamp when check was last clicked
  const [cooldowns, setCooldowns] = useState<Record<string, number>>({}); 

  // -- Data Fetching --

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
      if (!res.ok || json?.code !== 200) throw new Error(json?.message || "Failed to load domains");

      const list = Array.isArray(json?.data?.domainList) ? json.data.domainList : [];
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

  // -- Actions --

  const handleAddDomain = async () => {
    const domain = newDomain.trim().toLowerCase();
    if (!domain) return toast.error("Please enter a domain name");
    if (!isValidDomain(domain)) return toast.error("Please enter a valid domain name");

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
      if (!res.ok || json?.code !== 200) throw new Error(json?.message || "Failed to add domain");

      toast.success(json?.data ||json?.message || "Domain added");
      setNewDomain("");
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

  // Check logic with 30s Cooldown
  const handleCheckNow = async (type: RecordType, domainId: number) => {
    const cooldownKey = `${domainId}-${type}`;
    const now = Date.now();
    
    // Check if in cooldown (30 seconds = 30000ms)
    if (cooldowns[cooldownKey] && (now - cooldowns[cooldownKey]) < 30000) {
      const remaining = Math.ceil((30000 - (now - cooldowns[cooldownKey])) / 1000);
      toast.error(`Please wait ${remaining}s before checking again`);
      return;
    }

    if (checking[type]) return;

    try {
      setChecking((p) => ({ ...p, [type]: true }));
      
      // Set cooldown immediately to prevent double clicks
      setCooldowns(prev => ({ ...prev, [cooldownKey]: now }));

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
      if (!res.ok || json?.code !== 200) throw new Error(json?.message || `Failed to check ${type}`);

      toast.success(json?.message || `${type} checked`);
      await fetchDomains(false); // Refresh list to show new status
    } catch (e: any) {
      toast.error(e?.message || `Failed to check ${type}`);
    } finally {
      setChecking((p) => ({ ...p, [type]: false }));
    }
  };

  // -- Derived Data for Table --

  const filteredDomains = useMemo(() => {
    return domainList.filter(d => 
      d.domain_name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [domainList, searchQuery]);

  const totalPages = Math.ceil(filteredDomains.length / itemsPerPage);
  const paginatedDomains = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredDomains.slice(start, start + itemsPerPage);
  }, [filteredDomains, currentPage]);

  // Reset to page 1 if search changes and results shrink
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // -- Render Helpers --

  const getStatusBadge = (isValid?: string) => {
    const valid = isValid === "1";
    return valid ? (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
        <CheckCircle className="h-3.5 w-3.5" /> Valid
      </span>
    ) : (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-600 border border-red-500/20">
        <XCircle className="h-3.5 w-3.5" /> Invalid
      </span>
    );
  };

  return (
    <div className="min-h-screen p-4 md:p-8 bg-[var(--page-bg)] text-foreground">
      <div className="mx-auto max-w-6xl space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Domain Management</h1>
            <p className="text-muted-foreground mt-1">Manage sender domains and verify DNS records.</p>
          </div>
          <div className="flex items-center gap-3">
             <button
                onClick={() => fetchDomains(false)}
                disabled={refreshing}
                className="inline-flex items-center justify-center rounded-xl border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent transition disabled:opacity-50"
                title="Refresh"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
                Refresh
              </button>
          </div>
        </div>

        {/* Add Domain Card */}
        <div className="rounded-2xl border bg-card text-card-foreground shadow-sm p-6">
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 w-full">
              <label className="block text-sm font-medium mb-2 text-muted-foreground">
                Add New Domain <span className="text-destructive">*</span>
              </label>
              <input
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddDomain()}
                placeholder="example.com"
                className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring transition"
                disabled={adding}
              />
            </div>
            <button
              onClick={handleAddDomain}
              disabled={adding || !newDomain.trim()}
              className="w-full md:w-auto inline-flex items-center justify-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold bg-primary text-primary-foreground hover:opacity-90 transition disabled:opacity-50 shadow-sm"
            >
              {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Add Domain
            </button>
          </div>
        </div>

        {/* Main Table Card */}
        <div className="rounded-2xl border bg-card text-card-foreground shadow-sm overflow-hidden">
          
          {/* Toolbar */}
          <div className="p-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-muted/30">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input 
                type="text" 
                placeholder="Search domains..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-lg border border-input bg-background text-sm focus:ring-2 focus:ring-ring outline-none"
              />
            </div>
            <div className="text-sm text-muted-foreground">
              Showing {paginatedDomains.length} of {filteredDomains.length} domains
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground uppercase text-xs font-semibold">
                <tr>
                  <th className="px-6 py-4">Domain Name</th>
                  <th className="px-6 py-4 text-center">SPF Status</th>
                  <th className="px-6 py-4 text-center">DKIM Status</th>
                  <th className="px-6 py-4 text-center">DMARC Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                    </td>
                  </tr>
                ) : paginatedDomains.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                      No domains found. Add one to get started.
                    </td>
                  </tr>
                ) : (
                  paginatedDomains.map((domain) => (
                    <tr key={domain.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4 font-medium text-foreground">
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4 text-muted-foreground" />
                          {domain.domain_name}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">{getStatusBadge(domain.spf_is_valid)}</td>
                      <td className="px-6 py-4 text-center">{getStatusBadge(domain.dkim_is_valid)}</td>
                      <td className="px-6 py-4 text-center">{getStatusBadge(domain.dmarc_is_valid)}</td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => setViewDomain(domain)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 text-xs font-medium transition"
                        >
                          <Eye className="h-3.5 w-3.5" /> View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="p-4 border-t flex items-center justify-between bg-muted/30">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border bg-background text-xs font-medium hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Previous
              </button>
              <span className="text-xs text-muted-foreground">
                Page {currentPage} of {totalPages}
              </span>
              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border bg-background text-xs font-medium hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* --- Detail Modal --- */}
      {viewDomain && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl border flex flex-col animate-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="p-6 border-b flex items-center justify-between sticky top-0 bg-card z-10">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Globe className="h-5 w-5 text-primary" />
                  {viewDomain.domain_name}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">DNS Configuration Details</p>
              </div>
              <button 
                onClick={() => setViewDomain(null)}
                className="p-2 rounded-full hover:bg-muted transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              
              {/* SPF Section */}
              <RecordSection 
                type="SPF"
                domain={viewDomain}
                recordValue={viewDomain.spf_record}
                recordType={viewDomain.spf_type}
                isValid={viewDomain.spf_is_valid === "1"}
                onCheck={() => handleCheckNow("SPF", viewDomain.id)}
                checking={checking.SPF}
                cooldownKey={`${viewDomain.id}-SPF`}
                cooldowns={cooldowns}
                onCopy={handleCopy}
              />

              <div className="h-px bg-border" />

              {/* DKIM Section */}
              <RecordSection 
                type="DKIM"
                domain={viewDomain}
                recordValue={viewDomain.dkim_record}
                recordType={viewDomain.dkim_type}
                host={viewDomain.dkim_host}
                isValid={viewDomain.dkim_is_valid === "1"}
                onCheck={() => handleCheckNow("DKIM", viewDomain.id)}
                checking={checking.DKIM}
                cooldownKey={`${viewDomain.id}-DKIM`}
                cooldowns={cooldowns}
                onCopy={handleCopy}
              />

              <div className="h-px bg-border" />

              {/* DMARC Section */}
              <RecordSection 
                type="DMARC"
                domain={viewDomain}
                recordValue={viewDomain.dmarc_record}
                recordType={viewDomain.dmarc_type}
                host={viewDomain.dmarc_host}
                isValid={viewDomain.dmarc_is_valid === "1"}
                onCheck={() => handleCheckNow("DMARC", viewDomain.id)}
                checking={checking.DMARC}
                cooldownKey={`${viewDomain.id}-DMARC`}
                cooldowns={cooldowns}
                onCopy={handleCopy}
              />

            </div>
            
            {/* Modal Footer */}
            <div className="p-4 border-t bg-muted/30 flex justify-end">
              <button 
                onClick={() => setViewDomain(null)}
                className="px-4 py-2 rounded-lg bg-background border hover:bg-muted text-sm font-medium transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Sub-Component for Modal Rows ---

interface RecordSectionProps {
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
}

function RecordSection({ 
  type, domain, recordValue, recordType, host, isValid, 
  onCheck, checking, cooldownKey, cooldowns, onCopy 
}: RecordSectionProps) {
  
  const meta = RECORD_META[type];
  const fullHost = type === "SPF" 
    ? domain.domain_name 
    : `${host || (type === "DKIM" ? "default._domainkey" : "_dmarc")}.${domain.domain_name}`;

  // Calculate remaining cooldown time
  const now = Date.now();
  const lastClicked = cooldowns[cooldownKey] || 0;
  const isCooldown = (now - lastClicked) < 30000;
  const remainingSeconds = isCooldown ? Math.ceil((30000 - (now - lastClicked)) / 1000) : 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-md border ${meta.color}`}>
            {meta.icon}
          </div>
          <h3 className="font-semibold">{type} Record</h3>
        </div>
        
        {isValid ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
            <CheckCircle className="h-3.5 w-3.5" /> Verified
          </span>
        ) : (
          <button
            onClick={onCheck}
            disabled={checking || isCooldown}
            className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold border transition-all
              ${isCooldown 
                ? "bg-muted text-muted-foreground border-transparent cursor-not-allowed" 
                : "bg-primary text-primary-foreground border-primary hover:opacity-90 shadow-sm"}
            `}
          >
            {checking ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : isCooldown ? (
              <span className="tabular-nums">Wait {remainingSeconds}s</span>
            ) : (
              <>Check Now</>
            )}
          </button>
        )}
      </div>

      {recordValue ? (
        <div className="bg-muted/50 rounded-xl p-4 border space-y-3 text-sm">
          <div className="grid grid-cols-[80px_1fr] gap-2 items-center">
            <span className="text-muted-foreground text-xs uppercase font-semibold">Host</span>
            <div className="flex items-center justify-between group bg-background p-2 rounded border">
              <code className="text-xs font-mono break-all">{fullHost}</code>
              <button onClick={() => onCopy(fullHost, `${type} Host`)} className=" p-1 hover:bg-muted rounded transition">
                <Copy className="h-3 w-3 text-muted-foreground" />
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-[80px_1fr] gap-2 items-center">
            <span className="text-muted-foreground text-xs uppercase font-semibold">Type</span>
            <span className="font-medium text-xs">{recordType || "TXT"}</span>
          </div>

          <div className="grid grid-cols-[80px_1fr] gap-2 items-start">
            <span className="text-muted-foreground text-xs uppercase font-semibold pt-2">Value</span>
            <div className="flex items-start justify-between group bg-background p-2 rounded border">
              <code className="text-xs font-mono break-all text-muted-foreground leading-relaxed">
                {recordValue}
              </code>
              <button onClick={() => onCopy(recordValue, `${type} Value`)} className="p-1 hover:bg-muted rounded transition shrink-0 ml-2">
                <Copy className="h-3 w-3 text-muted-foreground" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-4 text-sm text-yellow-700 flex items-center gap-2">
          <ShieldAlert  color="#ff0000" className="h-4 w-4" />
          Proceed with SPF & DMARC records update, while the {type} record is getting generated...Please wait a while..!!
        </div>
      )}
    </div>
  );
}