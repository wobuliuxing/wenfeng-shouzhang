/* ========================================
   本地存储引擎 - localStorage 封装
   数据结构：任务、打卡记录、金币、书签、账号
   ======================================== */
var STORAGE_KEY = "wenfeng_data";

/**
 * 读取全部数据
 */
function loadData() {
  try {
    var raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultData();
    return JSON.parse(raw);
  } catch (e) {
    return getDefaultData();
  }
}

/**
 * 保存全部数据
 */
function saveData(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    showToast("保存失败：存储空间不足");
  }
}

/** 默认数据结构 */
function getDefaultData() {
  return {
    tasks: [],            // { id, name, freq, note, customDay, signature, records: ["2026-07-01",...], created }
    account: {            // 简单昵称
      username: "",
      gender: "",         // "男" / "女" / ""
      age: "",            // 年龄（字符串）
      registered: false,  // 是否注册（用于区分完整账号和本地昵称）
      passwordHash: ""    // 密码哈希
    },
    coins: 0,             // 金币总数
    lastCheckinDate: "",  // 上次打卡日期
    currentStreak: 0,     // 当前连续天数
    todayCoinDate: "",    // 哪天发过金币（每天只发一次）
    theme: "default",     // 当前主题名
    purchasedThemes: ["default"], // 已购买主题
    soundEnabled: true,   // 打卡铃声开关
    soundFile: "",        // 自定义铃声（base64/dataURL）
  };
}

/**
 * 获取所有任务
 */
function getTasks() {
  return loadData().tasks;
}

/**
 * 保存任务列表
 */
function saveTasks(tasks) {
  var data = loadData();
  data.tasks = tasks;
  saveData(data);
}

/**
 * 添加任务
 * @returns {object} 新任务对象
 */
function addTask(name, freq, note, customDay, signature) {
  var data = loadData();
  var tid = "t_" + Date.now() + "_" + Math.random().toString(36).substr(2, 6);
  var task = {
    id: tid,
    name: name,
    freq: freq || "daily",
    note: note || "",
    customDay: customDay || "",
    signature: signature || "",
    records: [],
    created: getTodayStr()
  };
  data.tasks.push(task);
  saveData(data);
  return task;
}

/**
 * 删除任务
 */
function deleteTask(tid) {
  var data = loadData();
  data.tasks = data.tasks.filter(function(t) { return t.id !== tid; });
  saveData(data);
}

/**
 * 获取某个任务
 */
function getTask(tid) {
  var tasks = getTasks();
  for (var i = 0; i < tasks.length; i++) {
    if (tasks[i].id === tid) return tasks[i];
  }
  return null;
}

/**
 * 今日是否已打卡
 */
function isCheckedToday(task) {
  var today = getTodayStr();
  return task.records.indexOf(today) >= 0;
}

/**
 * 打卡
 * @returns {object} { success, streak, coinsEarned, alreadyChecked }
 */
function doCheckin(tid) {
  var data = loadData();
  var task = null;
  for (var i = 0; i < data.tasks.length; i++) {
    if (data.tasks[i].id === tid) {
      task = data.tasks[i];
      break;
    }
  }
  if (!task) return { success: false, reason: "任务不存在" };

  var today = getTodayStr();
  if (task.records.indexOf(today) >= 0) {
    return { success: false, alreadyChecked: true };
  }

  task.records.push(today);

  // 计算连续打卡天数与金币
  var lastDate = data.lastCheckinDate;
  var yesterday = getDateStr(-1);

  if (lastDate === yesterday) {
    // 连续打卡
    data.currentStreak += 1;
  } else if (lastDate === today) {
    // 同一天（理论上不会进这里，但防御）
    data.currentStreak = Math.max(data.currentStreak, 1);
  } else {
    // 断签，重新开始
    data.currentStreak = 1;
  }

  data.lastCheckinDate = today;

  // ★ 每天只有第一个打卡发金币
  var coinsEarned = 0;
  if (data.todayCoinDate !== today) {
    coinsEarned = data.currentStreak; // 第N天得N金币
    data.coins += coinsEarned;
    data.todayCoinDate = today;
  }

  saveData(data);

  return {
    success: true,
    streak: data.currentStreak,
    coinsEarned: coinsEarned,
    totalCoins: data.coins,
    taskName: task.name
  };
}

/**
 * 获取连续打卡天数（全局）
 */
function getCurrentStreak() {
  return loadData().currentStreak;
}

/**
 * 获取总金币
 */
function getCoins() {
  return loadData().coins;
}

/**
 * 花费金币
 * @returns {boolean} 是否成功
 */
function spendCoins(amount) {
  var data = loadData();
  if (data.coins < amount) return false;
  data.coins -= amount;
  saveData(data);
  return true;
}

/**
 * 购买主题
 */
function purchaseTheme(themeId, cost) {
  var data = loadData();
  if (data.coins < cost) return false;
  if (data.purchasedThemes.indexOf(themeId) >= 0) return true; // 已拥有
  data.coins -= cost;
  data.purchasedThemes.push(themeId);
  saveData(data);
  return true;
}

/**
 * 设置当前主题
 */
function setCurrentTheme(themeId) {
  var data = loadData();
  data.theme = themeId;
  saveData(data);
}

function getCurrentTheme() {
  return loadData().theme;
}

function getPurchasedThemes() {
  return loadData().purchasedThemes;
}

/**
 * 账号：手动设置昵称
 */
function setUsername(username) {
  var data = loadData();
  data.account.username = username.trim();
  saveData(data);
}

function getUsername() {
  var data = loadData();
  return data.account.username || "未设置";
}

function getGender() {
  return loadData().account.gender || "";
}

function setGender(gender) {
  var data = loadData();
  data.account.gender = gender;
  saveData(data);
}

function getAge() {
  return loadData().account.age || "";
}

function setAge(age) {
  var data = loadData();
  data.account.age = age;
  saveData(data);
}

function isRegistered() {
  return loadData().account.registered || false;
}

function registerAccount(username, password) {
  var data = loadData();
  if (data.account.registered) return { ok: false, msg: "账号已注册，请登录" };
  data.account.registered = true;
  data.account.username = username.trim();
  data.account.passwordHash = simpleHash(password);
  saveData(data);
  return { ok: true };
}

function loginAccount(username, password) {
  var data = loadData();
  if (!data.account.registered) return { ok: false, msg: "尚未注册，请先注册" };
  if (data.account.username !== username.trim()) return { ok: false, msg: "用户名不存在" };
  if (data.account.passwordHash !== simpleHash(password)) return { ok: false, msg: "密码错误" };
  return { ok: true, username: data.account.username };
}

function logoutAccount() {
  var data = loadData();
  data.account.registered = false;
  data.account.passwordHash = "";
  // 保留本地数据
  saveData(data);
}

function simpleHash(str) {
  var hash = 0;
  for (var i = 0; i < str.length; i++) {
    var ch = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + ch;
    hash |= 0;
  }
  return "h_" + hash.toString(36);
}

/**
 * 声音设置
 */
function getSoundEnabled() {
  return loadData().soundEnabled;
}

function setSoundEnabled(enabled) {
  var data = loadData();
  data.soundEnabled = enabled;
  saveData(data);
}

function getSoundFile() {
  return loadData().soundFile || "";
}

function setSoundFile(base64) {
  var data = loadData();
  data.soundFile = base64;
  saveData(data);
}

/**
 * 计算某任务的连续天数
 */
function getTaskStreak(task) {
  var records = task.records.slice().sort().reverse();
  if (records.length === 0) return 0;

  var freq = task.freq || "daily";
  var today = new Date();
  var count = 0;

  if (freq === "daily") {
    var cursor = today;
    for (var i = 0; i < records.length; i++) {
      var d = parseDate(records[i]);
      if (!d) continue;
      if (dateEqual(d, cursor)) {
        count++;
        cursor.setDate(cursor.getDate() - 1);
      } else if (d < cursor) {
        break;
      }
    }
  } else if (freq === "weekly") {
    // 本周一
    var mon = new Date(today);
    mon.setDate(mon.getDate() - mon.getDay() + 1);
    if (mon.getDay() === 0) mon.setDate(mon.getDate() - 6);
    for (var j = 0; j < records.length; j++) {
      var d2 = parseDate(records[j]);
      if (!d2) continue;
      var dw = new Date(d2);
      dw.setDate(dw.getDate() - dw.getDay() + 1);
      if (dw.getDay() === 0) dw.setDate(dw.getDate() - 6);
      if (dateEqual(dw, mon)) {
        count++;
        mon.setDate(mon.getDate() - 7);
      } else if (dw < mon) {
        break;
      }
    }
  } else if (freq === "monthly") {
    var y = today.getFullYear();
    var m = today.getMonth() + 1;
    for (var k = 0; k < records.length; k++) {
      var d3 = parseDate(records[k]);
      if (!d3) continue;
      if (d3.getFullYear() === y && d3.getMonth() + 1 === m) {
        count++;
        m--;
        if (m === 0) { m = 12; y--; }
      } else if (d3.getFullYear() < y || (d3.getFullYear() === y && d3.getMonth() + 1 < m)) {
        break;
      }
    }
  }
  return count;
}

function getTaskTotal(task) {
  return task.records.length;
}

/**
 * 获取所有打卡记录用于统计
 */
function getAllRecords() {
  var tasks = getTasks();
  var allRecords = [];
  tasks.forEach(function(t) {
    t.records.forEach(function(r) {
      allRecords.push({ date: r, taskName: t.name, taskId: t.id });
    });
  });
  allRecords.sort(function(a, b) { return a.date.localeCompare(b.date); });
  return allRecords;
}

/* ========================================
   工具函数
   ======================================== */

function getTodayStr() {
  var d = new Date();
  return d.getFullYear() + "-" +
         pad(d.getMonth() + 1) + "-" +
         pad(d.getDate());
}

function getDateStr(offsetDays) {
  var d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.getFullYear() + "-" +
         pad(d.getMonth() + 1) + "-" +
         pad(d.getDate());
}

function pad(n) {
  return n < 10 ? "0" + n : "" + n;
}

function parseDate(str) {
  var parts = str.split("-");
  if (parts.length !== 3) return null;
  return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
}

function dateEqual(d1, d2) {
  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth() === d2.getMonth() &&
         d1.getDate() === d2.getDate();
}

function freqLabel(freq) {
  var map = { daily: "每天", weekly: "每周", monthly: "每月" };
  return map[freq] || freq;
}

function freqUnit(freq) {
  var map = { daily: "天", weekly: "周", monthly: "月" };
  return map[freq] || "天";
}

/* ========================================
   等级体系
   ======================================== */

var LEVELS = [
  { level: 1, name: "初心萌芽", minDays: 0, badge: "🌱" },
  { level: 2, name: "嫩芽新绿", minDays: 2, badge: "🌿" },
  { level: 3, name: "一周小苗", minDays: 7, badge: "☘️" },
  { level: 4, name: "月度小树", minDays: 30, badge: "🌳" },
  { level: 5, name: "季度繁花", minDays: 90, badge: "🌸" },
  { level: 6, name: "半年硕果", minDays: 180, badge: "🍎" },
  { level: 7, name: "年度参天", minDays: 365, badge: "🌲" },
  { level: 8, name: "两年不凋", minDays: 730, badge: "🌾" },
  { level: 9, name: "三年永恒", minDays: 1095, badge: "✨" }
];

function getUserLevel() {
  var streak = getCurrentStreak();
  var level = LEVELS[0];
  for (var i = LEVELS.length - 1; i >= 0; i--) {
    if (streak >= LEVELS[i].minDays) {
      level = LEVELS[i];
      break;
    }
  }
  return level;
}

function getLevelProgress() {
  var streak = getCurrentStreak();
  var currentLevel = getUserLevel();
  var nextLevel = LEVELS[currentLevel.level]; // same level if max, or next
  if (currentLevel.level >= LEVELS.length) {
    // 已满级
    return { current: streak, next: streak, pct: 100 };
  }
  var nextMinDays = LEVELS[currentLevel.level].minDays;
  var prevMinDays = currentLevel.minDays;
  if (nextMinDays === prevMinDays) return { current: streak, next: nextMinDays, pct: 100 };
  var pct = Math.min(100, Math.round((streak - prevMinDays) / (nextMinDays - prevMinDays) * 100));
  return { current: streak, next: nextMinDays, pct: pct };
}
