import Link from "next/link";

export default function NotFound() {
  return (
    <div
      className="
        relative min-h-screen w-full overflow-hidden
        bg-gradient-to-br
        from-orange-100 via-amber-100 to-yellow-200
        dark:from-[#120800] dark:via-[#1a0d00] dark:to-[#2b1400]
        text-gray-900 dark:text-white
      "
    >
      {/* Animated background */}
      <div className="absolute inset-0 animate-saffron opacity-70" />

      {/* Floating glow blobs */}
      <div className="absolute top-24 left-16 w-80 h-80 bg-orange-400/30 rounded-full blur-3xl animate-float-slow" />
      <div className="absolute bottom-24 right-20 w-96 h-96 bg-amber-400/30 rounded-full blur-3xl animate-float-fast" />

      {/* Content */}
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <h1 className="text-[160px] md:text-[190px] font-extrabold
          text-transparent bg-clip-text
          bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-400">
          404
        </h1>

        <p className="mt-6 text-3xl font-semibold animate-float">
          This page took a wrong turn 🚧
        </p>

        <p className="mt-4 max-w-xl text-gray-700 dark:text-gray-300">
          The page you’re looking for doesn’t exist, or the URL is invalid.
        </p>

        <p className="mt-6 text-sm text-gray-600 dark:text-gray-400">
          ✨ Thank you for visiting{" "}
          <span className="font-semibold text-orange-600 dark:text-amber-400">
            SMTPMaster
          </span>
          — delivering emails with precision.
        </p>

        <div className="mt-10">
          <Link
            href="/"
            className="
              px-10 py-4 rounded-full font-semibold
              bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-400
              text-black shadow-lg hover:scale-105 transition
            "
          >
            Go Home 🏠
          </Link>
        </div>
      </div>
    </div>
  );
}