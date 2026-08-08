/**
 * Groups one or more sections into a narrative chapter.
 *
 * The `data-chapter` attribute is the seam the WebGL layer will read: the
 * scroll driver maps chapter boundaries to camera/layout states, so the 3D
 * scene never needs to know about individual sections. Purely structural —
 * it renders no styling of its own so the sections inside keep full control
 * of their own spacing and backgrounds.
 */
export function Chapter({
  index,
  label,
  children,
}: {
  index: number;
  /** Short slug used for debugging and for the 3D layer's scene lookup. */
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div data-chapter={index} data-chapter-label={label}>
      {children}
    </div>
  );
}
