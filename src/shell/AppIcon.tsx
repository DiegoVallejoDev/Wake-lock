export default function AppIcon({
  src,
  size = 32,
  alt = "",
}: {
  src: string;
  size?: number;
  alt?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className="app-icon"
      src={src}
      alt={alt}
      width={size}
      height={size}
      draggable={false}
    />
  );
}
