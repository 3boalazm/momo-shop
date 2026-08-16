import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import logo from "./media/Logo.png";

/**
 * Brand intro shown once per session on first load.
 * Respects prefers-reduced-motion (skips animation, shows nothing).
 */
export default function LoadingScreen() {
  const [show, setShow] = useState(() => {
    if (typeof window === "undefined") return false;
    // Show only once per browser session
    if (sessionStorage.getItem("momo_intro_seen")) return false;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
    return true;
  });

  useEffect(() => {
    if (!show) return;
    const t = setTimeout(() => {
      setShow(false);
      sessionStorage.setItem("momo_intro_seen", "1");
    }, 1400); // hold 1.4s + 0.6s exit fade = 2.0s total
    return () => clearTimeout(t);
  }, [show]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center glow-field"
          style={{ backgroundColor: "var(--momo-bg)" }}
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.6, ease: "easeInOut" } }}
        >
          <div className="text-center">
            <motion.div
              initial={{ y: 24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="font-black leading-none"
              style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.04em" }}
            >
              <img src={logo} alt="OLTRÈ Collective" className="h-16 md:h-24 w-auto mx-auto" />
              <motion.div
                initial={{ y: 16, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
                className="text-lg md:text-2xl tracking-[0.4em] text-dim uppercase mt-3"
              >
                Collective
              </motion.div>
            </motion.div>

            {/* Accent loading bar */}
            <motion.div
              className="h-0.5 bg-accent mx-auto mt-8"
              initial={{ width: 0 }}
              animate={{ width: "160px" }}
              transition={{ duration: 1.4, ease: "easeInOut" }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
