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
} from "lucide-react";
import { useRouter } from "next/navigation";
import { token } from "../../common/http";

type MainTab = "smtp" | "api" | "campaign";
type CodeTab = "curl" | "php" | "python" | "nodejs" | "ruby";
type EmailSendType = "smtp" | "app";

type EmailConfigRow = {
  id: number;
  user_id: number;
  email_send_type: EmailSendType;
  host: string | null;
  port: string | null; // ❌ ignore backend port
  username: string | null;
  password: string | null; // hashed (not used in UI)
  app_url: string | null;
  status: string;
  without_hash?: string | null; // ✅ plain password / api key
};

type EmailConfigResponse = {
  email_config?: EmailConfigRow[];
};

export default function EmailSystemConfig() {
  const router = useRouter();

  // ✅ PUT YOUR REAL ENDPOINT HERE
  const CONFIG_URL = "http://localhost:8000/api/v1/user/useEmailConfig";

  // Tabs
  const [mainTab, setMainTab] = useState<MainTab>("smtp");
  const [codeTab, setCodeTab] = useState<CodeTab>("curl");
  const [copied, setCopied] = useState<string | null>(null);

  // Fullscreen code examples
  const [codeFullscreen, setCodeFullscreen] = useState(false);
  const [overlayMounted, setOverlayMounted] = useState(false);
  const [overlayVisible, setOverlayVisible] = useState(false);

  // ✅ Config states
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [configError, setConfigError] = useState<string | null>(null);
  const [emailSendType, setEmailSendType] = useState<EmailSendType>("smtp");

  // ✅ Values from backend (used depending on send type)
  // SMTP page values (only meaningful when email_send_type === "smtp")
  const [smtpHost, setSmtpHost] = useState("smtp.gmail.com");
  const [smtpUsername, setSmtpUsername] = useState("user@example.com");
  const [smtpPasswordPlain, setSmtpPasswordPlain] = useState("password123");

  // Campaign page values (only meaningful when email_send_type === "app")
  const [campaignAppUrl, setCampaignAppUrl] = useState("");
  const [campaignUsername, setCampaignUsername] = useState("");
  const [campaignPassword, setCampaignPassword] = useState("");

  // API tab API KEY (from without_hash)
  const [apiKey, setApiKey] = useState("");

  // Visibility toggles
  const [showSmtpPassword, setShowSmtpPassword] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showCampaignPassword, setShowCampaignPassword] = useState(false);

  // Port selection (✅ NOT from backend)
  const [port, setPort] = useState("587");
  const [encryption, setEncryption] = useState("NO");

  // ✅ Put your posted image in: /public/images/api-code-actions.png
  const API_ACTIONS_IMAGE_SRC = "/images/api-code-actions.png";

  // Auto encryption logic
  const handlePortChange = (value: string) => {
    setPort(value);
    if (value === "25") setEncryption("NO");
    if (value === "587") setEncryption("NO");
    if (value === "465") setEncryption("SSL");
  };

  // Copy function with feedback
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  // Language icons mapping
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

  // Language colors
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

  // ✅ Lock body scroll when fullscreen is open
  useEffect(() => {
    if (codeFullscreen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [codeFullscreen]);

  // ✅ ESC to close fullscreen
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeFullscreen();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ Mount/unmount overlay with animation
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

  // ✅ Fetch config (production)
  useEffect(() => {
    let alive = true;
    const controller = new AbortController();

    async function loadConfig() {
      try {
        setLoadingConfig(true);
        setConfigError(null);

        const res = await fetch(`/api/email-config/useEmailConfig`, {
          method: "GET",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json", 
            Authorization :`Bearer ${token()}`
          }
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
        if (!row) throw new Error("No email_config found");

        if (!alive) return;

        const type: EmailSendType = row.email_send_type === "app" ? "app" : "smtp";
        setEmailSendType(type);

        // ✅ Email Submission API -> API KEY (use without_hash)
        setApiKey((row.without_hash ?? "") || "");

        if (type === "smtp") {
          // ✅ Fill SMTP tab like backend (host/username/without_hash password)
          setSmtpHost(row.host ?? "");
          setSmtpUsername(row.username ?? "");
          setSmtpPasswordPlain((row.without_hash ?? "") || "");
          // auto switch if campaign is open
          if (mainTab === "campaign") setMainTab("smtp");
        } else {
          // ✅ Fill Campaign tab fields from backend
          // App url -> Campaign URL field (renamed label to App URL)
          setCampaignAppUrl(row.app_url ?? "");
          // username -> Campaign username
          setCampaignUsername(row.username ?? "");
          // without_hash -> Campaign password (plain)
          setCampaignPassword((row.without_hash ?? "") || "");
          // auto switch if smtp is open
          if (mainTab === "smtp") setMainTab("campaign");
        }
      } catch (err: any) {
        if (err?.name === "AbortError") return;
        setConfigError(err?.message || "Failed to load config");
      } finally {
        if (alive) setLoadingConfig(false);
      }
    }

    loadConfig();

    return () => {
      alive = false;
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [CONFIG_URL, router]);

  // ✅ Disable logic
  const smtpDisabled = emailSendType === "app";
  const campaignDisabled = emailSendType === "smtp";

  // Code examples (updated to API KEY only)
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

  const CodeExamplesCard = ({ fullscreen = false }: { fullscreen?: boolean }) => (
    <div className={fullscreen ? "bg-gray-900 rounded-none shadow-none border-0 p-6 w-full h-full" : "bg-gray-900 rounded-2xl shadow-xl border border-gray-800 p-6"}>
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
            {codeFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
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
        <div className={`absolute inset-0 bg-gradient-to-r ${getLanguageColor(codeTab)} opacity-20 rounded-xl blur-xl group-hover:opacity-30 transition-all`} />
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

          <pre className={["p-5 text-sm font-mono overflow-x-auto overflow-y-auto transition-all duration-300 ease-out", fullscreen ? "h-[70vh] lg:h-[78vh]" : "h-[260px]"].join(" ")}>
            <code className="text-gray-300 whitespace-pre" dangerouslySetInnerHTML={{ __html: codeExamples[codeTab] }} />
          </pre>
        </div>
      </div>

      <div className="mt-4 p-4 bg-gray-800/50 rounded-xl border border-gray-700">
        <div className="flex items-start space-x-3">
          <Sparkles className="h-4 w-4 text-orange-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs text-gray-400">
              <span className="text-orange-500 font-medium">Pro tip:</span> Replace
              <code className="mx-1 px-1.5 py-0.5 bg-gray-700 rounded text-orange-400">YOUR_API_KEY</code>
              with your API Key from the left panel
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* ✅ Fullscreen overlay (Animated) */}
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
                "w-full h-full rounded-2xl overflow-hidden border border-gray-800 shadow-2xl bg-gray-900",
                "transition-all duration-300 ease-out will-change-transform",
                overlayVisible ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-[0.97] translate-y-2",
              ].join(" ")}
            >
              <div className="w-full h-full">
                <CodeExamplesCard fullscreen />
              </div>

              <button
                onClick={closeFullscreen}
                className="absolute top-6 right-6 p-2 rounded-xl bg-gray-900/70 border border-gray-700 hover:bg-gray-800 text-gray-200 transition-all active:scale-95"
                title="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        <div className="flex-1 p-8 overflow-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Email Configuration</h1>
          </div>

          <div className="mb-6 flex items-center gap-3">
            {loadingConfig ? (
              <div className="text-sm text-gray-500">Loading configuration…</div>
            ) : configError ? (
              <div className="text-sm text-red-600">{configError}</div>
            ) : (
              <div className="text-sm text-gray-600">
                Active mode:{" "}
                <span className="font-semibold text-gray-900">{emailSendType.toUpperCase()}</span>
              </div>
            )}
          </div>

          {/* Main Tabs */}
          <div className="border-b border-gray-200 mb-6">
            <div className="flex space-x-8">
              <button
                onClick={() => !smtpDisabled && setMainTab("smtp")}
                disabled={smtpDisabled}
                className={`pb-3 text-sm font-medium relative transition-all ${
                  mainTab === "smtp" ? "text-orange-600" : "text-gray-500 hover:text-gray-700"
                } ${smtpDisabled ? "opacity-40 cursor-not-allowed hover:text-gray-500" : ""}`}
              >
                <span className="flex items-center space-x-2">
                  <Server className="h-4 w-4" />
                  <span>Outgoing SMTP Details</span>
                </span>
                {mainTab === "smtp" && !smtpDisabled && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-orange-500 to-orange-600" />
                )}
              </button>

              <button
                onClick={() => setMainTab("api")}
                className={`pb-3 text-sm font-medium relative transition-all ${
                  mainTab === "api" ? "text-orange-600" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <span className="flex items-center space-x-2">
                  <Zap className="h-4 w-4" />
                  <span>Email Submission API</span>
                </span>
                {mainTab === "api" && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-orange-500 to-orange-600" />
                )}
              </button>

              <button
                onClick={() => !campaignDisabled && setMainTab("campaign")}
                disabled={campaignDisabled}
                className={`pb-3 text-sm font-medium relative transition-all ${
                  mainTab === "campaign" ? "text-orange-600" : "text-gray-500 hover:text-gray-700"
                } ${campaignDisabled ? "opacity-40 cursor-not-allowed hover:text-gray-500" : ""}`}
              >
                <span className="flex items-center space-x-2">
                  <Send className="h-4 w-4" />
                  <span>Email Campaign Sender</span>
                </span>
                {mainTab === "campaign" && !campaignDisabled && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-orange-500 to-orange-600" />
                )}
              </button>
            </div>
          </div>

          {/* SMTP TAB (backend-driven like you asked) */}
          {mainTab === "smtp" && (
            <div className="grid lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="h-10 w-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
                    <Mail className="h-5 w-5 text-white" />
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900">Your SMTP Setting</h2>
                </div>

                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Server Name</label>
                    <div className="flex group">
                      <input
                        type="text"
                        value={smtpHost}
                        onChange={(e) => setSmtpHost(e.target.value)}
                        disabled={smtpDisabled}
                        className={`flex-1 border border-gray-200 rounded-l-xl px-4 py-3 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all ${
                          smtpDisabled ? "opacity-50 cursor-not-allowed" : ""
                        }`}
                      />
                      <button
                        onClick={() => handleCopy(smtpHost, "smtp-server")}
                        disabled={smtpDisabled}
                        className={`px-4 bg-gray-100 border border-l-0 border-gray-200 rounded-r-xl hover:bg-gray-200 transition-all ${
                          smtpDisabled ? "opacity-50 cursor-not-allowed hover:bg-gray-100" : ""
                        }`}
                      >
                        {copied === "smtp-server" ? <Check className="h-5 w-5 text-green-600" /> : <Copy className="h-5 w-5 text-gray-600" />}
                      </button>
                    </div>
                  </div>

                  {/* ✅ Port NOT from backend */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Port</label>
                    <select
                      value={port}
                      onChange={(e) => handlePortChange(e.target.value)}
                      disabled={smtpDisabled}
                      className={`w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all bg-white ${
                        smtpDisabled ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                    >
                      <option value="25">25</option>
                      <option value="587">587</option>
                      <option value="465">465</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Encryption</label>
                    <input type="text" value={encryption} disabled className="w-full border border-gray-200 rounded-xl px-4 py-3 bg-gray-100 text-gray-700 font-medium" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
                    <div className="flex group">
                      <input
                        type="text"
                        value={smtpUsername}
                        onChange={(e) => setSmtpUsername(e.target.value)}
                        disabled={smtpDisabled}
                        className={`flex-1 border border-gray-200 rounded-l-xl px-4 py-3 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all ${
                          smtpDisabled ? "opacity-50 cursor-not-allowed" : ""
                        }`}
                      />
                      <button
                        onClick={() => handleCopy(smtpUsername, "smtp-user")}
                        disabled={smtpDisabled}
                        className={`px-4 bg-gray-100 border border-l-0 border-gray-200 rounded-r-xl hover:bg-gray-200 transition-all ${
                          smtpDisabled ? "opacity-50 cursor-not-allowed hover:bg-gray-100" : ""
                        }`}
                      >
                        {copied === "smtp-user" ? <Check className="h-5 w-5 text-green-600" /> : <Copy className="h-5 w-5 text-gray-600" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                    <div className="flex">
                      <div className="relative flex-1">
                        <input
                          type={showSmtpPassword ? "text" : "password"}
                          value={smtpPasswordPlain}
                          onChange={(e) => setSmtpPasswordPlain(e.target.value)}
                          disabled={smtpDisabled}
                          className={`w-full border border-gray-200 rounded-l-xl px-4 py-3 pr-12 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all ${
                            smtpDisabled ? "opacity-50 cursor-not-allowed" : ""
                          }`}
                        />
                        <button
                          onClick={() => setShowSmtpPassword(!showSmtpPassword)}
                          disabled={smtpDisabled}
                          className={`absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 ${
                            smtpDisabled ? "opacity-50 cursor-not-allowed hover:text-gray-500" : ""
                          }`}
                        >
                          {showSmtpPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                      </div>
                      <button
                        onClick={() => handleCopy(smtpPasswordPlain, "smtp-pass")}
                        disabled={smtpDisabled}
                        className={`px-4 bg-gray-100 border border-l-0 border-gray-200 rounded-r-xl hover:bg-gray-200 transition-all ${
                          smtpDisabled ? "opacity-50 cursor-not-allowed hover:bg-gray-100" : ""
                        }`}
                      >
                        {copied === "smtp-pass" ? <Check className="h-5 w-5 text-green-600" /> : <Copy className="h-5 w-5 text-gray-600" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column - Test SMTP (Send button bottom) */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 flex flex-col">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="h-10 w-10 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-green-200">
                    <Send className="h-5 w-5 text-white" />
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900">Test SMTP</h2>
                </div>

                <div className="space-y-4 flex-1">
                  <input type="email" placeholder="From Email" disabled={smtpDisabled} className={`w-full border border-gray-200 rounded-xl px-4 py-3 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all ${smtpDisabled ? "opacity-50 cursor-not-allowed" : ""}`} />
                  <input type="email" placeholder="To Email" disabled={smtpDisabled} className={`w-full border border-gray-200 rounded-xl px-4 py-3 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all ${smtpDisabled ? "opacity-50 cursor-not-allowed" : ""}`} />
                  <input type="text" placeholder="Subject" disabled={smtpDisabled} className={`w-full border border-gray-200 rounded-xl px-4 py-3 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all ${smtpDisabled ? "opacity-50 cursor-not-allowed" : ""}`} />
                  <textarea placeholder="Body (HTML)" rows={4} disabled={smtpDisabled} className={`w-full border border-gray-200 rounded-xl px-4 py-3 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all resize-none ${smtpDisabled ? "opacity-50 cursor-not-allowed" : ""}`} />
                </div>

                <div className="mt-auto pt-4">
                  <div className="flex items-center space-x-3">
                    <input type="text" placeholder="Captcha" disabled={smtpDisabled} className={`flex-1 border border-gray-200 rounded-xl px-4 py-3 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all ${smtpDisabled ? "opacity-50 cursor-not-allowed" : ""}`} />
                    <button disabled={smtpDisabled} className={`px-8 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl hover:from-orange-600 hover:to-orange-700 transition-all shadow-lg shadow-orange-200 flex items-center space-x-2 font-medium ${smtpDisabled ? "opacity-50 cursor-not-allowed hover:from-orange-500 hover:to-orange-600" : ""}`}>
                      <Send className="h-4 w-4" />
                      <span>Send</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* API TAB (remove username/pass, add API KEY) */}
          {mainTab === "api" && (
            <div className="grid lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="h-10 w-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg shadow-purple-200">
                    <Zap className="h-5 w-5 text-white" />
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900">Email Submission API</h2>
                </div>

                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">API URL</label>
                    <div className="flex group">
                      <input
                        type="text"
                        defaultValue="https://api.example.com/v3/send "
                        className="flex-1 border border-gray-200 rounded-l-xl px-4 py-3 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                      />
                      <button
                        onClick={() => handleCopy("https://api.example.com/v3/send ", "api-url")}
                        className="px-4 bg-gray-100 border border-l-0 border-gray-200 rounded-r-xl hover:bg-gray-200 transition-all"
                      >
                        {copied === "api-url" ? <Check className="h-5 w-5 text-green-600" /> : <Copy className="h-5 w-5 text-gray-600" />}
                      </button>
                    </div>
                  </div>

                  {/* ✅ API KEY */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">API KEY</label>
                    <div className="flex">
                      <div className="relative flex-1">
                        <input
                          type={showApiKey ? "text" : "password"}
                          value={apiKey}
                          onChange={(e) => setApiKey(e.target.value)}
                          className="w-full border border-gray-200 rounded-l-xl px-4 py-3 pr-12 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                        />
                        <button
                          onClick={() => setShowApiKey(!showApiKey)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                          title={showApiKey ? "Hide" : "Show"}
                        >
                          {showApiKey ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                      </div>
                      <button
                        onClick={() => handleCopy(apiKey, "api-key")}
                        className="px-4 bg-gray-100 border border-l-0 border-gray-200 rounded-r-xl hover:bg-gray-200 transition-all"
                        title="Copy API Key"
                      >
                        {copied === "api-key" ? <Check className="h-5 w-5 text-green-600" /> : <KeyRound className="h-5 w-5 text-gray-600" />}
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      This API key is loaded from backend <span className="font-medium">without_hash</span>.
                    </p>
                  </div>
                </div>
              </div>

              <CodeExamplesCard />
            </div>
          )}

          {/* CAMPAIGN TAB (use app_url, username, without_hash) */}
          {mainTab === "campaign" && (
            <div className="grid lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="h-10 w-10 bg-gradient-to-br from-green-500 to-teal-500 rounded-xl flex items-center justify-center shadow-lg shadow-green-200">
                    <Send className="h-5 w-5 text-white" />
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900">Email Campaign Sender</h2>
                </div>

                <div className="space-y-5">
                  <div className="bg-gradient-to-r from-orange-50 to-yellow-50 p-4 rounded-xl border border-orange-100">
                    <p className="text-sm text-gray-700">
                      Configure your email campaign sender settings below. These settings will be used for all outgoing campaign emails.
                    </p>
                  </div>

                  {/* ✅ App URL (label changed) */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">App URL</label>
                    <div className="flex group">
                      <input
                        type="text"
                        value={campaignAppUrl}
                        onChange={(e) => setCampaignAppUrl(e.target.value)}
                        disabled={campaignDisabled}
                        className={`flex-1 border border-gray-200 rounded-l-xl px-4 py-3 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all ${
                          campaignDisabled ? "opacity-50 cursor-not-allowed" : ""
                        }`}
                      />
                      <button
                        onClick={() => handleCopy(campaignAppUrl, "camp-url")}
                        disabled={campaignDisabled}
                        className={`px-4 bg-gray-100 border border-l-0 border-gray-200 rounded-r-xl hover:bg-gray-200 transition-all ${
                          campaignDisabled ? "opacity-50 cursor-not-allowed hover:bg-gray-100" : ""
                        }`}
                      >
                        {copied === "camp-url" ? <Check className="h-5 w-5 text-green-600" /> : <Copy className="h-5 w-5 text-gray-600" />}
                      </button>
                    </div>
                  </div>

                  {/* ✅ Username from backend username */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
                    <div className="flex group">
                      <input
                        type="text"
                        value={campaignUsername}
                        onChange={(e) => setCampaignUsername(e.target.value)}
                        disabled={campaignDisabled}
                        className={`flex-1 border border-gray-200 rounded-l-xl px-4 py-3 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all ${
                          campaignDisabled ? "opacity-50 cursor-not-allowed" : ""
                        }`}
                      />
                      <button
                        onClick={() => handleCopy(campaignUsername, "camp-user")}
                        disabled={campaignDisabled}
                        className={`px-4 bg-gray-100 border border-l-0 border-gray-200 rounded-r-xl hover:bg-gray-200 transition-all ${
                          campaignDisabled ? "opacity-50 cursor-not-allowed hover:bg-gray-100" : ""
                        }`}
                      >
                        {copied === "camp-user" ? <Check className="h-5 w-5 text-green-600" /> : <Copy className="h-5 w-5 text-gray-600" />}
                      </button>
                    </div>
                  </div>

                  {/* ✅ Password from backend without_hash */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                    <div className="flex">
                      <div className="relative flex-1">
                        <input
                          type={showCampaignPassword ? "text" : "password"}
                          value={campaignPassword}
                          onChange={(e) => setCampaignPassword(e.target.value)}
                          disabled={campaignDisabled}
                          className={`w-full border border-gray-200 rounded-l-xl px-4 py-3 pr-12 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all ${
                            campaignDisabled ? "opacity-50 cursor-not-allowed" : ""
                          }`}
                        />
                        <button
                          onClick={() => setShowCampaignPassword(!showCampaignPassword)}
                          disabled={campaignDisabled}
                          className={`absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 ${
                            campaignDisabled ? "opacity-50 cursor-not-allowed hover:text-gray-500" : ""
                          }`}
                        >
                          {showCampaignPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                      </div>
                      <button
                        onClick={() => handleCopy(campaignPassword, "camp-pass")}
                        disabled={campaignDisabled}
                        className={`px-4 bg-gray-100 border border-l-0 border-gray-200 rounded-r-xl hover:bg-gray-200 transition-all ${
                          campaignDisabled ? "opacity-50 cursor-not-allowed hover:bg-gray-100" : ""
                        }`}
                      >
                        {copied === "camp-pass" ? <Check className="h-5 w-5 text-green-600" /> : <Copy className="h-5 w-5 text-gray-600" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column - Open Sending App (button opens app url) */}
              <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl shadow-xl p-6 text-white relative overflow-hidden">
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
                      Launch the sending application to start your email campaign immediately.
                    </p>

                    <button
                      disabled={campaignDisabled || !campaignAppUrl}
                      onClick={() => {
                        if (!campaignAppUrl) return;
                        window.open(campaignAppUrl, "_blank", "noopener,noreferrer");
                      }}
                      className={`w-full px-6 py-4 bg-white text-orange-600 rounded-xl hover:bg-orange-50 transition-all flex items-center justify-center space-x-3 text-lg font-semibold shadow-xl active:scale-[0.98] ${
                        campaignDisabled || !campaignAppUrl ? "opacity-70 cursor-not-allowed hover:bg-white" : ""
                      }`}
                    >
                      <Send className="h-5 w-5" />
                      <span>Open Sending App</span>
                    </button>

                    <div className="grid grid-cols-3 gap-3 mt-6">
                      <div className="bg-white/10 rounded-xl p-3 text-center backdrop-blur-sm">
                        <div className="text-2xl font-bold">12</div>
                        <div className="text-xs text-white/70">Active</div>
                      </div>
                      <div className="bg-white/10 rounded-xl p-3 text-center backdrop-blur-sm">
                        <div className="text-2xl font-bold">5.2K</div>
                        <div className="text-xs text-white/70">Sent</div>
                      </div>
                      <div className="bg-white/10 rounded-xl p-3 text-center backdrop-blur-sm">
                        <div className="text-2xl font-bold">98%</div>
                        <div className="text-xs text-white/70">Success</div>
                      </div>
                    </div>

                    <div className="border-t border-white/20 pt-4 mt-4">
                      <p className="text-xs text-white/60">
                        The sending app allows you to manage campaigns, track deliveries, and analyze performance in real-time.
                      </p>
                      <p className="text-xs text-white/60 mt-2">
                        {campaignAppUrl ? (
                          <>
                            App URL: <span className="text-white font-medium">{campaignAppUrl}</span>
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

          {/* Done */}
        </div>
      </main>
    </div>
  );
}