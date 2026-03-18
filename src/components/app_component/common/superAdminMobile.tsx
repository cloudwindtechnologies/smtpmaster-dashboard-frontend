"use client"

import { useState } from "react"
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Menu } from "lucide-react"
import { VisuallyHidden } from "@radix-ui/react-visually-hidden"
import SuperAdminSidebar from "./super-admin-sidebar"

export function SuperAdminMobileSidebar() {
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle navigation menu</span>
        </Button>
      </SheetTrigger>

      <SheetContent side="left" className="p-0 w-64">
        {/* ✅ Accessibility requirement: SheetContent must have a title */}
        <SheetHeader>
          <VisuallyHidden>
            <SheetTitle>Sidebar Menu</SheetTitle>
          </VisuallyHidden>
        </SheetHeader>

        <SuperAdminSidebar isMobile={true} />
      </SheetContent>
    </Sheet>
  )
}

export default SuperAdminMobileSidebar
