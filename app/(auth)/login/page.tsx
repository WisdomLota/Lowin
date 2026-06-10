'use client'

import { useState } from 'react'
import { login } from '../actions'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    setError(null)
    const result = await login(formData)
    if (result?.error) {
      setError(result.error)
      toast.error(result.error)
      setLoading(false)
    }
  }

  async function handleGoogleLogin() {
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
  }

  return (
    <div className="min-h-screen flex bg-[#0F0800]">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center items-center px-12 border-r border-[#874708]/10 relative overflow-hidden">
        <div className="absolute inset-0 bg-linear-to-br from-[#874708]/10 via-zinc-950 to-zinc-950" />
        <div className="relative z-10 max-w-md text-center">
          <img src="/lowinBrandLogo.png" alt="Lowin" className="w-20 h-20 rounded-2xl mx-auto mb-6 shadow-lg shadow-[#874708]/30" />
          <h1 className="text-4xl font-bold tracking-tight text-white mb-3">LOWIN</h1>
          <p className="text-zinc-400 text-sm leading-relaxed">
            Discover sub-penny cryptocurrencies, journal your trades,
            track investments and monitor your portfolio performance.
          </p>
          <div className="flex justify-center gap-6 mt-8">
            <div className="text-center">
              <p className="text-lg font-mono font-semibold text-[#32BC00]">3+</p>
              <p className="text-xs text-zinc-500">Exchanges</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-mono font-semibold text-[#32BC00]">≤$0.01</p>
              <p className="text-xs text-zinc-500">Price Filter</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-mono font-semibold text-[#32BC00]">Real-time</p>
              <p className="text-xs text-zinc-500">Price Data</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex flex-col justify-center items-center px-6 sm:px-12">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <img src="/lowinBrandLogo.png" alt="Lowin" className="w-14 h-14 rounded-xl mx-auto mb-3 shadow-lg shadow-[#874708]/30" />
            <h1 className="text-2xl font-bold tracking-tight text-white">LOWIN</h1>
          </div>

          <div className="mb-6">
            <h2 className="text-xl font-semibold text-white">Welcome back</h2>
            <p className="text-sm text-zinc-500 mt-1">Sign in to your account</p>
          </div>

          <form action={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email" className="text-zinc-400 text-sm">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                placeholder="you@example.com"
                className="bg-[#1a0f00] border-[#874708]/20 text-white mt-1.5 h-10 focus:border-[#FF8D19] focus:ring-emerald-600/20"
              />
            </div>
            <div>
              <Label htmlFor="password" className="text-zinc-400 text-sm">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                placeholder="Enter your password"
                className="bg-[#1a0f00] border-[#874708]/20 text-white mt-1.5 h-10 focus:border-[#FF8D19] focus:ring-emerald-600/20"
              />
            </div>

            {error && (
              <div className="bg-[#F32400]/10 border border-[#F32400]/20 rounded-lg px-3 py-2">
                <p className="text-[#F32400] text-sm">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-[#FF8D19] hover:bg-[#e67d15] text-white h-10 font-medium"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-[#874708]/20" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-[#0F0800] px-3 text-zinc-600">or</span>
            </div>
          </div>

          <Button
            variant="outline"
            onClick={handleGoogleLogin}
            className="w-full border-[#874708]/20 text-zinc-300 hover:bg-[#1a0f00] h-10"
          >
            <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </Button>

          <p className="text-center text-sm text-zinc-500 mt-6">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="text-[#32BC00] hover:text-[#32BC00] font-medium">
              Create one
            </Link>
          </p>

          <p className="text-center text-xs text-zinc-600 mt-4">
            Not financial advice — DYOR
          </p>
        </div>
      </div>
    </div>
  )
}