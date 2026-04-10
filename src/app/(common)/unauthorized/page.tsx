"use client";

import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen bg-[#f4f6fb] flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-3xl border border-gray-200 bg-white p-8 text-center shadow-[0_20px_60px_rgba(0,0,0,0.08)]">
        <h1 className="text-2xl font-bold text-gray-900">404: Page Not Found.</h1>
        <p className="mt-3 text-sm text-gray-600">
          The requested page could not be found.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-[#ff7800] px-6 text-sm font-semibold text-white hover:bg-[#e66c00]"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
