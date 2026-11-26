/**
 * A play triangle centered in its circle: the shape's balance point (not its box) sits in the
 * middle, so it reads centered at any size without a nudge.
 */
export default function PlayIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path d="M8.7 6.9c0-1 1.1-1.6 1.9-1.1l7.4 4.6c.8.5.8 1.7 0 2.2l-7.4 4.6c-.8.5-1.9-.1-1.9-1.1V6.9Z" />
    </svg>
  );
}
