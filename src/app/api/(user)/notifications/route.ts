import { apiURL } from "@/components/app_component/common/http";
import { NextResponse } from "next/server";

type DomainItem = {
  id: number;
  domain_name: string;
  spf_is_valid?: string;
  dkim_is_valid?: string;
  dmarc_is_valid?: string;
  created_at?: string;
};

type SpamItem = {
  id: number;
  title?: string | null;
  content?: string | null;
  message?: string | null;
  spamreport?: string | null;
  created_at?: string | null;
};

type NotificationItem = {
  id: string;
  type: "invalid_domain" | "spam_report";
  title: string;
  message: string;
  date: string | null;
  href: string;
};

async function safeJson(res: Response) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return {};
  }
}

export async function GET(req: Request) {
  try {
    const auth = req.headers.get("authorization") || "";

    const [domainRes, spamRes] = await Promise.all([
      fetch(`${apiURL}/api/v1/user/userDomainInformation`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: auth,
        },
        cache: "no-store",
      }),
      fetch(`${apiURL}/api/v1/spamReport?page=1`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: auth,
        },
        cache: "no-store",
      }),
    ]);

    const domainJson = await safeJson(domainRes);
    const spamJson = await safeJson(spamRes);

    const domainList: DomainItem[] = domainJson?.data?.domainList || [];
    const spamList: SpamItem[] = spamJson?.data?.data || [];

    const invalidDomainNotifications: NotificationItem[] = domainList
      .filter((item) => {
        const spfInvalid = item?.spf_is_valid === "0";
        const dkimInvalid = item?.dkim_is_valid === "0";
        const dmarcInvalid = item?.dmarc_is_valid === "0";
        return spfInvalid || dkimInvalid || dmarcInvalid;
      })
      .map((item) => {
        const failedParts: string[] = [];
        if (item?.spf_is_valid === "0") failedParts.push("SPF");
        if (item?.dkim_is_valid === "0") failedParts.push("DKIM");
        if (item?.dmarc_is_valid === "0") failedParts.push("DMARC");

        return {
          id: `domain-${item.id}`,
          type: "invalid_domain",
          title: "Invalid domain setup found",
          message: `${item.domain_name} has invalid ${failedParts.join(", ")} record${failedParts.length > 1 ? "s" : ""}.`,
          date: item?.created_at || null,
          href: "/domain-info",
        };
      });

    const spamNotifications: NotificationItem[] = spamList.map((item) => ({
      id: `spam-${item.id}`,
      type: "spam_report",
      title: item?.title?.trim() || "Spam report detected",
      message:
        item?.content?.trim() ||
        item?.spamreport?.trim() ||
        item?.message?.trim() ||
        "A spam report has been generated. Please review it.",
      date: item?.created_at || null,
      href: "/spam-report",
    }));

    const notifications = [...invalidDomainNotifications, ...spamNotifications].sort(
      (a, b) => {
        const aTime = a.date ? new Date(a.date).getTime() : 0;
        const bTime = b.date ? new Date(b.date).getTime() : 0;
        return bTime - aTime;
      }
    );

    return NextResponse.json({
      success: true,
      data: {
        total: notifications.length,
        notifications,
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      {
        success: false,
        message: e?.message || "Failed to load notifications",
        data: {
          total: 0,
          notifications: [],
        },
      },
      { status: 500 }
    );
  }
}