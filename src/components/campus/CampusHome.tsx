"use client";
import Image from "next/image";
import { useEffect, useRef } from "react";
import {
  campusAsset,
  campusBase,
  campusZones,
  zoneKeys,
  type CampusZoneKey,
} from "@/lib/campus";
import { CampusLink, useCampusMotion } from "./CampusShell";

export function CampusHome() {
  const host = useRef<HTMLElement>(null);
  const { navigate } = useCampusMotion();
  const onNavigate = useRef(navigate);
  useEffect(() => {
    onNavigate.current = navigate;
  }, [navigate]);
  useEffect(() => {
    let cancelled = false;
    let dispose: (() => void) | undefined;
    const node = host.current?.closest<HTMLElement>(".campus");
    if (!node) return;
    const timer = window.setTimeout(() => {
      Promise.all([import("three"), import("./campus-scene")])
        .then(([three, module]) => {
          if (cancelled) return;
          dispose = module.mountCampusMotion(
            node,
            three,
            (zone: CampusZoneKey) =>
              onNavigate.current(`${campusBase}/zones/${zone}`),
          );
        })
        .catch(() => {
          if (host.current) host.current.dataset.ready = "false";
        });
    }, 150);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      dispose?.();
    };
  }, []);

  return (
    <main id="main-content" data-screen="home">
      <section className="ww-page" ref={host}>
        <div className="campus-home-intro">
          <span className="campus-eyebrow">CONCEPT · CREATIVE CAMPUS</span>
          <h1 tabIndex={-1}>A world of things I build.</h1>
          <p>ระบบ แบรนด์ และประสบการณ์ดิจิทัล ในโลกใบเดียว</p>
        </div>
        <div className="campus-controls" aria-label="การสำรวจแคมปัส">
          <span className="campus-chapter">
            <i aria-hidden="true" /> EXPLORE MY WORLD <span>01 — 04</span>
          </span>
          <div>
            <button data-motion-skip hidden type="button">
              ข้าม ↗
            </button>
            <button data-motion-replay type="button">
              เล่นอีกครั้ง ↻
            </button>
            <button data-motion-reduce type="button" aria-pressed="false">
              ลด Motion
            </button>
          </div>
        </div>
        <div className="ww-world">
          <div className="ww-fallback">
            <Image
              src={campusAsset("campus-poster.png")}
              alt="แคมปัสจำลอง 4 โซน: Systems Lab, Brand House, Creative Studio และ Digital Garage"
              width={1024}
              height={374}
              priority
            />
          </div>
          <canvas className="campus-canvas" aria-label="แคมปัสสามมิติ" />
          <div className="ww-labels">
            {zoneKeys.map((key) => (
              <button
                className={`ww-zone ww-zone-${key}`}
                type="button"
                key={key}
                data-zone={key}
                aria-pressed="false"
              >
                {campusZones[key].name} ↗
              </button>
            ))}
          </div>
        </div>
        <div className="ww-bottom">
          <div className="ww-detail">
            <span className="ww-detail-kicker campus-eyebrow">
              WELCOME TO MY WORLD
            </span>
            <h3>Watcharin World</h3>
            <p>เลือกจุดบนแผนที่ แล้วเข้าถึงงานและเรื่องราวแต่ละด้าน</p>
          </div>
          <div className="ww-drive" aria-label="ปุ่มขับสำรวจ">
            {["up", "left", "down", "right"].map((dir, i) => (
              <button
                type="button"
                data-drive={dir}
                key={dir}
                aria-label={`ขับ${["ขึ้น", "ซ้าย", "ลง", "ขวา"][i]}`}
              >
                {["↑", "←", "↓", "→"][i]}
              </button>
            ))}
          </div>
        </div>
        <div className="wsp-home-action">
          <span className="campus-hint">
            เลือกอาคาร · เดินทาง · เปิดเรื่องราว
          </span>
          <button
            data-open-zone
            type="button"
            onClick={() => onNavigate.current(`${campusBase}/zones/web`)}
          >
            เริ่มสำรวจ Digital Garage ↗
          </button>
        </div>
        <div className="campus-progress" aria-live="polite">
          <span>
            <i aria-hidden="true" />
            <span data-motion-status>เลือกอาคารเพื่อเริ่มสำรวจ</span>
          </span>
          <span className="campus-progress-track" aria-hidden="true">
            <b />
          </span>
        </div>
      </section>
      <nav className="campus-zone-shortcuts" aria-label="เปิดรายละเอียดโซน">
        {zoneKeys.map((key) => (
          <CampusLink href={`${campusBase}/zones/${key}`} key={key}>
            <small>{campusZones[key].number}</small>
            <span>{campusZones[key].name}</span>
            <span aria-hidden="true">↗</span>
          </CampusLink>
        ))}
      </nav>
      <div className="campus-home-work">
        <CampusLink
          className="campus-button campus-button-outline"
          href={`${campusBase}/work`}
        >
          ดูผลงานทั้งหมด ↗
        </CampusLink>
      </div>
    </main>
  );
}
