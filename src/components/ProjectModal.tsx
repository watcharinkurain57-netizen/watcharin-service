"use client";

import { useEffect } from "react";
import type { Project } from "@/lib/projects";
import { pauseSmoothScroll, resumeSmoothScroll } from "@/lib/smoothScrollControl";

type Props = {
  project: Project | null;
  onClose: () => void;
};

export function ProjectModal({ project, onClose }: Props) {
  useEffect(() => {
    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  useEffect(() => {
    if (!project) return;
    // body overflow alone does not stop lenis, which drives window.scrollTo
    // itself and would keep the page moving behind the modal.
    pauseSmoothScroll();
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
      resumeSmoothScroll();
    };
  }, [project]);

  if (!project) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 modal-show">
      <button
        type="button"
        aria-label="Close modal"
        onClick={onClose}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
      />
      <div className="relative bg-surface-raised rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 w-10 h-10 rounded-full bg-surface-overlay hover:bg-surface-overlay flex items-center justify-center text-ink-muted z-10 font-bold cursor-pointer"
        >
          ✕
        </button>
        <div className="p-8">
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <div
                className={`w-16 h-16 rounded-2xl ${project.iconBg} flex items-center justify-center text-3xl`}
              >
                {project.icon}
              </div>
              <span
                className={`text-xs font-semibold px-3 py-1.5 rounded-full border ${project.statusBadge}`}
              >
                {project.statusLabel}
              </span>
            </div>
            <h2 className="text-3xl font-extrabold mb-1">{project.name}</h2>
            {project.url ? (
              <a
                href={project.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-brand-400 font-medium mb-1 inline-flex items-center gap-1 hover:underline"
              >
                {project.domain}
                <span aria-hidden>↗</span>
              </a>
            ) : (
              <p className="text-sm text-ink-faint mb-1">{project.domain}</p>
            )}
            <p className={`text-base font-medium ${project.accentText}`}>
              {project.category}
            </p>
          </div>

          <div className="mb-6">
            <p className="text-ink leading-relaxed">{project.description}</p>
          </div>

          <div className="mb-6">
            <h3 className="font-bold text-ink mb-3 flex items-center gap-2">
              📋 Key Features
            </h3>
            <ul className="space-y-2">
              {project.features.map((f, i) => (
                <li
                  key={i}
                  className="text-sm text-ink flex items-start gap-2"
                >
                  <span className="text-brand-500 mt-0.5">✓</span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mb-6">
            <h3 className="font-bold text-ink mb-3 flex items-center gap-2">
              ⚡ Tech Stack
            </h3>
            <div className="flex flex-wrap gap-2">
              {project.techStack.map((t) => (
                <span
                  key={t}
                  className="px-3 py-1.5 rounded-lg bg-surface-overlay text-ink text-sm font-medium border border-line"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>

          <div className="mb-6 grid sm:grid-cols-2 gap-4">
            <div className="bg-surface-raised/30 rounded-xl p-4">
              <div className="text-xs font-semibold text-ink-faint uppercase tracking-wide mb-1">
                Timeline
              </div>
              <div className="text-sm font-semibold text-ink">
                {project.timeline}
              </div>
            </div>
            <div className="bg-brand-500/10 rounded-xl p-4">
              <div className="text-xs font-semibold text-brand-300 uppercase tracking-wide mb-1">
                Status
              </div>
              <div className="text-sm font-semibold text-ink">
                {project.currentInfo}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {project.url && (
              <a
                href={project.url}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-surface-raised border border-brand-500/30 text-brand-300 font-semibold px-6 py-3 rounded-full inline-flex items-center gap-2 hover:border-brand-400/70 hover:bg-brand-500/10 transition"
              >
                🌐 เยี่ยมชม {project.domain}
                <span aria-hidden>↗</span>
              </a>
            )}
            <a
              href="#contact"
              onClick={onClose}
              className="gradient-btn text-white font-semibold px-6 py-3 rounded-full inline-flex items-center gap-2"
            >
              ปรึกษาเกี่ยวกับโปรเจคนี้ →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
