'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from '@/app/(auth)/actions'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function Header() {
  const pathname = usePathname()
  const [email, setEmail] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      setEmail(user?.email ?? null)
    })
  }, [])

  return (
    <header className="border-b border-zinc-800 bg-zinc-950 px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-2">
      <div className="flex items-center gap-3 sm:gap-6">
        <Link href="/">
          <h1 className="text-lg font-bold tracking-tight text-white">LOWIN</h1>
        </Link>
        <nav className="flex gap-1">
          <Link
            href="/"
            className={cn(
              'px-3 py-1.5 rounded text-sm transition-colors',
              pathname === '/' ? 'text-white bg-zinc-800' : 'text-zinc-500 hover:text-zinc-300'
            )}
          >
            Dashboard
          </Link>
          <Link
            href="/portfolio"
            className={cn(
              'px-3 py-1.5 rounded text-sm transition-colors',
              pathname === '/portfolio'
                ? 'text-white bg-zinc-800'
                : 'text-zinc-500 hover:text-zinc-300'
            )}
          >
            Portfolio
          </Link>
          <Link
            href="/journal"
            className={cn(
              'px-3 py-1.5 rounded text-sm transition-colors',
              pathname === '/journal'
                ? 'text-white bg-zinc-800'
                : 'text-zinc-500 hover:text-zinc-300'
            )}
          >
            Journal
          </Link>
        </nav>
      </div>
      <div className="flex items-center gap-3">
        {email && <span className="text-xs text-zinc-500">{email}</span>}
        <form action={signOut}>
          <Button
            variant="ghost"
            size="sm"
            className="text-zinc-400 hover:text-white hover:bg-zinc-800"
          >
            Sign Out
          </Button>
        </form>
      </div>
    </header>
  )
}