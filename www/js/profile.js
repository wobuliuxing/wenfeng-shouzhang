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
  avatar.textContent = (uname && uname !== "未登录") ? uname[0] : "?";
  avatar.setAttribute("aria-hidden", "true");
  profileHeader.appendChild(avatar);

  var info = createEl("div", "profile-info");
  var nameEl = createEl("div", "profile-name");
  nameEl.textContent = uname;
  info.appendChild(nameEl);

  var statusEl = createEl("div", "profile-status");
  var streak = getCurrentStreak();
  if (isLoggedIn()) {
    statusEl.textContent = "连续打卡" + streak + "天";
  } else {
    statusEl.textContent = "点击登录以同步数据";
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

  // 切换账号
  var itemAcct = makeSettingItem("账号管理", isLoggedIn() ? getUsername() : "点击注册/登录", function() {
    if (isLoggedIn()) {
      showAccountMenu();
    } else {
      showLoginForm();
    }
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

  // 关于
  var itemAbout = makeSettingItem("关于文峰手账", "v1.0.0", function() {
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

// ══════════════════════════════════════════════
//  账号管理
// ══════════════════════════════════════════════

function showAccountMenu() {
  var html = '<div class="modal-title">账号管理</div>';
  html += '<div class="modal-body">';
  html += '<p>当前账号：' + getUsername() + '</p>';
  html += '<p>连续打卡：' + getCurrentStreak() + '天</p>';
  html += '<p>金币：' + getCoins() + '</p>';
  html += '</div>';

  showModal(html, "退出登录", "关闭", function() {
    logout();
    renderProfilePage();
    showToast("已退出登录");
    return true;
  });

  setTimeout(function() {
    var confirmBtn = document.getElementById("modal-confirm-btn");
    if (confirmBtn) confirmBtn.textContent = "退出登录";
  }, 0);
}

function showLoginForm() {
  var html = '<div class="modal-title">' + (isLoggedIn() ? '登录' : '注册 / 登录') + '</div>';

  if (!isLoggedIn()) {
    html += '<p style="font-size:12px;color:#999;margin-bottom:8px;text-align:center">首次使用请注册，之后可直接登录</p>';
  }

  html += '<div class="form-group">';
  html += '<label class="form-label" for="lf-username">用户名</label>';
  html += '<input class="form-input" id="lf-username" type="text" placeholder="请输入用户名">';
  html += '</div>';

  html += '<div class="form-group">';
  html += '<label class="form-label" for="lf-password">密码</label>';
  html += '<input class="form-input" id="lf-password" type="password" placeholder="请输入密码">';
  html += '</div>';

  var buttons = '<div class="modal-actions" style="flex-wrap:wrap;gap:8px">';
  if (isLoggedIn()) {
    buttons += '<button class="modal-btn modal-btn-cancel" id="m-cancel">取消</button>';
    buttons += '<button class="modal-btn modal-btn-confirm" id="m-confirm">登录</button>';
  } else {
    buttons += '<button class="modal-btn modal-btn-cancel" id="m-cancel">取消</button>';
    buttons += '<button class="modal-btn modal-btn-confirm" id="m-confirm">注册</button>';
    buttons += '<button class="modal-btn modal-btn-cancel" id="m-register">已有账号？登录</button>';
  }
  buttons += '</div>';

  // 直接用全局 modal 改装
  var overlay = document.getElementById("modal-overlay");
  overlay.classList.remove("hidden");
  overlay.setAttribute("aria-hidden", "false");

  var box = document.getElementById("modal-box");
  box.innerHTML = html + buttons;
  box.querySelector(".modal-title").focus();

  function close() {
    overlay.classList.add("hidden");
    overlay.setAttribute("aria-hidden", "true");
  }

  var cancelBtn = document.getElementById("m-cancel");
  if (cancelBtn) cancelBtn.addEventListener("click", close);

  var loginBtn = document.getElementById("m-register");
  if (loginBtn) {
    loginBtn.addEventListener("click", function() {
      var username = document.getElementById("lf-username").value.trim();
      var password = document.getElementById("lf-password").value;
      if (!username || !password) {
        showToast("用户名和密码不能为空");
        return;
      }
      var result = loginAccount(username, password);
      if (result.ok) {
        close();
        renderProfilePage();
        showToast("欢迎回来，" + username);
      } else {
        showToast(result.msg);
      }
    });
  }

  var confirmBtn = document.getElementById("m-confirm");
  if (confirmBtn) {
    confirmBtn.addEventListener("click", function() {
      var username = document.getElementById("lf-username").value.trim();
      var password = document.getElementById("lf-password").value;
      if (!username || !password) {
        showToast("用户名和密码不能为空");
        return;
      }
      if (isLoggedIn()) {
        // 登录
        var result = loginAccount(username, password);
        if (result.ok) {
          close();
          renderProfilePage();
          showToast("欢迎回来，" + username);
        } else {
          showToast(result.msg);
        }
      } else {
        // 注册
        var result = registerAccount(username, password);
        if (result.ok) {
          close();
          renderProfilePage();
          showToast("注册成功！欢迎，" + username);
        } else {
          showToast(result.msg);
        }
      }
    });
  }
}

function logout() {
  var data = loadData();
  data.account.registered = false;
  data.account.username = "";
  data.account.passwordHash = "";
  saveData(data);
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
//  关于
// ══════════════════════════════════════════════

function showAbout() {
  var html = '<div class="modal-title">关于文峰手账</div>';
  html += '<div class="modal-body">';
  html += '<p>文峰手账 v1.0.0</p>';
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
