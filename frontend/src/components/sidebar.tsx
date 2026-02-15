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
} from 'lucide-react'

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const { canViewUserList, canManageMasterData, canManageTags, canViewReports, canViewTransfers, isPlatformAdmin } = usePermissions()

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, visible: true },
    { name: 'Assets', href: '/dashboard/assets', icon: Package, visible: true },
    { name: 'Assignments', href: '/dashboard/assignments', icon: ClipboardList, visible: true },
    { name: 'Transfers', href: '/dashboard/transfers', icon: ArrowRightLeft, visible: canViewTransfers },
    { name: 'Tags', href: '/dashboard/tags', icon: QrCode, visible: canManageTags },
    { name: 'Users', href: '/dashboard/users', icon: Users, visible: canViewUserList },
    { name: 'Departments', href: '/dashboard/departments', icon: Building2, visible: canManageMasterData },
    { name: 'Categories', href: '/dashboard/categories', icon: FolderTree, visible: canManageMasterData },
    { name: 'Vendors', href: '/dashboard/vendors', icon: Store, visible: canManageMasterData },
    { name: 'Locations', href: '/dashboard/locations', icon: MapPin, visible: canManageMasterData },
    { name: 'Reports', href: '/dashboard/reports', icon: FileText, visible: canViewReports },
    { name: 'Notifications', href: '/dashboard/notifications', icon: Bell, visible: true },
    { name: 'Settings', href: '/dashboard/settings', icon: Settings, visible: true },
  ]

  return (
    <div className="flex h-full flex-col bg-sidebar border-r border-sidebar-border">
      {/* Header with collapse toggle */}
      <div className={cn(
        'flex items-center border-b border-sidebar-border px-4 py-4',
        collapsed ? 'justify-center px-2' : 'justify-between'
      )}>
        {collapsed ? (
          <button
            onClick={onToggle}
            className="flex items-center justify-center rounded-lg p-1.5 text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors duration-fast"
            title="Expand sidebar"
          >
            <PanelLeftOpen className="h-4 w-4" />
          </button>
        ) : (
          <>
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-sidebar-foreground">Asset Manager</h1>
              {user?.organization && (
                <p className="mt-0.5 text-helper text-sidebar-muted truncate">{user.organization.name}</p>
              )}
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
