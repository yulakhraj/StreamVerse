import { useEffect, useRef, useState } from "react";
import { useDialogFocus } from "../lib/useDialogFocus";
import { usePreferences } from "../lib/preferences";
import type Hls from "hls.js";
import { motion, useReducedMotion } from "framer-motion";
import type { Channel } from "../lib/catalog";
import { playbackAttempts } from "../lib/playback";
interface Props {
  channel: Channel;
  channels: Channel[];
  onClose: () => void;
  onSelect: (channel: Channel) => void;
  onPlaying?: (channel: Channel) => void;
}
export default function Player({
  channel,
  channels,
  onClose,
  onSelect,
  onPlaying,
}: Props) {
  const reduced = useReducedMotion();
  const hide = usePreferences((s) => s.hide);
  const video = useRef<HTMLVideoElement>(null),
    panel = useRef<HTMLDivElement>(null),
    hls = useRef<Hls | null>(null);
  useDialogFocus(panel);
  const [status, setStatus] = useState("Connecting to the live stream…"),
    [offline, setOffline] = useState(false),
    [levels, setLevels] = useState<{ index: number; label: string }[]>([]),
    [quality, setQuality] = useState(-1),
    [restart, setRestart] = useState(0);
  const callbacks = useRef({ onClose, onSelect, onPlaying, channels });
  useEffect(() => {
    callbacks.current = { onClose, onSelect, onPlaying, channels };
  }, [onClose, onSelect, onPlaying, channels]);
  useEffect(() => {
    const element = video.current!;
    const attempts = playbackAttempts(
      channel.streams,
      location.protocol === "https:",
      import.meta.env.VITE_STREAM_PROXY ?? "/api/stream",
    );
    let index = 0,
      disposed = false,
      hasPlayed = false,
      failCurrent: () => void = () => {},
      timer: ReturnType<typeof setTimeout> | undefined;
    const clearTimer = () => {
      if (timer) clearTimeout(timer);
    };
    const armTimer = () => {
      clearTimer();
      timer = setTimeout(() => failCurrent(), 20000);
    };
    const play = () => {
      void element.play().catch((error: unknown) => {
        if (
          !disposed &&
          error instanceof DOMException &&
          error.name === "NotAllowedError"
        ) {
          clearTimer();
          setStatus("Press play to start watching.");
        }
      });
    };
    const playing = () => {
      hasPlayed = true;
      clearTimer();
      setStatus("");
      callbacks.current.onPlaying?.(channel);
    };
    const waiting = () => {
      setStatus("Buffering the live stream…");
      armTimer();
    };
    const error = () => failCurrent();
    const paused = () => {
      if (hasPlayed) clearTimer();
    };
    element.addEventListener("pause", paused);
    element.addEventListener("playing", playing);
    element.addEventListener("waiting", waiting);
    element.addEventListener("error", error);
    const start = async () => {
      if (disposed) return;
      hasPlayed = false;
      clearTimer();
      hls.current?.destroy();
      hls.current = null;
      const attempt = attempts[index];
      if (!attempt) {
        setOffline(true);
        setStatus(
          "This channel is currently unavailable. Try another channel or come back later.",
        );
        return;
      }
      setOffline(false);
      setLevels([]);
      setQuality(-1);
      setStatus(
        attempt.proxied
          ? "Trying the fallback connection…"
          : attempt.retry
            ? "Reconnecting to the stream…"
            : "Connecting to the live stream…",
      );
      let failed = false;
      failCurrent = () => {
        if (disposed || failed) return;
        failed = true;
        index++;
        void start().catch(() => {
          if (!disposed) {
            setOffline(true);
            setStatus("The video engine could not load. Please retry.");
          }
        });
      };
      armTimer();
      if (element.canPlayType("application/vnd.apple.mpegurl")) {
        element.src = attempt.url;
        play();
      } else {
        const { default: Hls } = await import("hls.js");
        if (disposed || failed) return;
        if (!Hls.isSupported()) {
          element.src = attempt.url;
          play();
          return;
        }
        const instance = new Hls({
          maxBufferLength: 30,
          manifestLoadingMaxRetry: 1,
          levelLoadingMaxRetry: 1,
          fragLoadingMaxRetry: 1,
        });
        hls.current = instance;
        instance.on(Hls.Events.MANIFEST_PARSED, () => {
          if (disposed || failed) return;
          setLevels(
            instance.levels.map((l, i) => ({
              index: i,
              label: l.height
                ? `${l.height}p`
                : `${Math.round(l.bitrate / 1000)} kbps`,
            })),
          );
          play();
        });
        instance.on(Hls.Events.ERROR, (_event, data) => {
          if (!disposed && !failed && data.fatal) failCurrent();
        });
        instance.attachMedia(element);
        instance.loadSource(attempt.url);
      }
    };
    void start().catch(() => {
      if (!disposed) {
        setOffline(true);
        setStatus("The video engine could not load. Please retry.");
      }
    });
    return () => {
      disposed = true;
      clearTimer();
      element.removeEventListener("pause", paused);
      element.removeEventListener("playing", playing);
      element.removeEventListener("waiting", waiting);
      element.removeEventListener("error", error);
      hls.current?.destroy();
      hls.current = null;
      element.pause();
      element.removeAttribute("src");
      element.load();
    };
  }, [channel, restart]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (document.querySelector("dialog[open]")) return;
      if (e.key === "Escape") {
        callbacks.current.onClose();
        return;
      }
      if ((e.target as HTMLElement).matches("input,select,textarea,video"))
        return;
      if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
      e.preventDefault();
      const list = callbacks.current.channels;
      const current = list.findIndex((c) => c.id === channel.id);
      if (!list.length) return;
      callbacks.current.onSelect(
        list[
          (current + (e.key === "ArrowDown" ? 1 : -1) + list.length) %
            list.length
        ],
      );
    };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [channel.id]);
  const switcher =
    channels.length > 120
      ? channels.slice(
          Math.max(0, channels.findIndex((c) => c.id === channel.id) - 30),
          Math.max(0, channels.findIndex((c) => c.id === channel.id) - 30) +
            120,
        )
      : channels;
  return (
    <motion.div
      className="player-backdrop"
      initial={reduced ? false : { opacity: 0 }}
      transition={{ duration: reduced ? 0 : 0.2 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        layoutId={`channel-${channel.id}`}
        className="player-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="player-title"
        ref={panel}
        initial={reduced ? false : { scale: 0.96, y: 20 }}
        transition={{ duration: reduced ? 0 : 0.25 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.96, y: 20 }}
      >
        <header className="player-header">
          <div>
            <p className="eyebrow">NOW WATCHING</p>
            <h2 id="player-title">{channel.name}</h2>
          </div>
          <button
            className="icon-button"
            onClick={onClose}
            aria-label="Close player"
          >
            ×
          </button>
        </header>
        <div className="player-layout">
          <section className="screen-area" aria-label="Video player">
            <div className={`video-wrap${offline ? " is-offline" : ""}`}>
              <video
                ref={video}
                tabIndex={offline ? -1 : 0}
                controls
                autoPlay
                playsInline
                aria-label={`${channel.name} live video`}
              />
              {offline && (
                <div className="offline-overlay">
                  <span aria-hidden="true">◉</span>
                  <h3>Off the air. For now.</h3>
                  <p>{status}</p>
                  <button
                    className="primary-button"
                    onClick={() => setRestart((n) => n + 1)}
                  >
                    Try again ↻
                  </button>
                  <button
                    className="hide-button"
                    onClick={() => {
                      hide(channel.id);
                      onClose();
                    }}
                  >
                    Hide this channel
                  </button>
                </div>
              )}
            </div>
            <div className="player-controls">
              <span className="player-status" role="status">
                {!offline && (status || "● Live")}
              </span>
              {levels.length > 0 && (
                <label className="quality-label">
                  Quality
                  <select
                    value={quality}
                    onChange={(e) => {
                      const value = Number(e.target.value);
                      setQuality(value);
                      if (hls.current) hls.current.currentLevel = value;
                    }}
                  >
                    <option value={-1}>Auto</option>
                    {levels.map((l) => (
                      <option key={l.index} value={l.index}>
                        {l.label}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <button
                className="secondary-button"
                onClick={() => {
                  void panel.current
                    ?.requestFullscreen?.()
                    .catch(() =>
                      setStatus("Fullscreen is unavailable in this browser."),
                    );
                }}
              >
                Fullscreen
              </button>
              {document.pictureInPictureEnabled && (
                <button
                  className="secondary-button"
                  onClick={() => {
                    void video.current
                      ?.requestPictureInPicture()
                      .catch(() =>
                        setStatus(
                          "Start playback before opening picture-in-picture.",
                        ),
                      );
                  }}
                >
                  PiP
                </button>
              )}
            </div>
            <p className="player-source-note">
              Public stream · Availability varies by broadcaster and location.
            </p>
          </section>
          <aside className="channel-switcher" aria-label="Channel switcher">
            <h3>
              Keep exploring <span>↑ ↓</span>
            </h3>
            {switcher.map((c) => (
              <button
                key={c.id}
                className={c.id === channel.id ? "is-active" : ""}
                aria-current={c.id === channel.id ? "true" : undefined}
                onClick={() => onSelect(c)}
              >
                <span className="switcher-logo">
                  {c.name.slice(0, 2).toUpperCase()}
                </span>
                <span>
                  <strong>{c.name}</strong>
                  <small>{c.countryName}</small>
                </span>
                {c.id === channel.id && <i />}
              </button>
            ))}
          </aside>
        </div>
      </motion.div>
    </motion.div>
  );
}
