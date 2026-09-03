import { Suspense } from "react";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="font-display text-3xl italic text-brand-ink">Softoi</p>
          <p className="mt-1 text-sm text-ink-muted">Sign in to the admin dashboard</p>
        </div>

        <div className="rounded-lg border border-border bg-surface p-6 shadow-sm">
          <Suspense fallback={null}>
            <LoginForm />
          </Suspense>
        </div>

        <p className="mt-6 text-center text-xs text-ink-faint">
          Internal Softoi platform — access is restricted to staff.
        </p>
      </div>
    </div>
  );
}
