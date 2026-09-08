import { signIn } from "@/lib/auth";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Log In",
  description: "Sign in to RIFT CLAN with your Discord account.",
};

type Props = {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
};

const errorMessages: Record<string, string> = {
  OAuthSignin: "Could not start the Discord sign-in flow. Try again.",
  OAuthCallback: "Discord returned an error during sign-in. Try again.",
  OAuthCreateAccount: "Could not create your account. Contact an admin.",
  Default: "An unexpected error occurred. Please try again.",
};

export default async function LoginPage({ searchParams }: Props) {
  const { callbackUrl, error } = await searchParams;
  const errorMessage = error ? (errorMessages[error] ?? errorMessages.Default) : null;

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center px-4">
      {/* Ambient glow */}
      <div className="bg-rift-glow pointer-events-none fixed inset-0 z-0" aria-hidden />

      <div className="relative z-10 w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 text-center">
          <p className="font-display text-3xl font-extrabold uppercase tracking-widest">
            RIFT <span className="text-rift-red">CLAN</span>
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in to access your profile and rankings.
          </p>
        </div>

        {/* Card */}
        <div className="glass-panel rounded-2xl p-8">
          <h1 className="mb-6 font-display text-xl font-bold uppercase tracking-wide">
            Sign In
          </h1>

          {/* Error message */}
          {errorMessage && (
            <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3">
              <p className="text-sm text-red-400">{errorMessage}</p>
            </div>
          )}

          {/* Discord sign-in */}
          <form
            action={async () => {
              "use server";
              await signIn("discord", {
                redirectTo: callbackUrl ?? "/profile",
              });
            }}
          >
            <button
              type="submit"
              id="login-discord-btn"
              className="flex w-full items-center justify-center gap-3 rounded-lg bg-[#5865F2] px-4 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:bg-[#4752C4] hover:shadow-[0_0_20px_-4px_rgba(88,101,242,0.6)] active:scale-95"
            >
              {/* Discord SVG icon */}
              <svg
                aria-hidden
                viewBox="0 0 24 24"
                fill="currentColor"
                className="h-5 w-5"
              >
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057.101 18.08.118 18.1.137 18.11a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 13.81 13.81 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
              </svg>
              Continue with Discord
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            By signing in you agree to follow the RIFT CLAN community rules.
          </p>
        </div>
      </div>
    </main>
  );
}
