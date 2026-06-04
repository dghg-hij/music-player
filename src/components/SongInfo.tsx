import { useState, useEffect, useRef } from "react";
import type { Song } from "../types";
import usePlayerStore from "../store/playerStore";
import { getThemeColors } from "./ThemePicker";

interface SongInfoProps {
  song: Song;
}

const BG_IMAGES = [
  "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=music%20concert%20stage%20lights%20abstract%20colorful&image_size=square_hd",
  "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=vinyl%20record%20player%20retro%20aesthetic%20warm&image_size=square_hd",
  "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=piano%20keys%20close%20up%20dramatic%20lighting&image_size=square_hd",
  "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=headphones%20on%20desk%20neon%20glow%20dark&image_size=square_hd",
  "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=music%20notes%20floating%20abstract%20purple%20blue&image_size=square_hd",
  "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=guitar%20acoustic%20warm%20sunset%20bokeh&image_size=square_hd",
];

export default function SongInfo({ song }: SongInfoProps) {
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const theme = usePlayerStore((s) => s.theme);
  const [currentBgIdx, setCurrentBgIdx] = useState(0);
  const [fadeIn, setFadeIn] = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isPlaying) {
      setFadeIn(true);

      timerRef.current = setInterval(() => {
        setFadeIn(false);
        setTimeout(() => {
          setCurrentBgIdx((prev) => (prev + 1) % BG_IMAGES.length);
          setFadeIn(true);
        }, 400);
      }, 10000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isPlaying]);

  const { primary, secondary } = getThemeColors(theme);
  const bgImage = BG_IMAGES[currentBgIdx];

  return (
    <div className="flex flex-col items-center gap-4">
      <div
        className="relative w-48 h-48 md:w-56 md:h-56 rounded-2xl overflow-hidden animate-fade-in"
        key={song.id}
        style={{
          boxShadow: `0 0 40px ${primary}50, 0 0 80px ${secondary}30`,
        }}
      >
        <div
          className="absolute inset-0 rounded-2xl"
          style={{
            padding: "2px",
            background: `linear-gradient(135deg, ${primary}, ${secondary})`,
            WebkitMask:
              "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
            WebkitMaskComposite: "xor",
            maskComposite: "exclude",
          }}
        />
        {isPlaying ? (
          <div className="w-full h-full relative">
            <img
              src={bgImage}
              alt={song.title}
              className={`w-full h-full object-cover rounded-2xl transition-opacity duration-500 ${
                fadeIn ? "opacity-100" : "opacity-0"
              }`}
              style={{ position: "absolute", inset: 0 }}
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = "none";
                if (target.parentElement) {
                  target.parentElement.style.background = `linear-gradient(135deg, ${primary}, ${secondary})`;
                }
              }}
            />
          </div>
        ) : song.cover ? (
          <img
            src={song.cover}
            alt={song.title}
            className="w-full h-full object-cover rounded-2xl"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = "none";
              if (target.parentElement) {
                target.parentElement.style.background = `linear-gradient(135deg, ${primary}, ${secondary})`;
              }
            }}
          />
        ) : (
          <div
            className="w-full h-full rounded-2xl flex items-center justify-center"
            style={{
              background: `linear-gradient(135deg, ${primary}, ${secondary})`,
            }}
          >
            <span className="text-4xl opacity-50">♪</span>
          </div>
        )}
      </div>
      <div className="text-center">
        <h2 className="font-outfit font-semibold text-xl md:text-2xl text-white leading-tight">
          {song.title}
        </h2>
        <p className="font-dm text-sm text-white/60 mt-1">{song.artist}</p>
      </div>
    </div>
  );
}
