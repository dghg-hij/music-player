export default async function handler(req, res) {
  const { type, s, id, limit, level, playlist_id } = req.query;

  let url = "https://api.bugpk.com/api/163_music?";
  const params = [];

  if (type) params.push("type=" + type);
  if (s) params.push("s=" + encodeURIComponent(s));
  if (id) params.push("id=" + id);
  if (limit) params.push("limit=" + limit);
  if (level) params.push("level=" + level);

  // 榜单接口：使用网易云歌单详情
  if (type === "playlist" && playlist_id) {
    url = `https://api.bugpk.com/api/163_music?type=playlist&id=${playlist_id}`;
  } else {
    url += params.join("&");
  }

  try {
    const response = await fetch(url);
    const data = await response.json();
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate");
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ code: 500, msg: "proxy request failed" });
  }
}
