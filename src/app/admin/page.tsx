'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Lock, User, Shield } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // If already authenticated, redirect
    const checkAuth = async () => {
      const { data } = await supabase.auth.getUser();
      const user = data?.user;
      if (user) {
        const allowed = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
        if (allowed.length === 0 || (user.email && allowed.includes(user.email))) {
          router.replace('/admin/dashboard');
        }
      }
    };
    checkAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message || '登入失敗，請稍後再試');
      setIsLoading(false);
      return;
    }

    const user = data.user;
    const allowed = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (allowed.length > 0 && (!user?.email || !allowed.includes(user.email))) {
      await supabase.auth.signOut();
      setError('此帳號無管理員權限');
      setIsLoading(false);
      return;
    }

    router.replace('/admin/dashboard');
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Shield className="w-12 h-12 text-yellow-500" />
          </div>
          <h1 className="text-3xl font-bold gold-gradient mb-2">管理員登入</h1>
          <p className="text-yellow-500/60">請輸入管理員 Email 與密碼</p>
        </div>

        {/* Login Form */}
        <div className="luxury-card rounded-2xl p-8">
          <form onSubmit={handleLogin} className="space-y-6">
            {/* Email Field */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-yellow-500 font-semibold">
                <User className="w-4 h-4" />
                管理員 Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl luxury-input outline-none"
                placeholder="example@domain.com"
                required
              />
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-yellow-500 font-semibold">
                <Lock className="w-4 h-4" />
                管理員密碼
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl luxury-input outline-none"
                placeholder="請輸入密碼"
                required
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 rounded-lg bg-red-500/20 border border-red-500/30">
                <p className="text-red-400 text-sm text-center">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full luxury-button py-3 rounded-xl font-semibold disabled:opacity-50"
            >
              {isLoading ? '登入中...' : '登入'}
            </button>
          </form>

          {/* Back to Home */}
          <div className="mt-6 pt-6 border-t border-yellow-500/20">
            <Link
              href="/"
              className="block text-center text-yellow-500/70 hover:text-yellow-500 transition"
            >
              返回首頁
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
