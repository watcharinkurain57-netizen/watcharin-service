import Image from "next/image";
import { coverGradient, type ArchiveProject } from "@/lib/project-archive";

type Props = {
  project: ArchiveProject;
  /** ใช้บอกเบราว์เซอร์ว่าจะแสดงกว้างเท่าไหร่ จะได้โหลดไฟล์ขนาดพอดี */
  sizes: string;
  priority?: boolean;
  className?: string;
};

/**
 * หน้าปกโปรเจกต์ — ถ้ายังไม่ได้ใส่รูปจะใช้พื้นไล่สีแทน
 * ตั้งใจให้ยังไม่มีรูปก็ดูเรียบร้อยได้ เพราะรูปจริงจะทยอยเติมทีหลัง
 */
export function ProjectCover({ project, sizes, priority, className }: Props) {
  const { cover, name } = project;

  if (!cover) {
    return (
      <div
        className={className}
        style={{ background: coverGradient(project.slug) }}
        aria-hidden="true"
      />
    );
  }

  return (
    <Image
      src={cover.src}
      alt={cover.alt || name}
      fill
      sizes={sizes}
      priority={priority}
      className={`object-cover ${className ?? ""}`}
      style={cover.focus ? { objectPosition: cover.focus } : undefined}
    />
  );
}
