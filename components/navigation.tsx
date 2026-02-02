"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Users,
  DollarSign,
  TrendingUp,
  ArrowLeftRight,
  FileText,
  LogOut,
  Menu,
  X,
} from "lucide-react"
import { useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/components/providers"

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/members", label: "Members", icon: Users, adminOnly: true },
  { href: "/contributions", label: "Contributions", icon: DollarSign },
  { href: "/stocks", label: "Stocks", icon: TrendingUp },
  { href: "/transactions", label: "Transactions", icon: ArrowLeftRight },
  { href: "/reports", label: "Reports", icon: FileText },
]

export function Navigation() {
  const pathname = usePathname()
  const { user, signOut } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const isAdmin = user?.familyMember?.is_admin ?? false

  const filteredNavItems = navItems.filter(
    (item) => !item.adminOnly || isAdmin
  )

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
        <div className="flex flex-col flex-grow border-r bg-card pt-5 overflow-y-auto">
          <div className="flex items-center flex-shrink-0 px-4">
            <TrendingUp className="h-8 w-8 text-primary" />
            <span className="ml-2 text-xl font-bold">Family Portfolio</span>
          </div>
          <div className="mt-8 flex flex-col flex-grow">
            <nav className="flex-1 px-2 space-y-1">
              {filteredNavItems.map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <item.icon
                      className={cn(
                        "mr-3 h-5 w-5 flex-shrink-0",
                        isActive
                          ? "text-primary-foreground"
                          : "text-muted-foreground group-hover:text-foreground"
                      )}
                    />
                    {item.label}
                  </Link>
                )
              })}
            </nav>
          </div>
          <div className="flex-shrink-0 flex border-t p-4">
            <div className="flex-shrink-0 w-full group block">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">
                    {user?.familyMember?.name || user?.email}
                  </p>
                  {isAdmin && (
                    <p className="text-xs text-muted-foreground">Admin</p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={signOut}
                  title="Sign out"
                >
                  <LogOut className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-card border-b">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center">
            <TrendingUp className="h-6 w-6 text-primary" />
            <span className="ml-2 font-bold">Family Portfolio</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </Button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-30 bg-card pt-16">
          <nav className="px-4 py-4 space-y-2">
            {filteredNavItems.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center px-3 py-3 text-base font-medium rounded-md transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <item.icon className="mr-3 h-5 w-5" />
                  {item.label}
                </Link>
              )
            })}
            <div className="pt-4 border-t mt-4">
              <div className="flex items-center justify-between px-3 py-2">
                <div>
                  <p className="text-sm font-medium">
                    {user?.familyMember?.name || user?.email}
                  </p>
                  {isAdmin && (
                    <p className="text-xs text-muted-foreground">Admin</p>
                  )}
                </div>
                <Button variant="ghost" size="sm" onClick={signOut}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign out
                </Button>
              </div>
            </div>
          </nav>
        </div>
      )}
    </>
  )
}
