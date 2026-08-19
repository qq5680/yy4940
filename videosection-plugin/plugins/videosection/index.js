// AngelLive VideoSection 插件 v1.0.0
// VideoSection = Stripchat 白牌站，使用站内 API + doppiocdn 流

(function () {
  var UA =
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
  var SITE = "https://zh.videosection.live";
  var API = SITE + "/api/front/v2";
  var PAGE_SIZE = 40;
  var PLATFORM_ID = "videosection";

  var MEDIA_SUFFIXES = [
    { suf: "", label: "原画", qn: 10000 },
    { suf: "_source", label: "原画源", qn: 9999 },
    { suf: "_1080p", label: "1080p", qn: 1080 },
    { suf: "_960p", label: "960p", qn: 960 },
    { suf: "_720p", label: "720p", qn: 720 },
    { suf: "_480p", label: "480p", qn: 480 },
    { suf: "_240p", label: "240p", qn: 240 }
  ];

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
      Referer: SITE + "/",
      Accept: "application/json, text/plain, */*",
      "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8"
    };
    var cookie = getCookie();
    if (cookie) h["Cookie"] = cookie;
    return h;
  }

  function hlsHeaders() {
    var h = {
      "User-Agent": UA,
      Referer: SITE + "/",
      Accept: "*/*"
    };
    var cookie = getCookie();
    if (cookie) h["Cookie"] = cookie;
    return h;
  }

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

  function absUrl(path) {
    if (!path) return "";
    if (String(path).indexOf("http") === 0) return path;
    return "https://img.doppiocdn.net" + (path.charAt(0) === "/" ? path : "/" + path);
  }

  function mapModel(m) {
    if (!m) return null;
    var username = String(m.username || "");
    var id = String(m.id || m.streamName || "");
    if (!username || !id) return null;
    if (m.isLive === false && m.isOnline === false) return null;

    var poster =
      absUrl(m.snapshotUrl) ||
      absUrl(m.previewUrlThumbBig) ||
      absUrl(m.previewUrlThumbSmall) ||
      absUrl(m.avatarUrl) ||
      "";
    // prefer live snapshot
    if (m.id && m.snapshotTimestamp) {
      poster = "https://img.doppiocdn.net/snapshot/" + m.id + "/" + m.snapshotTimestamp;
    } else if (m.id) {
      poster = "https://img.doppiocdn.net/thumbs/" + Math.floor(Date.now() / 1000) + "/" + m.id;
    }

    var viewers = m.viewersCount || 0;
    var status = String(m.status || "").toLowerCase();
    var liveState = status === "public" || m.isLive ? "live" : "unknow";

    return {
      userName: username,
      roomTitle: username + (viewers ? " (" + viewers + "人)" : ""),
      roomCover: poster,
      userHeadImg: absUrl(m.avatarUrl) || poster,
      liveState: liveState,
      userId: id,
      roomId: id,
      liveWatchedCount: String(viewers)
    };
  }

  async function fetchModels(primaryTag, page) {
    page = page || 1;
    // VideoSection API uses limit; offset style varies — use page via limit*page as top window
    var limit = PAGE_SIZE;
    var url =
      API +
      "/models?primaryTag=" +
      encodeURIComponent(primaryTag || "girls") +
      "&limit=" +
      limit +
      "&topLimit=" +
      limit +
      "&favoritesLimit=0&msBlock=true&byw=false&flags=0&uniq=" +
      Math.random().toString(36).slice(2);
    // simple pagination: for page>1 request larger topLimit and slice
    if (page > 1) {
      url =
        API +
        "/models?primaryTag=" +
        encodeURIComponent(primaryTag || "girls") +
        "&limit=" +
        limit +
        "&topLimit=" +
        page * limit +
        "&favoritesLimit=0&msBlock=true&byw=false&flags=0&uniq=" +
        Math.random().toString(36).slice(2);
    }
    var data = await httpGetJSON(url);
    if (!data) return [];
    var out = [];
    var seen = {};
    var blocks = data.blocks || [];
    for (var i = 0; i < blocks.length; i++) {
      var models = blocks[i].models || [];
      for (var j = 0; j < models.length; j++) {
        var mid = String(models[j].id || "");
        if (!mid || seen[mid]) continue;
        seen[mid] = true;
        out.push(models[j]);
      }
    }
    if (page > 1) {
      var start = (page - 1) * limit;
      out = out.slice(start, start + limit);
    }
    return out;
  }

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
          { id: "girls/young", parentId: "girls_root", title: "鲜嫩青年", icon: "" },
          { id: "girls/milfs", parentId: "girls_root", title: "熟女", icon: "" },
          { id: "girls/mature", parentId: "girls_root", title: "成熟", icon: "" },
          { id: "girls/new", parentId: "girls_root", title: "最新主播", icon: "" },
          { id: "girls/american", parentId: "girls_root", title: "美国女孩", icon: "" },
          { id: "girls/russian", parentId: "girls_root", title: "俄罗斯女孩", icon: "" },
          { id: "girls/ukrainian", parentId: "girls_root", title: "乌克兰女孩", icon: "" },
          { id: "girls/colombian", parentId: "girls_root", title: "哥伦比亚女孩", icon: "" },
          { id: "girls/brazilian", parentId: "girls_root", title: "巴西女孩", icon: "" },
          { id: "girls/mobile", parentId: "girls_root", title: "手机直播", icon: "" },
          { id: "girls/vr", parentId: "girls_root", title: "VR", icon: "" }
        ]
      },
      {
        id: "couples_root",
        title: "💑 情侣",
        icon: "",
        subList: [
          { id: "couples", parentId: "couples_root", title: "全部情侣", icon: "" },
          { id: "couples/chinese", parentId: "couples_root", title: "中国情侣", icon: "" },
          { id: "couples/popular", parentId: "couples_root", title: "热门情侣", icon: "" }
        ]
      },
      {
        id: "men_root",
        title: "👨 男主播",
        icon: "",
        subList: [
          { id: "men", parentId: "men_root", title: "全部男主播", icon: "" },
          { id: "men/popular", parentId: "men_root", title: "热门", icon: "" },
          { id: "men/gays", parentId: "men_root", title: "男同", icon: "" }
        ]
      }
    ];
  }

  async function getRooms(payload) {
    var id = String(payload.id || "girls");
    var page = payload.page || 1;
    if (id === "girls_root") id = "girls";
    if (id === "couples_root") id = "couples";
    if (id === "men_root") id = "men";

    var models = await fetchModels(id, page);
    var rooms = [];
    for (var i = 0; i < models.length; i++) {
      var r = mapModel(models[i]);
      if (r) rooms.push(r);
    }
    return rooms;
  }

  async function search(payload) {
    var keyword = String(payload.keyword || "").trim();
    if (!keyword) return [];
    var page = payload.page || 1;
    var url =
      API +
      "/models/search?query=" +
      encodeURIComponent(keyword) +
      "&limit=" +
      PAGE_SIZE +
      "&offset=" +
      (page - 1) * PAGE_SIZE +
      "&uniq=" +
      Math.random().toString(36).slice(2);
    var data = await httpGetJSON(url);
    var models = [];
    if (data) {
      if (Array.isArray(data.models)) models = data.models;
      else if (data.blocks) {
        for (var i = 0; i < data.blocks.length; i++) {
          models = models.concat(data.blocks[i].models || []);
        }
      }
    }
    // fallback: filter from girls list
    if (!models.length) {
      var all = await fetchModels("girls", 1);
      var kw = keyword.toLowerCase();
      for (var j = 0; j < all.length; j++) {
        if (String(all[j].username || "").toLowerCase().indexOf(kw) !== -1) models.push(all[j]);
      }
    }
    var rooms = [];
    for (var k = 0; k < models.length; k++) {
      var r = mapModel(models[k]);
      if (r) rooms.push(r);
    }
    return rooms;
  }

  async function getRoomDetail(payload) {
    var roomId = String(payload.roomId || "");
    var models = await fetchModels("girls", 1);
    for (var i = 0; i < models.length; i++) {
      if (String(models[i].id) === roomId || String(models[i].streamName) === roomId) {
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

  function buildMasterUrls(roomId) {
    var id = String(roomId);
    return [
      "https://edge-hls.doppiocdn.org/hls/" + id + "/master/" + id + "_auto.m3u8",
      "https://edge-hls.doppiocdn.com/hls/" + id + "/master/" + id + "_auto.m3u8",
      "https://edge-hls.growcdnssedge.com/hls/" + id + "/master/" + id + "_auto.m3u8",
      "https://edge-hls.doppiocdn.org/hls/" + id + "/master/" + id + ".m3u8"
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

    var masters = buildMasterUrls(id);
    for (var mi = 0; mi < masters.length; mi++) {
      var text = await httpGetText(masters[mi], hlsHeaders(), 8);
      if (!text || text.indexOf("#EXTM3U") === -1) continue;
      pkey = extractPkey(text) || pkey;
      if (pkey) break;
    }

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

    if (qualities.length === 0) {
      qualities.push({
        title: "自动",
        qn: 0,
        url:
          "https://edge-hls.doppiocdn.org/hls/" +
          id +
          "/master/" +
          id +
          "_auto.m3u8?playlistType=lowLatency"
      });
    }
    return qualities;
  }

  async function getPlayback(payload) {
    var roomId = String(payload.roomId || "");
    if (!roomId) Host.raise("INVALID_ARGS", "缺少 roomId");

    var list = await resolveQualities(roomId);
    if (!list.length) Host.raise("UPSTREAM", "无法获取播放地址");

    var qualitys = [];
    for (var i = 0; i < list.length; i++) {
      var q = list[i];
      qualitys.push({
        roomId: roomId,
        title: q.title,
        qn: q.qn,
        url: q.url,
        liveCodeType: "m3u8",
        liveType: "videosection",
        userAgent: UA,
        headers: {
          Referer: SITE + "/",
          "User-Agent": UA
        },
        playbackHints: {
          streamFormat: "hlsLive",
          latencyMode: "lowLatency",
          isLive: true
        }
      });
    }

    return [
      {
        cdn: "videosection",
        displayName: "VideoSection",
        qualitys: qualitys
      }
    ];
  }

  async function resolveShare(payload) {
    var code = String(payload.shareCode || "");
    var match =
      code.match(/videosection\.(?:live|com)\/([a-zA-Z0-9_-]+)/i) ||
      code.match(/^([a-zA-Z0-9_-]+)$/);
    if (!match) Host.raise("INVALID_ARGS", "无法识别 VideoSection 房间");
    var username = match[1];
    var rooms = await search({ keyword: username, page: 1 });
    for (var i = 0; i < rooms.length; i++) {
      if (String(rooms[i].userName).toLowerCase() === username.toLowerCase()) return rooms[i];
    }
    Host.raise("UPSTREAM", "未找到该主播或已下播");
  }

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
