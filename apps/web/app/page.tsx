"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";

const TOTAL = 6;
const CLOCK_TIMES = ["11:42 PM", "11:43 PM", "11:48 PM", "2:17 AM", "5:30 AM", "7:08 AM"];
const CHAPTER_LABELS = ["After hours", "A message arrives", "SignalBridge", "The promise", "How SafeNight works", "Morning"];

function AnimatedWords({ text, startMs, stepMs, dur = "0.7s" }: {
  text: string; startMs: number; stepMs: number; dur?: string;
}) {
  return (
    <>
      {text.split(" ").map((word, i) => (
        <span
          key={i}
          className={styles.animatedWord}
          style={{ "--word-delay": `${startMs + i * stepMs}ms`, animationDuration: dur } as React.CSSProperties}
        >
          {word}&nbsp;
        </span>
      ))}
    </>
  );
}

function Scene0() {
  return (
    <div className={styles.scene}>
      <div className={`${styles.atmosphere} ${styles.atmosphere0}`} />
      <div className={styles.centered}>
        <div className={styles.pulse}>
          <span /><span /><i />
        </div>
        <div className={styles.eyebrow}>SafeNight is listening</div>
        <h1>Some nights, the message comes in late.</h1>
        <p className={styles.lead}>And no one should have to hold it alone.</p>
      </div>
    </div>
  );
}

function Scene1() {
  return (
    <div className={styles.scene}>
      <div className={`${styles.atmosphere} ${styles.atmosphere1}`} />
      <div className={styles.conversation}>
        <div className={styles.incoming}>
          <span />
          11:43 PM - incoming
        </div>
        <div className={styles.youthBubble}>
          <AnimatedWords
            text="Someone in my class keeps editing photos of me and sharing them around. I really don't want to face school tomorrow."
            startMs={300}
            stepMs={75}
            dur="0.6s"
          />
          <i />
        </div>
        <div className={styles.replyWrap}>
          <p>SafeNight</p>
          <div className={styles.replyBubble}>
            That sounds really hard. You don&apos;t have to go over all of it right now. How are you feeling about school tomorrow?
          </div>
        </div>
      </div>
    </div>
  );
}

function Scene2() {
  return (
    <div className={styles.scene}>
      <div className={`${styles.atmosphere} ${styles.atmosphere2}`} />
      <div className={styles.centered}>
        <div className={styles.brandIcon}>
          <svg viewBox="0 0 24 24" fill="none" stroke="#eaf6f2" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4.9 16.1C1 12.2 1 5.8 4.9 1.9"/>
            <path d="M7.8 4.7a6.14 6.14 0 0 0-.8 7.5"/>
            <circle cx="12" cy="9" r="2"/>
            <path d="M16.2 4.8c2 2 2.26 5.11.8 7.47"/>
            <path d="M19.1 1.9a9.96 9.96 0 0 1 0 14.1"/>
            <path d="M9.5 18h5"/>
            <path d="m8 22 4-11 4 11"/>
          </svg>
        </div>
        <h1 className={styles.wordmark}><span>Signal</span>Bridge</h1>
        <p className={styles.lead}>After-hours support for young people. And a space for the workers who show up for them.</p>
      </div>
    </div>
  );
}

function Scene3() {
  return (
    <div className={styles.scene}>
      <div className={`${styles.atmosphere} ${styles.atmosphere3}`} />
      <div className={styles.promise}>
        <div className={styles.eyebrow}>The promise</div>
        <h2>
          <AnimatedWords
            text="You only have to say it once. We hold it until morning."
            startMs={250}
            stepMs={95}
            dur="0.7s"
          />
        </h2>
      </div>
    </div>
  );
}

function Scene4() {
  return (
    <div className={styles.scene}>
      <div className={`${styles.atmosphere} ${styles.atmosphere4}`} />
      <div className={styles.stepsScene}>
        <div className={styles.stepsHeading}>
          <div className={styles.eyebrow}>How SafeNight works</div>
          <h2>Three steps. Always on your terms.</h2>
        </div>
        <div className={styles.steps}>
          <div className={styles.step}>
            <div className={styles.stepIcon}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>
              </svg>
            </div>
            <h3>Listen</h3>
            <p>Here with you when it&apos;s late. No labels, no pressure.</p>
          </div>

          <div className={styles.connector} />

          <div className={styles.step} style={{ animationDelay: "1.4s" }}>
            <div className={`${styles.stepIcon} ${styles.amber}`}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
              </svg>
            </div>
            <h3>Read the signals</h3>
            <p>Picks up on what matters. Never diagnoses. Never assumes.</p>
          </div>

          <div
            className={styles.connector}
            style={{
              animationDelay: "2s",
              background: "linear-gradient(90deg, rgba(183,121,31,.4), rgba(111,184,170,.4))",
            }}
          />

          <div className={styles.step} style={{ animationDelay: "2.4s" }}>
            <div className={styles.stepIcon}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>
                <path d="m9 12 2 2 4-4"/>
              </svg>
            </div>
            <h3>Hand off carefully</h3>
            <p>You decide what gets shared. Your worker reviews everything before morning.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Scene5({ onEnter }: { onEnter: (label: string, href: string) => void }) {
  return (
    <div className={styles.scene}>
      <div className={`${styles.atmosphere} ${styles.atmosphere5}`} />
      <div className={styles.morning}>
        <div className={styles.eyebrow}>7:08 AM</div>
        <h2>Your worker picks up ready. You won&apos;t have to start over.</h2>

        <button
          className={styles.enterButton}
          onClick={(e) => { e.stopPropagation(); onEnter("SafeNight", "/login"); }}
        >
          Start talking
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
          </svg>
        </button>

        <div className={styles.staffLinks}>
          <button
            className={styles.supervisorLink}
            onClick={(e) => { e.stopPropagation(); onEnter("Youth worker", "/login"); }}
          >
            Youth worker sign in
          </button>
          <span className={styles.staffDivider}>·</span>
          <button
            className={styles.supervisorLink}
            onClick={(e) => { e.stopPropagation(); onEnter("Supervisor", "/login"); }}
          >
            Supervisor sign in
          </button>
        </div>
      </div>
    </div>
  );
}

export default function IntroPage() {
  const [scene, setScene] = useState(0);
  const [entering, setEntering] = useState<string | null>(null);
  const router = useRouter();
  const lockRef = useRef(false);

  const next = useCallback(() => setScene(s => Math.min(5, s + 1)), []);
  const prev = useCallback(() => setScene(s => Math.max(0, s - 1)), []);

  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      if (entering || lockRef.current || Math.abs(e.deltaY) < 8) return;
      lockRef.current = true;
      setTimeout(() => { lockRef.current = false; }, 850);
      e.deltaY > 0 ? next() : prev();
    };
    const onKey = (e: KeyboardEvent) => {
      if (entering) return;
      const el = document.activeElement as HTMLElement;
      if ((e.key === "Enter" || e.key === " ") && el?.getAttribute("role") === "button") {
        e.preventDefault(); el.click(); return;
      }
      if (["ArrowRight", "ArrowDown", "PageDown"].includes(e.key)) { e.preventDefault(); next(); }
      else if (["ArrowLeft", "ArrowUp", "PageUp"].includes(e.key)) { e.preventDefault(); prev(); }
    };
    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKey);
    };
  }, [entering, next, prev]);

  function handleEnter(label: string, href: string) {
    setEntering(label);
    setTimeout(() => router.push(href), 1400);
  }

  const isLight = scene === 5;

  return (
    <div
      className={`${styles.intro}${isLight ? " " + styles.light : ""}`}
      onClick={() => { if (!entering) next(); }}
      tabIndex={-1}
    >
      {/* Ambient layer */}
      <div className={styles.ambient}>
        <span className={styles.glowOne} />
        <span className={styles.glowTwo} />
        <span className={styles.grid} />
        <span className={styles.scan} />
        <span className={styles.vignette} />
      </div>

      {/* Persistent clock */}
      <div className={styles.clock}>
        <span />
        {CLOCK_TIMES[scene]}
      </div>

      {/* Persistent chapter label */}
      <div className={styles.chapter}>
        <span>{String(scene + 1).padStart(2, "0")} / 06</span>
        &nbsp;&nbsp;{CHAPTER_LABELS[scene]}
      </div>

      {/* Scenes */}
      {scene === 0 && <Scene0 />}
      {scene === 1 && <Scene1 />}
      {scene === 2 && <Scene2 />}
      {scene === 3 && <Scene3 />}
      {scene === 4 && <Scene4 />}
      {scene === 5 && <Scene5 onEnter={handleEnter} />}

      {/* Progress dots + hint */}
      <div className={styles.progress}>
        <div>
          {Array.from({ length: TOTAL }, (_, i) => (
            <button
              key={i}
              className={i === scene ? styles.activeDot : ""}
              onClick={(e) => { e.stopPropagation(); setScene(i); }}
              aria-label={`Scene ${i + 1}`}
            />
          ))}
        </div>
        {scene < 5 && !entering && (
          <p onClick={(e) => { e.stopPropagation(); next(); }}>
            {scene === 0 ? "Scroll, click, or press ->" : "Continue"}
          </p>
        )}
      </div>

      {/* Entering overlay */}
      {scene < 5 && !entering && (
        <button
          className={styles.skipBtn}
          onClick={(e) => { e.stopPropagation(); setScene(5); }}
        >
          Skip intro
        </button>
      )}

      {entering && (
        <div className={styles.entering}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
          </svg>
          <div>
            <strong>Opening {entering}</strong>
          </div>
        </div>
      )}
    </div>
  );
}
