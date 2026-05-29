'use client'

import { useState } from 'react'
import { register } from '../actions'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

export default function RegisterPage() {
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    setError(null)
    const result = await register(formData)
    if (result?.error) {
      setError(result.error)
      toast.error(result.error)
    } else if (result?.success) {
      setSuccess(result.success)
      toast.success('Account created! Check your email.')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex bg-zinc-950">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center items-center px-12 border-r border-zinc-800/50 relative overflow-hidden">
        {/* Subtle gradient background */}
        <div className="absolute inset-0 bg-linear-to-br from-emerald-950/20 via-zinc-950 to-zinc-950" />
        <div className="relative z-10 max-w-md text-center">
          <img src="/lowin.jpeg" alt="Lowin" className="w-20 h-20 rounded-2xl mx-auto mb-6 shadow-lg shadow-emerald-900/20" />
          <h1 className="text-4xl font-bold tracking-tight text-white mb-3">LOWIN</h1>
          <p className="text-zinc-400 text-sm leading-relaxed">
            Discover sub-penny cryptocurrencies, journal your trades,
            track investments and monitor your portfolio performance.
          </p>
          <div className="flex justify-center gap-6 mt-8">
            <div className="text-center">
              <p className="text-lg font-mono font-semibold text-emerald-400">3+</p>
              <p className="text-xs text-zinc-500">Exchanges</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-mono font-semibold text-emerald-400">≤$0.01</p>
              <p className="text-xs text-zinc-500">Price Filter</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-mono font-semibold text-emerald-400">Real-time</p>
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
            <img src="/lowin.jpeg" alt="Lowin" className="w-14 h-14 rounded-xl mx-auto mb-3 shadow-lg shadow-emerald-900/20" />
            <h1 className="text-2xl font-bold tracking-tight text-white">LOWIN</h1>
          </div>

          <div className="mb-6">
            <h2 className="text-xl font-semibold text-white">Create your account</h2>
            <p className="text-sm text-zinc-500 mt-1">Start discovering sub-penny gems today</p>
          </div>

          {success ? (
            <div className="text-center space-y-4 bg-zinc-900 border border-zinc-800 rounded-xl p-6">
              <div className="w-10 h-10 rounded-full bg-emerald-600/20 flex items-center justify-center mx-auto">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
                  stroke="#34d399" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <p className="text-emerald-400 text-sm">{success}</p>
              <Link href="/login">
                <Button variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">
                  Back to Sign In
                </Button>
              </Link>
            </div>
          ) : (
            <>
              <form action={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="email" className="text-zinc-400 text-sm">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    required
                    placeholder="you@example.com"
                    className="bg-zinc-900 border-zinc-800 text-white mt-1.5 h-10 focus:border-emerald-600 focus:ring-emerald-600/20"
                  />
                </div>
                <div>
                  <Label htmlFor="password" className="text-zinc-400 text-sm">Password</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    required
                    minLength={6}
                    placeholder="Minimum 6 characters"
                    className="bg-zinc-900 border-zinc-800 text-white mt-1.5 h-10 focus:border-emerald-600 focus:ring-emerald-600/20"
                  />
                </div>

                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                    <p className="text-red-400 text-sm">{error}</p>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-10 font-medium"
                >
                  {loading ? 'Creating account...' : 'Create Account'}
                </Button>
              </form>

              <p className="text-center text-sm text-zinc-500 mt-6">
                Already have an account?{' '}
                <Link href="/login" className="text-emerald-400 hover:text-emerald-300 font-medium">
                  Sign in
                </Link>
              </p>

              <p className="text-center text-xs text-zinc-600 mt-4">
                Not financial advice — DYOR
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}