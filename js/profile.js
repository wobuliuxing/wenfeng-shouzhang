/* ========================================
   我的选项卡 - 账号 / 金币 / 主题 / 铃声
   ======================================== */

/**
 * 渲染"我的"页面
 */
function renderProfilePage() {
  var main = document.getElementById("main-content");
  main.innerHTML = "";

  var page = createEl("div", "tab-page active", { id: "page-profile" });

  // ── 头像区域 ──
  var header = createEl("div", "profile-section");
  var profileHeader = createEl("div", "profile-header");

  var avatar = createEl("div", "profile-avatar");
  var uname = getUsername();
  avatar.textContent = (uname && uname !== "未设置") ? uname[0] : "?";
  avatar.setAttribute("aria-hidden", "true");
  profileHeader.appendChild(avatar);

  var info = createEl("div", "profile-info");
  var nameEl = createEl("div", "profile-name");
  nameEl.textContent = uname;
  info.appendChild(nameEl);

  var statusEl = createEl("div", "profile-status");
  var streak = getCurrentStreak();
  if (getUsername() !== "未设置") {
    statusEl.textContent = "连续打卡" + streak + "天";
  } else {
    statusEl.textContent = "设置昵称以显示连续天数";
  }
  info.appendChild(statusEl);
  profileHeader.appendChild(info);
  header.appendChild(profileHeader);
  page.appendChild(header);

  // ── 金币展示 ──
  var coinSection = createEl("div", "profile-section");
  var coinDisplay = createEl("div", "coin-display");
  coinDisplay.setAttribute("aria-label", "当前金币：" + getCoins() + "个");
  coinDisplay.innerHTML = '<span class="coin-icon">&#9679;</span> ' + getCoins() + ' 金币';
  coinDisplay.style.cssText = "padding:16px;background:#FFF8E1;";
  coinSection.appendChild(coinDisplay);

  var coinHint = createEl("div");
  coinHint.style.cssText = "text-align:center;font-size:12px;color:#999;padding:4px 0 12px;";
  coinHint.textContent = "连续打卡N天=N金币，一天比一天多！";
  coinSection.appendChild(coinHint);
  page.appendChild(coinSection);

  // ── 设置列表 ──
  var settingsSection = createEl("div", "profile-section");

  // 修改昵称
  var itemAcct = makeSettingItem("修改昵称", getUsername(), function() {
    showNameInput();
  });
  settingsSection.appendChild(itemAcct);

  // 打卡铃声
  var itemSound = makeSettingItem("打卡铃声", getSoundEnabled() ? "已开启" : "已关闭", function() {
    toggleSound();
  });
  settingsSection.appendChild(itemSound);

  // 铃声选择
  var itemSoundFile = makeSettingItem("自定义铃声", "点击选择", function() {
    pickCustomSound();
  });
  settingsSection.appendChild(itemSoundFile);

  // 主题设置
  var currentThemeName = getThemeName(getCurrentTheme());
  var itemTheme = makeSettingItem("更换背景主题", currentThemeName, function() {
    showThemeShop();
  });
  settingsSection.appendChild(itemTheme);

  // ★ 数据备份
  var itemBackup = makeSettingItem("数据备份与恢复", "导出/导入", function() {
    showBackupMenu();
  });
  settingsSection.appendChild(itemBackup);

  // 关于
  var itemAbout = makeSettingItem("关于文峰手账", "v2.4.0", function() {
    showAbout();
  });
  settingsSection.appendChild(itemAbout);

  page.appendChild(settingsSection);

  main.appendChild(page);
}

function makeSettingItem(label, value, onClick) {
  var item = createEl("div", "setting-item");
  item.setAttribute("role", "button");
  item.setAttribute("tabindex", "0");
  item.setAttribute("aria-label", label + "：" + value);

  var labelEl = createEl("span", "si-label");
  labelEl.textContent = label;
  item.appendChild(labelEl);

  var rightEl = createEl("span", "si-value");
  rightEl.textContent = value;
  item.appendChild(rightEl);

  var arrowEl = createEl("span", "si-arrow");
  arrowEl.textContent = ">";
  item.appendChild(arrowEl);

  item.addEventListener("click", onClick);
  return item;
}

/**
 * 手动输入昵称
 */
function showNameInput() {
  var current = getUsername();
  if (current === "未设置") current = "";

  var html = '<div class="modal-title">设置昵称</div>';
  html += '<p style="font-size:12px;color:#999;margin-bottom:8px;text-align:center">输入你的昵称，用于打卡分享卡片</p>';

  html += '<div class="form-group">';
  html += '<label class="form-label" for="ni-name">昵称</label>';
  html += '<input class="form-input" id="ni-name" type="text" placeholder="请输入昵称" value="' + current + '">';
  html += '</div>';

  showModal(html, "保存", "取消", function() {
    var name = document.getElementById("ni-name").value.trim();
    if (!name) { showToast("昵称不能为空"); return false; }
    setUsername(name);
    renderProfilePage();
    showToast("昵称已设置为「" + name + "」");
    return true;
  });
}

// ══════════════════════════════════════════════
//  铃声
// ══════════════════════════════════════════════

function toggleSound() {
  var enabled = getSoundEnabled();
  setSoundEnabled(!enabled);
  showToast("打卡铃声已" + (!enabled ? "开启" : "关闭"));
  renderProfilePage();
}

function pickCustomSound() {
  var input = document.createElement("input");
  input.type = "file";
  input.accept = "audio/*";
  input.addEventListener("change", function(e) {
    var file = e.target.files[0];
    if (!file) return;
    if (file.size > 500 * 1024) {
      showToast("铃声文件不能超过500KB");
      return;
    }
    var reader = new FileReader();
    reader.onload = function(evt) {
      setSoundFile(evt.target.result);
      showToast("自定义铃声已设置");
    };
    reader.readAsDataURL(file);
  });
  input.click();
}

function playCheckinSound() {
  if (!getSoundEnabled()) return;
  try {
    var audio;
    var soundFile = getSoundFile();
    if (soundFile) {
      audio = new Audio(soundFile);
    } else {
      // 默认使用 Web Audio API 生成简单提示音
      var ctx = new (window.AudioContext || window.webkitAudioContext)();
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 800;
      osc.type = "sine";
      gain.gain.value = 0.3;
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
      return;
    }
    audio.play().catch(function() {});
  } catch (e) {
    // 静默失败
  }
}

// ══════════════════════════════════════════════
//  主题商店
// ══════════════════════════════════════════════

var THEMES = [
  { id: "default", name: "简约白", cost: 0,
    bg: "#FFFFFF", bgSecondary: "#F5F5F5", textPrimary: "#1A1A1A",
    brand: "#07C160", border: "#E0E0E0" },
  { id: "warm", name: "暖米色", cost: 10,
    bg: "#FFFDF5", bgSecondary: "#FFF8E7", textPrimary: "#3D3226",
    brand: "#D4925A", border: "#E8DCC8" },
  { id: "mint", name: "薄荷绿", cost: 10,
    bg: "#F5FFFA", bgSecondary: "#E8F5E9", textPrimary: "#1B3B2B",
    brand: "#4CAF50", border: "#C8E6C9" },
  { id: "lavender", name: "薰衣草紫", cost: 10,
    bg: "#FDFBFF", bgSecondary: "#F3E5F5", textPrimary: "#2D1B3D",
    brand: "#9C27B0", border: "#E1BEE7" },
  { id: "ocean", name: "海洋蓝", cost: 10,
    bg: "#F5FAFF", bgSecondary: "#E3F2FD", textPrimary: "#0D2137",
    brand: "#2196F3", border: "#BBDEFB" },
  { id: "dark", name: "暗夜黑", cost: 15,
    bg: "#1A1A1A", bgSecondary: "#2D2D2D", textPrimary: "#E0E0E0",
    brand: "#4FE387", border: "#444444" },
  // ── 可爱猫咪系列 ──
  { id: "cat_milk", name: "奶糖猫咪", cost: 12,
    bg: "#FFFDF9", bgSecondary: "#FFF3E0", textPrimary: "#5D4037",
    brand: "#FFAB91", border: "#FFCCBC" },
  { id: "cat_tabby", name: "虎斑猫咪", cost: 12,
    bg: "#FAF6F0", bgSecondary: "#EFEBE0", textPrimary: "#4E342E",
    brand: "#A1887F", border: "#D7CCC8" },
  { id: "cat_calico", name: "三花猫咪", cost: 12,
    bg: "#FFFBF7", bgSecondary: "#FDE8D0", textPrimary: "#3E2723",
    brand: "#FF8A65", border: "#FFCC80" },
  { id: "cat_tuxedo", name: "奶牛猫咪", cost: 12,
    bg: "#FAFAFA", bgSecondary: "#ECEFF1", textPrimary: "#37474F",
    brand: "#546E7A", border: "#CFD8DC" },
  { id: "cat_ginger", name: "橘色猫咪", cost: 12,
    bg: "#FFFDF7", bgSecondary: "#FFF3CD", textPrimary: "#5D3A00",
    brand: "#FF9800", border: "#FFE082" },
  { id: "cat_silver", name: "银渐层猫咪", cost: 15,
    bg: "#F8F9FB", bgSecondary: "#E8ECF1", textPrimary: "#37474F",
    brand: "#78909C", border: "#B0BEC5" },
  { id: "cat_blush", name: "害羞猫咪", cost: 15,
    bg: "#FFF5F7", bgSecondary: "#FCE4EC", textPrimary: "#4A282F",
    brand: "#F48FB1", border: "#F8BBD0" },
  { id: "cat_sleep", name: "瞌睡猫咪", cost: 15,
    bg: "#F5F0FF", bgSecondary: "#EDE7F6", textPrimary: "#311B92",
    brand: "#B39DDB", border: "#D1C4E9" }
];

function getThemeName(themeId) {
  for (var i = 0; i < THEMES.length; i++) {
    if (THEMES[i].id === themeId) return THEMES[i].name;
  }
  return "简约白";
}

function getThemeById(themeId) {
  for (var i = 0; i < THEMES.length; i++) {
    if (THEMES[i].id === themeId) return THEMES[i];
  }
  return THEMES[0];
}

function showThemeShop() {
  var current = getCurrentTheme();
  var purchased = getPurchasedThemes();
  var coins = getCoins();

  var html = '<div class="modal-title">背景主题商店</div>';
  html += '<div class="modal-body" style="max-height:50vh;overflow-y:auto">';

  THEMES.forEach(function(theme) {
    var owned = purchased.indexOf(theme.id) >= 0;
    var isCurrent = theme.id === current;
    html += '<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid #eee">';
    html += '<div>';
    html += '<span style="display:inline-block;width:24px;height:24px;background:' + theme.brand + ';border-radius:50%;vertical-align:middle;margin-right:8px"></span>';
    html += theme.name;
    if (isCurrent) html += '<span style="color:#07C160;font-size:12px;margin-left:4px">(当前)</span>';
    html += '</div>';
    html += '<div>';
    if (owned) {
      if (isCurrent) {
        html += '<span style="color:#999;font-size:12px">使用中</span>';
      } else {
        html += '<button class="btn-secondary" style="padding:4px 12px;font-size:12px;min-height:28px" onclick="applyTheme(\'' + theme.id + '\')">使用</button>';
      }
    } else {
      html += '<button class="btn-primary" style="padding:4px 12px;font-size:12px;min-height:28px" onclick="buyTheme(\'' + theme.id + '\', ' + theme.cost + ')">' + theme.cost + '金币</button>';
    }
    html += '</div>';
    html += '</div>';
  });

  html += '<p style="font-size:12px;color:#999;margin-top:8px">当前金币：' + coins + '</p>';
  html += '</div>';

  showModal(html, null, "关闭", null);

  setTimeout(function() {
    var confirmBtn = document.getElementById("modal-confirm-btn");
    if (confirmBtn) confirmBtn.style.display = "none";
  }, 0);
}

function buyTheme(themeId, cost) {
  var purchased = getPurchasedThemes();
  if (purchased.indexOf(themeId) >= 0) {
    applyTheme(themeId);
    return;
  }
  if (!purchaseTheme(themeId, cost)) {
    showToast("金币不足，需要" + cost + "金币");
    return;
  }
  applyTheme(themeId);
  showToast("主题已购买并应用！-" + cost + "金币");
  hideModal();
  renderProfilePage();
}

function applyTheme(themeId) {
  setCurrentTheme(themeId);
  var theme = getThemeById(themeId);
  var root = document.documentElement.style;
  root.setProperty("--bg", theme.bg);
  root.setProperty("--bg-secondary", theme.bgSecondary);
  root.setProperty("--text-primary", theme.textPrimary);
  root.setProperty("--brand", theme.brand);
  root.setProperty("--border", theme.border);

  // 更新签名栏颜色
  var quoteBar = document.getElementById("top-quote-bar");
  if (quoteBar) quoteBar.style.background = theme.brand;

  hideModal();
  renderProfilePage();
}

/** 初始化加载主题 */
function initTheme() {
  var themeId = getCurrentTheme();
  applyTheme(themeId);
}

// ══════════════════════════════════════════════
//  数据备份与恢复
// ══════════════════════════════════════════════

function showBackupMenu() {
  var html = '<div class="modal-title">数据备份与恢复</div>';
  html += '<div class="modal-body">';
  html += '<p style="margin-bottom:8px">将你的打卡记录、金币、主题、书架数据导出为文件，换手机或重装时可以导入恢复。</p>';
  html += '<div style="display:flex;flex-direction:column;gap:10px;margin-top:12px">';
  html += '<button class="btn-primary" id="bk-export" style="min-height:44px">导出备份文件</button>';
  html += '<button class="btn-secondary" id="bk-import" style="min-height:44px">从文件导入恢复</button>';
  html += '</div>';
  html += '</div>';

  showModal(html, null, "关闭", null);
  setTimeout(function() { var b = document.getElementById("modal-confirm-btn"); if (b) b.style.display = "none"; }, 0);

  setTimeout(function() {
    var exportBtn = document.getElementById("bk-export");
    if (exportBtn) exportBtn.addEventListener("click", exportData);

    var importBtn = document.getElementById("bk-import");
    if (importBtn) importBtn.addEventListener("click", function() {
      var input = document.createElement("input");
      input.type = "file";
      input.accept = ".json,application/json";
      input.addEventListener("change", function(e) {
        var file = e.target.files[0];
        if (!file) return;
        var reader = new FileReader();
        reader.onload = function(evt) {
          try {
            var data = JSON.parse(evt.target.result);
            importData(data);
          } catch (err) {
            showToast("文件格式错误，无法导入");
          }
        };
        reader.readAsText(file, "UTF-8");
      });
      input.click();
    });
  }, 50);
}

function exportData() {
  var backup = {
    version: "2.1.0",
    exportDate: new Date().toISOString(),
    appData: loadData(),
    books: getBooks(),
    bookProgress: JSON.parse(localStorage.getItem("wenfeng_book_progress") || "{}"),
    theme: {
      current: getCurrentTheme(),
      purchased: getPurchasedThemes()
    }
  };

  var json = JSON.stringify(backup, null, 2);
  var blob = new Blob([json], { type: "application/json" });
  var url = URL.createObjectURL(blob);
  var a = document.createElement("a");
  a.href = url;
  a.download = "wenfeng_backup_" + getTodayStr() + ".json";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  hideModal();
  showToast("备份文件已下载");
}

function importData(backup) {
  if (!backup || !backup.appData) {
    showToast("备份文件格式不正确");
    return;
  }
  var html = '<div class="modal-title">确认导入</div>';
  html += '<div class="modal-body">';
  html += '<p>即将恢复以下数据：</p>';
  if (backup.appData.tasks) html += '<p>打卡任务：' + backup.appData.tasks.length + '个</p>';
  if (backup.books) html += '<p>书架书籍：' + backup.books.length + '本</p>';
  if (backup.appData.coins !== undefined) html += '<p>金币：' + backup.appData.coins + '</p>';
  html += '<p style="color:#E64340;margin-top:8px">注意：导入将覆盖当前数据！</p>';
  html += '</div>';

  showModal(html, "确认导入", "取消", function() {
    saveData(backup.appData);
    if (backup.books) localStorage.setItem("wenfeng_books", JSON.stringify(backup.books));
    if (backup.bookProgress) localStorage.setItem("wenfeng_book_progress", JSON.stringify(backup.bookProgress));
    if (backup.theme) {
      setCurrentTheme(backup.theme.current || "default");
      if (backup.theme.purchased) localStorage.setItem("wenfeng_purchased_themes", JSON.stringify(backup.theme.purchased));
    }
    hideModal();
    initTheme();
    updateQuoteBar();
    switchTab("checkin");
    showToast("数据恢复成功！");
    return true;
  });

  setTimeout(function() {
    var confirmBtn = document.getElementById("modal-confirm-btn");
    if (confirmBtn) confirmBtn.textContent = "确认导入";
  }, 0);
}

// ══════════════════════════════════════════════
//  关于
// ══════════════════════════════════════════════

function showAbout() {
  var html = '<div class="modal-title">关于文峰手账</div>';
  html += '<div class="modal-body">';
  html += '<p>文峰手账 v2.4.0</p>';
  html += '<p>纯文字无障碍打卡助手</p>';
  html += '<p>专为读屏优化设计</p>';
  html += '<br><p style="font-size:12px;color:#999">坚持打卡，成为更好的自己。</p>';
  html += '</div>';
  showModal(html, null, "知道了", null);
  setTimeout(function() {
    var confirmBtn = document.getElementById("modal-confirm-btn");
    if (confirmBtn) confirmBtn.style.display = "none";
  }, 0);
}
