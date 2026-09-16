"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import clcLogo from "@/public/clc-logo.png";
import { createClient } from "@/lib/supabase/client";
import { ArrowRight, ArrowLeft, Eye, EyeOff, Globe } from "lucide-react";
import { useLanguage } from "@/lib/language-context";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();
  const { t, language, toggleLanguage, isRTL } = useLanguage();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (authError) {
        throw authError;
      }

      if (data.session) {
        router.push("/leads");
      }
    } catch (err: any) {
      setError(err.message || (isRTL ? "خطأ في البريد الإلكتروني أو كلمة المرور" : "Invalid email or password"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-gray-50/50" dir={isRTL ? "rtl" : "ltr"}>
      {/* Top right language switcher */}
      <div className="fixed top-4 right-4 rtl:right-auto rtl:left-4 z-10">
        <button
          onClick={toggleLanguage}
          type="button"
          className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-button text-xs font-semibold text-ink-900 shadow-sm hover:bg-gray-50 transition-colors"
        >
          <Globe className="h-3.5 w-3.5 text-gray-500" />
          <span>{language === "ar" ? "English" : "العربية"}</span>
        </button>
      </div>

      <div className="w-full max-w-md">
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
            {t("auth_title")}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {t("auth_subtitle")}
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-panel border border-gray-200 p-8 shadow-sm">
          {error && (
            <div className="mb-5 p-3 rounded-card bg-red-50 border border-red-200 text-xs text-red-600">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-medium text-gray-500 mb-1.5"
              >
                {t("auth_email")}
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("auth_placeholder_email")}
                dir="ltr"
                className={`w-full px-3.5 py-2.5 text-sm bg-white border border-gray-200 rounded-button text-ink-900 placeholder:text-gray-400 focus:outline-none focus:border-ink-900 transition-colors ${
                  isRTL ? "text-right" : "text-left"
                }`}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="password"
                  className="block text-xs font-medium text-gray-500"
                >
                  {t("auth_password")}
                </label>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t("auth_placeholder_password")}
                  dir="ltr"
                  className={`w-full ${
                    isRTL ? "pr-3.5 pl-10" : "pl-3.5 pr-10"
                  } py-2.5 text-sm bg-white border border-gray-200 rounded-button text-ink-900 placeholder:text-gray-400 focus:outline-none focus:border-ink-900 transition-colors`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={`absolute ${
                    isRTL ? "left-3" : "right-3"
                  } top-1/2 -translate-y-1/2 text-gray-400 hover:text-ink-900 focus:outline-none transition-colors`}
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
                <span>{t("auth_signing_in")}</span>
              ) : (
                <>
                  <span>{t("auth_sign_in")}</span>
                  {isRTL ? (
                    <ArrowLeft className="h-4 w-4" />
                  ) : (
                    <ArrowRight className="h-4 w-4" />
                  )}
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          {isRTL ? "مخصص للموظفين المصرح لهم فقط · شركة أرض البناء للمقاولات" : "Authorized personnel only · CLC Contracting"}
        </p>
      </div>
    </main>
  );
}

