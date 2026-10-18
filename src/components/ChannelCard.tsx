import { motion } from "framer-motion";
import { useState } from "react";
import type { Channel } from "../lib/catalog";
import { usePreferences } from "../lib/preferences";
import { flag } from "../lib/locale";
export default function ChannelCard({
  channel,
  onPlay,
  position,
  total,
}: {
  channel: Channel;
  onPlay: (channel: Channel) => void;
  position?: number;
  total?: number;
}) {
  const favorites = usePreferences((s) => s.favorites),
    toggleFavorite = usePreferences((s) => s.toggleFavorite);
  const [brokenLogo, setBrokenLogo] = useState(false);
  return (
    <motion.article
      role="listitem"
      aria-posinset={position}
      aria-setsize={total}
      layoutId={`channel-${channel.id}`}
      className="channel-card"
    >
      <button
        className="channel-open"
        onClick={() => onPlay(channel)}
        aria-label={`Watch ${channel.name}`}
      >
        <div className="channel-art">
          <span className="live-badge">
            <i /> LIVE
          </span>
          {channel.logo && !brokenLogo ? (
            <img
              src={channel.logo}
              alt=""
              loading="lazy"
              decoding="async"
              onError={() => setBrokenLogo(true)}
            />
          ) : (
            <span className="channel-monogram" aria-hidden="true">
              {channel.name.slice(0, 2).toUpperCase()}
            </span>
          )}
          <span className="play-overlay" aria-hidden="true">
            ▷
          </span>
        </div>
        <div className="channel-details">
          <h3>{channel.name}</h3>
          <p>
            {flag(channel.country)} {channel.countryName}
            <span> · </span>
            {channel.categoryNames[0] ?? "General"}
          </p>
        </div>
      </button>
      <button
        className="favorite-button"
        aria-label={`${favorites.includes(channel.id) ? "Remove" : "Add"} ${channel.name} ${favorites.includes(channel.id) ? "from" : "to"} favorites`}
        aria-pressed={favorites.includes(channel.id)}
        onClick={() => toggleFavorite(channel.id)}
      >
        {favorites.includes(channel.id) ? "♥" : "♡"}
      </button>
    </motion.article>
  );
}
