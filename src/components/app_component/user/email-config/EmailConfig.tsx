"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Copy,
  Eye,
  EyeOff,
  Send,
  Check,
  Download,
  Maximize2,
  Minimize2,
  Terminal,
  FileCode,
  Braces,
  Gem,
  Coffee,
  Code2,
  Sparkles,
  Zap,
  Mail,
  Server,
  X,
  KeyRound,
  Users,
  BarChart,
  Play,
  ShieldCheck,
  Headset,
  Loader2,
  MailCheck,
  PackageCheck,
  Globe,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { token } from "../../common/http";
import Image from "next/image";

type MainTab = "smtp" | "api" | "campaign";
type CodeTab = "curl" | "php" | "python" | "nodejs" | "ruby";
type EmailSendType = "smtp" | "app";

type EmailConfigRow = {
  id: number;
  user_id: number;
  email_send_type: EmailSendType;
  host: string | null;
  port: string | null;
  username: string | null;
  password: string | null;
  app_url: string | null;
  status: string;
  without_hash?: string | null;
};

type EmailConfigResponse = {
  email_config?: EmailConfigRow[];
};

type DomainItem = {
  id: number;
  domain_name: string;
  spf_is_valid?: string | number | null;
  dkim_is_valid?: string | number | null;
  dmarc_is_valid?: string | number | null;
};

type DomainInfoResponse = {
  data?: {
    domainList?: DomainItem[];
  };
  code?: number;
  message?: string;
};

type PlanItem = {
  plan_id: number;
  package_name: string;
  start_date: string;
  end_date: string;
  status: string;
};

type PlanInfoResponse = {
  draw?: number;
  recordsTotal?: number;
  recordsFiltered?: number;
  data?: PlanItem[];
};

export default function EmailConfig() {
  const router = useRouter();

  const CONFIG_URL = "/api/email-config/useEmailConfig";
  const PLAN_URL = "/api/package-info/get_all_plans";

  // Step 1: Plan states
  const [loadingPlan, setLoadingPlan] = useState(true);
  const [planError, setPlanError] = useState("");
  const [hasActivePlan, setHasActivePlan] = useState(false);
  const [activePlanName, setActivePlanName] = useState("");
  const [activePlanEndDate, setActivePlanEndDate] = useState("");

  // Step 2/3: Email config states
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);
  const [hasEmailConfig, setHasEmailConfig] = useState(false);
  const [emailSendType, setEmailSendType] = useState<EmailSendType>("smtp");

  // Step 2: Domain validation states
  const [domainLoading, setDomainLoading] = useState(false);
  const [hasValidDomain, setHasValidDomain] = useState(false);
  const [validDomainName, setValidDomainName] = useState("");
  const [domainListEmpty, setDomainListEmpty] = useState(false);
  const [domainError, setDomainError] = useState("");

  // Tabs
  const [mainTab, setMainTab] = useState<MainTab>("smtp");
  const [codeTab, setCodeTab] = useState<CodeTab>("curl");
  const [copied, setCopied] = useState<string | null>(null);

  // Fullscreen code examples
  const [codeFullscreen, setCodeFullscreen] = useState(false);
  const [overlayMounted, setOverlayMounted] = useState(false);
  const [overlayVisible, setOverlayVisible] = useState(false);

  // SMTP page values
  const [smtpHost, setSmtpHost] = useState("smtp.gmail.com");
  const [smtpUsername, setSmtpUsername] = useState("user@example.com");
  const [smtpPasswordPlain, setSmtpPasswordPlain] = useState("password123");

  // Campaign page values
  const [campaignAppUrl, setCampaignAppUrl] = useState("");
  const [campaignUsername, setCampaignUsername] = useState("");
  const [campaignPassword, setCampaignPassword] = useState("");

  // API tab API KEY
  const [apiKey, setApiKey] = useState("");

  // Visibility toggles
  const [showSmtpPassword, setShowSmtpPassword] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showCampaignPassword, setShowCampaignPassword] = useState(false);

  // Port selection
  const [port, setPort] = useState("587");
  const [encryption, setEncryption] = useState("NO");

  const API_ACTIONS_IMAGE_SRC = "/images/api-code-actions.png";

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return dateStr;

    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const handlePortChange = (value: string) => {
    setPort(value);
    if (value === "25") setEncryption("NO");
    if (value === "587") setEncryption("NO");
    if (value === "465") setEncryption("SSL");
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const getLanguageIcon = (lang: CodeTab) => {
    switch (lang) {
      case "curl":
        return <Terminal className="h-4 w-4" />;
      case "php":
        return <FileCode className="h-4 w-4" />;
      case "python":
        return <Braces className="h-4 w-4" />;
      case "nodejs":
        return <Gem className="h-4 w-4" />;
      case "ruby":
        return <Coffee className="h-4 w-4" />;
      default:
        return <Code2 className="h-4 w-4" />;
    }
  };

  const getLanguageColor = (lang: CodeTab) => {
    switch (lang) {
      case "curl":
        return "from-orange-500 to-red-500";
      case "php":
        return "from-indigo-500 to-blue-500";
      case "python":
        return "from-blue-500 to-cyan-500";
      case "nodejs":
        return "from-green-500 to-emerald-500";
      case "ruby":
        return "from-red-500 to-rose-500";
      default:
        return "from-gray-500 to-gray-600";
    }
  };

  useEffect(() => {
    if (codeFullscreen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [codeFullscreen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeFullscreen();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    let t1: any;
    let t2: any;

    if (codeFullscreen) {
      setOverlayMounted(true);
      t1 = setTimeout(() => setOverlayVisible(true), 20);
    } else {
      setOverlayVisible(false);
      t2 = setTimeout(() => setOverlayMounted(false), 240);
    }

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [codeFullscreen]);

  const openFullscreen = () => setCodeFullscreen(true);
  const closeFullscreen = () => setCodeFullscreen(false);

  // STEP 1: LOAD ACTIVE PLAN
  useEffect(() => {
    let active = true;

    const loadPlanInfo = async () => {
      try {
        setLoadingPlan(true);
        setPlanError("");

        const res = await fetch(PLAN_URL, {
          method: "GET",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Bearer ${token()}`,
          },
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

        const data = (await res.json()) as PlanInfoResponse;
        const plans = Array.isArray(data?.data) ? data.data : [];

        if (!active) return;

        const activePlan =
          plans.find(
            (item) => String(item?.status || "").trim().toLowerCase() === "active"
          ) || null;

        if (activePlan) {
          setHasActivePlan(true);
          setActivePlanName(activePlan.package_name || "");
          setActivePlanEndDate(activePlan.end_date || "");
        } else {
          setHasActivePlan(false);
          setActivePlanName("");
          setActivePlanEndDate("");
        }
      } catch (err: any) {
        if (!active) return;
        setPlanError(err?.message || "Failed to load plan info");
      } finally {
        if (active) setLoadingPlan(false);
      }
    };

    loadPlanInfo();

    return () => {
      active = false;
    };
  }, [PLAN_URL, router]);

  // STEP 2/3/MAIN PAGE: LOAD EMAIL CONFIG ONLY IF ACTIVE PLAN EXISTS
  useEffect(() => {
    if (loadingPlan || !hasActivePlan) return;

    let alive = true;

    async function loadConfig() {
      try {
        setLoadingConfig(true);
        setConfigError(null);

        const res = await fetch(CONFIG_URL, {
          method: "GET",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Bearer ${token()}`,
          },
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

        const data = (await res.json()) as EmailConfigResponse;
        const row = data?.email_config?.[0];

        if (!alive) return;

        if (row && row.id) {
          setHasEmailConfig(true);

          const type: EmailSendType =
            row.email_send_type === "app" ? "app" : "smtp";
          setEmailSendType(type);

          setApiKey((row.without_hash ?? "") || "");

          if (type === "smtp") {
            setSmtpHost(row.host ?? "");
            setSmtpUsername(row.username ?? "");
            setSmtpPasswordPlain((row.without_hash ?? "") || "");
            setPort(row.port ?? "587");

            if (row.port === "465") setEncryption("SSL");
            else setEncryption("NO");

            if (mainTab === "campaign") setMainTab("smtp");
          } else {
            setCampaignAppUrl(row.app_url ?? "");
            setCampaignUsername(row.username ?? "");
            setCampaignPassword((row.without_hash ?? "") || "");
            if (mainTab === "smtp") setMainTab("campaign");
          }
        } else {
          setHasEmailConfig(false);
        }
      } catch (err: any) {
        if (!alive) return;

        if (
          err?.message?.includes("404") ||
          err?.message?.includes("No email_config found")
        ) {
          setHasEmailConfig(false);
        } else {
          setConfigError(err?.message || "Failed to load config");
        }
      } finally {
        if (alive) setLoadingConfig(false);
      }
    }

    loadConfig();

    return () => {
      alive = false;
    };
  }, [loadingPlan, hasActivePlan, CONFIG_URL, router, mainTab]);

  // STEP 2/3: DOMAIN CHECK ONLY IF ACTIVE PLAN EXISTS AND EMAIL CONFIG DOES NOT EXIST
  useEffect(() => {
    if (loadingPlan || !hasActivePlan || loadingConfig || hasEmailConfig) return;

    let active = true;

    const loadDomainInfo = async () => {
      try {
        setDomainLoading(true);
        setDomainError("");

        const res = await fetch("/api/domain-info", {
          method: "GET",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Bearer ${token()}`,
          },
          cache: "no-store",
        });

        if (res.status === 401) {
          router.replace("/login");
          return;
        }

        const data: DomainInfoResponse = await res.json();
        const domainList = Array.isArray(data?.data?.domainList)
          ? data.data!.domainList!
          : [];

        if (!active) return;

        if (domainList.length === 0) {
          setDomainListEmpty(true);
          setHasValidDomain(false);
          setValidDomainName("");
          return;
        }

        const validDomain = domainList.find((item) => {
          const spf = String(item.spf_is_valid ?? "").trim() === "1";
          const dkim = String(item.dkim_is_valid ?? "").trim() === "1";
          const dmarc = String(item.dmarc_is_valid ?? "").trim() === "1";
          return spf && dkim && dmarc;
        });

        if (validDomain) {
          setHasValidDomain(true);
          setValidDomainName(validDomain.domain_name || "");
          setDomainListEmpty(false);
        } else {
          setHasValidDomain(false);
          setValidDomainName("");
          setDomainListEmpty(false);
        }
      } catch (err: any) {
        if (!active) return;
        setDomainError(err?.message || "Failed to load domain info");
      } finally {
        if (active) setDomainLoading(false);
      }
    };

    loadDomainInfo();

    return () => {
      active = false;
    };
  }, [loadingPlan, hasActivePlan, loadingConfig, hasEmailConfig, router]);

  const smtpDisabled = emailSendType === "app";
  const campaignDisabled = emailSendType === "smtp";

  const codeExamples = useMemo(
    () => ({
      curl: `curl -X POST https://api.example.com/v3/send   \\
  -H "Authorization: Bearer <span class="text-orange-300">YOUR_API_KEY</span>" \\
  -H "Content-Type: <span class="text-green-300">application/json</span>" \\
  -d '{
    <span class="text-yellow-300">"from"</span>: <span class="text-green-300">"sender@example.com"</span>,
    <span class="text-yellow-300">"to"</span>: <span class="text-green-300">"recipient@example.com"</span>,
    <span class="text-yellow-300">"subject"</span>: <span class="text-green-300">"Test Email"</span>,
    <span class="text-yellow-300">"html"</span>: <span class="text-green-300">"<h1>Hello World</h1>"</span>
  }'`,
      php: `&lt;?php
<span class="text-orange-300">$ch</span> = curl_init(<span class="text-green-300">"https://api.example.com/v3/send"</span>);

curl_setopt(<span class="text-orange-300">$ch</span>, CURLOPT_HTTPHEADER, [
    <span class="text-green-300">"Authorization: Bearer YOUR_API_KEY"</span>,
    <span class="text-green-300">"Content-Type: application/json"</span>
]);

curl_setopt(<span class="text-orange-300">$ch</span>, CURLOPT_POSTFIELDS, json_encode([
    <span class="text-yellow-300">'from'</span> =&gt; <span class="text-green-300">'sender@example.com'</span>,
    <span class="text-yellow-300">'to'</span> =&gt; <span class="text-green-300">'recipient@example.com'</span>,
    <span class="text-yellow-300">'subject'</span> =&gt; <span class="text-green-300">'Test Email'</span>,
    <span class="text-yellow-300">'html'</span> =&gt; <span class="text-green-300">'&lt;h1&gt;Hello World&lt;/h1&gt;'</span>
]));

<span class="text-orange-300">$response</span> = curl_exec(<span class="text-orange-300">$ch</span>);
curl_close(<span class="text-orange-300">$ch</span>);
?&gt;`,
      python: `<span class="text-blue-300">import</span> requests

<span class="text-orange-300">url</span> = <span class="text-green-300">"https://api.example.com/v3/send"</span>
<span class="text-orange-300">headers</span> = {
    <span class="text-yellow-300">"Authorization"</span>: <span class="text-green-300">"Bearer YOUR_API_KEY"</span>,
    <span class="text-yellow-300">"Content-Type"</span>: <span class="text-green-300">"application/json"</span>
}
<span class="text-orange-300">data</span> = {
    <span class="text-yellow-300">"from"</span>: <span class="text-green-300">"sender@example.com"</span>,
    <span class="text-yellow-300">"to"</span>: <span class="text-green-300">"recipient@example.com"</span>,
    <span class="text-yellow-300">"subject"</span>: <span class="text-green-300">"Test Email"</span>,
    <span class="text-yellow-300">"html"</span>: <span class="text-green-300">"&lt;h1&gt;Hello World&lt;/h1&gt;"</span>
}

<span class="text-orange-300">response</span> = requests.post(<span class="text-orange-300">url</span>, headers=<span class="text-orange-300">headers</span>, json=<span class="text-orange-300">data</span>)
<span class="text-blue-300">print</span>(<span class="text-orange-300">response</span>.json())`,
      nodejs: `<span class="text-blue-300">const</span> <span class="text-orange-300">axios</span> = <span class="text-blue-300">require</span>(<span class="text-green-300">'axios'</span>);

<span class="text-blue-300">const</span> <span class="text-orange-300">data</span> = {
  <span class="text-yellow-300">from</span>: <span class="text-green-300">'sender@example.com'</span>,
  <span class="text-yellow-300">to</span>: <span class="text-green-300">'recipient@example.com'</span>,
  <span class="text-yellow-300">subject</span>: <span class="text-green-300">'Test Email'</span>,
  <span class="text-yellow-300">html</span>: <span class="text-green-300">'&lt;h1&gt;Hello World&lt;/h1&gt;'</span>
};

<span class="text-orange-300">axios</span>.<span class="text-blue-300">post</span>(<span class="text-green-300">'https://api.example.com/v3/send'</span>, <span class="text-orange-300">data</span>, {
  <span class="text-yellow-300">headers</span>: {
    <span class="text-yellow-300">'Authorization'</span>: <span class="text-green-300">'Bearer YOUR_API_KEY'</span>,
    <span class="text-yellow-300">'Content-Type'</span>: <span class="text-green-300">'application/json'</span>
  }
})
.<span class="text-blue-300">then</span>(<span class="text-orange-300">response</span> =&gt; <span class="text-blue-300">console</span>.log(<span class="text-orange-300">response</span>.data))
.<span class="text-blue-300">catch</span>(<span class="text-orange-300">error</span> =&gt; <span class="text-blue-300">console</span>.error(<span class="text-orange-300">error</span>));`,
      ruby: `<span class="text-blue-300">require</span> <span class="text-green-300">'net/http'</span>
<span class="text-blue-300">require</span> <span class="text-green-300">'uri'</span>
<span class="text-blue-300">require</span> <span class="text-green-300">'json'</span>

<span class="text-orange-300">uri</span> = URI.<span class="text-blue-300">parse</span>(<span class="text-green-300">"https://api.example.com/v3/send"</span>)
<span class="text-orange-300">request</span> = Net::HTTP::Post.<span class="text-blue-300">new</span>(<span class="text-orange-300">uri</span>)
<span class="text-orange-300">request</span>[<span class="text-green-300">"Authorization"</span>] = <span class="text-green-300">"Bearer YOUR_API_KEY"</span>
<span class="text-orange-300">request</span>[<span class="text-green-300">"Content-Type"</span>] = <span class="text-green-300">"application/json"</span>
<span class="text-orange-300">request</span>.body = {
  <span class="text-yellow-300">from</span>: <span class="text-green-300">"sender@example.com"</span>,
  <span class="text-yellow-300">to</span>: <span class="text-green-300">"recipient@example.com"</span>,
  <span class="text-yellow-300">subject</span>: <span class="text-green-300">"Test Email"</span>,
  <span class="text-yellow-300">html</span>: <span class="text-green-300">"&lt;h1&gt;Hello World&lt;/h1&gt;"</span>
}.<span class="text-blue-300">to_json</span>

<span class="text-orange-300">response</span> = Net::HTTP.<span class="text-blue-300">start</span>(<span class="text-orange-300">uri</span>.hostname, <span class="text-orange-300">uri</span>.port, <span class="text-yellow-300">use_ssl</span>: <span class="text-blue-300">true</span>) <span class="text-blue-300">do</span> |<span class="text-orange-300">http</span>|
  <span class="text-orange-300">http</span>.<span class="text-blue-300">request</span>(<span class="text-orange-300">request</span>)
<span class="text-blue-300">end</span>

<span class="text-blue-300">puts</span> <span class="text-orange-300">response</span>.body`,
    }),
    []
  );

  const StepProgress = ({
    step,
    title,
    subtitle,
  }: {
    step: 1 | 2 | 3;
    title: string;
    subtitle: string;
  }) => {
    const isDone1 = step > 1;
    const isDone2 = step > 2;

    return (
      <div className="mb-8">
        <div className="flex items-start justify-center gap-2 sm:gap-5">
          <div className="flex flex-col items-center">
            <div
              className={`flex h-12 w-12 items-center justify-center rounded-full border-4 text-base font-bold ${
                isDone1
                  ? "border-[#ff7800] bg-[#ff7800] text-white"
                  : step === 1
                  ? "border-[#ff7800]/30 bg-white text-[#ff7800]"
                  : "border-gray-200 bg-white text-gray-400"
              }`}
            >
              {isDone1 ? <Check className="h-6 w-6" /> : "1"}
            </div>
            <p className="mt-2 text-center text-xs font-semibold text-gray-500">
              Plan
            </p>
          </div>

          <div
            className={`mt-5 h-1 w-10 rounded-full sm:w-20 ${
              step > 1 ? "bg-[#ff7800]" : "bg-gray-200"
            }`}
          />

          <div className="flex flex-col items-center">
            <div
              className={`flex h-12 w-12 items-center justify-center rounded-full border-4 text-base font-bold ${
                isDone2
                  ? "border-[#ff7800] bg-[#ff7800] text-white"
                  : step === 2
                  ? "border-[#ff7800]/30 bg-white text-[#ff7800]"
                  : "border-gray-200 bg-white text-gray-400"
              }`}
            >
              {isDone2 ? <Check className="h-6 w-6" /> : "2"}
            </div>
            <p className="mt-2 text-center text-xs font-semibold text-gray-500">
              Domain
            </p>
          </div>

          <div
            className={`mt-5 h-1 w-10 rounded-full sm:w-20 ${
              step > 2 ? "bg-[#ff7800]" : "bg-gray-200"
            }`}
          />

          <div className="flex flex-col items-center">
            <div
              className={`flex h-12 w-12 items-center justify-center rounded-full border-4 text-base font-bold ${
                step === 3
                  ? "border-[#ff7800]/30 bg-white text-[#ff7800]"
                  : "border-gray-200 bg-white text-gray-400"
              }`}
            >
              3
            </div>
            <p className="mt-2 text-center text-xs font-semibold text-gray-500">
              Ready
            </p>
          </div>
        </div>

        <div className="mt-6 text-center">
          <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
          <p className="mt-2 text-sm text-gray-500">{subtitle}</p>
        </div>
      </div>
    );
  };

  const InfoCard = ({
    step,
    icon,
    title,
    subtitle,
    children,
  }: {
    step: 1 | 2 | 3;
    icon: React.ReactNode;
    title: string;
    subtitle: string;
    children: React.ReactNode;
  }) => (
    <div className="min-h-screen bg-[#f4f6fb] p-3 sm:p-4 md:p-6">
      <div className="mx-auto max-w-full">
        <div className="overflow-hidden rounded-[24px] border border-gray-200 bg-white shadow-[0_20px_60px_rgba(0,0,0,0.08)]">
          <div className="bg-[#ff7800] px-5 py-4 sm:px-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white">
                <Image
                  src="/Logoicon.png"
                  alt="SMTPMaster Logo"
                  width={28}
                  height={28}
                  className="object-contain"
                />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-white sm:text-xl">
                  Email Configuration
                </h1>
                <p className="text-sm text-white/90">
                  Complete the required setup to access your sending details
                </p>
              </div>
            </div>
          </div>

          <div className="px-6 py-10 sm:px-8 sm:py-12">
            <StepProgress step={step} title={title} subtitle={subtitle} />

            <div className="rounded-[24px] border border-gray-100 bg-[#fafafa] p-6 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-50">
                {icon}
              </div>

              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const CodeExamplesCard = ({ fullscreen = false }: { fullscreen?: boolean }) => (
    <div
      className={
        fullscreen
          ? "bg-gray-900 rounded-none shadow-none border-0 p-6 w-full h-full"
          : "bg-gray-900 rounded-2xl shadow-xl border border-gray-800 p-6"
      }
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center">
            <Code2 className="h-5 w-5 text-white" />
          </div>
          <h2 className="text-xl font-semibold text-white">Code Examples</h2>
        </div>

        <div className="relative flex items-center space-x-2">
          <img
            src={API_ACTIONS_IMAGE_SRC}
            alt="actions"
            className="absolute right-0 top-1/2 -translate-y-1/2 h-10 w-auto opacity-100 pointer-events-none select-none"
            draggable={false}
          />

          <button
            onClick={() => (codeFullscreen ? closeFullscreen() : openFullscreen())}
            className="p-2 hover:bg-gray-800 rounded-lg transition-all text-gray-400 relative z-10 active:scale-95"
            title={codeFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          >
            {codeFullscreen ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </button>

          <button className="p-2 hover:bg-gray-800 rounded-lg transition-all text-gray-400 relative z-10 active:scale-95">
            <Download className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {(["curl", "php", "python", "nodejs", "ruby"] as CodeTab[]).map((lang) => (
          <button
            key={lang}
            onClick={() => setCodeTab(lang)}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
              codeTab === lang
                ? `bg-gradient-to-r ${getLanguageColor(lang)} text-white shadow-lg`
                : "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-300"
            } active:scale-[0.98]`}
          >
            {getLanguageIcon(lang)}
            <span>{lang.toUpperCase()}</span>
          </button>
        ))}
      </div>

      <div className="relative group">
        <div
          className={`absolute inset-0 bg-gradient-to-r ${getLanguageColor(
            codeTab
          )} opacity-20 rounded-xl blur-xl group-hover:opacity-30 transition-all`}
        />
        <div className="relative bg-gray-950 rounded-xl border border-gray-800 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 bg-gray-900 border-b border-gray-800">
            <div className="flex items-center space-x-2">
              <div className="flex space-x-1.5">
                <div className="h-3 w-3 rounded-full bg-red-500" />
                <div className="h-3 w-3 rounded-full bg-yellow-500" />
                <div className="h-3 w-3 rounded-full bg-green-500" />
              </div>
              <span className="text-xs text-gray-500 ml-2">
                {codeTab === "curl" && "request.sh"}
                {codeTab === "php" && "mailer.php"}
                {codeTab === "python" && "mailer.py"}
                {codeTab === "nodejs" && "mailer.js"}
                {codeTab === "ruby" && "mailer.rb"}
              </span>
            </div>

            <button
              onClick={() => handleCopy(codeExamples[codeTab], "code")}
              className="flex items-center space-x-2 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg transition-all text-xs text-gray-400 hover:text-white active:scale-[0.98]"
            >
              {copied === "code" ? (
                <>
                  <Check className="h-3.5 w-3.5 text-green-400" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>

          <pre
            className={[
              "p-5 text-sm font-mono overflow-x-auto overflow-y-auto transition-all duration-300 ease-out",
              fullscreen ? "h-[70vh] lg:h-[78vh]" : "h-[260px]",
            ].join(" ")}
          >
            <code
              className="text-gray-300 whitespace-pre"
              dangerouslySetInnerHTML={{ __html: codeExamples[codeTab] }}
            />
          </pre>
        </div>
      </div>

      <div className="mt-4 p-4 bg-gray-800/50 rounded-xl border border-gray-700">
        <div className="flex items-start space-x-3">
          <Sparkles className="h-4 w-4 text-orange-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs text-gray-400">
              <span className="text-orange-500 font-medium">Pro tip:</span> Replace
              <code className="mx-1 px-1.5 py-0.5 bg-gray-700 rounded text-orange-400">
                YOUR_API_KEY
              </code>
              with your API Key from the left panel
            </p>
          </div>
        </div>
      </div>
    </div>
  );
  const SkeletonBlock = ({ className = "" }: { className?: string }) => (
  <div className={`animate-pulse bg-gray-200 rounded-lg ${className}`} />
);

  // STEP 1 loading
  if (loadingPlan) {
    return (
    <div className="w-full bg-white rounded-[24px] border border-gray-200 shadow-[0_20px_60px_rgba(0,0,0,0.08)] overflow-hidden">
    <div className="bg-[#ff7800] px-5 py-4 sm:px-6">
      <div className="flex items-center gap-3">
        <SkeletonBlock className="h-11 w-11 bg-white/30 rounded-xl" />
        <div className="space-y-2">
          <SkeletonBlock className="h-5 w-48 bg-white/30 rounded" />
          <SkeletonBlock className="h-4 w-32 bg-white/20 rounded" />
        </div>
      </div>
    </div>
    <div className="p-6 sm:p-8 space-y-6">
      <div className="flex justify-center gap-4">
        <div className="flex flex-col items-center gap-2">
          <SkeletonBlock className="h-12 w-12 rounded-full" />
          <SkeletonBlock className="h-4 w-12 rounded" />
        </div>
        <SkeletonBlock className="h-1 w-20 mt-6 rounded-full" />
        <div className="flex flex-col items-center gap-2">
          <SkeletonBlock className="h-12 w-12 rounded-full" />
          <SkeletonBlock className="h-4 w-12 rounded" />
        </div>
        <SkeletonBlock className="h-1 w-20 mt-6 rounded-full" />
        <div className="flex flex-col items-center gap-2">
          <SkeletonBlock className="h-12 w-12 rounded-full" />
          <SkeletonBlock className="h-4 w-12 rounded" />
        </div>
      </div>
      <div className="space-y-3 text-center">
        <SkeletonBlock className="h-8 w-64 mx-auto rounded" />
        <SkeletonBlock className="h-4 w-96 mx-auto rounded" />
      </div>
      <div className="rounded-[24px] border border-gray-100 bg-[#fafafa] p-6">
        <div className="flex flex-col items-center gap-4">
          <SkeletonBlock className="h-16 w-16 rounded-2xl" />
          <SkeletonBlock className="h-6 w-48 rounded" />
          <SkeletonBlock className="h-4 w-full max-w-md rounded" />
          <SkeletonBlock className="h-4 w-full max-w-sm rounded" />
        </div>
      </div>
    </div>
  </div>
    );
  }

  // STEP 1 error
  if (planError) {
    return (
      <div className="min-h-screen bg-[#f4f6fb] p-3 sm:p-4 md:p-6">
        <div className="mx-auto max-w-xl">
          <div className="overflow-hidden rounded-[24px] border border-gray-200 bg-white shadow-[0_20px_60px_rgba(0,0,0,0.08)]">
            <div className="bg-[#ff7800] px-5 py-4 sm:px-6">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white">
                  <Image
                    src="/Logoicon.png"
                    alt="SMTPMaster Logo"
                    width={28}
                    height={28}
                    className="object-contain"
                  />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-white sm:text-xl">
                    Error
                  </h1>
                  <p className="text-sm text-white/90">
                    Something went wrong
                  </p>
                </div>
              </div>
            </div>

            <div className="px-6 py-14 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50">
                <MailCheck className="h-8 w-8 text-red-500" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">
                Unable to load plan info
              </h2>
              <p className="mt-2 text-sm text-gray-500">{planError}</p>

              <button
                type="button"
                onClick={() => window.location.reload()}
                className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-[#ff7800] px-6 text-sm font-semibold text-white transition hover:bg-[#e66c00]"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // STEP 1 fail: no active plan
  if (!hasActivePlan) {
    return (
      <InfoCard
        step={1}
        icon={<PackageCheck className="h-8 w-8 text-[#ff7800]" />}
        title="Step 1: No Active Plan"
        subtitle="Please activate a plan to continue"
      >
        <h3 className="text-xl font-bold text-gray-900">Active Plan / No Active Plan</h3>
        <p className="mt-3 text-sm leading-6 text-gray-500">
          It looks like you don’t currently have an active email marketing plan,
          or your existing plan may have expired. To continue sending emails and
          access your email sending details, please choose a plan that fits your needs.
        </p>
        <p className="mt-3 text-sm leading-6 text-gray-500">
          Once your new plan is activated, you’ll be able to view your sending credentials,
          track your email activity, and make the most of your email marketing tools.
        </p>

        <button
          type="button"
          onClick={() => router.push("/all-packages")}
          className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-[#ff7800] px-6 text-sm font-semibold text-white transition hover:bg-[#e66c00]"
        >
          View Plan
        </button>
      </InfoCard>
    );
  }

  // EMAIL CONFIG loading after active plan
  if (loadingConfig) {
    return (
      <div className="min-h-screen bg-[#f4f6fb] p-3 sm:p-4 md:p-6">
        <div className="mx-auto max-w-xl">
          <div className="overflow-hidden rounded-[24px] border border-gray-200 bg-white shadow-[0_20px_60px_rgba(0,0,0,0.08)]">
            <div className="bg-[#ff7800] px-5 py-4 sm:px-6">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white">
                  <Image
                    src="/Logoicon.png"
                    alt="SMTPMaster Logo"
                    width={28}
                    height={28}
                    className="object-contain"
                  />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-white sm:text-xl">
                    Email Configuration
                  </h1>
                  <p className="text-sm text-white/90">
                    Loading your settings...
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-50">
                <Loader2 className="h-8 w-8 animate-spin text-[#ff7800]" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">
                Loading configuration
              </h2>
              <p className="mt-2 text-sm text-gray-500">
                Please wait while we load your email settings.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // config error
  if (configError && hasEmailConfig === false) {
    return (
      <div className="min-h-screen bg-[#f4f6fb] p-3 sm:p-4 md:p-6">
        <div className="mx-auto max-w-xl">
          <div className="overflow-hidden rounded-[24px] border border-gray-200 bg-white shadow-[0_20px_60px_rgba(0,0,0,0.08)]">
            <div className="bg-[#ff7800] px-5 py-4 sm:px-6">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white">
                  <Image
                    src="/Logoicon.png"
                    alt="SMTPMaster Logo"
                    width={28}
                    height={28}
                    className="object-contain"
                  />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-white sm:text-xl">
                    Error
                  </h1>
                  <p className="text-sm text-white/90">
                    Something went wrong
                  </p>
                </div>
              </div>
            </div>

            <div className="px-6 py-14 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50">
                <MailCheck className="h-8 w-8 text-red-500" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">
                Unable to load configuration
              </h2>
              <p className="mt-2 text-sm text-gray-500">{configError}</p>

              <button
                type="button"
                onClick={() => window.location.reload()}
                className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-[#ff7800] px-6 text-sm font-semibold text-white transition hover:bg-[#e66c00]"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // MAIN PAGE - only after plan + domain + email config
  if (hasEmailConfig) {
    return (
      <div
        className="min-h-screen bg-[var(--page-bg)]"
        style={{ borderRadius: "var(--page-radius)" }}
      >
        <div
          className="bg-[var(--brand)] text-[var(--text-on-dark)]"
          style={{ borderRadius: "var(--page-radius)" }}
        >
          <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
            <h1 className="text-xl font-bold tracking-tight">Email Configuration</h1>
            <p className="mt-2 text-sm text-[var(--text-on-dark)]/80">
              Manage SMTP settings, API credentials, and campaign sender configurations
            </p>
          </div>
        </div>

        {overlayMounted && (
          <div
            className={[
              "fixed inset-0 z-[9999] backdrop-blur-sm transition-all duration-300 ease-out",
              overlayVisible ? "bg-black/60 opacity-100" : "bg-black/0 opacity-0",
            ].join(" ")}
            onMouseDown={(e) => {
              if (e.currentTarget === e.target) closeFullscreen();
            }}
          >
            <div className="absolute inset-0 p-4 sm:p-6">
              <div
                className={[
                  "w-full h-full rounded-2xl overflow-hidden border shadow-2xl",
                  "transition-all duration-300 ease-out will-change-transform",
                  overlayVisible
                    ? "opacity-100 scale-100 translate-y-0"
                    : "opacity-0 scale-[0.97] translate-y-2",
                ].join(" ")}
                style={{
                  borderColor: "var(--border)",
                  backgroundColor: "var(--surface)",
                }}
              >
                <div className="w-full h-full">
                  <CodeExamplesCard fullscreen />
                </div>

                <button
                  onClick={closeFullscreen}
                  className="absolute top-6 right-6 p-2 rounded-xl transition-all active:scale-95"
                  style={{
                    backgroundColor: "var(--surface-2)",
                    borderColor: "var(--border)",
                    color: "var(--text-soft)",
                  }}
                  title="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <div className="text-sm text-[var(--text-body)]">
              Active mode:{" "}
              <span className="font-semibold text-[var(--foreground)]">
                {emailSendType.toUpperCase()}
              </span>
            </div>

          </div>

          <div className="border-b border-[var(--line-soft)] mb-6">
            <div className="flex space-x-8">
              <button
                onClick={() => !smtpDisabled && setMainTab("smtp")}
                disabled={smtpDisabled}
                className={`pb-3 text-sm font-medium relative transition-all ${
                  mainTab === "smtp" ? "" : "hover:opacity-80"
                } ${smtpDisabled ? "opacity-40 cursor-not-allowed" : ""}`}
                style={
                  mainTab === "smtp"
                    ? { color: "var(--brand)" }
                    : { color: "var(--text-soft)" }
                }
              >
                <span className="flex items-center space-x-2">
                  <Server className="h-4 w-4" />
                  <span>Outgoing SMTP Details</span>
                </span>
                {mainTab === "smtp" && !smtpDisabled && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--brand)]" />
                )}
              </button>

              <button
                onClick={() => !campaignDisabled && setMainTab("campaign")}
                disabled={campaignDisabled}
                className={`pb-3 text-sm font-medium relative transition-all ${
                  mainTab === "campaign" ? "" : "hover:opacity-80"
                } ${campaignDisabled ? "opacity-40 cursor-not-allowed" : ""}`}
                style={
                  mainTab === "campaign"
                    ? { color: "var(--brand)" }
                    : { color: "var(--text-soft)" }
                }
              >
                <span className="flex items-center space-x-2">
                  <Send className="h-4 w-4" />
                  <span>Email Campaign Sender</span>
                </span>
                {mainTab === "campaign" && !campaignDisabled && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--brand)]" />
                )}
              </button>
            </div>
          </div>

          {mainTab === "smtp" && (
            <div className="grid lg:grid-cols-2 gap-6">
              <div
                className="border border-[var(--line-soft)] bg-[var(--surface)] p-6 shadow-[var(--shadow-panel)]"
                style={{ borderRadius: "var(--page-radius)" }}
              >
                <div className="flex items-center space-x-3 mb-6">
                  <div className="h-10 w-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg">
                    <Mail className="h-5 w-5 text-white" />
                  </div>
                  <h2 className="text-xl font-semibold text-[var(--text-strong)]">
                    Your SMTP Setting
                  </h2>
                </div>

                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-[var(--text-body)]">
                      Server Name
                    </label>
                    <div className="flex group">
                      <input
                        type="text"
                        value={smtpHost}
                        onChange={(e) => setSmtpHost(e.target.value)}
                        disabled={smtpDisabled}
                        className={`flex-1 px-4 py-3 text-sm text-[var(--text-strong)] bg-[var(--surface-2)] border border-[var(--line-soft)] outline-none transition focus:border-[var(--line-strong)] focus:ring-2 focus:ring-[var(--ring)] ${
                          smtpDisabled ? "opacity-50 cursor-not-allowed" : ""
                        }`}
                        style={{
                          borderRadius:
                            "var(--page-radius) 0 0 var(--page-radius)",
                        }}
                      />
                      <button
                        onClick={() => handleCopy(smtpHost, "smtp-server")}
                        disabled={smtpDisabled}
                        className={`px-4 border border-l-0 border-[var(--line-soft)] bg-[var(--surface-2)] text-[var(--text-body)] transition hover:bg-[var(--surface-soft)] ${
                          smtpDisabled ? "opacity-50 cursor-not-allowed" : ""
                        }`}
                        style={{
                          borderRadius:
                            "0 var(--page-radius) var(--page-radius) 0",
                        }}
                      >
                        {copied === "smtp-server" ? (
                          <Check className="h-5 w-5 text-[var(--success)]" />
                        ) : (
                          <Copy className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2 text-[var(--text-body)]">
                      Port
                    </label>
                    <select
                      value={port}
                      onChange={(e) => handlePortChange(e.target.value)}
                      disabled={smtpDisabled}
                      className={`w-full px-4 py-3 text-sm text-[var(--text-strong)] bg-[var(--surface)] border border-[var(--line-soft)] outline-none transition focus:border-[var(--line-strong)] focus:ring-2 focus:ring-[var(--ring)] ${
                        smtpDisabled ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                      style={{ borderRadius: "var(--page-radius)" }}
                    >
                      <option value="25">25</option>
                      <option value="587">587</option>
                      <option value="465">465</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2 text-[var(--text-body)]">
                      Encryption
                    </label>
                    <input
                      type="text"
                      value={encryption}
                      disabled
                      className="w-full px-4 py-3 text-sm font-medium text-[var(--text-body)] bg-[var(--surface-2)] border border-[var(--line-soft)]"
                      style={{ borderRadius: "var(--page-radius)" }}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2 text-[var(--text-body)]">
                      Username
                    </label>
                    <div className="flex group">
                      <input
                        type="text"
                        value={smtpUsername}
                        onChange={(e) => setSmtpUsername(e.target.value)}
                        disabled={smtpDisabled}
                        className={`flex-1 px-4 py-3 text-sm text-[var(--text-strong)] bg-[var(--surface-2)] border border-[var(--line-soft)] outline-none transition focus:border-[var(--line-strong)] focus:ring-2 focus:ring-[var(--ring)] ${
                          smtpDisabled ? "opacity-50 cursor-not-allowed" : ""
                        }`}
                        style={{
                          borderRadius:
                            "var(--page-radius) 0 0 var(--page-radius)",
                        }}
                      />
                      <button
                        onClick={() => handleCopy(smtpUsername, "smtp-user")}
                        disabled={smtpDisabled}
                        className={`px-4 border border-l-0 border-[var(--line-soft)] bg-[var(--surface-2)] text-[var(--text-body)] transition hover:bg-[var(--surface-soft)] ${
                          smtpDisabled ? "opacity-50 cursor-not-allowed" : ""
                        }`}
                        style={{
                          borderRadius:
                            "0 var(--page-radius) var(--page-radius) 0",
                        }}
                      >
                        {copied === "smtp-user" ? (
                          <Check className="h-5 w-5 text-[var(--success)]" />
                        ) : (
                          <Copy className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2 text-[var(--text-body)]">
                      Password
                    </label>
                    <div className="flex">
                      <div className="relative flex-1">
                        <input
                          type={showSmtpPassword ? "text" : "password"}
                          value={smtpPasswordPlain}
                          onChange={(e) => setSmtpPasswordPlain(e.target.value)}
                          disabled={smtpDisabled}
                          className={`w-full px-4 py-3 pr-12 text-sm text-[var(--text-strong)] bg-[var(--surface-2)] border border-[var(--line-soft)] outline-none transition focus:border-[var(--line-strong)] focus:ring-2 focus:ring-[var(--ring)] ${
                            smtpDisabled ? "opacity-50 cursor-not-allowed" : ""
                          }`}
                          style={{
                            borderRadius:
                              "var(--page-radius) 0 0 var(--page-radius)",
                          }}
                        />
                        <button
                          onClick={() => setShowSmtpPassword(!showSmtpPassword)}
                          disabled={smtpDisabled}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-soft)]"
                        >
                          {showSmtpPassword ? (
                            <EyeOff className="h-5 w-5" />
                          ) : (
                            <Eye className="h-5 w-5" />
                          )}
                        </button>
                      </div>
                      <button
                        onClick={() => handleCopy(smtpPasswordPlain, "smtp-pass")}
                        disabled={smtpDisabled}
                        className={`px-4 border border-l-0 border-[var(--line-soft)] bg-[var(--surface-2)] text-[var(--text-body)] transition hover:bg-[var(--surface-soft)] ${
                          smtpDisabled ? "opacity-50 cursor-not-allowed" : ""
                        }`}
                        style={{
                          borderRadius:
                            "0 var(--page-radius) var(--page-radius) 0",
                        }}
                      >
                        {copied === "smtp-pass" ? (
                          <Check className="h-5 w-5 text-[var(--success)]" />
                        ) : (
                          <Copy className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

               <div className="border border-gray-200 bg-white p-6 rounded-2xl shadow-sm flex flex-col h-full">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">How to Use SMTP Settings</h2>
                <p className="text-gray-600 mb-3">
                  To start sending emails through SMTPMaster, simply configure your email application or system using the following SMTP details:
                </p>
                <ul className="list-disc pl-5 space-y-2 text-gray-600 mb-3">
                  <li><strong className="text-gray-800">Server Name:</strong> This is your SMTP host (e.g., smtp.server.name) where emails are sent from.</li>
                  <li><strong className="text-gray-800">Username & Password:</strong> Use your SMTP credentials provided in your account dashboard to authenticate your sending.</li>
                  <li><strong className="text-gray-800">Port Options:</strong> Port 25 or 587 – Standard SMTP ports (no encryption required). Port 465 – Use this with TLS encryption for a more secure connection.</li>
                  <li><strong className="text-gray-800">Encryption:</strong> You can choose TLS for added security, or use non-encrypted ports if required.</li>
                  <li><strong className="text-gray-800">Send From Address:</strong> Use any verified email address from your domain (e.g., yourname@yourdomain.com)</li>
                </ul>
                <p className="text-gray-600">
                  Once these details are configured, your application will be able to send bulk or transactional emails reliably through our SMTP infrastructure.
                </p>
              </div>
            </div>
          )}

          {mainTab === "api" && (
            <div className="grid lg:grid-cols-2 gap-6">
              <div
                className="border border-[var(--line-soft)] bg-[var(--surface)] p-6 shadow-[var(--shadow-panel)]"
                style={{ borderRadius: "var(--page-radius)" }}
              >
                <div className="flex items-center space-x-3 mb-6">
                  <div className="h-10 w-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg">
                    <Zap className="h-5 w-5 text-white" />
                  </div>
                  <h2 className="text-xl font-semibold text-[var(--text-strong)]">
                    Email Submission API
                  </h2>
                </div>

                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-[var(--text-body)]">
                      API URL
                    </label>
                    <div className="flex group">
                      <input
                        type="text"
                        defaultValue="https://api.example.com/v3/send"
                        className="flex-1 px-4 py-3 text-sm text-[var(--text-strong)] bg-[var(--surface-2)] border border-[var(--line-soft)] outline-none transition focus:border-[var(--line-strong)] focus:ring-2 focus:ring-[var(--ring)]"
                        style={{
                          borderRadius:
                            "var(--page-radius) 0 0 var(--page-radius)",
                        }}
                      />
                      <button
                        onClick={() =>
                          handleCopy("https://api.example.com/v3/send", "api-url")
                        }
                        className="px-4 border border-l-0 border-[var(--line-soft)] bg-[var(--surface-2)] text-[var(--text-body)] transition hover:bg-[var(--surface-soft)]"
                        style={{
                          borderRadius:
                            "0 var(--page-radius) var(--page-radius) 0",
                        }}
                      >
                        {copied === "api-url" ? (
                          <Check className="h-5 w-5 text-[var(--success)]" />
                        ) : (
                          <Copy className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2 text-[var(--text-body)]">
                      API KEY
                    </label>
                    <div className="flex">
                      <div className="relative flex-1">
                        <input
                          type={showApiKey ? "text" : "password"}
                          value={apiKey}
                          onChange={(e) => setApiKey(e.target.value)}
                          className="w-full px-4 py-3 pr-12 text-sm text-[var(--text-strong)] bg-[var(--surface-2)] border border-[var(--line-soft)] outline-none transition focus:border-[var(--line-strong)] focus:ring-2 focus:ring-[var(--ring)]"
                          style={{
                            borderRadius:
                              "var(--page-radius) 0 0 var(--page-radius)",
                          }}
                        />
                        <button
                          onClick={() => setShowApiKey(!showApiKey)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-soft)]"
                        >
                          {showApiKey ? (
                            <EyeOff className="h-5 w-5" />
                          ) : (
                            <Eye className="h-5 w-5" />
                          )}
                        </button>
                      </div>
                      <button
                        onClick={() => handleCopy(apiKey, "api-key")}
                        className="px-4 border border-l-0 border-[var(--line-soft)] bg-[var(--surface-2)] text-[var(--text-body)] transition hover:bg-[var(--surface-soft)]"
                        style={{
                          borderRadius:
                            "0 var(--page-radius) var(--page-radius) 0",
                        }}
                      >
                        {copied === "api-key" ? (
                          <Check className="h-5 w-5 text-[var(--success)]" />
                        ) : (
                          <KeyRound className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                    <p className="text-xs mt-2 text-[var(--text-faint)]">
                      This API key is loaded from backend{" "}
                      <span className="font-medium">without_hash</span>.
                    </p>
                  </div>
                </div>
              </div>

              <CodeExamplesCard />
            </div>
          )}

          {mainTab === "campaign" && (
            <div className="grid lg:grid-cols-2 gap-6">
              <div
                className="border border-[var(--line-soft)] bg-[var(--surface)] p-6 shadow-[var(--shadow-panel)]"
                style={{ borderRadius: "var(--page-radius)" }}
              >
                <div className="flex items-center space-x-3 mb-6">
                  <div className="h-10 w-10 bg-gradient-to-br from-green-500 to-teal-500 rounded-xl flex items-center justify-center shadow-lg">
                    <Send className="h-5 w-5 text-white" />
                  </div>
                  <h2 className="text-xl font-semibold text-[var(--text-strong)]">
                    Email Campaign Sender
                  </h2>
                </div>

                <div className="space-y-5">
                  <div
                    className="p-4 rounded-xl border bg-[var(--brand-soft)] border-[var(--line-soft)]"
                    style={{ borderRadius: "var(--page-radius)" }}
                  >
                    <p className="text-sm text-[var(--text-body)]">
                      Configure your email campaign sender settings below. These settings
                      will be used for all outgoing campaign emails.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2 text-[var(--text-body)]">
                      App URL
                    </label>
                    <div className="flex group">
                      <input
                        type="text"
                        value={campaignAppUrl}
                        onChange={(e) => setCampaignAppUrl(e.target.value)}
                        disabled={campaignDisabled}
                        className={`flex-1 px-4 py-3 text-sm text-[var(--text-strong)] bg-[var(--surface-2)] border border-[var(--line-soft)] outline-none transition focus:border-[var(--line-strong)] focus:ring-2 focus:ring-[var(--ring)] ${
                          campaignDisabled ? "opacity-50 cursor-not-allowed" : ""
                        }`}
                        style={{
                          borderRadius:
                            "var(--page-radius) 0 0 var(--page-radius)",
                        }}
                      />
                      <button
                        onClick={() => handleCopy(campaignAppUrl, "camp-url")}
                        disabled={campaignDisabled}
                        className={`px-4 border border-l-0 border-[var(--line-soft)] bg-[var(--surface-2)] text-[var(--text-body)] transition hover:bg-[var(--surface-soft)] ${
                          campaignDisabled ? "opacity-50 cursor-not-allowed" : ""
                        }`}
                        style={{
                          borderRadius:
                            "0 var(--page-radius) var(--page-radius) 0",
                        }}
                      >
                        {copied === "camp-url" ? (
                          <Check className="h-5 w-5 text-[var(--success)]" />
                        ) : (
                          <Copy className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2 text-[var(--text-body)]">
                      Username
                    </label>
                    <div className="flex group">
                      <input
                        type="text"
                        value={campaignUsername}
                        onChange={(e) => setCampaignUsername(e.target.value)}
                        disabled={campaignDisabled}
                        className={`flex-1 px-4 py-3 text-sm text-[var(--text-strong)] bg-[var(--surface-2)] border border-[var(--line-soft)] outline-none transition focus:border-[var(--line-strong)] focus:ring-2 focus:ring-[var(--ring)] ${
                          campaignDisabled ? "opacity-50 cursor-not-allowed" : ""
                        }`}
                        style={{
                          borderRadius:
                            "var(--page-radius) 0 0 var(--page-radius)",
                        }}
                      />
                      <button
                        onClick={() => handleCopy(campaignUsername, "camp-user")}
                        disabled={campaignDisabled}
                        className={`px-4 border border-l-0 border-[var(--line-soft)] bg-[var(--surface-2)] text-[var(--text-body)] transition hover:bg-[var(--surface-soft)] ${
                          campaignDisabled ? "opacity-50 cursor-not-allowed" : ""
                        }`}
                        style={{
                          borderRadius:
                            "0 var(--page-radius) var(--page-radius) 0",
                        }}
                      >
                        {copied === "camp-user" ? (
                          <Check className="h-5 w-5 text-[var(--success)]" />
                        ) : (
                          <Copy className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2 text-[var(--text-body)]">
                      Password
                    </label>
                    <div className="flex">
                      <div className="relative flex-1">
                        <input
                          type={showCampaignPassword ? "text" : "password"}
                          value={campaignPassword}
                          onChange={(e) => setCampaignPassword(e.target.value)}
                          disabled={campaignDisabled}
                          className={`w-full px-4 py-3 pr-12 text-sm text-[var(--text-strong)] bg-[var(--surface-2)] border border-[var(--line-soft)] outline-none transition focus:border-[var(--line-strong)] focus:ring-2 focus:ring-[var(--ring)] ${
                            campaignDisabled ? "opacity-50 cursor-not-allowed" : ""
                          }`}
                          style={{
                            borderRadius:
                              "var(--page-radius) 0 0 var(--page-radius)",
                          }}
                        />
                        <button
                          onClick={() =>
                            setShowCampaignPassword(!showCampaignPassword)
                          }
                          disabled={campaignDisabled}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-soft)]"
                        >
                          {showCampaignPassword ? (
                            <EyeOff className="h-5 w-5" />
                          ) : (
                            <Eye className="h-5 w-5" />
                          )}
                        </button>
                      </div>
                      <button
                        onClick={() => handleCopy(campaignPassword, "camp-pass")}
                        disabled={campaignDisabled}
                        className={`px-4 border border-l-0 border-[var(--line-soft)] bg-[var(--surface-2)] text-[var(--text-body)] transition hover:bg-[var(--surface-soft)] ${
                          campaignDisabled ? "opacity-50 cursor-not-allowed" : ""
                        }`}
                        style={{
                          borderRadius:
                            "0 var(--page-radius) var(--page-radius) 0",
                        }}
                      >
                        {copied === "camp-pass" ? (
                          <Check className="h-5 w-5 text-[var(--success)]" />
                        ) : (
                          <Copy className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div
                className="rounded-2xl shadow-xl p-6 text-white relative overflow-hidden"
                style={{
                  background: `linear-gradient(135deg, var(--brand), var(--brand-strong))`,
                  boxShadow: "var(--shadow-panel)",
                  borderRadius: "var(--page-radius)",
                }}
              >
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-32 translate-x-32" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full translate-y-24 -translate-x-24" />

                <div className="relative z-10">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="h-12 w-12 bg-white/20 rounded-xl backdrop-blur-sm flex items-center justify-center">
                      <Send className="h-6 w-6 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold">Quick Actions</h2>
                  </div>

                  <div className="space-y-6">
                    <p className="text-white/90 text-lg leading-relaxed">
                      Launch the sending application to start your email campaign
                      immediately.
                    </p>

                    <button
                      disabled={campaignDisabled || !campaignAppUrl}
                      onClick={() => {
                        if (!campaignAppUrl) return;
                        window.open(campaignAppUrl, "_blank", "noopener,noreferrer");
                      }}
                      className="w-full px-6 py-4 rounded-xl transition-all flex items-center justify-center space-x-3 text-lg font-semibold shadow-xl active:scale-[0.98] bg-white text-[var(--brand)]"
                      style={{ borderRadius: "var(--page-radius)" }}
                    >
                      <Send className="h-5 w-5" />
                      <span>Open Sending App</span>
                    </button>

                    <div className="grid grid-cols-3 gap-3 mt-6">
                      <div
                        className="bg-white/10 rounded-xl p-3 text-center backdrop-blur-sm"
                        style={{ borderRadius: "var(--page-radius)" }}
                      >
                        <div className="text-2xl font-bold">12</div>
                        <div className="text-xs text-white/70">Active</div>
                      </div>
                      <div
                        className="bg-white/10 rounded-xl p-3 text-center backdrop-blur-sm"
                        style={{ borderRadius: "var(--page-radius)" }}
                      >
                        <div className="text-2xl font-bold">5.2K</div>
                        <div className="text-xs text-white/70">Sent</div>
                      </div>
                      <div
                        className="bg-white/10 rounded-xl p-3 text-center backdrop-blur-sm"
                        style={{ borderRadius: "var(--page-radius)" }}
                      >
                        <div className="text-2xl font-bold">98%</div>
                        <div className="text-xs text-white/70">Success</div>
                      </div>
                    </div>

                    <div className="border-t border-white/20 pt-4 mt-4">
                      <p className="text-xs text-white/60">
                        The sending app allows you to manage campaigns, track deliveries,
                        and analyze performance in real-time.
                      </p>
                      <p className="text-xs text-white/60 mt-2">
                        {campaignAppUrl ? (
                          <>
                            App URL:{" "}
                            <span className="text-white font-medium">
                              {campaignAppUrl}
                            </span>
                          </>
                        ) : (
                          <>App URL not found from backend.</>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // STEP 2 loading
  if (domainLoading) {
    return (
      <div className="min-h-screen bg-[#f4f6fb] p-3 sm:p-4 md:p-6">
        <div className="mx-auto max-w-xl">
          <div className="overflow-hidden rounded-[24px] border border-gray-200 bg-white shadow-[0_20px_60px_rgba(0,0,0,0.08)]">
            <div className="bg-[#ff7800] px-5 py-4 sm:px-6">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white">
                  <Image
                    src="/Logoicon.png"
                    alt="SMTPMaster Logo"
                    width={28}
                    height={28}
                    className="object-contain"
                  />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-white sm:text-xl">
                    Domain Verification
                  </h1>
                  <p className="text-sm text-white/90">
                    Checking your sending domain status
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-50">
                <Loader2 className="h-8 w-8 animate-spin text-[#ff7800]" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">
                Checking domain status
              </h2>
              <p className="mt-2 text-sm text-gray-500">
                Please wait while we verify your sending domain details.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // STEP 2 error
  if (domainError) {
    return (
      <div className="min-h-screen bg-[#f4f6fb] p-3 sm:p-4 md:p-6">
        <div className="mx-auto max-w-xl">
          <div className="overflow-hidden rounded-[24px] border border-gray-200 bg-white shadow-[0_20px_60px_rgba(0,0,0,0.08)]">
            <div className="bg-[#ff7800] px-5 py-4 sm:px-6">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white">
                  <Image
                    src="/Logoicon.png"
                    alt="SMTPMaster Logo"
                    width={28}
                    height={28}
                    className="object-contain"
                  />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-white sm:text-xl">
                    Domain Verification
                  </h1>
                  <p className="text-sm text-white/90">Something went wrong</p>
                </div>
              </div>
            </div>

            <div className="px-6 py-14 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50">
                <MailCheck className="h-8 w-8 text-red-500" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">
                Unable to load domain info
              </h2>
              <p className="mt-2 text-sm text-gray-500">{domainError}</p>

              <button
                type="button"
                onClick={() => window.location.reload()}
                className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-[#ff7800] px-6 text-sm font-semibold text-white transition hover:bg-[#e66c00]"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // STEP 2 fail: no valid domain
  if (domainListEmpty || !hasValidDomain) {
    return (
      <InfoCard
        step={2}
        icon={<Globe className="h-8 w-8 text-[#ff7800]" />}
        title="Step 2: No Active Domain Found"
        subtitle="Please verify your domain to continue"
      >
        <div className="mb-4 rounded-2xl border border-orange-100 bg-orange-50 px-4 py-3">
          <p className="text-sm font-medium text-gray-700">
            Active Plan:
            <span className="ml-1 font-bold text-[#ff7800]">{activePlanName}</span>
            {activePlanEndDate ? (
              <span className="ml-2 text-gray-500">
                • Expires: {formatDate(activePlanEndDate)}
              </span>
            ) : null}
          </p>
        </div>

        <p className="mt-3 text-sm leading-6 text-gray-500">
          To access your SMTP credentials and sending application details, you'll
          need to verify your domain. Please go to the Domain Info section and add
          the following three TXT records to your DNS panel: SPF, DMARC, DKIM.
        </p>

        <p className="mt-3 text-sm leading-6 text-gray-500">
          Once these records are properly added and verified, your domain will be
          activated, and you'll be able to access your email sending credentials.
        </p>

        <p className="mt-3 text-sm leading-6 text-gray-500">
          If you need any assistance with the setup or have any questions, feel free
          to reach out to our{" "}
          <a
            href="mailto:support@smtpmaster.com"
            className="font-semibold text-[#ff7800] hover:underline"
          >
            support team
          </a>{" "}
          — we're here to help.
        </p>

        <button
          type="button"
          onClick={() => router.push("/domain-info")}
          className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-[#ff7800] px-6 text-sm font-semibold text-white transition hover:bg-[#e66c00]"
        >
          Domain Info
        </button>
      </InfoCard>
    );
  }

  // STEP 3 ready - domain ok but email config not ready yet
  if (hasValidDomain && !hasEmailConfig) {
    return (
      <InfoCard
        step={3}
        icon={<ShieldCheck className="h-8 w-8 text-green-600" />}
        title="Step 3: Ready to send emails"
        subtitle="Your domain is verified successfully"
      >
        <div className="mb-4 rounded-2xl border border-green-100 bg-green-50 px-4 py-3">
          <p className="text-sm font-medium text-gray-700">
            Verified Domain:
            <span className="ml-1 font-bold text-green-600">{validDomainName}</span>
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Active Plan: <span className="font-semibold">{activePlanName}</span>
            {activePlanEndDate ? ` • Expires: ${formatDate(activePlanEndDate)}` : ""}
          </p>
        </div>

        <h3 className="text-xl font-bold text-gray-900">Ready to send emails</h3>

        <p className="mt-3 text-sm leading-6 text-gray-500">
          Your domain has been successfully verified. Your email sending details
          will be available shortly.
        </p>

        <p className="mt-3 text-sm leading-6 text-gray-500">
          If you experience any delays or need further assistance, please don't
          hesitate to contact our{" "}
          <a
            href="mailto:support@smtpmaster.com"
            className="font-semibold text-[#ff7800] hover:underline"
          >
            support team
          </a>{" "}
          or raise a support ticket. We're here to help.
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => router.push("https://smtpmaster.tawk.help")}
            className="inline-flex h-11 items-center justify-center rounded-xl border border-[#ff7800] bg-white px-6 text-sm font-semibold text-[#ff7800] transition hover:bg-orange-50"
          >
            Raise Support Ticket
          </button>

          <button
            type="button"
            onClick={() =>
              window.location.href =
                "mailto:support@smtpmaster.com?subject=Email%20Configuration%20Request"
            }
            className="inline-flex h-11 items-center justify-center rounded-xl bg-[#ff7800] px-6 text-sm font-semibold text-white transition hover:bg-[#e66c00]"
          >
            Contact Support
          </button>
        </div>
      </InfoCard>
    );
  }

  // final fallback
  return (
    <div className="min-h-screen bg-[#f4f6fb] p-3 sm:p-4 md:p-6">
      <div className="mx-auto max-w-xl">
        <div className="overflow-hidden rounded-[24px] border border-gray-200 bg-white shadow-[0_20px_60px_rgba(0,0,0,0.08)]">
          <div className="bg-[#ff7800] px-5 py-4 sm:px-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white">
                <Image
                  src="/Logoicon.png"
                  alt="SMTPMaster Logo"
                  width={28}
                  height={28}
                  className="object-contain"
                />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-white sm:text-xl">
                  Loading
                </h1>
                <p className="text-sm text-white/90">Please wait...</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-50">
              <Loader2 className="h-8 w-8 animate-spin text-[#ff7800]" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Loading</h2>
            <p className="mt-2 text-sm text-gray-500">
              Please wait while we load your information.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}