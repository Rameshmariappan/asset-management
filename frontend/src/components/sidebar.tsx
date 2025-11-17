'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
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
} from 'lucide-react'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Assets', href: '/dashboard/assets', icon: Package },
  { name: 'Assignments', href: '/dashboard/assignments', icon: ClipboardList },
  { name: 'Transfers', href: '/dashboard/transfers', icon: ArrowRightLeft },
  { name: 'Tags', href: '/dashboard/tags', icon: QrCode },
  { name: 'Users', href: '/dashboard/users', icon: Users },
  { name: 'Departments', href: '/dashboard/departments', icon: Building2 },
  { name: 'Categories', href: '/dashboard/categories', icon: FolderTree },
  { name: 'Vendors', href: '/dashboard/vendors', icon: Store },
  { name: 'Locations', href: '/dashboard/locations', icon: MapPin },
  { name: 'Reports', href: '/dashboard/reports', icon: FileText },
  { name: 'Notifications', href: '/dashboard/notifications', icon: Bell },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const { user, logout } = useAuth()

  return (
    <div className="flex h-full flex-col bg-gray-900">
      <div className="flex h-16 items-center justify-center border-b border-gray-800 px-4">
        <h1 className="text-xl font-bold text-white">Asset Manager</h1>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'group flex items-center rounded-md px-2 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              )}
            >
              <item.icon
                className={cn(
                  'mr-3 h-5 w-5 flex-shrink-0',
                  isActive ? 'text-white' : 'text-gray-400 group-hover:text-white'
                )}
              />
              {item.name}
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-gray-800 p-4">
        <div className="mb-3 flex items-center">
          <div className="flex-shrink-0">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-800 text-white">
              {user?.firstName?.[0]}
              {user?.lastName?.[0]}
            </div>
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-white">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-xs text-gray-400">{user?.email}</p>
          </div>
        </div>
        <Button
          variant="outline"
          className="w-full justify-start text-gray-300 hover:text-white"
          onClick={logout}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </Button>
      </div>
    </div>
  )
}
