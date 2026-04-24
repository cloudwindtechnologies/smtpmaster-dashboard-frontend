import { apiURL } from "@/components/app_component/common/http";
import { NextRequest, NextResponse } from "next/server";

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasProfileData(payload: unknown): boolean {
  if (!isRecord(payload)) return false;
  const profile = payload.data;
  return isRecord(profile) && Object.keys(profile).length > 0;
}

function clearAuthCookies(response: NextResponse) {
  ["token", "role"].forEach((name) => {
    response.cookies.set(name, "", {
      httpOnly: name === "token",
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires: new Date(0),
    });
  });
}

function unauthorizedProfileResponse(message = "Session expired. Please login again.") {
  const response = NextResponse.json(
    { success: false, message },
    { status: 401 }
  );
  clearAuthCookies(response);
  return response;
}

async function createProfileResponse(backendRes: Response) {
  if (backendRes.status === 204) {
    return unauthorizedProfileResponse();
  }

  let text = "";

  try {
    text = await backendRes.text();
  } catch (error) {
    console.error("Profile response read error:", error);
    return NextResponse.json(
      { message: "Unable to read backend response" },
      { status: 502 }
    );
  }

  if (!text) {
    return backendRes.ok
      ? unauthorizedProfileResponse()
      : NextResponse.json({}, { status: backendRes.status });
  }

  try {
    const data = JSON.parse(text);

    if (backendRes.ok) {
      const success = isRecord(data) ? data.success : undefined;

      if (success === false || !hasProfileData(data)) {
        return unauthorizedProfileResponse();
      }
    }

    const response = NextResponse.json(data, { status: backendRes.status });

    if (backendRes.status === 401 || backendRes.status === 403) {
      clearAuthCookies(response);
    }

    return response;
  } catch {
    if (backendRes.ok) {
      return unauthorizedProfileResponse();
    }

    const response = new NextResponse(text, {
      status: backendRes.status,
      headers: {
        "Content-Type":
          backendRes.headers.get("content-type") || "text/plain; charset=utf-8",
      },
    });

    if (backendRes.status === 401 || backendRes.status === 403) {
      clearAuthCookies(response);
    }

    return response;
  }
}

function getCookieValue(cookieHeader: string, key: string): string {
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${key}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : "";
}

function getAuthHeader(req: NextRequest): string {
  const headerAuth = req.headers.get("authorization") || "";

  if (headerAuth.toLowerCase().startsWith("bearer ")) {
    return headerAuth;
  }

  const cookieToken = getCookieValue(req.headers.get("cookie") || "", "token");
  return cookieToken ? `Bearer ${cookieToken}` : "";
}

export async function GET(req: NextRequest) {
  try {
    // 1️⃣ Read Authorization header from frontend request
    const authHeader = getAuthHeader(req);

    if (!authHeader) {
      return NextResponse.json(
        { message: "Authorization header missing" },
        { status: 401 }
      );
    }

    // 2️⃣ Call Laravel API
    const backendRes = await fetch(
      `${apiURL}/api/v1/profileMe`,
      {
        method: "GET",
        headers: {
          Authorization: authHeader,
          Accept: "application/json",
        },
        cache: "no-store", // important for auth routes
      }
    );

    // 3️⃣ Read backend response
    return createProfileResponse(backendRes);

    // 4️⃣ Forward response & status


  } catch (error) {
    console.error("Profile proxy error:", error);

    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
