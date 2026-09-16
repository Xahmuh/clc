"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import clcLogo from "@/public/clc-logo.png";
import { createClient } from "@/lib/supabase/client";
import { LogIn, ArrowRight, Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword(
        {
          email: email.trim(),
          password,
        },
      );

      if (authError) {
        throw authError;
      }

      if (data.session) {
        router.push("/leads");
      }
    } catch (err: any) {
      setError(err.message || "Invalid email or password");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-gray-50/50" dir="ltr">
      <div className="w-full max-w-md" dir="ltr">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-3">
            <Image
              src={clcLogo}
              alt="CLC Logo"
              priority
              className="h-14 w-auto object-contain"
            />
          </div>
          <h1 className="text-2xl font-semibold text-ink-900 tracking-tight">
            Sign in to CLC CRM
          </h1>
          <p className="mt-1 text-sm text-gray-500">management portal</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-panel border border-gray-200 p-8" dir="ltr">
          {error && (
            <div className="mb-5 p-3 rounded-card bg-red-50 border border-red-200 text-xs text-red-600 text-left">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4 text-left" dir="ltr">
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-medium text-gray-500 mb-1.5 text-left"
              >
                Email address
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Type your Email address"
                dir="ltr"
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-gray-200 rounded-button text-ink-900 placeholder:text-gray-400 focus:outline-none focus:border-ink-900 transition-colors text-left"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="password"
                  className="block text-xs font-medium text-gray-500 text-left"
                >
                  Password
                </label>
              </div>
              <div className="relative" dir="ltr">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  dir="ltr"
                  className="w-full pl-3.5 pr-10 py-2.5 text-sm bg-white border border-gray-200 rounded-button text-ink-900 placeholder:text-gray-400 focus:outline-none focus:border-ink-900 transition-colors text-left"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-ink-900 focus:outline-none transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 px-4 bg-ink-900 text-white rounded-button text-sm font-semibold hover:bg-black transition-colors disabled:opacity-50"
            >
              {isLoading ? (
                <span>Signing in...</span>
              ) : (
                <>
                  <span>Sign in</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Authorized personnel only · CLC Contracting
        </p>
      </div>
    </main>
  );
}
