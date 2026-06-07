"use client";

import { useState } from "react";
import { projects, ecosystemDisplay, type Project } from "@/lib/projects";
import { ProjectModal } from "./ProjectModal";

export function EcosystemGrid() {
  const [openProject, setOpenProject] = useState<Project | null>(null);

  return (
    <>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {ecosystemDisplay.map((id) => {
          const p = projects[id];
          return (
            <button
              key={id}
              type="button"
              onClick={() => setOpenProject(p)}
              className={`text-left bg-white border border-slate-200 rounded-2xl p-6 card-hover scroll-fade cursor-pointer ${
                p.stealth ? "relative" : ""
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <div
                  className={`w-12 h-12 rounded-xl ${p.iconBg} flex items-center justify-center text-2xl`}
                >
                  {p.icon}
                </div>
                <span
                  className={`text-xs font-semibold px-2.5 py-1 rounded-full border inline-flex items-center gap-1 ${p.statusBadge}`}
                >
                  {p.statusLabel}
                </span>
              </div>
              <h3
                className={`text-xl font-bold mb-1 ${p.stealth ? "stealth-blur" : ""}`}
              >
                {p.stealth ? p.id.replace("stealth-", "") : p.name}
              </h3>
              <p className={`text-sm font-medium mb-3 ${p.accentText}`}>
                {p.category}
              </p>
              <p className="text-slate-600 text-sm leading-relaxed">
                {p.stealth
                  ? p.id === "stealth-healthy"
                    ? "ขายสินค้าสุขภาพ จัดกลุ่มตามส่วนของร่างกาย"
                    : p.id === "stealth-ruamtee"
                      ? "จัดการองค์กรขาย ฝึกอบรม ติดตามทีม"
                      : "วิจัยและออกแบบสินค้าไทย สายสุขภาพ-ความงาม"
                  : p.id === "watcharin-service"
                    ? "ศูนย์รวมโปรเจคและบริการทั้งหมดของผม"
                    : "ตั้งทีม จัดทริป รวมกิจกรรม Public/Private"}
              </p>
              <div
                className={`mt-4 text-sm font-medium flex items-center gap-1 ${
                  p.stealth ? "text-slate-500" : p.accentText
                }`}
              >
                {p.stealth ? "ข้อมูลถูกซ่อน →" : "ดูรายละเอียด →"}
              </div>
            </button>
          );
        })}

        {/* Overview card */}
        <button
          type="button"
          onClick={() => setOpenProject(projects.overview)}
          className="text-left bg-gradient-to-br from-brand-600 via-brand-500 to-cyan-500 rounded-2xl p-6 flex flex-col justify-between text-white card-hover scroll-fade relative overflow-hidden cursor-pointer"
        >
          <div className="absolute -top-6 -right-6 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
          <div className="relative">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center text-2xl mb-4">
              ✨
            </div>
            <h3 className="text-xl font-bold mb-2">Ecosystem Overview</h3>
            <p className="text-brand-50 text-sm leading-relaxed">
              ดู value chain ทั้งหมด ว่าระบบเชื่อมกันยังไง สร้าง business model
              แบบไหน
            </p>
          </div>
          <div className="relative mt-6 inline-flex items-center gap-2 font-semibold text-white transition-all">
            อ่านต่อ <span>→</span>
          </div>
        </button>
      </div>

      <ProjectModal project={openProject} onClose={() => setOpenProject(null)} />
    </>
  );
}
