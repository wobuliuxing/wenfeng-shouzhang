/* ========================================
   籽芽手账 - 通知提醒模块
   功能：
   1. 六时书定时打卡提醒（按 reminderTime 字段）
   2. 每日晚上9点提醒忘记打卡的任务
   使用 @capacitor/local-notifications 插件（APK 模式）
   网页模式降级为提醒文本
   ======================================== */

/* 通知 ID 基数（避免与其他通知冲突） */
var NOTIF_ID_MOMENTBOOK_BASE = 1000;  // 六时书提醒：1000 + bookIndex
var NOTIF_ID_EVENING_REMINDER = 999;   // 晚9点提醒

/**
 * 获取 Local Notifications 插件（仅 APK 模式可用）
 */
function _getNotifPlugin() {
  try {
    if (typeof window.Capacitor !== "undefined" &&
        window.Capacitor.Plugins &&
        window.Capacitor.Plugins.LocalNotifications) {
      return window.Capacitor.Plugins.LocalNotifications;
    }
  } catch (e) {}
  return null;
}

/**
 * 检测是否在 Capacitor APK 中运行
 */
function _isNotifCapacitor() {
  return !!_getNotifPlugin();
}

/**
 * 初始化通知提醒
 * 在 app.js DOMContentLoaded 中调用
 */
function initNotifications() {
  if (!_isNotifCapacitor()) {
    console.log("通知功能需要 APK 环境，网页模式跳过");
    return;
  }

  var notif = _getNotifPlugin();

  // 请求通知权限
  notif.requestPermissions().then(function(result) {
    if (result.display !== "granted") {
      console.warn("通知权限未授予");
      return;
    }
    console.log("通知权限已授予");

    // 调度所有通知
    scheduleAllNotifications();
  }).catch(function(err) {
    console.warn("请求通知权限失败:", err);
  });
}

/**
 * 调度所有通知提醒
 * 1. 六时书定时提醒
 * 2. 每日晚上9点未打卡提醒
 */
function scheduleAllNotifications() {
  if (!_isNotifCapacitor()) return;

  var notif = _getNotifPlugin();

  // 先取消所有已调度的通知
  notif.getPending().then(function(result) {
    var pendingIds = (result.notifications || []).map(function(n) { return n.id; });
    if (pendingIds.length > 0) {
      return notif.cancel(pendingIds);
    }
  }).then(function() {
    // 重新调度
    _scheduleMomentBookReminders();
    _scheduleEveningReminder();
  }).catch(function(err) {
    console.warn("调度通知失败:", err);
    // 即使取消失败也尝试调度
    _scheduleMomentBookReminders();
    _scheduleEveningReminder();
  });
}

/**
 * 六时书定时提醒
 * 读取所有六时书的 reminderTime 字段，到点发通知
 */
function _scheduleMomentBookReminders() {
  if (!_isNotifCapacitor()) return;
  if (!isPractitionerActivated()) return;

  var notif = _getNotifPlugin();
  var sixBooks = getMomentBooks("six");
  var threeBooks = getMomentBooks("three");
  var oneBooks = getMomentBooks("one");

  var allBooks = [];
  // 六时书
  sixBooks.forEach(function(b, i) {
    allBooks.push({ type: "six", book: b, index: i });
  });
  // 三时书
  threeBooks.forEach(function(b, i) {
    allBooks.push({ type: "three", book: b, index: i });
  });
  // 一时书
  oneBooks.forEach(function(b, i) {
    allBooks.push({ type: "one", book: b, index: i });
  });

  var schedules = [];
  var notifIdCounter = NOTIF_ID_MOMENTBOOK_BASE;

  allBooks.forEach(function(item) {
    var book = item.book;
    var reminderTime = book.reminderTime;
    if (!reminderTime || !/^\d{1,2}:\d{2}$/.test(reminderTime)) return;

    var parts = reminderTime.split(":");
    var hour = parseInt(parts[0]);
    var minute = parseInt(parts[1]);

    var config = MOMENT_BOOK_CONFIG[item.type];
    var bookName = book.name || config.name;

    // 检查今天是否已完成
    var todayRecords = book.records.filter(function(r) { return r.date === getTodayStr(); });
    if (todayRecords.length >= config.maxPerDay) return;  // 今天已完成

    notifIdCounter++;
    schedules.push({
      id: notifIdCounter,
      title: config.name + "提醒",
      body: "「" + bookName + "」该打卡了！今日已记录 " + todayRecords.length + "/" + config.maxPerDay + " 次",
      schedule: {
        on: {
          hour: hour,
          minute: minute
        },
        every: "day"
      },
      smallIcon: "ic_stat_icon",
      largeBody: "别忘了完成今日的" + config.name + "打卡记录。",
      priority: 2,
      sound: "default"
    });
  });

  if (schedules.length > 0) {
    notif.create(schedules).then(function() {
      console.log("已调度 " + schedules.length + " 条六时书提醒");
    }).catch(function(err) {
      console.warn("调度六时书提醒失败:", err);
    });
  }
}

/**
 * 每日晚上9点提醒忘记打卡的任务
 * 检查当天所有未打卡的任务（普通任务 + 时刻书）
 */
function _scheduleEveningReminder() {
  if (!_isNotifCapacitor()) return;

  var notif = _getNotifPlugin();
  var today = getTodayStr();

  // 收集所有未打卡的任务名
  var uncheckedNames = [];

  // 普通任务
  var tasks = getTasks();
  tasks.forEach(function(task) {
    if (task.records.indexOf(today) < 0) {
      uncheckedNames.push(task.name);
    }
  });

  // 时刻书（仅践行者）
  if (isPractitionerActivated()) {
    var types = ["one", "three", "six"];
    types.forEach(function(type) {
      var books = getMomentBooks(type);
      var config = MOMENT_BOOK_CONFIG[type];
      books.forEach(function(book) {
        var todayRecords = book.records.filter(function(r) { return r.date === today; });
        if (todayRecords.length < config.maxPerDay) {
          uncheckedNames.push(config.name + "：" + book.name);
        }
      });
    });

    // 不抱怨挑战（今日无记录也算未完成）
    var ncChallenges = getNoComplaintChallenges();
    ncChallenges.forEach(function(ch) {
      var hasToday = false;
      for (var i = 0; i < ch.records.length; i++) {
        if (ch.records[i].date === today) { hasToday = true; break; }
      }
      if (!hasToday) {
        uncheckedNames.push("不抱怨：" + ch.name);
      }
    });
  }

  // 如果有未打卡的任务，调度晚9点提醒
  // 即使当前没有未打卡任务也调度（因为每天任务状态会变）
  var bodyText;
  if (uncheckedNames.length === 0) {
    bodyText = "今天的打卡任务都完成了，继续保持！";
  } else if (uncheckedNames.length <= 3) {
    bodyText = "还有 " + uncheckedNames.length + " 个任务未打卡：" + uncheckedNames.join("、");
  } else {
    bodyText = "还有 " + uncheckedNames.length + " 个任务未打卡，快来完成吧！";
  }

  var schedule = {
    id: NOTIF_ID_EVENING_REMINDER,
    title: "籽芽手账打卡提醒",
    body: bodyText,
    schedule: {
      on: {
        hour: 21,
        minute: 0
      },
      every: "day"
    },
    smallIcon: "ic_stat_icon",
    largeBody: uncheckedNames.length > 0
      ? "今日未完成：" + uncheckedNames.slice(0, 5).join("、") + (uncheckedNames.length > 5 ? "..." : "")
      : "今天全部完成，太棒了！",
    priority: 2,
    sound: "default"
  };

  notif.create([schedule]).then(function() {
    console.log("已调度晚9点打卡提醒");
  }).catch(function(err) {
    console.warn("调度晚9点提醒失败:", err);
  });
}

/**
 * 手动刷新通知调度
 * 在新增/编辑/删除任务后调用
 */
function refreshNotifications() {
  if (_isNotifCapacitor()) {
    scheduleAllNotifications();
  }
}
