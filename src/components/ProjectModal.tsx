"use client";

import { useEffect } from "react";
import type { Project } from "@/lib/projects";

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
    if (project) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [project]);

  if (!project) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 modal-show">
      <button
        type="button"
        aria-label="Close modal"
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm"
      />
      <div className="relative bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 z-10 font-bold cursor-pointer"
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
            <p className="text-sm text-slate-500 mb-1">{project.domain}</p>
            <p className={`text-base font-medium ${project.accentText}`}>
              {project.category}
            </p>
          </div>

          <div className="mb-6">
            <p className="text-slate-700 leading-relaxed">{project.description}</p>
          </div>

          <div className="mb-6">
            <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
              📋 Key Features
            </h3>
            <ul className="space-y-2">
              {project.features.map((f, i) => (
                <li
                  key={i}
                  className="text-sm text-slate-700 flex items-start gap-2"
                >
                  <span className="text-brand-500 mt-0.5">✓</span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mb-6">
            <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
              ⚡ Tech Stack
            </h3>
            <div className="flex flex-wrap gap-2">
              {project.techStack.map((t) => (
                <span
                  key={t}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-sm font-medium border border-slate-200"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>

          <div className="mb-6 grid sm:grid-cols-2 gap-4">
            <div className="bg-slate-50 rounded-xl p-4">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                Timeline
              </div>
              <div className="text-sm font-semibold text-slate-900">
                {project.timeline}
              </div>
            </div>
            <div className="bg-brand-50 rounded-xl p-4">
              <div className="text-xs font-semibold text-brand-700 uppercase tracking-wide mb-1">
                Status
              </div>
              <div className="text-sm font-semibold text-slate-900">
                {project.currentInfo}
              </div>
            </div>
          </div>

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
  );
}
