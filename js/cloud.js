/* ========================================
   籽芽手账 - WebDAV 跨端云同步
   PUT上传 / GET下载 + Basic Auth 认证
   目标文件名 ka.db（内容为 JSON 文本）
   与电脑版逻辑一致，跨端兼容
   ======================================== */

/* ─── 配置键名 ─── */
var CLOUD_CONFIG_KEY = "ziya_cloud_sync_config";
var CLOUD_AUTO_SYNC_KEY = "ziya_cloud_auto_sync";
var CLOUD_LAST_SYNC_KEY = "ziya_cloud_last_sync";
var CLOUD_FILENAME = "ka.db";

/* ─── 自动同步定时器 ─── */
var _autoSyncTimer = null;
var _syncInProgress = false;

/* ========================================
   配置管理
   ======================================== */

/**
 * 加载云同步配置
 */
function loadCloudConfig() {
  try {
    var raw = localStorage.getItem(CLOUD_CONFIG_KEY);
    if (raw) {
      var cfg = JSON.parse(raw);
      // 兼容旧版 S3 配置：如果存在 upload_url 但没有 webdav_url，返回空
      if (cfg.webdav_url) return cfg;
    }
  } catch (e) {}
  return {
    webdav_url: "",
    username: "",
    password: "",
    auto_sync: true,
    interval_minutes: 10
  };
}

/**
 * 保存云同步配置
 */
function saveCloudConfig(config) {
  localStorage.setItem(CLOUD_CONFIG_KEY, JSON.stringify(config));
}

/**
 * 获取自动同步开关状态
 */
function getCloudSyncEnabled() {
  var config = loadCloudConfig();
  return config.auto_sync !== false;
}

/**
 * 设置自动同步开关
 */
function setCloudSyncEnabled(on) {
  var config = loadCloudConfig();
  config.auto_sync = on;
  saveCloudConfig(config);
}

/**
 * 检查是否已配置
 */
function isCloudConfigured() {
  var config = loadCloudConfig();
  return !!(config.webdav_url && config.username && config.password);
}

/**
 * 构造云端文件完整 URL
 */
function _getCloudFileUrl(config) {
  var base = (config.webdav_url || "").trim();
  if (!base) return "";
  // 去掉末尾斜杠再拼接文件名
  base = base.replace(/\/+$/, "");
  // 坚果云：根目录 /dav/ 不能直接放文件，自动补"我的坚果云"文件夹
  var mark = "dav.jianguoyun.com/dav";
  var pos = base.indexOf(mark);
  if (pos >= 0) {
    var after = base.substring(pos + mark.length);
    if (after === "" || after === "/") {
      base = base.substring(0, pos + mark.length) + "/我的坚果云";
    }
  }
  return encodeURI(base + "/" + CLOUD_FILENAME);
}

/**
 * 构造 Basic Auth 请求头值
 */
function _buildAuthHeader(config) {
  var raw = (config.username || "") + ":" + (config.password || "");
  try {
    // 处理可能的多字节字符
    return "Basic " + btoa(unescape(encodeURIComponent(raw)));
  } catch (e) {
    return "Basic " + btoa(raw);
  }
}

/* ========================================
   备份包生成（与电脑版兼容）
   ======================================== */

/**
 * 生成标准备份包
 */
function makeBackupBundle() {
  var data = loadData();
  var books = {};
  try {
    books = JSON.parse(localStorage.getItem("wenfeng_book_progress") || "{}");
  } catch (e) {}

  return {
    version: "13.0",
    exportDate: new Date().toISOString(),
    appData: data,
    bookProgress: books,
    theme: data.theme || "default",
    customShortcuts: {}
  };
}

/* ========================================
   数据合并核心逻辑
   支持 updatedAt 时间戳：同条记录以较新为准
   无 updatedAt 的旧数据视为最旧（0），新数据优先
   ======================================== */

/**
 * 合并打卡记录列表，按日期去重
 * 记录可以是字符串("2026-07-10")或字典({"date":"2026-07-10", ...})
 * 同 date 记录：count 取大值（不丢打卡次数），其他字段按 updatedAt 较新为准
 */
function _mergeRecords(localRecs, cloudRecs) {
  var merged = {};

  // 先放本地
  for (var i = 0; i < localRecs.length; i++) {
    var r = localRecs[i];
    if (typeof r === "string") {
      merged[r] = r;
    } else if (r && typeof r === "object") {
      var key = r.date || String(r);
      merged[key] = r;
    }
  }

  // 再合并云端
  for (var j = 0; j < cloudRecs.length; j++) {
    var r2 = cloudRecs[j];
    if (typeof r2 === "string") {
      if (!merged[r2]) merged[r2] = r2;
      continue;
    }
    if (!r2 || typeof r2 !== "object") continue;

    var key2 = r2.date || String(r2);
    var existing = merged[key2];

    if (existing === undefined) {
      // 本地没有此日期，直接加入
      merged[key2] = r2;
      continue;
    }

    // 本地已有同日期记录
    if (typeof existing === "string") {
      // 本地是字符串，云端是对象，对象信息更丰富 → 用云端
      merged[key2] = r2;
      continue;
    }
    if (typeof r2 === "string") {
      // 云端是字符串，本地是对象，保留本地对象
      continue;
    }

    // 两边都是对象
    var exUp = existing.updatedAt || 0;
    var r2Up = r2.updatedAt || 0;

    // count 累积值取大，避免丢打卡次数
    var maxCount = Math.max(existing.count || 0, r2.count || 0);

    // 时刻书可能有多条同日期不同时间的记录
    if (r2.time || existing.time) {
      var rTime = r2.time || "";
      var exTime = existing.time || "";
      if (rTime && rTime !== exTime) {
        // 不同时间的记录，作为独立条目保留
        var compositeKey = key2 + "|" + rTime;
        if (!merged[compositeKey]) {
          merged[compositeKey] = r2;
        }
        continue;
      }
    }

    if (r2Up > exUp) {
      // 云端较新：以云端为基准，但 count 取大
      var newer = _cloneObj(r2);
      newer.count = maxCount;
      merged[key2] = newer;
    } else {
      // 本地较新或相等：保留本地，count 取大，补云端独有字段
      existing.count = maxCount;
      for (var fk in r2) {
        if (fk === "date" || fk === "count" || fk === "updatedAt") continue;
        if (r2[fk] && !existing[fk]) existing[fk] = r2[fk];
      }
    }
  }

  // 还原为列表
  var result = [];
  for (var k in merged) {
    if (merged.hasOwnProperty(k)) {
      result.push(merged[k]);
    }
  }
  return result;
}

/**
 * 按 ID 合并两个列表
 * 同 ID 项目：
 *   - records 字段始终合并（两边新增打卡都保留）
 *   - 其他字段按 updatedAt 较新为准；无 updatedAt 视为 0（最旧）
 */
function _mergeListById(localList, cloudList) {
  var result = {};

  // 先放本地
  for (var i = 0; i < localList.length; i++) {
    var item = localList[i];
    if (item && typeof item === "object" && item.id) {
      result[item.id] = _cloneObj(item);
    } else {
      var sk = String(item);
      result[sk] = (item && typeof item === "object") ? _cloneObj(item) : item;
    }
  }

  // 再合并云端
  for (var j = 0; j < cloudList.length; j++) {
    var cItem = cloudList[j];
    if (cItem && typeof cItem === "object" && cItem.id) {
      var iid = cItem.id;
      if (result[iid] && typeof result[iid] === "object") {
        var existing = result[iid];
        var exUp = existing.updatedAt || 0;
        var clUp = cItem.updatedAt || 0;

        // records 字段始终合并
        var mergedRecs;
        if (cItem.records && existing.records) {
          mergedRecs = _mergeRecords(existing.records || [], cItem.records || []);
        } else if (cItem.records) {
          mergedRecs = cItem.records;
        } else {
          mergedRecs = existing.records;
        }

        if (clUp > exUp) {
          // 云端较新：以云端为基准
          var baseNew = _cloneObj(cItem);
          baseNew.records = mergedRecs;
          result[iid] = baseNew;
        } else {
          // 本地较新或相等：保留本地为基准，records 合并，补云端独有字段
          existing.records = mergedRecs;
          for (var k in cItem) {
            if (k === "records" || k === "id") continue;
            if (cItem[k] && !existing[k]) {
              existing[k] = cItem[k];
            }
            if (!(k in existing)) {
              existing[k] = cItem[k];
            }
          }
        }
      } else {
        result[iid] = _cloneObj(cItem);
      }
    } else {
      var key = String(cItem);
      if (!result[key]) {
        result[key] = (cItem && typeof cItem === "object") ? _cloneObj(cItem) : cItem;
      }
    }
  }

  var list = [];
  for (var id in result) {
    if (result.hasOwnProperty(id)) {
      list.push(result[id]);
    }
  }
  return list;
}

/**
 * 深拷贝简单对象
 */
function _cloneObj(obj) {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * 合并本地数据和云端数据
 */
function mergeData(localData, cloudData) {
  if (!localData) return cloudData;
  if (!cloudData) return localData;

  var merged = _cloneObj(localData);

  // ── 合并 tasks（按 ID）──
  merged.tasks = _mergeListById(
    localData.tasks || [],
    cloudData.tasks || []
  );

  // ── 合并 noComplaint.challenges（按 ID）──
  var localNC = (localData.noComplaint || {}).challenges || [];
  var cloudNC = (cloudData.noComplaint || {}).challenges || [];
  if (!merged.noComplaint) merged.noComplaint = {};
  merged.noComplaint.challenges = _mergeListById(localNC, cloudNC);

  // ── 合并 时刻书（one/three/six，按 ID）──
  var mbKeys = ["oneMomentBook", "threeMomentBook", "sixMomentBook"];
  for (var mi = 0; mi < mbKeys.length; mi++) {
    var mbKey = mbKeys[mi];
    var localMB = (localData[mbKey] || {}).books || [];
    var cloudMB = (cloudData[mbKey] || {}).books || [];
    if (!merged[mbKey]) merged[mbKey] = {};
    merged[mbKey].books = _mergeListById(localMB, cloudMB);
  }

  // ── 合并 阳光雨露 entries（按 ID）──
  var localSun = (localData.sunshine || {}).entries || [];
  var cloudSun = (cloudData.sunshine || {}).entries || [];
  if (!merged.sunshine) merged.sunshine = {};
  merged.sunshine.entries = _mergeListById(localSun, cloudSun);

  // ── 合并 梦想（按 ID）──
  merged.dreams = _mergeListById(
    localData.dreams || [],
    cloudData.dreams || []
  );

  // ── 合并 笔记（按 ID）──
  merged.notes = _mergeListById(
    localData.notes || [],
    cloudData.notes || []
  );

  // ── 梦想币 & 连续天数：取较大值 ──
  merged.coins = Math.max(localData.coins || 0, cloudData.coins || 0);
  merged.currentStreak = Math.max(
    localData.currentStreak || 0,
    cloudData.currentStreak || 0
  );

  // lastCheckinDate 取较新的
  var localLCD = localData.lastCheckinDate || "";
  var cloudLCD = cloudData.lastCheckinDate || "";
  if (localLCD && cloudLCD) {
    merged.lastCheckinDate = localLCD > cloudLCD ? localLCD : cloudLCD;
  } else {
    merged.lastCheckinDate = localLCD || cloudLCD;
  }

  var localTCD = localData.todayCoinDate || "";
  var cloudTCD = cloudData.todayCoinDate || "";
  if (localTCD && cloudTCD) {
    merged.todayCoinDate = localTCD > cloudTCD ? localTCD : cloudTCD;
  } else {
    merged.todayCoinDate = localTCD || cloudTCD;
  }

  // ── 践行者状态：任一端已激活则激活 ──
  var localPrac = localData.practitioner || {};
  var cloudPrac = cloudData.practitioner || {};
  var mergedPrac = _cloneObj(localPrac);
  if (cloudPrac.activated) {
    mergedPrac.activated = true;
    mergedPrac.activationCode = mergedPrac.activationCode || cloudPrac.activationCode || "";
    mergedPrac.activatedDate = mergedPrac.activatedDate || cloudPrac.activatedDate || "";
  }
  merged.practitioner = mergedPrac;

  // ── 已购主题：取并集 ──
  var localThemes = localData.purchasedThemes || ["default"];
  var cloudThemes = cloudData.purchasedThemes || ["default"];
  var themeSet = {};
  for (var t = 0; t < localThemes.length; t++) themeSet[localThemes[t]] = true;
  for (var t2 = 0; t2 < cloudThemes.length; t2++) themeSet[cloudThemes[t2]] = true;
  merged.purchasedThemes = Object.keys(themeSet);

  // ── 主题：取本地（用户最近选择）──
  merged.theme = localData.theme || cloudData.theme || "default";

  // ── 账号信息：合并非空字段 ──
  var localAcct = localData.account || {};
  var cloudAcct = cloudData.account || {};
  var mergedAcct = _cloneObj(localAcct);
  for (var ak in cloudAcct) {
    if (cloudAcct[ak] && !mergedAcct[ak]) {
      mergedAcct[ak] = cloudAcct[ak];
    }
  }
  merged.account = mergedAcct;

  return merged;
}

/**
 * 合并书籍进度数据
 */
function mergeBooks(localBooks, cloudBooks) {
  if (!localBooks || typeof localBooks !== "object") localBooks = {};
  if (!cloudBooks || typeof cloudBooks !== "object") cloudBooks = {};
  var merged = _cloneObj(localBooks);
  for (var bid in cloudBooks) {
    if (!cloudBooks.hasOwnProperty(bid)) continue;
    var book = cloudBooks[bid];
    if (merged[bid]) {
      var existing = merged[bid];
      if (existing && typeof existing === "object" && book && typeof book === "object") {
        // 有 updatedAt 按时间戳，否则按原逻辑（content 长度、position 行数）
        var exUp = existing.updatedAt || 0;
        var clUp = book.updatedAt || 0;
        if (clUp > exUp) {
          // 云端较新：以云端为准
          merged[bid] = book;
        } else {
          for (var k in book) {
            if (k === "content") {
              if (String(book[k]).length > String(existing[k] || "").length) {
                existing[k] = book[k];
              }
            } else if (k === "position") {
              var exLine = parseInt(String(existing[k] || "0").split(/[.|]/)[0]) || 0;
              var newLine = parseInt(String(book[k]).split(/[.|]/)[0]) || 0;
              if (newLine > exLine) existing[k] = book[k];
            } else if (book[k] && !existing[k]) {
              existing[k] = book[k];
            }
          }
        }
      } else {
        merged[bid] = book;
      }
    } else {
      merged[bid] = book;
    }
  }
  return merged;
}

/**
 * 合并两个完整备份包
 */
function mergeBackupBundles(localBundle, cloudBundle) {
  var localData = localBundle.appData || localBundle;
  var cloudData = cloudBundle.appData || cloudBundle;
  var mergedData = mergeData(localData, cloudData);

  var localBooks = localBundle.bookProgress || {};
  var cloudBooks = cloudBundle.bookProgress || {};
  var mergedBooks = mergeBooks(localBooks, cloudBooks);

  return {
    version: "13.0",
    exportDate: new Date().toISOString(),
    appData: mergedData,
    bookProgress: mergedBooks,
    theme: mergedData.theme || "default",
    customShortcuts: {}
  };
}

/* ========================================
   WebDAV 上传/下载（XMLHttpRequest + Basic Auth）
   ======================================== */

/**
 * 上传数据到 WebDAV（PUT + Basic Auth）
 * @param {object} config - 含 webdav_url/username/password
 * @param {string} jsonData - JSON 字符串
 * @param {function} callback - callback(err)
 */
function uploadToCloud(config, jsonData, callback) {
  var fileUrl = _getCloudFileUrl(config);
  if (!fileUrl) {
    if (callback) callback(new Error("未配置 WebDAV 地址"));
    return;
  }

  var xhr = new XMLHttpRequest();
  xhr.open("PUT", fileUrl, true);
  xhr.setRequestHeader("Content-Type", "application/octet-stream");
  xhr.setRequestHeader("Authorization", _buildAuthHeader(config));

  xhr.onload = function() {
    // 200/201/204 都算成功（坚果云上传成功通常返回 201 或 200）
    if (xhr.status >= 200 && xhr.status < 300) {
      if (callback) callback(null);
    } else if (xhr.status === 401 || xhr.status === 403) {
      if (callback) callback(new Error("认证失败：用户名或应用密码错误 (HTTP " + xhr.status + ")"));
    } else {
      if (callback) callback(new Error("上传失败 (HTTP " + xhr.status + ")"));
    }
  };

  xhr.onerror = function() {
    if (callback) callback(new Error("上传失败：网络错误，请检查 WebDAV 地址"));
  };

  xhr.ontimeout = function() {
    if (callback) callback(new Error("上传超时"));
  };

  xhr.timeout = 60000;
  xhr.send(jsonData);
}

/**
 * 从 WebDAV 下载数据（GET + Basic Auth）
 * @param {object} config - 含 webdav_url/username/password
 * @param {function} callback - callback(err, data) data 为解析后的 JSON 对象
 */
function downloadFromCloud(config, callback) {
  var fileUrl = _getCloudFileUrl(config);
  if (!fileUrl) {
    if (callback) callback(new Error("未配置 WebDAV 地址"));
    return;
  }

  var xhr = new XMLHttpRequest();
  xhr.open("GET", fileUrl, true);
  xhr.setRequestHeader("Authorization", _buildAuthHeader(config));

  xhr.onload = function() {
    if (xhr.status >= 200 && xhr.status < 300) {
      try {
        var data = JSON.parse(xhr.responseText);
        if (callback) callback(null, data);
      } catch (e) {
        if (callback) callback(new Error("云端备份解析失败"));
      }
    } else if (xhr.status === 404) {
      // 云端还没有文件
      if (callback) callback(null, null);
    } else if (xhr.status === 401 || xhr.status === 403) {
      if (callback) callback(new Error("认证失败：用户名或应用密码错误 (HTTP " + xhr.status + ")"));
    } else {
      if (callback) callback(new Error("下载失败 (HTTP " + xhr.status + ")"));
    }
  };

  xhr.onerror = function() {
    if (callback) callback(new Error("下载失败：网络错误，请检查 WebDAV 地址"));
  };

  xhr.ontimeout = function() {
    if (callback) callback(new Error("下载超时"));
  };

  xhr.timeout = 60000;
  xhr.send();
}

/* ========================================
   完整同步流程
   ======================================== */

/**
 * 执行完整同步：下载云端 -> 合并本地 -> 上传覆盖
 * @param {function} callback - callback(err, message)
 */
function fullSync(callback) {
  if (_syncInProgress) {
    if (callback) callback(null, "同步正在进行中");
    return;
  }
  _syncInProgress = true;

  var config = loadCloudConfig();
  if (!isCloudConfigured()) {
    _syncInProgress = false;
    if (callback) callback(new Error("未完整配置 WebDAV（需要地址、用户名、应用密码）"));
    return;
  }

  // ── 第一步：下载云端备份 ──
  downloadFromCloud(config, function(dlErr, cloudBundle) {
    if (dlErr) {
      _syncInProgress = false;
      if (callback) callback(dlErr);
      return;
    }

    // 云端可能还没有文件
    if (!cloudBundle) {
      cloudBundle = { appData: {}, bookProgress: {}, version: "13.0" };
    }

    // ── 第二步：合并本地数据 ──
    var localBundle = makeBackupBundle();
    var mergedBundle = mergeBackupBundles(localBundle, cloudBundle);

    // ── 第三步：保存合并后的数据到本地 ──
    var mergedData = mergedBundle.appData || {};
    saveData(mergedData);
    if (mergedBundle.bookProgress) {
      localStorage.setItem("wenfeng_book_progress", JSON.stringify(mergedBundle.bookProgress));
    }

    // ── 第四步：上传合并后的数据到云端 ──
    var jsonStr = JSON.stringify(mergedBundle);
    uploadToCloud(config, jsonStr, function(upErr) {
      _syncInProgress = false;

      if (upErr) {
        if (callback) callback(upErr);
        return;
      }

      // 记录最后同步时间
      localStorage.setItem(CLOUD_LAST_SYNC_KEY, new Date().toISOString());

      if (callback) callback(null, "同步合并成功");
    });
  });
}

/**
 * 仅从云端恢复（不执行上传）
 * @param {function} callback - callback(err, message)
 */
function restoreFromCloud(callback) {
  var config = loadCloudConfig();
  if (!isCloudConfigured()) {
    if (callback) callback(new Error("未完整配置 WebDAV"));
    return;
  }

  downloadFromCloud(config, function(err, cloudBundle) {
    if (err) {
      if (callback) callback(err);
      return;
    }
    if (!cloudBundle) {
      if (callback) callback(new Error("云端还没有备份文件"));
      return;
    }

    // 恢复到本地
    var cloudData = cloudBundle.appData || cloudBundle;
    saveData(cloudData);
    if (cloudBundle.bookProgress) {
      localStorage.setItem("wenfeng_book_progress", JSON.stringify(cloudBundle.bookProgress));
    }

    if (callback) callback(null, "云端数据已恢复到本地");
  });
}

/**
 * 测试 WebDAV 连通性
 * 通过 GET ka.db 探测：200/404 视为连通，401/403 视为认证错
 * @param {object} config - 含 webdav_url/username/password
 * @param {function} callback - callback(ok, message)
 */
function testWebDAV(config, callback) {
  var fileUrl = _getCloudFileUrl(config);
  if (!fileUrl) {
    if (callback) callback(false, "请填写 WebDAV 地址");
    return;
  }
  if (!config.username || !config.password) {
    if (callback) callback(false, "请填写用户名和应用密码");
    return;
  }

  var xhr = new XMLHttpRequest();
  // 用 HEAD 探测，避免下载完整文件
  xhr.open("HEAD", fileUrl, true);
  xhr.setRequestHeader("Authorization", _buildAuthHeader(config));
  xhr.timeout = 15000;

  xhr.onload = function() {
    if (xhr.status >= 200 && xhr.status < 300) {
      var size = xhr.getResponseHeader("Content-Length") || "未知";
      if (callback) callback(true, "WebDAV 可访问，云端已有备份 (大小: " + size + " 字节)");
    } else if (xhr.status === 404) {
      // 404 说明地址和认证都对，只是文件还不存在（首次使用）
      if (callback) callback(true, "WebDAV 可访问，云端暂无备份（首次使用，同步后会自动创建）");
    } else if (xhr.status === 401 || xhr.status === 403) {
      if (callback) callback(false, "认证失败：用户名或应用密码错误 (HTTP " + xhr.status + ")");
    } else if (xhr.status === 405) {
      // 某些 WebDAV 不支持 HEAD，返回 405，视为地址可访问
      if (callback) callback(true, "WebDAV 地址可访问（HEAD 不支持，但不影响同步）");
    } else {
      if (callback) callback(false, "WebDAV 异常 (HTTP " + xhr.status + ")");
    }
  };

  xhr.onerror = function() {
    // HEAD 失败，尝试 PROPFIND（WebDAV 标准方法）
    var xhr2 = new XMLHttpRequest();
    xhr2.open("PROPFIND", fileUrl, true);
    xhr2.setRequestHeader("Authorization", _buildAuthHeader(config));
    xhr2.setRequestHeader("Depth", "0");
    xhr2.timeout = 15000;
    xhr2.onload = function() {
      if (xhr2.status >= 200 && xhr2.status < 400) {
        if (callback) callback(true, "WebDAV 可访问 (PROPFIND HTTP " + xhr2.status + ")");
      } else if (xhr2.status === 401 || xhr2.status === 403) {
        if (callback) callback(false, "认证失败：用户名或应用密码错误");
      } else {
        if (callback) callback(false, "WebDAV 无法访问 (HTTP " + xhr2.status + ")");
      }
    };
    xhr2.onerror = function() {
      if (callback) callback(false, "WebDAV 无法访问：网络错误，请检查地址");
    };
    xhr2.ontimeout = function() {
      if (callback) callback(false, "WebDAV 检测超时");
    };
    xhr2.send();
  };

  xhr.ontimeout = function() {
    if (callback) callback(false, "WebDAV 检测超时");
  };

  xhr.send();
}

/* ========================================
   自动同步定时器
   ======================================== */

/**
 * 启动自动同步定时器
 * 每 interval_minutes 分钟执行一次 fullSync
 */
function startAutoSyncTimer() {
  stopAutoSyncTimer();

  var config = loadCloudConfig();
  if (!config.auto_sync) return;
  if (!isCloudConfigured()) return;

  var intervalMs = (config.interval_minutes || 10) * 60 * 1000;

  _autoSyncTimer = setInterval(function() {
    fullSync(function(err, msg) {
      if (err) {
        console.warn("自动同步失败:", err.message);
      } else {
        console.log("自动同步完成:", msg);
      }
    });
  }, intervalMs);

  console.log("自动同步定时器已启动，间隔 " + (config.interval_minutes || 10) + " 分钟");
}

/**
 * 停止自动同步定时器
 */
function stopAutoSyncTimer() {
  if (_autoSyncTimer) {
    clearInterval(_autoSyncTimer);
    _autoSyncTimer = null;
  }
}

/**
 * 获取最后同步时间
 */
function getLastSyncTime() {
  return localStorage.getItem(CLOUD_LAST_SYNC_KEY) || "";
}

/**
 * 手动触发一次同步
 */
function doManualSync(callback) {
  fullSync(function(err, msg) {
    if (err) {
      showToast("同步失败：" + err.message);
    } else {
      showToast("同步成功！" + msg);
      refreshCheckinList();
      updateQuoteBar();
    }
    if (callback) callback(err, msg);
  });
}

/**
 * 打卡完成后触发同步（异步，不阻塞 UI）
 */
function syncAfterCheckin() {
  if (!isCloudConfigured()) return;
  fullSync(function(err, msg) {
    if (err) {
      console.warn("打卡后同步失败:", err.message);
    } else {
      console.log("打卡后同步完成:", msg);
    }
  });
}
