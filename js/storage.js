/* ========================================
   本地存储引擎 - localStorage 封装
   数据结构：任务、打卡记录、梦想币、书签、账号
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
      phone: "",          // 手机号（云同步唯一标识）
      registered: false,  // 是否注册（用于区分完整账号和本地昵称）
      passwordHash: ""    // 密码哈希
    },
    coins: 0,             // 梦想币总数
    lastCheckinDate: "",  // 上次打卡日期
    currentStreak: 0,     // 当前连续天数
    todayCoinDate: "",    // 哪天发过梦想币（每天只发一次）
    theme: "default",     // 当前主题名
    purchasedThemes: ["default"], // 已购买主题
    // 践行者模块
    practitioner: {
      activated: false,   // 是否已激活
      activationCode: "",  // 使用的激活码
      activatedDate: "",  // 激活日期
      avatar: "",         // 专属头像（未来可扩展）
      icon: "default"     // 专属图标样式
    },
    // 不抱怨挑战
    noComplaint: {
      challenges: []      // { id, name, targetDays, note, signature, records: [{date, count, times: [{time, note}]}], created }
    },
    // 一时书
    oneMomentBook: {
      books: []           // { id, name, prompt, reminderTime, signature, records: [{date, type, data}], created }
    },
    // 三时书（比一时书多1次打卡，共3次/天）
    threeMomentBook: {
      books: []
    },
    // 六时书（比一时书多5次打卡，共7次/天）
    sixMomentBook: {
      books: []
    },
    // 阳光雨露（连续3天打卡激活）
    sunshine: {
      entries: []  // { id, name, content, action, records: ["2026-07-01",...], created }
    },
    dreams: [             // 梦想中心：坚持天数+奖励
      { id: "dream_7", name: "坚持7天的小约定", targetDays: 7, reward: "一杯奶茶", isDefault: true, completed: false, completedDate: "" },
      { id: "dream_21", name: "21天养成好习惯", targetDays: 21, reward: "一个可自选的主题", isDefault: true, completed: false, completedDate: "" },
      { id: "dream_60", name: "60天给自己的礼物", targetDays: 60, reward: "一天假期", isDefault: true, completed: false, completedDate: "" }
    ],
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
 * 更新任务（编辑）
 */
function updateTask(tid, name, freq, note, customDay, signature) {
  var data = loadData();
  for (var i = 0; i < data.tasks.length; i++) {
    if (data.tasks[i].id === tid) {
      data.tasks[i].name = name;
      data.tasks[i].freq = freq || "daily";
      data.tasks[i].note = note || "";
      data.tasks[i].customDay = customDay || "";
      data.tasks[i].signature = signature || "";
      break;
    }
  }
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

  // 计算连续打卡天数与梦想币
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

  // ★ 每天只有第一个打卡发梦想币
  var coinsEarned = 0;
  if (data.todayCoinDate !== today) {
    coinsEarned = data.currentStreak; // 第N天得N梦想币
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
 * 获取总梦想币
 */
function getCoins() {
  return loadData().coins;
}

/**
 * 花费梦想币
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

function getPhone() {
  return loadData().account.phone || "";
}

function setPhone(phone) {
  var data = loadData();
  data.account.phone = phone;
  saveData(data);
}

function isRegistered() {
  return loadData().account.registered || false;
}

function registerAccount(username, password, phone) {
  var data = loadData();
  if (data.account.registered) return { ok: false, msg: "账号已注册，请登录" };
  data.account.registered = true;
  data.account.username = username.trim();
  data.account.passwordHash = simpleHash(password);
  data.account.phone = (phone || "").trim();
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

/**
 * 获取总打卡天数（所有任务去重后的日期数）
 * 用于排行榜展示
 */
function getTotalCheckinDays() {
  var tasks = getTasks();
  var dateSet = {};
  tasks.forEach(function(t) {
    t.records.forEach(function(r) {
      dateSet[r] = true;
    });
  });
  return Object.keys(dateSet).length;
}

/* ========================================
   梦想中心
   ======================================== */

/**
 * 获取所有梦想
 */
function getDreams() {
  var data = loadData();
  if (!data.dreams) {
    data.dreams = getDefaultData().dreams;
    saveData(data);
  }
  return data.dreams;
}

/**
 * 添加自定义梦想
 */
function addDream(name, targetDays, reward) {
  var data = loadData();
  if (!data.dreams) data.dreams = getDefaultData().dreams;
  var dream = {
    id: "dream_" + Date.now() + "_" + Math.random().toString(36).substr(2, 6),
    name: name,
    targetDays: parseInt(targetDays),
    reward: reward,
    isDefault: false,
    completed: false,
    completedDate: ""
  };
  data.dreams.push(dream);
  saveData(data);
  return dream;
}

/**
 * 删除梦想
 */
function deleteDream(id) {
  var data = loadData();
  if (!data.dreams) return;
  data.dreams = data.dreams.filter(function(d) { return d.id !== id; });
  saveData(data);
}

/**
 * 检查梦想完成状态
 * 基于当前连续打卡天数
 * @returns {array} 新完成的梦想列表
 */
function checkDreamCompletion() {
  var data = loadData();
  if (!data.dreams) return [];
  var streak = data.currentStreak || 0;
  var newlyCompleted = [];

  data.dreams.forEach(function(dream) {
    if (!dream.completed && streak >= dream.targetDays) {
      dream.completed = true;
      dream.completedDate = getTodayStr();
      newlyCompleted.push(dream);
    }
  });

  if (newlyCompleted.length > 0) {
    saveData(data);
  }

  return newlyCompleted;
}

/* ========================================
   践行者模块 - 激活码系统
   ======================================== */

// 有效激活码列表（10个）
var ACTIVATION_CODES = [
  "WF-8X2K-9PM7",
  "WF-N3Q5-RZAC",
  "WF-B6C8-D2E4",
  "WF-F7G9-H1J3",
  "WF-K6L8-M2P5",
  "WF-Q7R9-S3T5",
  "WF-U4V6-W8X3",
  "WF-Y5Z7-A1B4",
  "WF-C6D8-E2F5",
  "WF-G7H9-J3K6"
];

/**
 * 获取已使用的激活码列表
 */
function getUsedActivationCodes() {
  var data = loadData();
  if (!data._usedCodes) data._usedCodes = [];
  return data._usedCodes;
}

/**
 * 验证并激活践行者
 * @param {string} code - 激活码
 * @returns {object} { success, msg }
 */
function activatePractitioner(code) {
  var cleanCode = code.trim().toUpperCase();

  // 检查格式
  if (!/^WF-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(cleanCode)) {
    return { success: false, msg: "激活码格式不正确，请检查后重试" };
  }

  // 检查是否有效码
  var valid = false;
  for (var i = 0; i < ACTIVATION_CODES.length; i++) {
    if (ACTIVATION_CODES[i] === cleanCode) { valid = true; break; }
  }
  if (!valid) {
    return { success: false, msg: "激活码无效，请确认后重试" };
  }

  // 检查是否已使用（本地）
  var used = getUsedActivationCodes();
  if (used.indexOf(cleanCode) >= 0) {
    return { success: false, msg: "该激活码已被使用，请联系管理员" };
  }

  // 激活
  var data = loadData();
  if (!data._usedCodes) data._usedCodes = [];
  data._usedCodes.push(cleanCode);
  if (!data.practitioner) data.practitioner = { activated: false, activationCode: "", activatedDate: "", avatar: "", icon: "default" };
  data.practitioner.activated = true;
  data.practitioner.activationCode = cleanCode;
  data.practitioner.activatedDate = getTodayStr();
  saveData(data);

  return { success: true, msg: "践行者模块已激活！专属主题和功能已解锁" };
}

/**
 * 检查践行者是否已激活
 */
function isPractitionerActivated() {
  var data = loadData();
  return data.practitioner && data.practitioner.activated;
}

/* ========================================
   不抱怨模块
   ======================================== */

/**
 * 获取所有不抱怨挑战
 */
function getNoComplaintChallenges() {
  var data = loadData();
  if (!data.noComplaint) data.noComplaint = { challenges: [] };
  return data.noComplaint.challenges;
}

/**
 * 添加不抱怨挑战
 */
function addNoComplaintChallenge(name, targetDays, note, signature) {
  var data = loadData();
  if (!data.noComplaint) data.noComplaint = { challenges: [] };
  var challenge = {
    id: "nc_" + Date.now() + "_" + Math.random().toString(36).substr(2, 6),
    name: name || "不抱怨挑战",
    targetDays: parseInt(targetDays) || 21,
    note: note || "",
    signature: signature || "",
    records: [],       // { date: "2026-07-01", count: 5, times: [{ time: "09:30", note: "" }] }
    created: getTodayStr(),
    completed: false
  };
  data.noComplaint.challenges.push(challenge);
  saveData(data);
  return challenge;
}

/**
 * 获取某个不抱怨挑战
 */
function getNoComplaintChallenge(cid) {
  var challenges = getNoComplaintChallenges();
  for (var i = 0; i < challenges.length; i++) {
    if (challenges[i].id === cid) return challenges[i];
  }
  return null;
}

/**
 * 添加抱怨记录（一天可多次）
 */
function addComplaintRecord(cid) {
  var data = loadData();
  if (!data.noComplaint) return null;
  var challenge = null;
  var cidx = -1;
  for (var i = 0; i < data.noComplaint.challenges.length; i++) {
    if (data.noComplaint.challenges[i].id === cid) {
      challenge = data.noComplaint.challenges[i];
      cidx = i;
      break;
    }
  }
  if (!challenge) return null;

  var today = getTodayStr();
  var now = new Date();
  var timeStr = pad(now.getHours()) + ":" + pad(now.getMinutes());

  // 查找今天的记录
  var todayRecord = null;
  for (var j = 0; j < challenge.records.length; j++) {
    if (challenge.records[j].date === today) {
      todayRecord = challenge.records[j];
      break;
    }
  }

  if (!todayRecord) {
    todayRecord = { date: today, count: 0, times: [] };
    challenge.records.push(todayRecord);
  }

  todayRecord.count += 1;
  todayRecord.times.push({ time: timeStr, note: "" });

  saveData(data);
  return challenge;
}

/**
 * 删除不抱怨挑战
 */
function deleteNoComplaintChallenge(cid) {
  var data = loadData();
  if (!data.noComplaint) return;
  data.noComplaint.challenges = data.noComplaint.challenges.filter(function(c) { return c.id !== cid; });
  saveData(data);
}

/* ========================================
   一时书模块
   ======================================== */

/**
 * 获取所有一时书
 */
function getOneMomentBooks() {
  var data = loadData();
  if (!data.oneMomentBook) data.oneMomentBook = { books: [] };
  return data.oneMomentBook.books;
}

/**
 * 添加一时书
 */
function addOneMomentBook(name, prompt, reminderTime, signature) {
  var data = loadData();
  if (!data.oneMomentBook) data.oneMomentBook = { books: [] };
  var book = {
    id: "omb_" + Date.now() + "_" + Math.random().toString(36).substr(2, 6),
    name: name || "我的目标",
    prompt: prompt || "目标要具体可落地",
    reminderTime: reminderTime || "",
    signature: signature || "",
    records: [],       // { date: "2026-07-01", type: "checkin|coffee", data: {...} }
    created: getTodayStr()
  };
  data.oneMomentBook.books.push(book);
  saveData(data);
  return book;
}

/**
 * 获取某个一时书
 */
function getOneMomentBook(bid) {
  var books = getOneMomentBooks();
  for (var i = 0; i < books.length; i++) {
    if (books[i].id === bid) return books[i];
  }
  return null;
}

/**
 * 添加一时书记录
 * type: "checkin" = 第一次打卡（正向/负面/利他）
 * type: "coffee" = 咖啡冥想
 */
function addOneMomentBookRecord(bid, type, recordData) {
  var data = loadData();
  if (!data.oneMomentBook) return null;
  var book = null;
  for (var i = 0; i < data.oneMomentBook.books.length; i++) {
    if (data.oneMomentBook.books[i].id === bid) {
      book = data.oneMomentBook.books[i];
      break;
    }
  }
  if (!book) return null;

  var today = getTodayStr();
  var record = {
    date: today,
    type: type,  // "checkin" or "coffee"
    data: recordData,
    created: new Date().toISOString()
  };
  book.records.push(record);
  saveData(data);
  return record;
}

/**
 * 删除一时书
 */
function deleteOneMomentBook(bid) {
  var data = loadData();
  if (!data.oneMomentBook) return;
  data.oneMomentBook.books = data.oneMomentBook.books.filter(function(b) { return b.id !== bid; });
  saveData(data);
}

/* ========================================
   通用时刻书模块（三时书、六时书）
   type: "three" = 三时书(3次/天), "six" = 六时书(7次/天)
   ======================================== */

var MOMENT_BOOK_CONFIG = {
  one:   { maxPerDay: 2, name: "一时书", checkinName: "六时书" },
  three: { maxPerDay: 3, name: "三时书", checkinName: "六时书" },
  six:   { maxPerDay: 7, name: "六时书", checkinName: "六时书" }
};

function _getMomentBookKey(type) {
  if (type === "three") return "threeMomentBook";
  if (type === "six") return "sixMomentBook";
  return "oneMomentBook";
}

function getMomentBooks(type) {
  var data = loadData();
  var key = _getMomentBookKey(type);
  if (!data[key]) data[key] = { books: [] };
  return data[key].books;
}

function addMomentBook(type, name, prompt, reminderTime, signature) {
  var data = loadData();
  var key = _getMomentBookKey(type);
  if (!data[key]) data[key] = { books: [] };
  var prefix = type === "three" ? "tmb_" : (type === "six" ? "smb_" : "omb_");
  var book = {
    id: prefix + Date.now() + "_" + Math.random().toString(36).substr(2, 6),
    name: name || "我的目标",
    prompt: prompt || "",
    reminderTime: reminderTime || "",
    signature: signature || "",
    records: [],
    created: getTodayStr()
  };
  data[key].books.push(book);
  saveData(data);
  return book;
}

function getMomentBook(type, bid) {
  var books = getMomentBooks(type);
  for (var i = 0; i < books.length; i++) {
    if (books[i].id === bid) return books[i];
  }
  return null;
}

function addMomentBookRecord(type, bid, recordType, recordData) {
  var data = loadData();
  var key = _getMomentBookKey(type);
  if (!data[key]) return null;
  var book = null;
  for (var i = 0; i < data[key].books.length; i++) {
    if (data[key].books[i].id === bid) {
      book = data[key].books[i];
      break;
    }
  }
  if (!book) return null;

  var today = getTodayStr();
  var record = {
    date: today,
    type: recordType,
    data: recordData,
    created: new Date().toISOString()
  };
  book.records.push(record);
  saveData(data);
  return record;
}

function deleteMomentBook(type, bid) {
  var data = loadData();
  var key = _getMomentBookKey(type);
  if (!data[key]) return;
  data[key].books = data[key].books.filter(function(b) { return b.id !== bid; });
  saveData(data);
}

/* ========================================
   连续打卡跟踪（践行者）
   ======================================== */

var STREAK_TARGETS = {
  dream:    { name: "梦想打卡", targetDays: 7,   desc: "连续打卡7天" },
  nocomplain: { name: "不抱怨", targetDays: 21,  desc: "连续21天不抱怨" },
  one:      { name: "一时书", targetDays: 30,  desc: "连续30天记录一时书" },
  three:    { name: "三时书", targetDays: 90,  desc: "连续90天记录三时书" },
  six:      { name: "六时书", targetDays: 180, desc: "连续180天记录六时书" }
};

function getPractitionerStreaks() {
  var data = loadData();
  if (!data.practitioner) data.practitioner = {};
  if (!data.practitioner.streaks) data.practitioner.streaks = {};
  return data.practitioner.streaks;
}

function setPractitionerStreak(key, enabled) {
  var data = loadData();
  if (!data.practitioner) data.practitioner = { activated: false };
  if (!data.practitioner.streaks) data.practitioner.streaks = {};
  data.practitioner.streaks[key] = { enabled: enabled, startDate: enabled ? getTodayStr() : "" };
  saveData(data);
}

function isStreakEnabled(key) {
  var streaks = getPractitionerStreaks();
  return streaks[key] && streaks[key].enabled;
}

/* ========================================
   阳光雨露模块
   ======================================== */

function getSunshineEntries() {
  var data = loadData();
  if (!data.sunshine) data.sunshine = { entries: [] };
  return data.sunshine.entries;
}

function addSunshineEntry(name, content, action) {
  var data = loadData();
  if (!data.sunshine) data.sunshine = { entries: [] };
  var entry = {
    id: "sun_" + Date.now() + "_" + Math.random().toString(36).substr(2, 6),
    name: name || "阳光雨露",
    content: content || "",
    action: action || "",
    records: [],
    created: getTodayStr()
  };
  data.sunshine.entries.push(entry);
  saveData(data);
  return entry;
}

function getSunshineEntry(eid) {
  var entries = getSunshineEntries();
  for (var i = 0; i < entries.length; i++) {
    if (entries[i].id === eid) return entries[i];
  }
  return null;
}

function addSunshineRecord(eid) {
  var data = loadData();
  if (!data.sunshine) return null;
  for (var i = 0; i < data.sunshine.entries.length; i++) {
    if (data.sunshine.entries[i].id === eid) {
      var today = getTodayStr();
      if (data.sunshine.entries[i].records.indexOf(today) >= 0) return data.sunshine.entries[i];
      data.sunshine.entries[i].records.push(today);
      saveData(data);
      return data.sunshine.entries[i];
    }
  }
  return null;
}

function deleteSunshineEntry(eid) {
  var data = loadData();
  if (!data.sunshine) return;
  data.sunshine.entries = data.sunshine.entries.filter(function(e) { return e.id !== eid; });
  saveData(data);
}

/* ========================================
   模块激活机制（连续打卡达标自动激活）
   有激活码则一次性全部激活
   ======================================== */

var ACTIVATION_TARGETS = {
  dream:     { name: "梦想中心", targetDays: 7,   desc: "连续打卡7天激活" },
  nocomplain:{ name: "不抱怨", targetDays: 21,  desc: "连续21天记录激活" },
  one:       { name: "一时书", targetDays: 30,  desc: "连续30天记录激活" },
  three:     { name: "三时书", targetDays: 90,  desc: "连续90天记录激活" },
  six:       { name: "六时书", targetDays: 180, desc: "连续180天记录激活" },
  sunshine:  { name: "阳光雨露", targetDays: 3,  desc: "连续3天记录激活" }
};

/**
 * 检查某个模块是否已激活
 * 有激活码 = 全部激活
 * 无激活码 = 检查连续打卡天数是否达标
 */
function isModuleActivated(key) {
  // 践行者已激活（有激活码），则全部模块激活
  if (isPractitionerActivated()) return true;

  var target = ACTIVATION_TARGETS[key];
  if (!target) return false;

  var streak = _getModuleStreak(key);
  return streak >= target.targetDays;
}

/**
 * 获取某模块的连续打卡天数
 */
function _getModuleStreak(key) {
  if (key === "dream") {
    return getCurrentStreak();
  }
  if (key === "nocomplain") {
    var ncChallenges = getNoComplaintChallenges();
    if (ncChallenges.length === 0) return 0;
    return _getNoComplaintStreakGlobal(ncChallenges);
  }
  if (key === "one" || key === "three" || key === "six") {
    var books = getMomentBooks(key);
    if (books.length === 0) return 0;
    return _getMomentBookStreakGlobal(books);
  }
  if (key === "sunshine") {
    var entries = getSunshineEntries();
    if (entries.length === 0) return 0;
    return _getSunshineStreakGlobal(entries);
  }
  return 0;
}

function _getNoComplaintStreakGlobal(challenges) {
  var dateSet = {};
  challenges.forEach(function(ch) {
    ch.records.forEach(function(r) { dateSet[r.date] = true; });
  });
  return _calcStreakFromDates(dateSet);
}

function _getMomentBookStreakGlobal(books) {
  var dateSet = {};
  books.forEach(function(book) {
    book.records.forEach(function(r) { dateSet[r.date] = true; });
  });
  return _calcStreakFromDates(dateSet);
}

function _getSunshineStreakGlobal(entries) {
  var dateSet = {};
  entries.forEach(function(e) {
    e.records.forEach(function(r) { dateSet[r] = true; });
  });
  return _calcStreakFromDates(dateSet);
}

function _calcStreakFromDates(dateSet) {
  var streak = 0;
  var cursor = new Date();
  while (true) {
    var dateStr = cursor.getFullYear() + "-" + pad(cursor.getMonth() + 1) + "-" + pad(cursor.getDate());
    if (dateSet[dateStr]) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

/**
 * 各模块的激活进度查询（返回当前连续天数，供"待激活 还需X天"显示）
 */
function getDreamCenterActivationProgress() { return _getModuleStreak("dream"); }
function getNoComplaintActivationProgress() { return _getModuleStreak("nocomplain"); }
function getMomentBookActivationProgress(type) { return _getModuleStreak(type || "one"); }
function getSunshineActivationProgress() { return _getModuleStreak("sunshine"); }

