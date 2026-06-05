import type { Category, Ranking } from "../types";

const SONG_QUERIES: { title: string; artist: string; query: string; categoryId: string }[] = [
  { title: "奔腾", artist: "周深", query: "奔腾 周深", categoryId: "pop" },
  { title: "龙耀华夏", artist: "龙友林", query: "龙耀华夏 龙友林", categoryId: "ancient" },
  { title: "一半一半", artist: "Top Barry", query: "一半一半 Top Barry", categoryId: "pop" },
  { title: "非凡", artist: "刘德华", query: "非凡 刘德华", categoryId: "pop" },
  { title: "那天下雨了", artist: "周杰伦", query: "那天下雨了 周杰伦", categoryId: "pop" },
  { title: "我对缘分小心翼翼", artist: "林俊杰", query: "我对缘分小心翼翼 林俊杰", categoryId: "pop" },
  { title: "人间共鸣", artist: "李健", query: "人间共鸣 李健", categoryId: "folk" },
  { title: "离开我的依赖", artist: "王艳薇", query: "离开我的依赖 王艳薇", categoryId: "pop" },
  { title: "记忆点", artist: "陈卓璇", query: "记忆点 陈卓璇", categoryId: "pop" },
  { title: "我会一直顺", artist: "黄子弘凡", query: "我会一直顺 黄子弘凡", categoryId: "pop" },
  { title: "雨过后的风景", artist: "蔡诗芸", query: "雨过后的风景 蔡诗芸", categoryId: "folk" },
  { title: "嘉禾望岗", artist: "海来阿木", query: "嘉禾望岗 海来阿木", categoryId: "folk" },
  { title: "觅光", artist: "张韶涵", query: "觅光 张韶涵", categoryId: "pop" },
  { title: "半壶纱", artist: "刘珂矣", query: "半壶纱 刘珂矣", categoryId: "ancient" },
  { title: "恋人", artist: "李荣浩", query: "恋人 李荣浩", categoryId: "pop" },
  { title: "枕上书", artist: "周深", query: "枕上书 周深", categoryId: "ancient" },
  { title: "枪火", artist: "宝石Gem", query: "枪火 宝石Gem", categoryId: "hiphop" },
  { title: "colder", artist: "蔡徐坤", query: "colder 蔡徐坤", categoryId: "pop" },
  { title: "城市烟火", artist: "群星", query: "城市烟火", categoryId: "pop" },
  { title: "今生啊多相见", artist: "万仁", query: "今生啊多相见 万仁", categoryId: "folk" },
];

export const CATEGORIES: Category[] = [
  {
    id: "ancient",
    name: "古风",
    description: "墨色山水，国韵悠长",
    cover:
      "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=chinese%20ancient%20ink%20painting%20mountains%20moon%20serene&image_size=square_hd",
    accent: "#A855F7",
  },
  {
    id: "pop",
    name: "流行",
    description: "最新热门，引领潮流",
    cover:
      "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=neon%20pop%20music%20concert%20lights%20vibrant&image_size=square_hd",
    accent: "#F97316",
  },
  {
    id: "folk",
    name: "民谣",
    description: "诗与远方，民谣心声",
    cover:
      "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=acoustic%20guitar%20countryside%20warm%20sunset%20meadow&image_size=square_hd",
    accent: "#22C55E",
  },
  {
    id: "rock",
    name: "摇滚",
    description: "热血澎湃，释放激情",
    cover:
      "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=electric%20rock%20guitar%20fire%20stage%20dark&image_size=square_hd",
    accent: "#EF4444",
  },
  {
    id: "hiphop",
    name: "说唱",
    description: "押韵律动，态度表达",
    cover:
      "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=hiphop%20street%20graffiti%20urban%20night%20style&image_size=square_hd",
    accent: "#0EA5E9",
  },
  {
    id: "electronic",
    name: "电子",
    description: "电子律动，未来感声",
    cover:
      "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=electronic%20music%20synthwave%20neon%20grid%20retro%20futuristic&image_size=square_hd",
    accent: "#06B6D4",
  },
  {
    id: "rnb",
    name: "R&B",
    description: "灵魂律动，慵懒午后",
    cover:
      "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=rnb%20soul%20music%20vintage%20microphone%20warm%20jazz%20lounge&image_size=square_hd",
    accent: "#EC4899",
  },
  {
    id: "classical",
    name: "古典",
    description: "传世经典，纯净之声",
    cover:
      "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=classical%20piano%20concert%20hall%20elegant%20golden%20lights&image_size=square_hd",
    accent: "#F59E0B",
  },
];

export const RANKINGS: Ranking[] = [
  {
    id: "hot",
    name: "24h 热度榜",
    description: "过去24小时最热门的歌曲",
    cover:
      "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=fire%20flame%20chart%20number%20one%20winner%20orange%20dark&image_size=square_hd",
    accent: "#F97316",
    query: "热门",
  },
  {
    id: "new",
    name: "新歌榜",
    description: "最新发布的热门单曲",
    cover:
      "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=new%20music%20release%20bright%20fresh%20sky%20blue&image_size=square_hd",
    accent: "#0EA5E9",
    query: "新歌",
  },
  {
    id: "original",
    name: "原创榜",
    description: "独立音乐人原创佳作",
    cover:
      "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=original%20music%20artist%20studio%20creative%20purple%20violet&image_size=square_hd",
    accent: "#A855F7",
    query: "原创",
  },
  {
    id: "飙升",
    name: "飙升榜",
    description: "上升势头最猛的歌曲",
    cover:
      "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=rocket%20launch%20sky%20trend%20rising%20green%20momentum&image_size=square_hd",
    accent: "#22C55E",
    query: "飙升",
  },
  {
    id: "classic",
    name: "经典榜",
    description: "历久弥新的传世金曲",
    cover:
      "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=classic%20golden%20vinyl%20record%20retro%20elegant%20amber&image_size=square_hd",
    accent: "#F59E0B",
    query: "经典",
  },
  {
    id: "ancient",
    name: "古风榜",
    description: "国风古韵，仙侠之声",
    cover:
      "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=chinese%20ancient%20style%20music%20ink%20moon%20zither%20serene&image_size=square_hd",
    accent: "#A855F7",
    query: "古风",
  },
];

export default SONG_QUERIES;

export const CATEGORY_KEYWORDS: Record<string, string[]> = {
  ancient: ["古风", "国风", "戏腔", "周深", "刘珂矣", "半壶纱", "枕上书", "龙耀华夏"],
  pop: ["流行", "周深", "周杰伦", "林俊杰", "李荣浩", "张韶涵"],
  folk: ["民谣", "李健", "海来阿木", "蔡诗芸", "万仁"],
  rock: ["摇滚", "汪峰", "崔健", "痛仰"],
  hiphop: ["说唱", "宝石Gem", "GAI", "法老"],
  electronic: ["电子", "Alan Walker", "Marshmello"],
  rnb: ["R&B", "陶喆", "方大同", "袁娅维"],
  classical: ["古典", "钢琴", "交响", "久石让"],
};
