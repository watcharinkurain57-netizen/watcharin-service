import content from "./content.json";
import zoneData from "./zones.json";

export const campusContent = content;
export const campusZones = zoneData;
export type CampusProject = (typeof content.projects)[number];
export type CampusZoneKey = keyof typeof zoneData;
export const zoneKeys = Object.keys(zoneData) as CampusZoneKey[];
export const campusBase = "/campus";
export const campusAsset = (file: string) => `${campusBase}/${file}`;
export const projectCover = (project: CampusProject) =>
  campusAsset(`${project.key}-mockup-v1.png`);

export type CampusRoute =
  | { page: "home" | "about" | "contact" }
  | { page: "work"; category: CampusZoneKey | "all" }
  | { page: "zone"; zone: CampusZoneKey }
  | { page: "resume"; language: "th" | "en" }
  | { page: "project"; project: CampusProject };

export function resolveCampusRoute(path: string[] = []): CampusRoute | null {
  if (path.length === 0) return { page: "home" };
  if (path.length === 1 && ["about", "contact"].includes(path[0])) {
    return { page: path[0] as "about" | "contact" };
  }
  if (path[0] === "work" && path.length <= 2) {
    const category = path[1] ?? "all";
    return category === "all" || zoneKeys.includes(category as CampusZoneKey)
      ? { page: "work", category: category as CampusZoneKey | "all" }
      : null;
  }
  if (path.length !== 2) return null;
  if (path[0] === "resume" && (path[1] === "th" || path[1] === "en"))
    return { page: "resume", language: path[1] };
  if (path[0] === "zones" && zoneKeys.includes(path[1] as CampusZoneKey)) {
    return { page: "zone", zone: path[1] as CampusZoneKey };
  }
  if (path[0] === "projects") {
    const project = content.projects.find((item) => item.key === path[1]);
    return project ? { page: "project", project } : null;
  }
  return null;
}

export function projectsInZone(category: CampusZoneKey | "all") {
  return category === "all"
    ? content.projects
    : content.projects.filter((p) => p.category.split(" ").includes(category));
}
