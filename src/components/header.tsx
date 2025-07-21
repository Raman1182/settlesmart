"use client"

import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { PanelLeft } from "lucide-react"
import Link from "next/link"
import { SettleSmartLogo } from "./icons"
import { AppSidebar } from "./app-sidebar"
import { UserNav } from "./user-nav"
import { AddExpenseSheet } from "./add-expense-sheet"

export function Header() {
    return (
        <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6 py-4">
            <Sheet>
                <SheetTrigger asChild>
                    <Button size="icon" variant="outline" className="sm:hidden">
                        <PanelLeft className="h-5 w-5" />
                        <span className="sr-only">Toggle Menu</span>
                    </Button>
                </SheetTrigger>
                <SheetContent side="left" className="sm:max-w-xs p-0">
                    <div className="flex h-full max-h-screen flex-col gap-2">
                        <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
                            <Link href="/" className="flex items-center gap-2 font-semibold">
                                <SettleSmartLogo className="h-6 w-6" />
                                <span className="">SettleSmart</span>
                            </Link>
                        </div>
                        <div className="flex-1 overflow-auto">
                            <AppSidebar />
                        </div>
                    </div>
                </SheetContent>
            </Sheet>
            <div className="relative ml-auto flex-1 md:grow-0">
                <h1 className="text-xl font-semibold">Dashboard</h1>
            </div>
            <div className="ml-auto flex items-center gap-2">
                <AddExpenseSheet />
                <UserNav />
            </div>
        </header>
    );
}
