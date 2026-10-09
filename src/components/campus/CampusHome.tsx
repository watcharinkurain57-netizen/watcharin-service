"use client";
import Image from "next/image";
import { useEffect, useRef } from "react";
import {
  campusAsset,
  campusBase,
  campusContent,
  campusZones,
  zoneKeys,
  type CampusZoneKey,
} from "@/lib/campus";
import { CampusLink, useCampusMotion } from "./CampusShell";

const zoneNotes: Record<CampusZoneKey, string> = {
  systems: "ServiceNow, สถาปัตยกรรม และการเชื่อมต่อระบบ",
  brands: "ตัวตนของแบรนด์ เสื้อผ้า และอาหาร",
  media: "ภาพ 3D ภาพโฆษณา และเรื่องราวที่กำลังสร้าง",
  web: "เว็บไซต์ แอปพลิเคชัน และประสบการณ์ดิจิทัล",
};

export function CampusHome() {
  const host = useRef<HTMLElement>(null);
  const page = useRef<HTMLElement>(null);
  const { navigate, reduced } = useCampusMotion();
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

  useEffect(() => {
    const frames = Array.from(
      page.current?.querySelectorAll<HTMLElement>("[data-home-parallax]") ?? [],
    );
    if (reduced) {
      for (const frame of frames) frame.style.removeProperty("--image-shift");
      return;
    }
    const visible = new Set<HTMLElement>();
    let raf = 0;
    const update = () => {
      raf = 0;
      if (document.hidden) return;
      for (const frame of visible) {
        const rect = frame.getBoundingClientRect();
        const progress = Math.max(
          -1,
          Math.min(
            1,
            (rect.top + rect.height / 2 - innerHeight / 2) / innerHeight,
          ),
        );
        frame.style.setProperty("--image-shift", `${progress * 3}%`);
      }
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) visible.add(entry.target as HTMLElement);
        else visible.delete(entry.target as HTMLElement);
      }
      schedule();
    });
    for (const frame of frames) observer.observe(frame);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    document.addEventListener("visibilitychange", schedule);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      document.removeEventListener("visibilitychange", schedule);
      for (const frame of frames) frame.style.removeProperty("--image-shift");
    };
  }, [reduced]);

  return (
    <main
      id="main-content"
      data-screen="home"
      className="campus-home"
      ref={page}
    >
      <section
        className="ww-page home-hero"
        ref={host}
        aria-labelledby="home-title"
      >
        <div className="home-hero-copy ww-intro">
          <span className="home-overline">Creative Campus</span>
          <h1 id="home-title" tabIndex={-1}>
            <span>Many worlds.</span>
            <span>One maker.</span>
          </h1>
          <div className="home-maker">
            <span>{campusContent.profile.name}</span>
            <p>
              Software Architect ที่เชื่อมระบบ
              <br />
              แบรนด์ และประสบการณ์ดิจิทัลเข้าด้วยกัน
            </p>
          </div>
          <a className="home-link" href="#selected-work">
            สำรวจผลงาน <span aria-hidden="true">↓</span>
          </a>
        </div>
        <div className="home-scene">
          <div className="ww-world">
            <div className="ww-fallback">
              <Image
                src={campusAsset("campus-poster.png")}
                alt="แคมปัสจำลอง 4 โซน: Systems Lab, Brand House, Creative Studio และ Digital Garage"
                width={1024}
                height={600}
                sizes="(max-width: 760px) 100vw, 65vw"
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
                  {campusZones[key].name}
                  <span aria-hidden="true">↗</span>
                </button>
              ))}
            </div>
          </div>
          <div className="home-scene-caption">
            <div className="ww-detail" aria-live="polite" aria-atomic="true">
              <span className="ww-detail-kicker">เลือกอาคารเพื่อสำรวจ</span>
              <h3>Creative Campus</h3>
              <p>สี่พื้นที่ของงานที่ผมสร้าง</p>
            </div>
            <button
              className="home-enter"
              data-open-zone
              type="button"
              onClick={() => onNavigate.current(`${campusBase}/zones/web`)}
            >
              เข้าสู่ Digital Garage ↗
            </button>
          </div>
          <div className="home-scene-tools campus-controls">
            <span data-motion-status role="status">
              เลือกอาคาร แล้วกดเข้าสู่โซน
            </span>
            <div>
              <button data-motion-skip hidden type="button">
                ข้าม
              </button>
              <details className="home-scene-settings">
                <summary>
                  วิธีสำรวจ <span aria-hidden="true">＋</span>
                </summary>
                <div className="home-settings-panel">
                  <p>
                    เลือกชื่ออาคารเพื่อดูโซน
                    หรือโฟกัสที่แคมปัสแล้วใช้ปุ่มลูกศรขับรถ
                  </p>
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
                  <button data-motion-replay type="button">
                    เล่น Intro อีกครั้ง
                  </button>
                  <button data-motion-reduce type="button" aria-pressed="false">
                    ลด Motion
                  </button>
                </div>
              </details>
            </div>
          </div>
        </div>
        <a
          href="#home-introduction"
          className="home-scroll-cue"
          aria-label="เลื่อนอ่านเกี่ยวกับ Watcharin"
        >
          <span aria-hidden="true">↓</span> เรื่องราวถัดไป
        </a>
      </section>

      <section
        id="home-introduction"
        className="home-introduction home-section"
        aria-labelledby="home-about-title"
      >
        <div className="home-section-aside">
          <span>คนเบื้องหลังแคมปัส</span>
          <span className="home-person-name">
            Watcharin
            <br />
            Kurain
          </span>
          <CampusLink className="home-link" href={`${campusBase}/about`}>
            รู้จักผม <span aria-hidden="true">↗</span>
          </CampusLink>
        </div>
        <div className="home-introduction-copy" data-campus-reveal="">
          <h2 id="home-about-title">
            คิดให้เชื่อมกัน.
            <br />
            สร้างให้ใช้งานได้.
          </h2>
          <p>
            ผมทำงานตั้งแต่สถาปัตยกรรมระบบองค์กรและ ServiceNow
            ไปจนถึงเว็บไซต์และแอปพลิเคชัน
            และกำลังต่อยอดพื้นที่ของตัวเองสู่งานแบรนด์และภาพสร้างสรรค์
          </p>
          <p className="home-introduction-note">
            Creative Campus คือวิธีพาคุณสำรวจงานเหล่านั้น
            <br className="home-desktop-break" />{" "}
            ผ่านโลกใบเดียวที่แต่ละอาคารมีเรื่องราวต่างกัน
          </p>
        </div>
      </section>

      <section
        id="selected-work"
        className="home-selected home-section"
        aria-labelledby="home-work-title"
      >
        <div className="home-section-heading">
          <h2 id="home-work-title">สิ่งที่กำลังสร้าง</h2>
          <CampusLink className="home-link" href={`${campusBase}/work`}>
            ดูผลงานทั้งหมด <span aria-hidden="true">↗</span>
          </CampusLink>
        </div>
        <div className="home-projects">
          <article
            className="home-project home-project-web"
            data-project-key="watcharin"
            tabIndex={-1}
          >
            <CampusLink
              href={`${campusBase}/projects/watcharin`}
              className="home-project-link"
              aria-label="ดูรายละเอียด Watcharin Service"
            >
              <div className="home-project-image" data-home-parallax="">
                <Image
                  src={campusAsset("watcharin-mockup-v1.png")}
                  alt="ภาพคอนเซปต์เว็บไซต์ Watcharin Service บนจอ Desktop และมือถือ"
                  width={1536}
                  height={1024}
                  sizes="(max-width: 760px) 100vw, 58vw"
                />
                <span className="home-image-action" aria-hidden="true">
                  ↗
                </span>
              </div>
              <div className="home-project-caption">
                <div>
                  <span>เว็บไซต์ส่วนตัว</span>
                  <h3>Watcharin Service</h3>
                </div>
                <span className="home-work-status">
                  <i aria-hidden="true" />
                  เปิดใช้งานแล้ว
                </span>
              </div>
            </CampusLink>
            <p>
              ออกแบบและพัฒนา Portfolio ตั้งแต่โครงสร้างและแคมปัส 3D
              ไปจนถึงการใช้งานบนเว็บจริง
            </p>
            <span className="home-image-note">
              ภาพคอนเซปต์สำหรับนำเสนอเว็บไซต์
            </span>
          </article>
          <article className="home-project home-project-brand">
            <CampusLink
              href={`${campusBase}/work/brands`}
              className="home-project-link"
              aria-label="ดูเรื่องราวและภาพของ WANSABYE"
            >
              <div className="home-project-image" data-home-parallax="">
                <Image
                  src={campusAsset("wansabye-shop.jpg")}
                  alt="หน้าร้านเสื้อผ้า WANSABYE พร้อมสินค้าและป้ายร้าน"
                  width={1440}
                  height={1440}
                  sizes="(max-width: 760px) 100vw, 35vw"
                />
                <span className="home-image-action" aria-hidden="true">
                  ↗
                </span>
              </div>
              <div className="home-project-caption">
                <div>
                  <span>แบรนด์เสื้อผ้า</span>
                  <h3>WANSABYE</h3>
                </div>
              </div>
            </CampusLink>
            <p>
              ร้านเสื้อผ้าที่มีอยู่แล้ว
              พร้อมเรื่องราวและช่องทางของแบรนด์ที่กำลังเตรียมกลับมาพัฒนาต่อ
            </p>
            <span className="home-image-note">ภาพจริงจากเพจ WANSABYE</span>
          </article>
        </div>
      </section>

      <section
        className="home-worlds home-section"
        aria-labelledby="home-worlds-title"
      >
        <div className="home-worlds-intro">
          <h2 id="home-worlds-title">
            ต่างงาน.
            <br />
            โลกเดียวกัน.
          </h2>
          <p>
            เลือกพื้นที่ที่สนใจ เพื่อดูแนวคิด
            <br />
            กระบวนการ และงานในแต่ละด้าน
          </p>
          <div className="home-worlds-art">
            <Image
              src={campusAsset("brand-house-concept-v1.png")}
              alt="ภาพคอนเซปต์ Brand House ในโลก Creative Campus"
              width={1536}
              height={1024}
              sizes="(max-width: 760px) 100vw, 34vw"
            />
          </div>
        </div>
        <nav
          className="home-world-links"
          aria-label="พื้นที่ของ Creative Campus"
        >
          {zoneKeys.map((key) => (
            <CampusLink
              href={`${campusBase}/zones/${key}`}
              className="home-world-link"
              key={key}
            >
              <div>
                <h3>{campusZones[key].name}</h3>
                <p>{zoneNotes[key]}</p>
              </div>
              <span aria-hidden="true">↗</span>
            </CampusLink>
          ))}
        </nav>
      </section>

      <section className="home-contact" aria-labelledby="home-contact-title">
        <div className="home-contact-inner">
          <span>เริ่มต้นจากบทสนทนา</span>
          <h2 id="home-contact-title">
            คุณกำลังจะ
            <br />
            สร้างอะไรต่อ?
          </h2>
          <div>
            <p>
              เล่าไอเดียหรือโจทย์ของคุณ
              <br />
              แล้วเราค่อยวางทางไปต่อด้วยกัน
            </p>
            <CampusLink
              href={`${campusBase}/contact`}
              className="home-contact-link"
            >
              คุยเรื่องโปรเจกต์ <span aria-hidden="true">↗</span>
            </CampusLink>
          </div>
        </div>
      </section>
    </main>
  );
}
