import "server-only";
import { notFound } from "next/navigation";
import { siteFeatures } from "./site-config";

/** Gate entry points as well as HTTP routing, including build-time renders. */
export function requireWorkspace(): void {
  if (!siteFeatures.workspace) notFound();
}
