import { createServerSupabaseClient } from '@/lib/supabase-server'
import { signOut } from './(auth)/actions'
import { Button } from '@/components/ui/button'

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 gap-4">
      <h1 className="text-2xl font-bold text-white">Welcome to LOWIN</h1>
      <p className="text-zinc-400">Logged in as: {user?.email}</p>
      <form action={signOut}>
        <Button
          variant="outline"
          className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
        >
          Sign Out
        </Button>
      </form>
    </div>
  )
}