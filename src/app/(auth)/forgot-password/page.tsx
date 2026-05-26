"use client";

// app/(auth)/forgot-password/page.tsx

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle } from "lucide-react";
import toast from "react-hot-toast";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/auth/send-reset-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data?.error ?? "Something went wrong. Please try again.");
        return;
      }

      // Always show success — never reveal whether the email exists (security)
      setSent(true);
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="text-center mb-7">
        <Link href="/" className="text-3xl font-bold text-pink-600 tracking-tight">
          SKM WARDROBE
        </Link>
        <h1 className="mt-3 text-2xl font-semibold text-gray-900">Reset password</h1>
        <p className="text-base text-gray-500 mt-1">
          {sent ? "Email sent!" : "We'll send you a reset link"}
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-7 w-full max-w-sm">
        {sent ? (
          <div className="text-center py-4">
            <CheckCircle size={48} className="text-green-500 mx-auto mb-4" />
            <p className="text-base text-gray-700 font-medium mb-1">Check your inbox</p>
            <p className="text-sm text-gray-500 mb-6">
              If an account exists for{" "}
              <span className="font-medium text-gray-700">{email}</span>,
              we've sent a password reset link. Check your spam folder too.
            </p>
            <button
              onClick={() => { setSent(false); setEmail(""); }}
              className="text-sm text-pink-600 hover:underline"
            >
              Try a different email
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Email address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-3 text-base border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-pink-600 hover:bg-pink-700 text-white text-base font-semibold rounded-xl transition-colors disabled:opacity-60"
            >
              {loading ? "Sending..." : "Send reset link"}
            </button>
          </form>
        )}
      </div>

      <Link
        href="/login"
        className="flex items-center gap-2 mt-5 text-base text-gray-500 hover:text-pink-600 transition-colors"
      >
        <ArrowLeft size={16} /> Back to sign in
      </Link>
    </div>
  );
}