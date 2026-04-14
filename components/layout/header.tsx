'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from '@/app/(auth)/actions'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function Header() {
  const pathname = usePathname()

  return (
    <header className="border-b border-zinc-800 bg-zinc-950 px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-6">
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
              pathname === '/portfolio' ? 'text-white bg-zinc-800' : 'text-zinc-500 hover:text-zinc-300'
            )}
          >
            Portfolio
          </Link>
        </nav>
      </div>
      <form action={signOut}>
        <Button
          variant="ghost"
          size="sm"
          className="text-zinc-400 hover:text-white hover:bg-zinc-800"
        >
          Sign Out
        </Button>
      </form>
    </header>
  )
}