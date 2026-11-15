import "server-only";
import { readSiteFeatures } from "./site-features";
import { getSupabaseEnv } from "./supabase/env";

export const siteFeatures = readSiteFeatures(process.env);
// Fail at build/start when the workspace is explicitly enabled without its
// configuration. Portfolio mode does not need a database or placeholder keys.
if (siteFeatures.workspace) getSupabaseEnv();
