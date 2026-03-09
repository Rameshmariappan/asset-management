'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/auth-context'
import { usePermissions } from '@/lib/permissions'
import { Button } from '@/components/ui/button'
import { OrgSwitcher } from '@/components/org-switcher'
import {
  LayoutDashboard,
  Package,
  Users,
  Building2,
  FolderTree,
  Store,
  MapPin,
  ArrowRightLeft,
  ClipboardList,
  FileText,
  Bell,
  Settings,
  LogOut,
  QrCode,
  PanelLeftClose,
  PanelLeftOpen,
  Globe,
} from 'lucide-react'

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/v1').replace(/\/v1$/, '')

function getInitials(name: string) {
  const words = name.trim().split(/\s+/)
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const { canViewUserList, canManageTags, canViewReports, canViewTransfers, isPlatformAdmin } = usePermissions()

  const orgName = user?.organization?.name || 'Asset Manager'
  const orgLogoUrl = user?.organization?.logoUrl
    ? user.organization.logoUrl.startsWith('http')
      ? user.organization.logoUrl
      : `${API_BASE}${user.organization.logoUrl}`
    : null

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, visible: true },
    { name: 'Assets', href: '/dashboard/assets', icon: Package, visible: true },
    { name: 'Assignments', href: '/dashboard/assignments', icon: ClipboardList, visible: true },
    { name: 'Transfers', href: '/dashboard/transfers', icon: ArrowRightLeft, visible: canViewTransfers },
    { name: 'Tags', href: '/dashboard/tags', icon: QrCode, visible: canManageTags },
    { name: 'Users', href: '/dashboard/users', icon: Users, visible: canViewUserList },
    { name: 'Departments', href: '/dashboard/departments', icon: Building2, visible: true },
    { name: 'Categories', href: '/dashboard/categories', icon: FolderTree, visible: true },
    { name: 'Vendors', href: '/dashboard/vendors', icon: Store, visible: true },
    { name: 'Locations', href: '/dashboard/locations', icon: MapPin, visible: true },
    { name: 'Reports', href: '/dashboard/reports', icon: FileText, visible: canViewReports },
    { name: 'Notifications', href: '/dashboard/notifications', icon: Bell, visible: true },
    { name: 'Settings', href: '/dashboard/settings', icon: Settings, visible: true },
  ]

  return (
    <div className="flex h-full flex-col bg-sidebar border-r border-sidebar-border">
      {/* Header with logo + collapse toggle */}
      <div className={cn(
        'flex items-center border-b border-sidebar-border px-4 py-4',
        collapsed ? 'flex-col gap-2 px-2' : 'justify-between'
      )}>
        {collapsed ? (
          <>
            {orgLogoUrl ? (
              <img src={orgLogoUrl} alt={orgName} className="h-8 w-8 rounded-lg object-contain" />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-accent text-sidebar-foreground text-[10px] font-bold">
                {getInitials(orgName)}
              </div>
            )}
            <button
              onClick={onToggle}
              className="flex items-center justify-center rounded-lg p-1.5 text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors duration-fast"
              title="Expand sidebar"
            >
              <PanelLeftOpen className="h-4 w-4" />
            </button>
          </>
        ) : (
          <>
            <div className="flex items-center gap-3 min-w-0">
              {orgLogoUrl ? (
                <img src={orgLogoUrl} alt={orgName} className="h-9 w-9 rounded-lg object-contain flex-shrink-0" />
              ) : (
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-accent text-sidebar-foreground text-xs font-bold flex-shrink-0">
                  {getInitials(orgName)}
                </div>
              )}
              <div className="min-w-0">
                <h1 className="text-sm font-bold text-sidebar-foreground truncate">{orgName}</h1>
              </div>
            </div>
            <button
              onClick={onToggle}
              className="flex-shrink-0 flex items-center justify-center rounded-lg p-1.5 text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors duration-fast"
              title="Collapse sidebar"
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
          </>
        )}
      </div>

      {/* Org Switcher (platform admin only) */}
      {isPlatformAdmin && !collapsed && <OrgSwitcher />}

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-3">
        {navigation.filter((item) => item.visible).map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              title={collapsed ? item.name : undefined}
              className={cn(
                'group flex items-center rounded-lg px-3 py-2.5 text-[13px] font-medium transition-all duration-fast ease-smooth',
                collapsed && 'justify-center px-2',
                isActive
                  ? 'bg-sidebar-active-bg text-sidebar-active-fg shadow-soft'
                  : 'text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground'
              )}
            >
              <item.icon
                className={cn(
                  'h-[18px] w-[18px] flex-shrink-0',
                  !collapsed && 'mr-3',
                  isActive ? 'text-sidebar-active-fg' : 'text-sidebar-muted group-hover:text-sidebar-foreground'
                )}
              />
              {!collapsed && item.name}
            </Link>
          )
        })}

        {/* Platform Admin Section */}
        {isPlatformAdmin && (
          <>
            <div className={cn('pt-4 pb-1', collapsed ? 'px-0' : 'px-3')}>
              {!collapsed && (
                <p className="text-[11px] font-semibold uppercase tracking-wider text-sidebar-muted">Platform</p>
              )}
              {collapsed && <div className="border-t border-sidebar-border" />}
            </div>
            {(() => {
              const isActive = pathname.startsWith('/dashboard/platform/organizations')
              return (
                <Link
                  href="/dashboard/platform/organizations"
                  title={collapsed ? 'Organizations' : undefined}
                  className={cn(
                    'group flex items-center rounded-lg px-3 py-2.5 text-[13px] font-medium transition-all duration-fast ease-smooth',
                    collapsed && 'justify-center px-2',
                    isActive
                      ? 'bg-sidebar-active-bg text-sidebar-active-fg shadow-soft'
                      : 'text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground'
                  )}
                >
                  <Globe
                    className={cn(
                      'h-[18px] w-[18px] flex-shrink-0',
                      !collapsed && 'mr-3',
                      isActive ? 'text-sidebar-active-fg' : 'text-sidebar-muted group-hover:text-sidebar-foreground'
                    )}
                  />
                  {!collapsed && 'Organizations'}
                </Link>
              )
            })()}
          </>
        )}
      </nav>

      {/* User profile */}
      <div className="border-t border-sidebar-border p-3">
        {!collapsed ? (
          <>
            <div className="mb-3 flex items-center">
              <div className="flex-shrink-0">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sidebar-accent text-sidebar-foreground text-[13px] font-medium">
                  {user?.firstName?.[0]}
                  {user?.lastName?.[0]}
                </div>
              </div>
              <div className="ml-3 min-w-0">
                <p className="text-[13px] font-medium text-sidebar-foreground truncate">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-helper text-sidebar-muted truncate">{user?.email}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              className="w-full justify-start text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent"
              size="sm"
              onClick={logout}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </Button>
          </>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            className="w-full text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent"
            onClick={logout}
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  )
}
