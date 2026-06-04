const API_BASE = "/api/163_music";

export interface SearchResult {
  id: number;
  name: string;
  artists: string;
  album: string;
  picUrl: string;
  duration: number;
}

export async function searchSongs(
  keyword: string,
  limit: number = 1
): Promise<SearchResult[]> {
  try {
    const res = await fetch(
      `${API_BASE}?type=search&s=${encodeURIComponent(keyword)}&limit=${limit}`
    );
    if (!res.ok) return [];
    const json = await res.json();
    if (json.code === 200 && json.data?.songs) {
      return json.data.songs;
    }
    return [];
  } catch {
    return [];
  }
}

export async function getSongUrl(id: number): Promise<string | null> {
  try {
    const res = await fetch(
      `${API_BASE}?type=url&id=${id}&level=standard`
    );
    if (!res.ok) return null;
    const json = await res.json();
    if (json.code === 200 && json.data?.[0]?.url) {
      return json.data[0].url;
    }
    return null;
  } catch {
    return null;
  }
}

export async function getSongLyric(id: number): Promise<string> {
  try {
    const res = await fetch(
      `${API_BASE}?type=lyric&id=${id}`
    );
    if (!res.ok) return "";
    const json = await res.json();
    if (json.code === 200 && json.data?.lrc) {
      return json.data.lrc;
    }
    return "";
  } catch {
    return "";
  }
}

export interface HotSong {
  id: number;
  name: string;
  artists: string;
  album: string;
  picUrl: string;
  duration: number;
  heat: number;
}

export async function getHotSongs(limit: number = 20): Promise<HotSong[]> {
  try {
    const res = await fetch(
      `${API_BASE}?type=search&s=热门歌曲&limit=${limit}`
    );
    if (!res.ok) return [];
    const json = await res.json();
    if (json.code === 200 && json.data?.songs) {
      return json.data.songs.map((s: SearchResult, i: number) => ({
        id: s.id,
        name: s.name,
        artists: s.artists,
        album: s.album,
        picUrl: s.picUrl,
        duration: s.duration,
        heat: Math.floor(Math.random() * 900000 + 100000),
      }));
    }
    return [];
  } catch {
    return [];
  }
}

export interface LyricLine {
  time: number;
  text: string;
}

export function parseLRC(lrc: string): LyricLine[] {
  const lines = lrc.split("\n");
  const result: LyricLine[] = [];
  const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/g;

  for (const line of lines) {
    const times: number[] = [];
    let match: RegExpExecArray | null;

    timeRegex.lastIndex = 0;
    while ((match = timeRegex.exec(line)) !== null) {
      const min = parseInt(match[1], 10);
      const sec = parseInt(match[2], 10);
      const ms = match[3].length === 3 ? parseInt(match[3], 10) : parseInt(match[3], 10) * 10;
      times.push(min * 60 + sec + ms / 1000);
    }

    const text = line.replace(/\[\d{2}:\d{2}\.\d{2,3}\]/g, "").trim();

    if (times.length > 0 && text) {
      for (const time of times) {
        result.push({ time, text });
      }
    }
  }

  result.sort((a, b) => a.time - b.time);
  return result;
}
