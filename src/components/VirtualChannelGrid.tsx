import { useEffect, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { Channel } from "../lib/catalog";
import ChannelCard from "./ChannelCard";
export default function VirtualChannelGrid({
  channels,
  onPlay,
}: {
  channels: Channel[];
  onPlay: (channel: Channel) => void;
}) {
  "use no memo"; // The virtualizer owns mutable scroll measurements.
  const parent = useRef<HTMLDivElement>(null);
  const [columns, setColumns] = useState(4);
  useEffect(() => {
    const node = parent.current;
    if (!node) return;
    const update = () =>
      setColumns(
        node.clientWidth < 640
          ? 2
          : Math.max(2, Math.floor((node.clientWidth + 20) / 260)),
      );
    const observer = new ResizeObserver(update);
    observer.observe(node);
    update();
    return () => observer.disconnect();
  }, []);
  // oxlint-disable-next-line react/incompatible-library -- This component is explicitly opted out of compiler memoization; measurements remain local.
  const virtual = useVirtualizer({
    count: Math.ceil(channels.length / columns),
    getScrollElement: () => parent.current,
    estimateSize: () => (columns === 2 ? 245 : 285),
    overscan: 3,
  });
  return (
    <div
      ref={parent}
      className="virtual-scroller"
      tabIndex={0}
      role="region"
      aria-label={`${channels.length} channels. Scroll to explore more.`}
    >
      <div
        role="list"
        className="virtual-list"
        style={{ height: virtual.getTotalSize() }}
      >
        {virtual.getVirtualItems().map((row) => (
          <div
            key={row.key}
            ref={virtual.measureElement}
            data-index={row.index}
            role="presentation"
            className="virtual-row"
            style={{
              transform: `translateY(${row.start}px)`,
              gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
            }}
          >
            {channels
              .slice(row.index * columns, (row.index + 1) * columns)
              .map((c, i) => (
                <ChannelCard
                  key={c.id}
                  channel={c}
                  onPlay={onPlay}
                  position={row.index * columns + i + 1}
                  total={channels.length}
                />
              ))}
          </div>
        ))}
      </div>
    </div>
  );
}
