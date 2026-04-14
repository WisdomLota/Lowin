'use client'

import { signOut } from '@/app/(auth)/actions'
import { Button } from '@/components/ui/button'

export function Header() {
  return (
    <header className="border-b border-zinc-800 bg-zinc-950 px-6 py-3 flex items-center justify-between">
      <h1 className="text-lg font-bold tracking-tight text-white">LOWIN</h1>
      <div className="flex items-center gap-3">
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