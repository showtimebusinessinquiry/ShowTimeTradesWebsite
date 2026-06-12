'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AuthCallbackPage() {
  const router = useRouter()

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get('code')
    if (!code) {
      router.replace('/dashboard')
      return
    }
    supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
      router.replace(error ? '/login?error=auth' : '/dashboard')
    })
  }, [router])

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <div className="text-accent text-sm animate-pulse">Confirming your account…</div>
    </div>
  )
}
