/* ========================================
   文峰手账 - CloudBase 云同步 & 排行榜
   ======================================== */

var CLOUD_ENV_ID = "clockin-backup-d3gcy9a9t86d32ca3";
var _app = null;
var _auth = null;
var _db = null;
var _initialized = false;
var _uid = null;

/**
 * 加载 CloudBase SDK 并初始化
 */
function initCloudBase(callback) {
  if (_initialized && _app) { callback(null); return; }

  // 动态加载 SDK
  var script = document.createElement("script");
  script.src = "https://static.cloudbase.net/cloudbase-js-sdk/latest/cloudbase.full.js";
  script.onload = function() {
    try {
      _app = cloudbase.init({
        env: CLOUD_ENV_ID
      });
      _auth = _app.auth({ persistence: "local" });
      _db = _app.database();
      _initialized = true;
      callback(null);
    } catch (e) {
      callback(e);
    }
  };
  script.onerror = function() {
    callback(new Error("CloudBase SDK 加载失败"));
  };
  document.head.appendChild(script);
}

/**
 * 获取当前登录用户的 UID
 */
function getCloudUid() {
  return _uid;
}

/**
 * 匿名登录（免注册快速使用）
 */
function cloudSignInAnonymously(callback) {
  if (!_initialized) return callback(new Error("未初始化"));
  _auth.signInAnonymously().then(function(res) {
    _uid = res.user.uid;
    callback(null, res);
  }).catch(function(e) {
    callback(e);
  });
}

/**
 * 用户名密码注册
 */
function cloudSignUp(username, password, callback) {
  if (!_initialized) return callback(new Error("未初始化"));
  _auth.signUp({
    username: username,
    password: password
  }).then(function(res) {
    _uid = res.user.uid;
    callback(null, res);
  }).catch(function(e) {
    callback(e);
  });
}

/**
 * 用户名密码登录
 */
function cloudSignIn(username, password, callback) {
  if (!_initialized) return callback(new Error("未初始化"));
  _auth.signInWithPassword({
    username: username,
    password: password
  }).then(function(res) {
    _uid = res.user.uid;
    callback(null, res);
  }).catch(function(e) {
    callback(e);
  });
}

/**
 * 退出登录
 */
function cloudSignOut(callback) {
  if (!_initialized) { if (callback) callback(null); return; }
  _auth.signOut().then(function() {
    _uid = null;
    if (callback) callback(null);
  }).catch(function(e) {
    if (callback) callback(e);
  });
}

/**
 * 检查是否已登录
 */
function isCloudLoggedIn() {
  return !!_uid;
}

/* ========================================
   数据同步
   ======================================== */

/**
 * 上传本地数据到云端
 */
function cloudUploadData(callback) {
  if (!_uid) return callback(new Error("未登录，请先登录"));
  if (!_db) return callback(new Error("数据库未初始化"));

  var localData = loadData();
  var books = getBooks();
  var bookProgress = localStorage.getItem("wenfeng_book_progress") || "{}";
  var themeLocal = {
    current: getCurrentTheme(),
    purchased: getPurchasedThemes()
  };

  var uploadPayload = {
    uid: _uid,
    username: getUsername(),
    gender: getGender(),
    age: getAge(),
    appData: localData,
    books: books,
    bookProgress: bookProgress,
    theme: themeLocal,
    updatedAt: new Date().toISOString()
  };

  _db.collection("user_data").where({ uid: _uid }).get().then(function(res) {
    if (res.data && res.data.length > 0) {
      // 更新已有记录
      return _db.collection("user_data").doc(res.data[0]._id).set(uploadPayload);
    } else {
      // 新建记录
      return _db.collection("user_data").add(uploadPayload);
    }
  }).then(function() {
    callback(null);
  }).catch(function(e) {
    callback(e);
  });

  // 同时更新排行榜
  cloudPushLeaderboard(localData.coins, getUsername(), function() {});
}

/**
 * 从云端下载数据
 */
function cloudDownloadData(callback) {
  if (!_uid) return callback(new Error("未登录"));
  if (!_db) return callback(new Error("数据库未初始化"));

  _db.collection("user_data").where({ uid: _uid }).get().then(function(res) {
    if (!res.data || res.data.length === 0) {
      return callback(null, null); // 无数据
    }
    var cloudRecord = res.data[0];
    callback(null, {
      appData: cloudRecord.appData,
      books: cloudRecord.books,
      bookProgress: cloudRecord.bookProgress,
      theme: cloudRecord.theme,
      updatedAt: cloudRecord.updatedAt
    });
  }).catch(function(e) {
    callback(e);
  });
}

/**
 * 同步：比较时间戳，自动选择较新的数据
 */
function cloudSync(callback) {
  cloudDownloadData(function(err, cloudData) {
    if (err) return callback(err);

    if (!cloudData) {
      // 云端无数据，上传本地
      cloudUploadData(function(e2) {
        callback(e2, "uploaded");
      });
      return;
    }

    // 云端有数据：合并策略（云端数据覆盖本地，因为云端是最后上传的）
    if (cloudData.appData) {
      saveData(cloudData.appData);
    }
    if (cloudData.books) {
      localStorage.setItem("wenfeng_books", JSON.stringify(cloudData.books));
    }
    if (cloudData.bookProgress) {
      localStorage.setItem("wenfeng_book_progress", cloudData.bookProgress);
    }
    if (cloudData.theme) {
      setCurrentTheme(cloudData.theme.current || "default");
      if (cloudData.theme.purchased) {
        localStorage.setItem("wenfeng_purchased_themes", JSON.stringify(cloudData.theme.purchased));
      }
    }

    initTheme();
    updateQuoteBar();
    switchTab("checkin");
    callback(null, "downloaded");
  });
}

/* ========================================
   金币排行榜
   ======================================== */

/**
 * 推送分数到排行榜
 */
function cloudPushLeaderboard(coins, username, callback) {
  if (!_uid) return;
  if (!_db) return;

  var displayName = username || "匿名用户";
  var level = getUserLevel();

  _db.collection("leaderboard").where({ uid: _uid }).get().then(function(res) {
    var entry = {
      uid: _uid,
      username: displayName,
      coins: coins,
      level: level.level,
      levelName: level.name,
      updatedAt: new Date().toISOString()
    };

    if (res.data && res.data.length > 0) {
      return _db.collection("leaderboard").doc(res.data[0]._id).set(entry);
    } else {
      return _db.collection("leaderboard").add(entry);
    }
  }).then(function() {
    if (callback) callback(null);
  }).catch(function(e) {
    if (callback) callback(e);
  });
}

/**
 * 获取排行榜前 N 名
 */
function cloudFetchLeaderboard(limit, callback) {
  if (!_db) return callback(new Error("数据库未初始化"));
  limit = limit || 20;

  _db.collection("leaderboard")
    .orderBy("coins", "desc")
    .limit(limit)
    .get()
    .then(function(res) {
      callback(null, res.data || []);
    })
    .catch(function(e) {
      callback(e);
    });
}

/**
 * 显示排行榜弹窗
 */
function showLeaderboard() {
  var html = '<div class="modal-title">金币排行榜</div>';
  html += '<div class="modal-body" style="text-align:center">';
  html += '<p>正在加载排行榜...</p>';
  html += '</div>';
  showModal(html, null, "关闭", null);

  cloudFetchLeaderboard(20, function(err, data) {
    if (err) {
      var b = document.getElementById("modal-box");
      b.querySelector(".modal-body").innerHTML = '<p style="color:#E64340">加载失败：' + err.message + '</p>';
      return;
    }

    var table = '<table style="width:100%;border-collapse:collapse;font-size:14px;text-align:left">';
    table += '<tr style="border-bottom:2px solid var(--brand)"><th style="padding:8px">#</th><th>昵称</th><th>等级</th><th>金币</th></tr>';
    data.forEach(function(entry, i) {
      var isMe = (entry.uid === _uid);
      var bg = isMe ? "background:rgba(7,193,96,0.1)" : "";
      table += '<tr style="border-bottom:1px solid #eee;' + bg + '">';
      table += '<td style="padding:8px">' + (i + 1) + '</td>';
      table += '<td>' + (entry.username || "匿名用户") + (isMe ? ' (我)' : '') + '</td>';
      table += '<td>Lv.' + (entry.level || 1) + '</td>';
      table += '<td style="color:#FF9500;font-weight:600">' + (entry.coins || 0) + '</td>';
      table += '</tr>';
    });
    if (data.length === 0) {
      table += '<tr><td colspan="4" style="text-align:center;padding:16px;color:#999">暂无数据</td></tr>';
    }
    table += '</table>';

    var b = document.getElementById("modal-box");
    b.querySelector(".modal-body").innerHTML = table;
  });
}