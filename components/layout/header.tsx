'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from '@/app/(auth)/actions'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { NotificationBell } from './notification-bell'

const navLinks = [
  { href: '/', label: 'Dashboard' },
  { href: '/portfolio', label: 'Portfolio' },
  { href: '/journal', label: 'Journal' },
  { href: '/investments', label: 'Investments' },
]

export function Header() {
  const pathname = usePathname()
  const [email, setEmail] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      setEmail(user?.email ?? null)
    })
  }, [])

  // Close menu on route change
  useEffect(() => {
    setMenuOpen(false)
  }, [pathname])

  return (
    <header className="border-b border-zinc-800 bg-zinc-950 sticky top-0 z-40">
      <div className="px-4 sm:px-6 py-3 flex items-center justify-between">
        {/* Left: Logo + Desktop Nav */}
        <div className="flex items-center gap-4 sm:gap-6">
          <Link href="/">
            <h1 className="text-lg font-bold tracking-tight text-white">LOWIN</h1>
          </Link>
          <nav className="hidden md:flex gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'px-3 py-1.5 rounded text-sm transition-colors',
                  pathname === link.href ? 'text-white bg-zinc-800' : 'text-zinc-500 hover:text-zinc-300'
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Right: Bell + Email + SignOut + Hamburger */}
        <div className="flex items-center gap-2 sm:gap-3">
          <NotificationBell />
          {email && <span className="hidden sm:inline text-xs text-zinc-500 max-w-37.5 truncate">{email}</span>}
          <form action={signOut} className="hidden sm:block">
            <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white hover:bg-zinc-800">
              Sign Out
            </Button>
          </form>
          {/* Hamburger button - mobile only */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden p-1.5 rounded text-zinc-400 hover:text-white hover:bg-zinc-800"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {menuOpen ? (
                <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>
              ) : (
                <><line x1="4" y1="6" x2="20" y2="6" /><line x1="4" y1="12" x2="20" y2="12" /><line x1="4" y1="18" x2="20" y2="18" /></>
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-zinc-800 bg-zinc-950 px-4 py-3 space-y-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'block px-3 py-2 rounded text-sm transition-colors',
                pathname === link.href ? 'text-white bg-zinc-800' : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
              )}
            >
              {link.label}
            </Link>
          ))}
          {email && <p className="px-3 py-2 text-xs text-zinc-600 truncate">{email}</p>}
          <form action={signOut}>
            <button className="w-full text-left px-3 py-2 rounded text-sm text-red-400 hover:bg-zinc-800/50">
              Sign Out
            </button>
          </form>
        </div>
      )}
    </header>
  )
}