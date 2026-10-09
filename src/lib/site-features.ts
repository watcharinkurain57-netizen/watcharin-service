export type SiteFeatures = {
  portfolio: boolean;
  workspace: boolean;
};

/** Build configuration. Reopening the workspace does not change its auth or RLS. */
export function readSiteFeatures(env: Record<string, string | undefined>): SiteFeatures {
  const mode = env.SITE_MODE?.trim() || "portfolio";
  const workspace = env.INTERNAL_WORKSPACE_ENABLED?.trim() || "false";
  if (mode !== "portfolio" && mode !== "legacy")
    throw new Error("SITE_MODE must be portfolio or legacy");
  if (workspace !== "true" && workspace !== "false")
    throw new Error("INTERNAL_WORKSPACE_ENABLED must be true or false");
  if (mode === "legacy" && workspace !== "true")
    throw new Error("The legacy homepage requires INTERNAL_WORKSPACE_ENABLED=true");
  return { portfolio: mode === "portfolio", workspace: workspace === "true" };
}

export const workspacePaths = [
  "/projects", "/clients", "/requests", "/start", "/login", "/invite", "/auth",
  "/api/cron/meeting-reminders",
] as const;

export function isWorkspacePath(pathname: string): boolean {
  return workspacePaths.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export type WorkspaceDecision =
  | { kind: "allow" }
  | { kind: "closed" }
  | { kind: "redirect"; destination: string };

/** Exact segment matching prevents unrelated public URLs from being blocked. */
export function workspaceDecision(
  features: SiteFeatures,
  pathname: string,
  method: string,
  serverAction = false,
): WorkspaceDecision {
  if (features.workspace) return { kind: "allow" };
  // The only registered Server Action belongs to the archive. Also block its
  // invocation on public pages; hiding the legacy navigation alone is insufficient.
  if (serverAction) return { kind: "closed" };
  if (!isWorkspacePath(pathname)) return { kind: "allow" };
  if (method === "GET" || method === "HEAD") {
    if (pathname === "/projects") return { kind: "redirect", destination: "/campus/work" };
    if (pathname === "/start") return { kind: "redirect", destination: "/campus/contact" };
  }
  return { kind: "closed" };
}
