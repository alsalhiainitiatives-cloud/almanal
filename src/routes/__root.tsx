import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { installStaleChunkReload, recoverFromStaleChunk } from "../lib/stale-chunk-reload";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { Toaster } from "@/components/ui/sonner";
import { ConfirmProvider } from "@/components/ui/confirm-dialog";
import { school } from "@/data/site";
import { AuthProvider } from "@/features/auth/AuthProvider";
import { SiteContentProvider } from "@/features/site-content/SiteContentProvider";
import { DEFAULT_SITE_CONTENT } from "@/features/site-content/defaults";
import { siteContentGet } from "@/features/site-content/site-content.functions";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  // A new deploy invalidates the previous build's hashed chunks, so an open tab
  // fails to lazy-load a route module. Reload once to pick up the fresh assets.
  useEffect(() => {
    recoverFromStaleChunk(error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    // Site-wide defaults only. Page-specific title/description/canonical/og
    // live in each leaf route's head() via @/lib/seo (pageHead).
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "مدارس وروضة المنال | عنيزة" },
      { name: "description", content: school.description },
      { name: "author", content: school.name },
      { property: "og:site_name", content: school.name },
      { property: "og:locale", content: "ar_SA" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&family=Poppins:wght@400;500;600;700;800&display=swap",
      },
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
    // Organization/WebSite JSON-LD lives on the homepage route (single
    // authoritative graph with stable @id values), not on the root, so it is
    // never duplicated on every page.
  }),
  shellComponent: RootShell,
  component: RootComponent,
  // A transient network failure on this RPC must never blank the whole app:
  // fall back to the built-in defaults and let the UI render.
  loader: async () => {
    try {
      return await siteContentGet();
    } catch (error) {
      console.error("siteContentGet failed; using default content", error);
      return DEFAULT_SITE_CONTENT;
    }
  },
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const content = Route.useLoaderData();

  useEffect(() => {
    installStaleChunkReload();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <SiteContentProvider content={content}>
        <AuthProvider>
        <ConfirmProvider>
        <div className="flex min-h-screen flex-col">
          <Header />
          <main className="flex-1">
            {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
            <Outlet />
          </main>
          <Footer />
        </div>
        <Toaster position="top-center" richColors />
        </ConfirmProvider>
        </AuthProvider>
      </SiteContentProvider>
    </QueryClientProvider>
  );
}
