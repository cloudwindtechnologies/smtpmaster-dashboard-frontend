"use client";

import type React from "react";
import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  LayoutDashboard,
  Mail,
  Users,
  Package,
  RefreshCw,
  FileText,
  Bell,
  Ticket,
  User,
  BarChart3,
  LogOut,
  ChevronRight,
  ChevronDown,
  Sun,
  Moon,
  Settings,
  Server,
  List as ListIcon,
  PlusCircle,
  Edit3,
  Key,
  TicketIcon,
} from "lucide-react";
import { useTheme } from "next-themes";
import { usePathname } from "next/navigation";

type SubItem = { label: string; href: string };

type NavItem = {
  icon: React.ReactNode;
  label: string;
  href?: string;
  key?: string; // for dropdown state
  subItems?: SubItem[];
};

interface SidebarNavProps {
  isMobile?: boolean;
}

export default function SuperAdminSidebar({ isMobile = false }: SidebarNavProps) {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // ✅ Track which dropdowns have been manually opened (for transitions)
  const [manuallyOpened, setManuallyOpened] = useState<Record<string, boolean>>({});
  
  // ✅ multiple dropdowns, all closed by default
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});

  // Auto-open dropdown if current path matches any sub-item (NO TRANSITION)
  useEffect(() => {
    if (!mounted) {
      setMounted(true);
      return;
    }

    // Safely check pathname
    if (!pathname) return;

    // Find which dropdown should be open based on current path
    const navItemsWithSubs = [
      { key: "emailAccountSetting", subItems: [
        "/email-account-setting/email-configuration",
        "/email-account-setting/list-sender-domain",
        "/email-account-setting/add-sender-domain",
        
      ]},
      { key: "userManagement", subItems: [
        "/user-management/add-new-user",
        "/user-management/list-users",
        // "/user-management/add-server",
        "/user-management/client-span-report"
      ]},
      { key: "emailPackageConfig", subItems: ["/email-package-config/add-new-package"]},
      
    ];

    for (const item of navItemsWithSubs) {
      if (item.subItems.some(subPath => pathname === subPath || pathname.startsWith(subPath))) {
        // Open immediately without transition on page load
        setOpenMenus(prev => ({ ...prev, [item.key]: true }));
        break;
      }
    }
  }, [pathname, mounted]);

  const toggleMenu = (key: string) => {
    // Mark this dropdown as manually opened (for transition)
    if (!manuallyOpened[key]) {
      setManuallyOpened(prev => ({ ...prev, [key]: true }));
    }
    
    // Toggle the menu
    setOpenMenus((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const navItems: NavItem[] = useMemo(
    () => [
      { 
        icon: <LayoutDashboard className="h-5 w-5" />, 
        label: "Dashboard", 
        href: "/" 
      },

      {
        key: "emailAccountSetting",
        icon: <Settings className="h-5 w-5" />,
        label: "Email Account Setting",
        subItems: [
          { label: "Email Configuration", href: "/email-account-setting/email-configuration" },
          { label: "List Sender Domain", href: "/email-account-setting/list-sender-domain" },
          { label: "Add Sender Domain", href: "/email-account-setting/add-sender-domain" },
          
        ],
      },

      {
        key: "userManagement",
        icon: <Users className="h-5 w-5" />,
        label: "User Management",
        subItems: [
          { label: "Add New User", href: "/user-management/add-new-user" },
          { label: "List Users", href: "/user-management/list-users" },
          // { label: "Add Server", href: "/user-management/add-server" },
          { label: "Clients Spam Report", href: "/user-management/client-span-report" },
        ],
      },

      {
        key: "emailPackageConfig",
        icon: <Package className="h-5 w-5" />,
        label: "Email Package Config",
        subItems: [{ label: "Add New Package", href: "/email-package-config/add-new-package" }],
      },

      { 
        icon: <RefreshCw className="h-5 w-5" />, 
        label: "Change Currency Exchange", 
        href: "/change-currency-exchange" 
      },
      { 
        icon: <FileText className="h-5 w-5" />, 
        label: "Email Logs", 
        href: "/email-logs" 
      },
      { 
        icon: <Bell className="h-5 w-5" />, 
        label: "Notification", 
        href: "/add-notification" 
      },

      { icon: <Key className="h-5 w-5" />, label: "Support Ticket", href: "https://smtpmaster.tawk.help/" },

      {
        key: "myAccount",
        icon: <User className="h-5 w-5" />,
        label: "My Account",
         href: "/my-accounts"
        // subItems: [
        //   { label: "Change Password", href: "/my-accounts/change-password" },
        //   { label: "Upload Image", href: "/my-accounts/upload-image" },
        // ],
      },

      { 
        icon: <BarChart3 className="h-5 w-5" />, 
        label: "Live Report", 
        href: "/live-report" 
      },
       { 
        icon: <TicketIcon className="h-5 w-5" />, 
        label: "Coupons", 
        href: "/coupons" 
      },
      { 
        icon: <LogOut className="h-5 w-5" />, 
        label: "Logout", 
        href: "/logout" 
      },
    ],
    []
  );

  const toggleTheme = (e: React.MouseEvent) => {
    e.preventDefault();
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const baseClass = "flex items-center gap-3 rounded-md px-3 py-2 text-sm text-foreground hover:bg-orange-50 hover:text-orange-500 dark:hover:bg-gray-800 transition-all duration-300";

  const renderItem = (item: NavItem) => {
    // ✅ dropdown items
    if (item.subItems && item.key) {
      const isOpen = !!openMenus[item.key];
      const wasManuallyOpened = !!manuallyOpened[item.key];
      const hasActiveSubItem = item.subItems.some(sub => {
        if (!pathname) return false;
        return pathname === sub.href;
      });

      return (
        <div>
          <button
            onClick={() => toggleMenu(item.key!)}
            className={`${baseClass} w-full justify-between ${
              hasActiveSubItem ? "bg-orange-50 text-orange-500 dark:bg-gray-800" : ""
            }`}
            aria-expanded={isOpen}
            aria-controls={`submenu-${item.key}`}
          >
            <div className="flex items-center gap-3">
              {item.icon}
              {item.label}
            </div>
            {isOpen ? (
              <ChevronDown className="h-4 w-4 transition-transform duration-300" />
            ) : (
              <ChevronRight className="h-4 w-4 transition-transform duration-300" />
            )}
          </button>

          <div
            id={`submenu-${item.key}`}
            className={`overflow-hidden ${
              // Apply transition only if this dropdown was manually opened
              wasManuallyOpened 
                ? "transition-all duration-300 ease-in-out" 
                : ""
            } ${
              isOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
            }`}
            style={{
              // For dropdowns opened on page load, show immediately (no transition)
              transition: wasManuallyOpened ? undefined : 'none'
            }}
          >
            <ul className="mt-1 space-y-1 pl-10">
              {item.subItems.map((sub, i) => {
                const isActive = pathname === sub.href;
                return (
                  <li key={i}>
                    <Link
                      href={sub.href}
                      className={`block rounded-md px-3 py-2 text-sm ${
                        isActive
                          ? "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
                          : "text-foreground hover:bg-orange-50 hover:text-orange-500 dark:hover:bg-gray-800"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`h-1.5 w-1.5 rounded-full ${isActive ? "bg-blue-500" : "bg-gray-300 dark:bg-gray-600"}`} />
                        {sub.label}
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      );
    }

    // ✅ open external links in new tab
    if (item.href?.startsWith("http")) {
      return (
        <a 
          href={item.href} 
          target="_blank" 
          rel="noopener noreferrer" 
          className={baseClass}
        >
          {item.icon}
          {item.label}
        </a>
      );
    }

    // ✅ normal single link
    const isActive = pathname === item.href;
    return (
      <Link
        href={item.href || "#"}
        className={`${baseClass} ${
          isActive ? "bg-orange-50 text-orange-500 dark:bg-gray-800" : ""
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
{/* 
      <div className="flex items-center justify-between border-t border-border p-2 text-xs text-muted-foreground">
        <button 
          onClick={toggleTheme} 
          className="rounded-md p-1 hover:bg-accent transition-all duration-300" 
          aria-label="Toggle theme"
        >
          {theme === "dark" ? <Moon className="h-3 w-3" /> : <Sun className="h-3 w-3" />}
        </button>
        <span>GMT+5</span>
      </div> */}

      {/* {!isMobile && (
        <div className="border-t border-border p-4">
          <div className="rounded-md bg-orange-500 p-6 text-white transition-all duration-300 hover:shadow-lg">
            <div className="mb-1 text-center text-xs font-medium">Current Plan</div>
            <div className="mb-2 text-center text-lg font-bold">BASIC</div>
            <div className="mb-1 text-xs">STORAGE</div>
            <div className="mb-2 h-2 overflow-hidden rounded-full bg-white/30">
              <div className="h-full w-[40%] rounded-full bg-white transition-all duration-1000 ease-out" />
            </div>
            <div className="text-right text-xs">40%</div>
            <Link
              href="/upgrade"
              className="mt-2 block w-full rounded-md bg-white py-2 text-center text-sm font-medium text-orange-500 hover:bg-orange-50 transition-all duration-300"
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
    <div className="flex h-full w-72 flex-col border-r border-border bg-card transition-all duration-300">
      <div className="flex items-center justify-center px-4 py-3 mt-3 h-16">
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