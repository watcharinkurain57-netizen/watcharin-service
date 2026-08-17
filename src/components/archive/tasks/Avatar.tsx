"use client";

import { initials, personName, type Person } from "@/lib/project-tasks";

/**
 * วงกลมรูปคน — ถ้าไม่มีรูปใช้ตัวอักษรแรกของชื่อแทน
 *
 * ใช้ <img> ธรรมดาไม่ใช่ next/image เพราะรูปมาจากโดเมนของ Google
 * ซึ่งเปลี่ยนไปเรื่อย ๆ การไปไล่ประกาศ remotePatterns ไม่คุ้มกับรูป 24px
 */
export function Avatar({ person, size = 22 }: { person?: Person; size?: number }) {
  const name = personName(person);

  if (person?.avatar_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={person.avatar_url}
        alt={name}
        title={name}
        width={size}
        height={size}
        referrerPolicy="no-referrer"
        className="flex-none rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <span
      title={name}
      aria-label={name}
      className="grid flex-none place-items-center rounded-full bg-brand-500/20 font-bold text-brand-300"
      style={{ width: size, height: size, fontSize: size * 0.45 }}
    >
      {initials(person)}
    </span>
  );
}
