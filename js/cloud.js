/* ========================================
   籽芽手账 - CloudBase 云同步 & 排行榜
   以手机号为唯一标识，跨设备数据同步
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
   数据同步（以手机号为唯一标识）
   ======================================== */

/**
 * 上传本地数据到云端
 * 以手机号作为主键查找/创建记录
 */
function cloudUploadData(callback) {
  if (!_db) return callback(new Error("数据库未初始化"));

  var localData = loadData();
  var books = getBooks();
  var bookProgress = localStorage.getItem("wenfeng_book_progress") || "{}";
  var themeLocal = {
    current: getCurrentTheme(),
    purchased: getPurchasedThemes()
  };
  var phone = getPhone();
  var username = getUsername();

  // 以手机号为唯一标识；若没手机号则用 uid
  var lookupKey = phone || _uid;
  if (!lookupKey) return callback(new Error("未登录，请先登录"));

  var uploadPayload = {
    uid: _uid,
    phone: phone,
    username: username,
    gender: getGender(),
    age: getAge(),
    appData: localData,
    books: books,
    bookProgress: bookProgress,
    theme: themeLocal,
    updatedAt: new Date().toISOString()
  };

  // 以手机号查找已有记录
  var query = phone
    ? _db.collection("user_data").where({ phone: phone })
    : _db.collection("user_data").where({ uid: _uid });

  query.get().then(function(res) {
    if (res.data && res.data.length > 0) {
      return _db.collection("user_data").doc(res.data[0]._id).set(uploadPayload);
    } else {
      return _db.collection("user_data").add(uploadPayload);
    }
  }).then(function() {
    callback(null);
  }).catch(function(e) {
    callback(e);
  });

  // 同时更新排行榜
  cloudPushLeaderboard(localData.coins, username, function() {});
}

/**
 * 从云端下载数据（以手机号查找）
 */
function cloudDownloadData(callback) {
  if (!_db) return callback(new Error("数据库未初始化"));

  var phone = getPhone();
  var query = phone
    ? _db.collection("user_data").where({ phone: phone })
    : _db.collection("user_data").where({ uid: _uid });

  if (!phone && !_uid) return callback(new Error("未登录"));

  query.get().then(function(res) {
    if (!res.data || res.data.length === 0) {
      return callback(null, null);
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
 * 以手机号查找云端账号
 * 用于卸载重装后恢复账号
 */
function cloudFindByPhone(phone, callback) {
  if (!_db) return callback(new Error("数据库未初始化"));
  if (!phone) return callback(new Error("请输入手机号"));

  _db.collection("user_data").where({ phone: phone }).get().then(function(res) {
    if (!res.data || res.data.length === 0) {
      callback(null, null);
    } else {
      var record = res.data[0];
      callback(null, {
        username: record.username,
        appData: record.appData,
        books: record.books,
        bookProgress: record.bookProgress,
        theme: record.theme,
        updatedAt: record.updatedAt
      });
    }
  }).catch(function(e) {
    callback(e);
  });
}

/**
 * 同步：默认上传本地数据到云端
 */
function cloudSync(callback) {
  cloudUploadData(function(e) {
    callback(e, "uploaded");
  });
}

/**
 * 登录后检查云端是否有数据，提示用户是否覆盖本地
 */
function cloudCheckAndPrompt(callback) {
  cloudDownloadData(function(err, cloudData) {
    if (err) { if (callback) callback(err); return; }

    if (!cloudData || !cloudData.appData) {
      cloudUploadData(function(e) {
        if (callback) callback(e, "uploaded");
      });
      return;
    }

    var cloudDate = cloudData.updatedAt ? new Date(cloudData.updatedAt).toLocaleString("zh-CN") : "未知时间";

    var html = '<div class="confirm-page">';
    html += '<p class="confirm-message">云端有一份备份数据（更新于 ' + cloudDate + '）。\n\n是否用云端数据覆盖本地？\n选"保留本地"则上传当前数据到云端。</p>';
    html += '<div class="confirm-actions">';
    html += '<button class="btn-secondary" id="cf-keep" style="flex:1;min-height:44px">保留本地</button>';
    html += '<button class="btn-primary" id="cf-overwrite" style="flex:1;min-height:44px">覆盖本地</button>';
    html += '</div>';
    html += '</div>';

    showPage("云端数据发现", html);

    var topPage = _pageStack[_pageStack.length - 1];
    if (!topPage) return;
    var pageEl = topPage.el;

    setTimeout(function() {
      var keepBtn = pageEl.querySelector("#cf-keep");
      if (keepBtn) keepBtn.addEventListener("click", function() {
        hidePage();
        cloudUploadData(function(e) {
          if (!e) showToast("本地数据已上传到云端");
          if (callback) callback(e, "uploaded");
        });
      });

      var overwriteBtn = pageEl.querySelector("#cf-overwrite");
      if (overwriteBtn) overwriteBtn.addEventListener("click", function() {
        if (cloudData.appData) saveData(cloudData.appData);
        if (cloudData.books) localStorage.setItem("wenfeng_books", JSON.stringify(cloudData.books));
        if (cloudData.bookProgress) localStorage.setItem("wenfeng_book_progress", cloudData.bookProgress);
        if (cloudData.theme) {
          setCurrentTheme(cloudData.theme.current || "default");
          if (cloudData.theme.purchased) {
            localStorage.setItem("wenfeng_purchased_themes", JSON.stringify(cloudData.theme.purchased));
          }
        }
        hidePage();
        initTheme();
        updateQuoteBar();
        switchTab("checkin");
        showToast("已用云端数据覆盖本地");
        if (callback) callback(null, "downloaded");
      });
    }, 50);
  });
}

/* ========================================
   打卡天数排行榜
   ======================================== */

/**
 * 推送排行榜数据
 * 以打卡天数为排名依据
 */
function cloudPushLeaderboard(coins, username, callback) {
  if (!_db) return;

  var phone = getPhone();
  var lookupKey = phone || _uid;
  if (!lookupKey) return;

  var displayName = username || "匿名用户";
  var streak = getCurrentStreak();
  var totalDays = getTotalCheckinDays();
  var level = getUserLevel();

  var entry = {
    uid: _uid,
    phone: phone,
    username: displayName,
    coins: coins,
    streak: streak,
    totalDays: totalDays,
    level: level.level,
    levelName: level.name,
    updatedAt: new Date().toISOString()
  };

  var query = phone
    ? _db.collection("leaderboard").where({ phone: phone })
    : _db.collection("leaderboard").where({ uid: _uid });

  query.get().then(function(res) {
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
 * 获取排行榜前 N 名（按打卡天数降序）
 */
function cloudFetchLeaderboard(limit, callback) {
  if (!_db) return callback(new Error("数据库未初始化"));
  limit = limit || 10;

  _db.collection("leaderboard")
    .orderBy("totalDays", "desc")
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
 * 获取当前用户在完整排行榜中的排名
 */
function cloudFetchUserRank(callback) {
  if (!_db) return callback(new Error("数据库未初始化"));

  var phone = getPhone();
  var lookupKey = phone || _uid;
  if (!lookupKey) return callback(null, null);

  // 先获取用户自己的数据
  var query = phone
    ? _db.collection("leaderboard").where({ phone: phone })
    : _db.collection("leaderboard").where({ uid: _uid });

  query.get().then(function(res) {
    if (!res.data || res.data.length === 0) {
      callback(null, null);
      return;
    }
    var myData = res.data[0];
    var myDays = myData.totalDays || 0;

    // 统计比我高的有多少人
    _db.collection("leaderboard")
      .where("totalDays", ">", myDays)
      .count()
      .then(function(countRes) {
        var rank = (countRes.total || 0) + 1;
        callback(null, { rank: rank, data: myData });
      })
      .catch(function(e) {
        callback(e);
      });
  }).catch(function(e) {
    callback(e);
  });
}

/**
 * 显示排行榜（页面，列表格式）
 * 默认前10名，最上方显示当前用户排名
 */
function showLeaderboard() {
  showPage("打卡排行榜", '<div style="text-align:center;padding:20px;color:#999">正在加载排行榜...</div>');

  // 先确保云服务初始化 + 匿名登录
  initCloudBase(function(initErr) {
    if (initErr) {
      _renderLeaderboardError("云服务连接失败：" + initErr.message);
      return;
    }

    // 匿名登录
    if (!_uid) {
      cloudSignInAnonymously(function(loginErr) {
        if (loginErr) {
          _renderLeaderboardError("登录失败：" + loginErr.message);
          return;
        }
        _fetchAndRenderLeaderboard();
      });
    } else {
      _fetchAndRenderLeaderboard();
    }
  });
}

function _renderLeaderboardError(msg) {
  var topPage = _pageStack[_pageStack.length - 1];
  if (topPage) topPage.el.querySelector(".page-body").innerHTML =
    '<p style="color:#E64340;text-align:center;padding:20px">' + msg + '</p>';
}

function _fetchAndRenderLeaderboard() {
  var leaderboardData = null;
  var userRankData = null;
  var completed = 0;

  function renderLb() {
    completed++;
    if (completed < 2) return;

    var topPage = _pageStack[_pageStack.length - 1];
    if (!topPage) return;
    var pageEl = topPage.el;

    var html = '<div class="leaderboard-page">';

    // 顶部：当前用户排名
    if (userRankData && userRankData.data) {
      html += '<div class="lb-my-rank">';
      html += '<div class="lb-my-rank-label">我的排名</div>';
      html += '<div class="lb-my-rank-num">第 ' + userRankData.rank + ' 名</div>';
      html += '<div class="lb-my-rank-info">' + (userRankData.data.username || "我") + " | 打卡 " + (userRankData.data.totalDays || 0) + " 天</div>";
      html += '</div>';
    } else {
      html += '<div class="lb-no-rank">暂无你的排名数据，打卡后再来看看吧</div>';
    }

    // 前10名列表
    html += '<div class="lb-list">';
    if (leaderboardData && leaderboardData.length > 0) {
      leaderboardData.forEach(function(entry, i) {
        var isMe = (entry.phone && getPhone() && entry.phone === getPhone()) ||
                   (entry.uid === _uid && !getPhone());
        html += '<div class="lb-item' + (isMe ? ' lb-item-me' : '') + '">';
        html += '<span class="lb-rank">第' + (i + 1) + '名</span>';
        html += '<span class="lb-name">' + (entry.username || "匿名用户") + (isMe ? ' (我)' : '') + '</span>';
        html += '<span class="lb-days">' + (entry.totalDays || 0) + ' 天</span>';
        html += '</div>';
      });
    } else {
      html += '<div style="text-align:center;padding:20px;color:#999">暂无排行榜数据</div>';
    }
    html += '</div>';

    html += '</div>';

    pageEl.querySelector(".page-body").innerHTML = html;
  }

  cloudFetchLeaderboard(10, function(err, data) {
    if (err) { _renderLeaderboardError("排行榜加载失败：" + err.message); return; }
    leaderboardData = data;
    renderLb();
  });

  cloudFetchUserRank(function(err, data) {
    if (err) { userRankData = null; }
    else { userRankData = data; }
    renderLb();
  });
}
