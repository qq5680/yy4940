// AngelLive Stripchat 插件 v1.1.0
// 多分类（女生/情侣/男主播）+ 登录Cookie + 多画质 + 广告过滤
// API: go.mavrtracktor.com

(function () {
  var UA =
    "Mozilla/5.0 (Linux; Android 15; 2407FRK8EC Build/AP3A.240617.008; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/128.0.6613.127 Mobile Safari/537.36";
  var API_BASE = "https://go.mavrtracktor.com";
  var PAGE_SIZE = 50;
  var PLATFORM_ID = "stripchat";

  var MEDIA_SUFFIXES = [
    { suf: "", label: "原画", qn: 10000 },
    { suf: "_source", label: "原画源", qn: 9999 },
    { suf: "_orig", label: "原始", qn: 9998 },
    { suf: "_1600p", label: "1600p", qn: 1600 },
    { suf: "_1080p", label: "1080p", qn: 1080 },
    { suf: "_720p", label: "720p", qn: 720 },
    { suf: "_480p", label: "480p", qn: 480 },
    { suf: "_360p", label: "360p", qn: 360 },
    { suf: "_240p", label: "240p", qn: 240 }
  ];

  // ───────────────────────── Cookie / Headers ─────────────────────────

  function getCookie() {
    try {
      if (Host.session && typeof Host.session.getCookieHeader === "function") {
        var c = Host.session.getCookieHeader(PLATFORM_ID);
        if (c && String(c).trim()) return String(c).trim();
      }
    } catch (e) {}
    return "";
  }

  function apiHeaders() {
    var h = {
      "User-Agent": UA,
      Referer: "https://zh.stripchat.global/",
      Accept: "application/json, text/plain, */*",
      "Accept-Language": "zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7"
    };
    var cookie = getCookie();
    if (cookie) h["Cookie"] = cookie;
    return h;
  }

  function hlsHeaders() {
    var h = {
      "User-Agent": UA,
      Referer: "https://stripchat.com/",
      Accept: "*/*",
      "Accept-Language": "en,zh-CN;q=0.9,zh;q=0.8"
    };
    var cookie = getCookie();
    if (cookie) h["Cookie"] = cookie;
    return h;
  }

  // ───────────────────────── HTTP ─────────────────────────

  async function httpGetText(url, headers, timeout) {
    timeout = timeout || 15;
    var resp = await Host.http.request({
      url: url,
      method: "GET",
      headers: headers || apiHeaders(),
      timeout: timeout
    });
    if (resp.status < 200 || resp.status >= 300) return null;
    return resp.bodyText || "";
  }

  async function httpGetJSON(url, headers) {
    var text = await httpGetText(url, headers || apiHeaders(), 20);
    if (!text) return null;
    try {
      return JSON.parse(text);
    } catch (e) {
      return null;
    }
  }

  // ───────────────────────── 模型列表 ─────────────────────────

  async function fetchModels(tag, page, search) {
    page = page || 1;
    var offset = (page - 1) * PAGE_SIZE;
    var url =
      API_BASE +
      "/api/models?tag=" +
      encodeURIComponent(tag) +
      "&forceClient=1&stripcashR=0&limit=" +
      PAGE_SIZE +
      "&usePreroll&webp=1&type=popular&timezone=Asia/Shanghai&offset=" +
      offset;
    if (search) url += "&search=" + encodeURIComponent(search);
    var data = await httpGetJSON(url);
    if (!data) return [];
    return data.models || [];
  }

  function mapModel(model) {
    if (!model) return null;
    var username = String(model.username || "");
    var id = String(model.id || "");
    if (!username || !id) return null;

    var poster = model.snapshotUrl || model.previewUrlThumbBig || model.avatarUrl || "";
    var viewers = model.viewersCount || 0;
    var status = (model.status || "").toLowerCase();
    var liveState = status === "public" || !status ? "live" : "unknow";

    return {
      userName: username,
      roomTitle: username + (viewers ? " (" + viewers + "人)" : ""),
      roomCover: poster,
      userHeadImg: model.avatarUrl || poster,
      liveState: liveState,
      userId: id,
      roomId: id,
      liveWatchedCount: String(viewers)
    };
  }

  // ───────────────────────── 分类（更多） ─────────────────────────

  async function getCategories() {
    return [
      {
        id: "girls_root",
        title: "👩 女生",
        icon: "",
        subList: [
          { id: "girls", parentId: "girls_root", title: "全部女生", icon: "" },
          { id: "girls/chinese", parentId: "girls_root", title: "中国女孩", icon: "" },
          { id: "girls/japanese", parentId: "girls_root", title: "日本女孩", icon: "" },
          { id: "girls/korean", parentId: "girls_root", title: "韩国女孩", icon: "" },
          { id: "girls/asian", parentId: "girls_root", title: "亚洲人", icon: "" },
          { id: "girls/teens", parentId: "girls_root", title: "少女18+", icon: "" },
          { id: "girls/young", parentId: "girls_root", title: "鲜嫩青年22+", icon: "" },
          { id: "girls/milfs", parentId: "girls_root", title: "熟女", icon: "" },
          { id: "girls/mature", parentId: "girls_root", title: "成熟", icon: "" },
          { id: "girls/new", parentId: "girls_root", title: "最新女主播", icon: "" },
          { id: "girls/white", parentId: "girls_root", title: "白人", icon: "" },
          { id: "girls/latin", parentId: "girls_root", title: "拉丁人", icon: "" },
          { id: "girls/ebony", parentId: "girls_root", title: "黑珍珠", icon: "" },
          { id: "girls/russian", parentId: "girls_root", title: "俄罗斯女孩", icon: "" },
          { id: "girls/ukrainian", parentId: "girls_root", title: "乌克兰女孩", icon: "" },
          { id: "girls/colombian", parentId: "girls_root", title: "哥伦比亚女孩", icon: "" },
          { id: "girls/brazilian", parentId: "girls_root", title: "巴西女孩", icon: "" },
          { id: "girls/american", parentId: "girls_root", title: "美国女孩", icon: "" },
          { id: "girls/german", parentId: "girls_root", title: "德国女孩", icon: "" },
          { id: "girls/french", parentId: "girls_root", title: "法国女孩", icon: "" },
          { id: "girls/uk-models", parentId: "girls_root", title: "英国女孩", icon: "" },
          { id: "girls/indian", parentId: "girls_root", title: "印度女孩", icon: "" },
          { id: "girls/arab", parentId: "girls_root", title: "阿拉伯女孩", icon: "" }
        ]
      },
      {
        id: "couples_root",
        title: "💑 情侣",
        icon: "",
        subList: [
          { id: "couples/popular", parentId: "couples_root", title: "热门情侣", icon: "" },
          { id: "couples/chinese", parentId: "couples_root", title: "中国情侣", icon: "" },
          { id: "couples/new", parentId: "couples_root", title: "最新情侣", icon: "" },
          { id: "couples", parentId: "couples_root", title: "全部情侣", icon: "" }
        ]
      },
      {
        id: "men_root",
        title: "👨 男主播",
        icon: "",
        subList: [
          { id: "men/popular", parentId: "men_root", title: "最受欢迎", icon: "" },
          { id: "men/gay-couples", parentId: "men_root", title: "男同伴侣", icon: "" },
          { id: "men/gays", parentId: "men_root", title: "男同聊天", icon: "" },
          { id: "men/straight", parentId: "men_root", title: "直男", icon: "" },
          { id: "men", parentId: "men_root", title: "全部男主播", icon: "" }
        ]
      }
    ];
  }

  // ───────────────────────── 房间列表 ─────────────────────────

  async function getRooms(payload) {
    var id = String(payload.id || "girls");
    var page = payload.page || 1;
    if (id === "girls_root") id = "girls";
    if (id === "couples_root") id = "couples/popular";
    if (id === "men_root") id = "men/popular";

    var models = await fetchModels(id, page);
    var rooms = [];
    for (var i = 0; i < models.length; i++) {
      var r = mapModel(models[i]);
      if (r) rooms.push(r);
    }
    return rooms;
  }

  // ───────────────────────── 搜索 ─────────────────────────

  async function search(payload) {
    var keyword = String(payload.keyword || "").trim();
    if (!keyword) return [];
    var page = payload.page || 1;
    var models = await fetchModels("girls", page, keyword);
    var rooms = [];
    for (var i = 0; i < models.length; i++) {
      var r = mapModel(models[i]);
      if (r) rooms.push(r);
    }
    return rooms;
  }

  // ───────────────────────── 房间详情 / 状态 ─────────────────────────

  async function getRoomDetail(payload) {
    var roomId = String(payload.roomId || "");
    var models = await fetchModels("girls", 1);
    for (var i = 0; i < models.length; i++) {
      if (String(models[i].id) === roomId) {
        var mapped = mapModel(models[i]);
        if (mapped) return mapped;
      }
    }
    return {
      userName: roomId,
      roomTitle: "房间 " + roomId,
      roomCover: "",
      userHeadImg: "",
      liveState: "live",
      userId: roomId,
      roomId: roomId
    };
  }

  async function getLiveState(payload) {
    return { liveState: "live" };
  }

  // ───────────────────────── 播放地址（多画质 + 广告过滤） ─────────────────────────

  function buildMasterUrls(roomId) {
    var id = String(roomId);
    return [
      "https://edge-hls.doppiocdn.org/hls/" + id + "/master/" + id + "_auto.m3u8",
      "https://edge-hls.doppiocdn.com/hls/" + id + "/master/" + id + "_auto.m3u8",
      "https://edge-hls.growcdnssedge.com/hls/" + id + "/master/" + id + "_auto.m3u8",
      "https://edge-hls.doppiocdn.org/hls/" + id + "/master/" + id + ".m3u8",
      "https://edge-hls.doppiocdn.com/hls/" + id + "/master/" + id + ".m3u8"
    ];
  }

  function extractPkey(m3u8Text) {
    var needle = "#EXT-X-MOUFLON:PSCH:v2:";
    var idx = m3u8Text.indexOf(needle);
    if (idx === -1) return "";
    var lineEnd = m3u8Text.indexOf("\n", idx);
    var line = m3u8Text.substring(idx, lineEnd === -1 ? m3u8Text.length : lineEnd).trim();
    var parts = line.split(":");
    if (parts.length >= 4) return parts[parts.length - 1];
    return "";
  }

  function isAdPlaylist(text) {
    if (!text) return true;
    var t = text.toLowerCase();
    if (t.indexOf("#ext-x-mouflon-advert") !== -1) return true;
    if (t.indexOf("cpa/v2/") !== -1) return true;
    if (t.indexOf("#ext-x-playlist-type:vod") !== -1) return true;
    if (t.indexOf("#extinf") === -1) return true;
    return false;
  }

  async function isLiveMedia(url, pkey) {
    var probe = url;
    if (pkey && probe.indexOf("pkey=") === -1) {
      probe += (probe.indexOf("?") !== -1 ? "&" : "?") + "playlistType=lowLatency&psch=v2&pkey=" + pkey;
    } else if (probe.indexOf("playlistType") === -1) {
      probe += (probe.indexOf("?") !== -1 ? "&" : "?") + "playlistType=lowLatency";
    }
    var text = await httpGetText(probe, hlsHeaders(), 8);
    if (!text || isAdPlaylist(text)) return false;
    return true;
  }

  function appendParams(url, pkey) {
    var finalUrl = url;
    if (pkey && finalUrl.indexOf("pkey=") === -1) {
      finalUrl += (finalUrl.indexOf("?") !== -1 ? "&" : "?") + "playlistType=lowLatency&psch=v2&pkey=" + pkey;
    } else if (finalUrl.indexOf("playlistType") === -1) {
      finalUrl += (finalUrl.indexOf("?") !== -1 ? "&" : "?") + "playlistType=lowLatency";
    }
    return finalUrl;
  }

  async function resolveQualities(roomId) {
    var id = String(roomId);
    var pkey = "";
    var qualities = [];
    var seen = {};

    // 探测 master 拿 pkey
    var masters = buildMasterUrls(id);
    for (var mi = 0; mi < masters.length; mi++) {
      var text = await httpGetText(masters[mi], hlsHeaders(), 8);
      if (!text || text.indexOf("#EXTM3U") === -1) continue;
      pkey = extractPkey(text) || pkey;
      if (pkey) break;
    }

    // 按画质从高到低探测 media 地址
    var baseGrow = "https://media-hls.growcdnssedge.com/b-hls-10/" + id + "/" + id;
    for (var i = 0; i < MEDIA_SUFFIXES.length; i++) {
      var item = MEDIA_SUFFIXES[i];
      var cand = baseGrow + item.suf + ".m3u8";
      if (seen[cand]) continue;
      if (await isLiveMedia(cand, pkey)) {
        seen[cand] = true;
        qualities.push({
          title: item.label,
          qn: item.qn,
          url: appendParams(cand, pkey)
        });
      }
    }

    // 如果一个都没找到，兜底 auto
    if (qualities.length === 0) {
      qualities.push({
        title: "自动",
        qn: 0,
        url: "https://edge-hls.doppiocdn.org/hls/" + id + "/master/" + id + "_auto.m3u8?playlistType=lowLatency"
      });
    }

    return { qualities: qualities, pkey: pkey };
  }

  async function getPlayback(payload) {
    var roomId = String(payload.roomId || "");
    if (!roomId) {
      Host.raise("INVALID_ARGS", "缺少 roomId");
    }

    var result = await resolveQualities(roomId);
    var list = result.qualities || [];
    if (!list.length) {
      Host.raise("UPSTREAM", "无法获取播放地址");
    }

    var qualitys = [];
    for (var i = 0; i < list.length; i++) {
      var q = list[i];
      qualitys.push({
        roomId: roomId,
        title: q.title,
        qn: q.qn,
        url: q.url,
        liveCodeType: "hls",
        liveType: "stripchat",
        userAgent: UA,
        headers: {
          Referer: "https://stripchat.com/",
          "User-Agent": UA
        },
        playbackHints: {
          streamFormat: "hls",
          latencyMode: "low",
          isLive: true
        }
      });
    }

    return [
      {
        cdn: "stripchat",
        displayName: "Stripchat",
        qualitys: qualitys
      }
    ];
  }

  // ───────────────────────── 分享解析 ─────────────────────────

  async function resolveShare(payload) {
    var code = String(payload.shareCode || "");
    var match =
      code.match(/stripchat\.com\/([a-zA-Z0-9_-]+)/i) ||
      code.match(/stripchat\.global\/([a-zA-Z0-9_-]+)/i) ||
      code.match(/^([a-zA-Z0-9_-]+)$/);
    if (!match) {
      Host.raise("INVALID_ARGS", "无法识别 Stripchat 房间");
    }
    var username = match[1];
    var models = await fetchModels("girls", 1, username);
    for (var i = 0; i < models.length; i++) {
      if (String(models[i].username).toLowerCase() === username.toLowerCase()) {
        var mapped = mapModel(models[i]);
        if (mapped) return mapped;
      }
    }
    Host.raise("UPSTREAM", "未找到该主播或已下播");
  }

  // ───────────────────────── 导出 ─────────────────────────

  globalThis.LiveParsePlugin = {
    apiVersion: 1,
    getCategories: getCategories,
    getRooms: getRooms,
    search: search,
    getRoomDetail: getRoomDetail,
    getLiveState: getLiveState,
    getPlayback: getPlayback,
    resolveShare: resolveShare
  };
})();
