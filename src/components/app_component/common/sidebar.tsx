"use client";

import type React from "react";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  LayoutDashboard,
  List,
  Mail,
  FileText,
  LayoutTemplate,
  Key,
  ClipboardList,
  ChevronRight,
  ChevronDown,
  Sun,
  Moon,
  Settings, // Added for Email Config
  History,  // Added for Order History
  CreditCard, // Added for My Plans
  LifeBuoy, // Added for Support
  LogOut,   // Better icon for Logout
  User,      // Better icon for My Account
  OctagonAlert,
  HeartHandshake
} from "lucide-react";
import { useTheme } from "next-themes";
import { usePathname } from "next/navigation";

type NavItem = {
  icon: React.ReactNode;
  label: string;
  href?: string;
  subItems?: { label: string; href: string }[];
};

interface SidebarNavProps {
  isMobile?: boolean;
}

export default function SidebarNav({ isMobile = false }: SidebarNavProps) {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [myAccountOpen, setMyAccountOpen] = useState(false);

  // ✅ REARRANGED SEQUENCE & RENAMED LABELS
  const navItems: NavItem[] = [
    { icon: <LayoutDashboard className="h-5 w-5" />, label: "Dashboard", href: "/" },
    { icon: <List className="h-5 w-5" />, label: "All Packages", href: "/all-packages" },
    { icon: <FileText className="h-5 w-5" />, label: "My Domains", href: "/domain-info" },
    
    // ✅ NEW: Email Config
    { icon: <Settings className="h-5 w-5" />, label: "Email Config", href: "/email-config" },
    
    { icon: <LayoutTemplate className="h-5 w-5" />, label: "Email Logs", href: "/email-logs" },
    { icon: <OctagonAlert strokeWidth={2} className="h-5 w-5" />, label: "Spam Report", href: "/spam-report" },

    // ✅ RENAMED: Package Info → My Plans
    { icon: <CreditCard className="h-5 w-5" />, label: "My Plans", href: "/my-plans" },
    
    // ✅ RENAMED & MOVED: Order History (was after All Packages)
    { icon: <History className="h-5 w-5" />, label: "Order History", href: "/order-history" },
    
    // ✅ RENAMED: Support Ticket → Support
    { icon: <HeartHandshake className="h-5 w-5" />, label: "Support", href: "https://smtpmaster.tawk.help/" },

    // ✅ RENAMED & ICON CHANGED: My Account
    { icon: <User className="h-5 w-5" />, label: "My Account", href: "/my-accounts" },

    // ✅ RENAMED & ICON CHANGED: Logout
    { icon: <LogOut className="h-5 w-5" />, label: "Logout", href: "/logout" },
  ];

  const toggleTheme = () => setTheme(theme === "dark" ? "light" : "dark");

  const renderItem = (item: NavItem) => {
    const baseClass =
      "flex items-center gap-3 rounded-md px-3 py-2 text-sm text-foreground hover:bg-orange-50 hover:text-orange-500 dark:hover:bg-gray-800";

    if (item.subItems) {
      return (
        <div>
          <button
            onClick={() => setMyAccountOpen((v) => !v)}
            className={`${baseClass} w-full justify-between`}
          >
            <div className="flex items-center gap-3">
              {item.icon}
              {item.label}
            </div>
            {myAccountOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>

          {myAccountOpen && (
            <ul className="mt-1 space-y-1 pl-10">
              {item.subItems.map((sub, i) => (
                <li key={i}>
                  <Link
                    href={sub.href}
                    className={`block rounded-md px-3 py-2 text-sm ${
                      pathname === sub.href
                        ? "bg-orange-50 text-orange-500 dark:bg-gray-800"
                        : "text-foreground hover:bg-orange-50 hover:text-orange-500 dark:hover:bg-gray-800"
                    }`}
                  >
                    • {sub.label}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      );
    }

    // ✅ open external links in new tab
    if (item.href?.startsWith("http")) {
      return (
        <a href={item.href} target="_blank" rel="noopener noreferrer" className={baseClass}>
          {item.icon}
          {item.label}
        </a>
      );
    }

    return (
      <Link
        href={item.href || "#"}
        className={`${baseClass} ${
          item.href && pathname === item.href ? "bg-orange-50 text-orange-500 dark:bg-gray-800" : ""
        }`}
      >
        {item.icon}
        {item.label}
      </Link>
    );
  };

  const content = (
    <>
      <nav className="flex-1 overflow-y-auto p-4">
        <ul className="space-y-1">
          {navItems.map((item, idx) => (
            <li key={idx} className="rounded-md">
              {renderItem(item)}
            </li>
          ))}
        </ul>
      </nav>

      {/* <div className="flex items-center justify-between border-t border-border p-2 text-xs text-muted-foreground">
        <button onClick={toggleTheme} className="rounded-md p-1 hover:bg-accent" aria-label="Toggle theme">
          {theme === "dark" ? <Moon className="h-3 w-3" /> : <Sun className="h-3 w-3" />}
        </button>
        <span>GMT+5</span>
      </div> */}

      {/* {!isMobile && (
        <div className="border-t border-border p-4">
          <div className="rounded-md bg-orange-500 p-6 text-white">
            <div className="mb-1 text-center text-xs font-medium">Current Plan</div>
            <div className="mb-2 text-center text-lg font-bold">BASIC</div>
            <div className="mb-1 text-xs">STORAGE</div>
            <div className="mb-2 h-2 overflow-hidden rounded-full bg-white/30">
              <div className="h-full w-[40%] rounded-full bg-white" />
            </div>
            <div className="text-right text-xs">40%</div>
            <Link
              href="/all-packages"
              className="mt-2 block w-full rounded-md bg-white py-2 text-center text-sm font-medium text-orange-500 hover:bg-orange-50 transition-colors"
            >
              Upgrade Plan
            </Link>
          </div>
        </div>
      )} */}
    </>
  );

  if (isMobile) return content;

  return (
    <div className="flex h-full w-64 flex-col border-r border-border bg-card">
      <div className="flex items-center justify-center px-4 py-3 mt-3 mb-[-0.5rem] h-16">
        <Link href="/">
            <Image
              src="/LoginLogo.png"
              alt="SMTP Master"
              width={120}
              height={32}
              className="w-[13rem] object-contain"
              priority
              unoptimized
            />
        </Link>
      </div>
       
      {content}
    </div>
  );
}