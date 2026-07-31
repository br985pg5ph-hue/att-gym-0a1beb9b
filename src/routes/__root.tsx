import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { AppProviders } from "@/lib/providers";
import { Toaster } from "sonner";

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  useEffect(() => { reportLovableError(error, { boundary: "root" }); }, [error]);
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-3xl">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <button
          onClick={() => { router.invalidate(); reset(); }}
          className="mt-6 rounded-pill bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
        >Try again</button>
      </div>
    </div>
  );
}

function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 text-center">
      <div>
        <h1 className="font-display text-7xl text-primary">404</h1>
        <p className="mt-2 text-sm text-muted-foreground">Page not found</p>
        <a href="/" className="mt-6 inline-block rounded-pill bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground">Go home</a>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: "#0a0a0a" },
      { title: "Nuvo — Gym Management Platform" },
      { name: "description", content: "Nuvo is a gym management platform for members, coaches and staff — booking, memberships and payments in one app." },
      { property: "og:title", content: "Nuvo — Gym Management Platform" },
      { property: "og:description", content: "Nuvo is a gym management platform for members, coaches and staff — booking, memberships and payments in one app." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Nuvo — Gym Management Platform" },
      { name: "twitter:description", content: "Nuvo is a gym management platform for members, coaches and staff — booking, memberships and payments in one app." },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/bd6dcbce-e758-4a54-b0a2-deec18a91cae" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/bd6dcbce-e758-4a54-b0a2-deec18a91cae" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@400;500;600;700&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFound,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="light">
      <head><HeadContent /></head>
      <body>{children}<Scripts /></body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <AppProviders>
        <Outlet />
        <Toaster theme="light" position="top-center" />
      </AppProviders>
    </QueryClientProvider>
  );
}
