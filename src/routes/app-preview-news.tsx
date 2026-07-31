import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * Internal unbranded member-app preview: news.
 * Redirects into the reserved "preview" workspace so it isn't tied to a real gym.
 */
export const Route = createFileRoute("/app-preview-news")({
  ssr: false,
  beforeLoad: () => {
    throw redirect({ to: "/gym/preview/news" as any });
  },
  component: () => null,
});
