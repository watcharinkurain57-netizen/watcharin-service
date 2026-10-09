"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { campusAsset, campusZones } from "@/lib/campus";

const gallery = campusZones.brands.brandGallery;
const photoTitle = (caption: string) => caption.replace(/\s*↗$/, "");

export function CampusBrandGallery() {
  const [selected, setSelected] = useState<number | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLButtonElement | null>(null);
  const open = selected !== null;
  const photo = gallery.photos[selected ?? 0];

  useEffect(() => {
    if (!open) return;
    const node = dialog.current;
    if (!node) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    node.showModal();
    return () => {
      document.body.style.overflow = previousOverflow;
      node.close();
    };
  }, [open]);

  function move(direction: number) {
    setSelected((current) =>
      current === null
        ? null
        : (current + direction + gallery.photos.length) % gallery.photos.length,
    );
  }

  return (
    <section className="campus-brand-gallery">
      <div className="campus-brand-heading">
        <Image
          src={campusAsset(gallery.logo.file)}
          width={96}
          height={96}
          alt={gallery.logo.alt}
        />
        <div>
          <span className="campus-eyebrow">{gallery.sourceLabel}</span>
          <h2>{gallery.title}</h2>
          <p>ภาพจากหน้าร้านและสินค้าในเพจของแบรนด์ · กดภาพเพื่อดูขนาดใหญ่</p>
        </div>
      </div>
      <div className="campus-brand-photos">
        {gallery.photos.map((item, index) => (
          <figure key={item.key} data-campus-reveal="">
            <button
              className="campus-photo-open"
              type="button"
              aria-label={`ดูภาพใหญ่: ${photoTitle(item.caption)}`}
              aria-haspopup="dialog"
              onClick={(event) => {
                opener.current = event.currentTarget;
                setSelected(index);
              }}
            >
              <Image
                src={campusAsset(item.file)}
                width={item.width}
                height={item.height}
                sizes="(max-width: 600px) 100vw, 360px"
                alt={item.alt}
              />
              <span aria-hidden="true">ดูภาพใหญ่ ⤢</span>
            </button>
            <figcaption>
              <span>{photoTitle(item.caption)}</span>
              <a href={item.sourceURL} target="_blank" rel="noopener noreferrer">
                ดูต้นทาง ↗
              </a>
            </figcaption>
          </figure>
        ))}
      </div>
      <dialog
        ref={dialog}
        className="campus-gallery-dialog"
        aria-labelledby="campus-gallery-title"
        onClose={() => {
          setSelected(null);
          if (opener.current?.isConnected) opener.current.focus({ preventScroll: true });
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            const rect = event.currentTarget.getBoundingClientRect();
            if (
              event.clientX < rect.left || event.clientX > rect.right ||
              event.clientY < rect.top || event.clientY > rect.bottom
            ) dialog.current?.close();
          }
        }}
        onKeyDown={(event) => {
          if (event.key === "Tab") {
            const controls = event.currentTarget.querySelectorAll<HTMLElement>("button:not([disabled]), a[href]");
            const first = controls[0];
            const last = controls[controls.length - 1];
            if (event.shiftKey && document.activeElement === first) {
              event.preventDefault();
              last?.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
              event.preventDefault();
              first?.focus();
            }
          }
          if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
            event.preventDefault();
            move(event.key === "ArrowRight" ? 1 : -1);
          }
        }}
      >
        <header className="campus-gallery-toolbar">
          <div>
            <span className="campus-eyebrow">WANSABYE · {gallery.sourceLabel}</span>
            <h2 id="campus-gallery-title">{photoTitle(photo.caption)}</h2>
          </div>
          <button type="button" autoFocus aria-label="ปิดภาพใหญ่" onClick={() => dialog.current?.close()}>
            ปิด ×
          </button>
        </header>
        <div className="campus-gallery-frame" key={photo.key}>
          <Image
            src={campusAsset(photo.file)}
            width={photo.width}
            height={photo.height}
            sizes="(max-width: 600px) 90vw, 760px"
            alt={photo.alt}
          />
        </div>
        <footer className="campus-gallery-toolbar">
          <div className="campus-gallery-controls">
            <button type="button" aria-label="ภาพก่อนหน้า" onClick={() => move(-1)}>←</button>
            <span role="status" aria-live="polite" aria-atomic="true">
              ภาพ {(selected ?? 0) + 1} จาก {gallery.photos.length}
            </span>
            <button type="button" aria-label="ภาพถัดไป" onClick={() => move(1)}>→</button>
          </div>
          <a className="campus-text-link" href={photo.sourceURL} target="_blank" rel="noopener noreferrer">
            ดูภาพต้นทางบน Facebook ↗
          </a>
        </footer>
      </dialog>
    </section>
  );
}
