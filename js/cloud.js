/* ========================================
   籽芽手账 - S3 跨端云同步
   适配中科院数据胶囊 S3 协议（PUT上传/GET下载）
   替换原 CloudBase 方案，与电脑版 cloud_sync.py 逻辑一致
   ======================================== */

/* ─── 配置键名 ─── */
var CLOUD_CONFIG_KEY = "ziya_cloud_sync_config";
var CLOUD_AUTO_SYNC_KEY = "ziya_cloud_auto_sync";
var CLOUD_LAST_SYNC_KEY = "ziya_cloud_last_sync";
var CLOUD_FILENAME = "ziya_backup.json";

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
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return {
    upload_url: "",
    download_url: "",
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
  return !!(config.upload_url && config.download_url);
}

/* ========================================
   备份包生成（与电脑版兼容）
   ======================================== */

/**
 * 生成标准备份包
 * 格式与电脑版 cloud_sync.py make_backup_bundle() 一致
 */
function makeBackupBundle() {
  var data = loadData();
  var books = {};
  try {
    books = JSON.parse(localStorage.getItem("wenfeng_book_progress") || "{}");
  } catch (e) {}

  return {
    version: "12.0",
    exportDate: new Date().toISOString(),
    appData: data,
    bookProgress: books,
    theme: data.theme || "default",
    customShortcuts: {}
  };
}

/* ========================================
   数据合并核心逻辑
   移植自电脑版 cloud_sync.py merge_data()
   ======================================== */

/**
 * 合并打卡记录列表，按日期去重
 * 记录可以是字符串("2026-07-10")或字典({"date":"2026-07-10", ...})
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
      var existing = merged[key];
      if (existing === undefined) {
        merged[key] = r;
      } else if (typeof existing === "string") {
        merged[key] = r; // dict 比 string 信息更丰富
      } else if (existing && typeof existing === "object") {
        var subKey = r.count || 0;
        var exCount = existing.count || 0;
        if (subKey > exCount) {
          merged[key] = r;
        }
      }
    }
  }

  // 再合并云端
  for (var j = 0; j < cloudRecs.length; j++) {
    var r2 = cloudRecs[j];
    if (typeof r2 === "string") {
      if (!merged[r2]) {
        merged[r2] = r2;
      }
    } else if (r2 && typeof r2 === "object") {
      var key2 = r2.date || String(r2);
      var existing2 = merged[key2];
      if (existing2 === undefined) {
        merged[key2] = r2;
      } else if (typeof existing2 === "string") {
        merged[key2] = r2;
      } else if (existing2 && typeof existing2 === "object") {
        var exCount2 = existing2.count || 0;
        var rCount2 = r2.count || 0;
        // 时刻书可能有多条同日期记录（不同时间），用 time 做子键区分
        if (r2.time || existing2.time) {
          var rTime = r2.time || "";
          var exTime = existing2.time || "";
          if (rTime && rTime !== exTime) {
            var compositeKey = key2 + "|" + rTime;
            if (!merged[compositeKey]) {
              merged[compositeKey] = r2;
            }
          } else if (rCount2 > exCount2) {
            merged[key2] = r2;
          }
        } else if (rCount2 > exCount2) {
          merged[key2] = r2;
        }
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
 * 同 ID 的项目合并内部字段，records 字段特殊处理
 */
function _mergeListById(localList, cloudList) {
  var result = {};

  // 先放本地
  for (var i = 0; i < localList.length; i++) {
    var item = localList[i];
    if (item && typeof item === "object" && item.id) {
      result[item.id] = _cloneObj(item);
    } else {
      result[String(item)] = (item && typeof item === "object") ? _cloneObj(item) : item;
    }
  }

  // 再合并云端
  for (var j = 0; j < cloudList.length; j++) {
    var cItem = cloudList[j];
    if (cItem && typeof cItem === "object" && cItem.id) {
      var iid = cItem.id;
      if (result[iid] && typeof result[iid] === "object") {
        var existing = result[iid];
        // 合并 records
        if (cItem.records && existing.records) {
          existing.records = _mergeRecords(
            existing.records || [],
            cItem.records || []
          );
        }
        // 其他字段：云端值优先（如果云端有非空值且本地为空）
        for (var k in cItem) {
          if (k === "records") continue;
          if (cItem[k] && !existing[k]) {
            existing[k] = cItem[k];
          }
          if (!(k in existing)) {
            existing[k] = cItem[k];
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
 * 移植自 cloud_sync.py merge_data()
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
    version: "12.0",
    exportDate: new Date().toISOString(),
    appData: mergedData,
    bookProgress: mergedBooks,
    theme: mergedData.theme || "default",
    customShortcuts: {}
  };
}

/* ========================================
   S3 上传/下载（XMLHttpRequest 实现）
   ======================================== */

/**
 * 上传数据到云端 S3
 * @param {string} uploadUrl - S3 PUT 接口地址
 * @param {string} jsonData - JSON 字符串数据
 * @param {function} callback - callback(err)
 */
function uploadToCloud(uploadUrl, jsonData, callback) {
  var xhr = new XMLHttpRequest();
  xhr.open("PUT", uploadUrl, true);
  xhr.setRequestHeader("Content-Type", "application/octet-stream");

  xhr.onload = function() {
    if (xhr.status >= 200 && xhr.status < 300) {
      callback(null);
    } else {
      callback(new Error("上传失败 (HTTP " + xhr.status + ")"));
    }
  };

  xhr.onerror = function() {
    callback(new Error("上传失败：网络错误"));
  };

  xhr.ontimeout = function() {
    callback(new Error("上传超时"));
  };

  xhr.timeout = 60000;
  xhr.send(jsonData);
}

/**
 * 从云端 S3 下载数据
 * @param {string} downloadUrl - S3 GET 直链地址
 * @param {function} callback - callback(err, data) data 为解析后的 JSON 对象
 */
function downloadFromCloud(downloadUrl, callback) {
  var xhr = new XMLHttpRequest();
  xhr.open("GET", downloadUrl, true);

  xhr.onload = function() {
    if (xhr.status >= 200 && xhr.status < 300) {
      try {
        var data = JSON.parse(xhr.responseText);
        callback(null, data);
      } catch (e) {
        callback(new Error("云端备份解析失败"));
      }
    } else if (xhr.status === 404) {
      // 云端还没有文件
      callback(null, null);
    } else {
      callback(new Error("下载失败 (HTTP " + xhr.status + ")"));
    }
  };

  xhr.onerror = function() {
    callback(new Error("下载失败：网络错误"));
  };

  xhr.ontimeout = function() {
    callback(new Error("下载超时"));
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
  var uploadUrl = (config.upload_url || "").trim();
  var downloadUrl = (config.download_url || "").trim();

  if (!uploadUrl) {
    _syncInProgress = false;
    if (callback) callback(new Error("未配置上传接口地址"));
    return;
  }
  if (!downloadUrl) {
    _syncInProgress = false;
    if (callback) callback(new Error("未配置下载直链地址"));
    return;
  }

  // ── 第一步：下载云端备份 ──
  downloadFromCloud(downloadUrl, function(dlErr, cloudBundle) {
    if (dlErr) {
      _syncInProgress = false;
      if (callback) callback(dlErr);
      return;
    }

    // 云端可能还没有文件
    if (!cloudBundle) {
      cloudBundle = { appData: {}, bookProgress: {}, version: "12.0" };
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
    uploadToCloud(uploadUrl, jsonStr, function(upErr) {
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
  var downloadUrl = (config.download_url || "").trim();

  if (!downloadUrl) {
    if (callback) callback(new Error("未配置下载直链地址"));
    return;
  }

  downloadFromCloud(downloadUrl, function(err, cloudBundle) {
    if (err) {
      if (callback) callback(err);
      return;
    }
    if (!cloudBundle) {
      if (callback) callback(new Error("云端没有备份文件"));
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
 * 检测上传接口是否可访问
 */
function testUploadUrl(url, callback) {
  var xhr = new XMLHttpRequest();
  xhr.open("OPTIONS", url, true);
  xhr.timeout = 15000;

  xhr.onload = function() {
    callback(true, "上传接口可访问 (HTTP " + xhr.status + ")");
  };

  xhr.onerror = function() {
    // HTTP 4xx/5xx 也说明接口存在
    callback(false, "上传接口无法访问");
  };

  xhr.ontimeout = function() {
    callback(false, "上传接口检测超时");
  };

  xhr.send();
}

/**
 * 检测下载直链是否可访问
 */
function testDownloadUrl(url, callback) {
  var xhr = new XMLHttpRequest();
  xhr.open("HEAD", url, true);
  xhr.timeout = 15000;

  xhr.onload = function() {
    if (xhr.status >= 200 && xhr.status < 300) {
      var size = xhr.getResponseHeader("Content-Length") || "未知";
      callback(true, "下载直链可访问 (HTTP " + xhr.status + ", 大小: " + size + " 字节)");
    } else {
      callback(false, "下载直链异常 (HTTP " + xhr.status + ")");
    }
  };

  xhr.onerror = function() {
    // HEAD 可能不支持，尝试 GET
    var xhr2 = new XMLHttpRequest();
    xhr2.open("GET", url, true);
    xhr2.timeout = 15000;
    xhr2.onload = function() {
      if (xhr2.status >= 200 && xhr2.status < 300) {
        callback(true, "下载直链可访问 (HTTP " + xhr2.status + ")");
      } else {
        callback(false, "下载直链无法访问");
      }
    };
    xhr2.onerror = function() {
      callback(false, "下载直链无法访问");
    };
    xhr2.ontimeout = function() {
      callback(false, "下载直链检测超时");
    };
    xhr2.send();
  };

  xhr.ontimeout = function() {
    callback(false, "下载直链检测超时");
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
    // 静默同步，不弹 toast
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
