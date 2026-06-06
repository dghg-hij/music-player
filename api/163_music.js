export default async function handler(req, res) {
  const { type, s, id, limit, level, playlist_id } = req.query;

  let url = "https://api.bugpk.com/api/163_music?";
  const params = [];

  if (type) params.push("type=" + type);
  if (s) params.push("s=" + encodeURIComponent(s));
  // 支持 id 和 playlist_id 两种参数名
  if (id) params.push("id=" + id);
  else if (playlist_id) params.push("id=" + playlist_id);
  if (limit) params.push("limit=" + limit);
  if (level) params.push("level=" + level);

  url += params.join("&");

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    const data = await response.json();
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate");
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ code: 500, msg: "proxy request failed" });
  }
}
