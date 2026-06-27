import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Zap } from 'lucide-react'

export default function AuthPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleSignIn(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    })
    if (error) {
      setError(error.message)
    } else {
      setSent(true)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-400/10 border border-amber-400/20 rounded-2xl mb-4">
            <Zap size={32} className="text-amber-400" />
          </div>
          <h1 className="text-3xl font-bold text-[#F8FAFC]">AGENT OS</h1>
          <p className="text-[#94A3B8] mt-2 text-sm">AI infrastructure builder</p>
        </div>

        {/* Card */}
        <div className="bg-[#12121A] border border-[#1E1E2E] rounded-2xl p-8">
          {sent ? (
            <div className="text-center">
              <div className="text-4xl mb-4">📬</div>
              <h2 className="text-lg font-semibold text-[#F8FAFC] mb-2">Check your email</h2>
              <p className="text-[#94A3B8] text-sm">
                Magic link sent to <span className="text-amber-400">{email}</span>.
                Click the link to sign in.
              </p>
            </div>
          ) : (
            <>
              <h2 className="text-lg font-semibold text-[#F8FAFC] mb-1">Sign in</h2>
              <p className="text-[#94A3B8] text-sm mb-6">We'll send you a magic link</p>

              <form onSubmit={handleSignIn} className="space-y-4">
                <div>
                  <label className="block text-xs text-[#94A3B8] mb-1.5 uppercase tracking-wider">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@postarmy.com"
                    required
                    className="w-full bg-[#0A0A0F] border border-[#1E1E2E] rounded-lg px-4 py-3 text-[#F8FAFC] text-sm placeholder-[#94A3B8]/50 focus:outline-none focus:border-amber-400/50 transition-colors"
                  />
                </div>

                {error && (
                  <div className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-3">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || !email}
                  className="w-full py-3 bg-amber-400 text-black font-bold rounded-lg hover:bg-amber-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <span className="animate-pulse">Sending...</span>
                  ) : (
                    <>
                      <Zap size={16} />
                      Send magic link
                    </>
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
