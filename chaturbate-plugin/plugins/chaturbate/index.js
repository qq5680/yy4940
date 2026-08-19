// AngelLive Chaturbate 插件 v1.0.0
// 公开房列表 + HLS 播放（不绕过私人房）

(function () {
  var UA =
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
  var SITE = "https://chaturbate.com";
  var PAGE_SIZE = 60;
  var PLATFORM_ID = "chaturbate";

  function getCookie() {
    try {
      if (Host.session && typeof Host.session.getCookieHeader === "function") {
        var c = Host.session.getCookieHeader(PLATFORM_ID);
        if (c && String(c).trim()) return String(c).trim();
      }
    } catch (e) {}
    return "";
  }

  function baseHeaders() {
    var h = {
      "User-Agent": UA,
      Referer: SITE + "/",
      Accept: "application/json, text/plain, */*",
      "Accept-Language": "en-US,en;q=0.9,zh-CN;q=0.8"
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
      headers: headers || baseHeaders(),
      timeout: timeout
    });
    if (resp.status < 200 || resp.status >= 300) return null;
    return resp.bodyText || "";
  }

  async function httpPostText(url, body, headers, timeout) {
    timeout = timeout || 15;
    var h = headers || baseHeaders();
    h["Content-Type"] = "application/x-www-form-urlencoded";
    h["X-Requested-With"] = "XMLHttpRequest";
    var resp = await Host.http.request({
      url: url,
      method: "POST",
      headers: h,
      body: body,
      timeout: timeout
    });
    if (resp.status < 200 || resp.status >= 300) return null;
    return resp.bodyText || "";
  }

  async function httpGetJSON(url, headers) {
    var text = await httpGetText(url, headers || baseHeaders(), 20);
    if (!text) return null;
    try {
      return JSON.parse(text);
    } catch (e) {
      return null;
    }
  }

  function roomAccessLabel(r) {
    var show = String(r.current_show || r.label || "").toLowerCase();
    if (r.has_password) return "🔑密码";
    if (show === "private" || show === "hidden") return "🔒私人";
    if (show === "group" || show === "ticket") return "🎫门票";
    if (show === "away") return "💤离开";
    if (show === "offline") return "⚫离线";
    if (show === "public" || !show) return "🆓免费";
    return "❓" + show;
  }

  function isPaidOrLocked(r) {
    var show = String(r.current_show || r.label || "").toLowerCase();
    if (r.has_password) return true;
    if (show === "private" || show === "hidden" || show === "group" || show === "ticket") return true;
    return false;
  }

  function isPlayablePublic(r) {
    var show = String(r.current_show || r.label || "").toLowerCase();
    return show === "public" && !r.has_password;
  }

  function mapRoom(r) {
    if (!r) return null;
    var username = String(r.username || "").trim();
    if (!username) return null;

    var viewers = r.num_users || 0;
    var access = roomAccessLabel(r);
    var liveState = isPlayablePublic(r) ? "live" : "unknow";
    var show = String(r.current_show || "").toLowerCase();
    if (show === "offline" || show === "away") liveState = "close";

    var cover =
      r.img ||
      "https://roomimg.stream.highwebmedia.com/ri/" + username + ".jpg";

    var subject = String(r.room_subject || r.subject || "").trim();
    var title = access + " " + username + (viewers ? " (" + viewers + "人)" : "");
    if (subject) {
      var short = subject.length > 40 ? subject.substring(0, 40) + "…" : subject;
      title = access + " " + username + " · " + short;
    }

    return {
      userName: username,
      roomTitle: title,
      roomCover: cover,
      userHeadImg: cover,
      liveState: liveState,
      userId: username,
      roomId: username,
      liveWatchedCount: String(viewers)
    };
  }

  // genders: f / m / c / t
  async function fetchRoomList(genders, page, keywords) {
    page = page || 1;
    var offset = (page - 1) * PAGE_SIZE;
    var url =
      SITE +
      "/api/ts/roomlist/room-list/?limit=" +
      PAGE_SIZE +
      "&offset=" +
      offset;
    if (genders) url += "&genders=" + encodeURIComponent(genders);
    if (keywords) url += "&keywords=" + encodeURIComponent(keywords);

    var data = await httpGetJSON(url);
    if (!data) return [];
    return data.rooms || [];
  }

  async function getCategories() {
    return [
      {
        id: "f_root",
        title: "👩 女生",
        icon: "",
        subList: [
          { id: "f", parentId: "f_root", title: "全部女生", icon: "" },
          { id: "f#free", parentId: "f_root", title: "🆓仅免费公开", icon: "" },
          { id: "f#paid", parentId: "f_root", title: "🔒仅私人/门票", icon: "" }
        ]
      },
      {
        id: "c_root",
        title: "💑 情侣",
        icon: "",
        subList: [
          { id: "c", parentId: "c_root", title: "全部情侣", icon: "" },
          { id: "c#free", parentId: "c_root", title: "🆓仅免费公开", icon: "" }
        ]
      },
      {
        id: "m_root",
        title: "👨 男主播",
        icon: "",
        subList: [
          { id: "m", parentId: "m_root", title: "全部男主播", icon: "" },
          { id: "m#free", parentId: "m_root", title: "🆓仅免费公开", icon: "" }
        ]
      },
      {
        id: "t_root",
        title: "⚧ 跨性别",
        icon: "",
        subList: [
          { id: "t", parentId: "t_root", title: "全部", icon: "" },
          { id: "t#free", parentId: "t_root", title: "🆓仅免费公开", icon: "" }
        ]
      }
    ];
  }

  async function getRooms(payload) {
    var id = String(payload.id || "f");
    var page = payload.page || 1;
    if (id === "f_root") id = "f";
    if (id === "c_root") id = "c";
    if (id === "m_root") id = "m";
    if (id === "t_root") id = "t";

    var filterMode = "";
    var hashIdx = id.indexOf("#");
    if (hashIdx !== -1) {
      filterMode = id.substring(hashIdx + 1);
      id = id.substring(0, hashIdx) || "f";
    }

    var gender = id; // f/m/c/t
    var roomsRaw = await fetchRoomList(gender, page, "");
    var rooms = [];
    for (var i = 0; i < roomsRaw.length; i++) {
      var r = roomsRaw[i];
      if (filterMode === "free" && isPaidOrLocked(r)) continue;
      if (filterMode === "paid" && !isPaidOrLocked(r)) continue;
      var mapped = mapRoom(r);
      if (mapped) rooms.push(mapped);
    }
    return rooms;
  }

  async function search(payload) {
    var keyword = String(payload.keyword || "").trim();
    if (!keyword) return [];
    var page = payload.page || 1;
    // keywords 搜索不限性别
    var roomsRaw = await fetchRoomList("", page, keyword);
    if (!roomsRaw.length) {
      // 兜底：从女生列表里本地过滤用户名
      roomsRaw = await fetchRoomList("f", 1, "");
      var kw = keyword.toLowerCase();
      roomsRaw = roomsRaw.filter(function (r) {
        return String(r.username || "").toLowerCase().indexOf(kw) !== -1;
      });
    }
    var rooms = [];
    for (var i = 0; i < roomsRaw.length; i++) {
      var mapped = mapRoom(roomsRaw[i]);
      if (mapped) rooms.push(mapped);
    }
    return rooms;
  }

  async function getRoomDetail(payload) {
    var roomId = String(payload.roomId || payload.userId || "").trim();
    if (!roomId) return null;
    var cover = "https://roomimg.stream.highwebmedia.com/ri/" + roomId + ".jpg";
    var status = await getStreamInfo(roomId);
    var liveState = "unknow";
    var access = "❓";
    if (status) {
      var rs = String(status.room_status || "").toLowerCase();
      if (rs === "public" && status.url) {
        liveState = "live";
        access = "🆓免费";
      } else if (rs === "private" || rs === "hidden") {
        access = "🔒私人";
        liveState = "unknow";
      } else if (rs === "away" || rs === "offline") {
        access = "⚫离线";
        liveState = "close";
      }
    }
    return {
      userName: roomId,
      roomTitle: access + " " + roomId,
      roomCover: cover,
      userHeadImg: cover,
      liveState: liveState,
      userId: roomId,
      roomId: roomId
    };
  }

  async function getLiveState(payload) {
    var roomId = String(payload.roomId || "").trim();
    if (!roomId) return { liveState: "unknow" };
    var status = await getStreamInfo(roomId);
    if (!status) return { liveState: "unknow" };
    var rs = String(status.room_status || "").toLowerCase();
    if (rs === "public" && status.url) return { liveState: "live" };
    if (rs === "offline" || rs === "away") return { liveState: "close" };
    return { liveState: "unknow" };
  }

  // 返回 { room_status, url, hls_source }
  async function getStreamInfo(username) {
    username = String(username || "").trim();
    if (!username) return null;

    // 1) POST get_edge_hls_url_ajax
    try {
      var body = "room_slug=" + encodeURIComponent(username) + "&bandwidth=high";
      var text = await httpPostText(
        SITE + "/get_edge_hls_url_ajax/",
        body,
        Object.assign(baseHeaders(), {
          Referer: SITE + "/" + username + "/"
        }),
        12
      );
      if (text) {
        var j = JSON.parse(text);
        if (j) {
          return {
            room_status: j.room_status || "",
            url: j.url || "",
            hls_source: j.url || ""
          };
        }
      }
    } catch (e) {}

    // 2) GET chatvideocontext
    try {
      var j2 = await httpGetJSON(SITE + "/api/chatvideocontext/" + username + "/");
      if (j2) {
        return {
          room_status: j2.room_status || "",
          url: j2.hls_source || "",
          hls_source: j2.hls_source || ""
        };
      }
    } catch (e2) {}

    return null;
  }

  function parseMasterQualities(masterText, masterUrl) {
    // 从 master m3u8 解析多码率
    var lines = String(masterText || "").split(/\r?\n/);
    var out = [];
    var base = masterUrl.replace(/[^\/]+$/, "");
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      if (line.indexOf("#EXT-X-STREAM-INF:") === 0) {
        var info = line;
        var next = (lines[i + 1] || "").trim();
        if (!next || next.charAt(0) === "#") continue;
        var resMatch = info.match(/RESOLUTION=(\d+)x(\d+)/i);
        var bwMatch = info.match(/BANDWIDTH=(\d+)/i);
        var h = resMatch ? parseInt(resMatch[2], 10) : 0;
        var bw = bwMatch ? parseInt(bwMatch[1], 10) : 0;
        var url = next.indexOf("http") === 0 ? next : base + next;
        var title = h ? h + "p" : bw ? Math.round(bw / 1000) + "k" : "自动";
        out.push({ title: title, qn: h || Math.round(bw / 1000) || 0, url: url });
      }
    }
    out.sort(function (a, b) {
      return b.qn - a.qn;
    });
    return out;
  }

  async function getPlayback(payload) {
    var roomId = String(payload.roomId || "").trim();
    if (!roomId) Host.raise("INVALID_ARGS", "缺少 roomId");

    var info = await getStreamInfo(roomId);
    if (!info) Host.raise("UPSTREAM", "无法获取房间状态");

    var rs = String(info.room_status || "").toLowerCase();
    if (rs === "private" || rs === "hidden") {
      Host.raise("UPSTREAM", "该房间为私人房，无法播放公开流");
    }
    if (rs === "away" || rs === "offline") {
      Host.raise("UPSTREAM", "主播不在线");
    }
    if (rs === "password protected") {
      Host.raise("UPSTREAM", "密码房间，无法播放");
    }

    var masterUrl = info.url || info.hls_source || "";
    if (!masterUrl) {
      if (rs === "public") Host.raise("UPSTREAM", "公开房但无流地址（可能地区限制）");
      Host.raise("UPSTREAM", "无可用播放地址，状态: " + (rs || "unknown"));
    }

    var qualitys = [];
    // 尝试解析 master 多画质
    try {
      var masterText = await httpGetText(
        masterUrl,
        Object.assign(baseHeaders(), {
          Referer: SITE + "/" + roomId + "/",
          Accept: "*/*"
        }),
        10
      );
      if (masterText && masterText.indexOf("#EXTM3U") !== -1) {
        var variants = parseMasterQualities(masterText, masterUrl);
        for (var i = 0; i < variants.length; i++) {
          qualitys.push({
            roomId: roomId,
            title: variants[i].title,
            qn: variants[i].qn,
            url: variants[i].url,
            liveCodeType: "m3u8",
            liveType: "chaturbate",
            userAgent: UA,
            headers: {
              Referer: SITE + "/" + roomId + "/",
              "User-Agent": UA
            },
            playbackHints: {
              streamFormat: "hlsLive",
              latencyMode: "lowLatency",
              isLive: true
            }
          });
        }
      }
    } catch (e) {}

    // 至少给一条 master
    if (!qualitys.length) {
      qualitys.push({
        roomId: roomId,
        title: "自动",
        qn: 0,
        url: masterUrl,
        liveCodeType: "m3u8",
        liveType: "chaturbate",
        userAgent: UA,
        headers: {
          Referer: SITE + "/" + roomId + "/",
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
        cdn: "chaturbate",
        displayName: "Chaturbate",
        qualitys: qualitys
      }
    ];
  }

  async function resolveShare(payload) {
    var code = String(payload.shareCode || "");
    var match =
      code.match(/chaturbate\.(?:com|eu|global)\/([a-zA-Z0-9_-]+)/i) ||
      code.match(/^\/?([a-zA-Z0-9_-]+)\/?$/);
    if (!match) Host.raise("INVALID_ARGS", "无法识别 Chaturbate 房间");
    return getRoomDetail({ roomId: match[1] });
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
