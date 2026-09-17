import { animate, useInView } from "motion/react";
import { useEffect, useRef, useState } from "react";

export function Counter({
  value,
  suffix = "",
  duration = 1.8,
}: {
  value: number;
  suffix?: string;
  duration?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const controls = animate(0, value, {
      duration,
      ease: "easeOut",
      onUpdate: (latest) => setDisplay(Math.round(latest)),
    });
    return () => controls.stop();
  }, [inView, value, duration]);

  return (
    <span ref={ref} className="tabular-nums">
      {/* Progressive enhancement: the final configured value is always present
          in the server-rendered HTML for crawlers and assistive tech, while the
          visible number keeps animating from 0 for normal users. */}
      <span className="sr-only">
        {value.toLocaleString("ar-EG")}
        {suffix}
      </span>
      <span aria-hidden>
        {display.toLocaleString("ar-EG")}
        {suffix}
      </span>
    </span>
  );
}