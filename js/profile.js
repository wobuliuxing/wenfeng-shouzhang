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

  var uname = getUsername();
  if (uname === "未设置") uname = "点击登录";
  var level = getUserLevel();
  var streak = getCurrentStreak();
  var coins = getCoins();
  var registered = isRegistered();

  // ── 头像区域 ──
  var header = createEl("div", "profile-section");
  var profileHeader = createEl("div", "profile-header");

  var avatar = createEl("div", "profile-avatar");
  avatar.textContent = (uname && uname !== "点击登录") ? uname[0] : "?";
  avatar.setAttribute("aria-hidden", "true");
  profileHeader.appendChild(avatar);

  var info = createEl("div", "profile-info");
  var nameEl = createEl("div", "profile-name");
  // 名字后面只放一个：你已坚持N天
  nameEl.textContent = uname + "  你已坚持" + streak + "天";
  info.appendChild(nameEl);

  // 等级徽章 + 进度
  var levelEl = createEl("div", "profile-level");
  levelEl.innerHTML = '<span class="level-badge">' + level.badge + ' Lv.' + level.level + '</span> <span class="level-name">' + level.name + '</span>';
  if (level.level < 9) {
    var prog = getLevelProgress();
    var daysLeft = prog.next - prog.current;
    levelEl.innerHTML += '<div class="level-progress" style="margin-top:4px;font-size:12px;color:#999">你已坚持' + prog.current + '天！离下一级还剩' + daysLeft + '天，继续加油哦！</div>';
  }
  info.appendChild(levelEl);

  // 鼓励语（去掉金币，只保留鼓励）
  var statusEl = createEl("div", "profile-status");
  statusEl.textContent = "你已坚持打卡" + streak + "天，继续加油哦！  |  当前一共" + coins + "金币";
  info.appendChild(statusEl);
  profileHeader.appendChild(info);
  header.appendChild(profileHeader);
  page.appendChild(header);

  // ── 账号与主题 ──
  var mainSection = createEl("div", "profile-section");

  // 账号管理
  if (registered) {
    var itemAcct = makeSettingItem("账号管理", uname, function() {
      showAccountInfo();
    });
    mainSection.appendChild(itemAcct);
  } else {
    var itemLogin = makeSettingItem("登录 / 注册", "点击注册账号", function() {
      showLoginRegister();
    });
    mainSection.appendChild(itemLogin);
  }

  // 主题商店
  var currentThemeName = getThemeName(getCurrentTheme());
  var itemTheme = makeSettingItem("主题商店", currentThemeName, function() {
    showThemeShop();
  });
  mainSection.appendChild(itemTheme);

  // 设置入口（所有设置统一放入）
  var itemSettings = makeSettingItem("设置", "铃声 / 备份 / 云同步", function() {
    showSettingsMenu();
  });
  mainSection.appendChild(itemSettings);

  page.appendChild(mainSection);

  // 关于
  var aboutSection = createEl("div", "profile-section");
  var itemAbout = makeSettingItem("关于文峰手账", "v2.6.1", function() {
    showAbout();
  });
  aboutSection.appendChild(itemAbout);
  page.appendChild(aboutSection);

  main.appendChild(page);
}

/**
 * 设置菜单（弹窗，包含铃声、备份、云同步、排行榜）
 */
function showSettingsMenu() {
  var syncOn = getCloudSyncEnabled();
  var lbOn = getLeaderboardEnabled();

  var html = '<div class="modal-title">设置</div>';
  html += '<div class="modal-body" style="padding:0">';

  // 打卡铃声
  html += '<div class="setting-item" role="button" tabindex="0" aria-label="打卡铃声：' + (getSoundEnabled() ? "已开启" : "已关闭") + '">';
  html += '<span class="si-label">打卡铃声</span>';
  html += '<span class="si-value">' + (getSoundEnabled() ? "已开启" : "已关闭") + '</span>';
  html += '<span class="si-arrow">></span>';
  html += '</div>';

  // 自定义铃声
  html += '<div class="setting-item" role="button" tabindex="0" aria-label="自定义铃声：点击选择">';
  html += '<span class="si-label">自定义铃声</span>';
  html += '<span class="si-value">点击选择</span>';
  html += '<span class="si-arrow">></span>';
  html += '</div>';

  // 数据备份
  html += '<div class="setting-item" role="button" tabindex="0" aria-label="数据备份与恢复：导出/导入">';
  html += '<span class="si-label">数据备份与恢复</span>';
  html += '<span class="si-value">导出/导入</span>';
  html += '<span class="si-arrow">></span>';
  html += '</div>';

  // 云同步
  html += '<div class="setting-item" role="button" tabindex="0" aria-label="多端云同步：' + (syncOn ? "已开启" : "已关闭") + '">';
  html += '<span class="si-label">多端云同步</span>';
  html += '<span class="si-value">' + (syncOn ? "已开启" : "已关闭") + '</span>';
  html += '<span class="si-arrow">></span>';
  html += '</div>';

  // 排行榜
  html += '<div class="setting-item" role="button" tabindex="0" aria-label="金币排行榜：' + (lbOn ? "已开启" : "已关闭") + '">';
  html += '<span class="si-label">金币排行榜</span>';
  html += '<span class="si-value">' + (lbOn ? "已开启" : "已关闭") + '</span>';
  html += '<span class="si-arrow">></span>';
  html += '</div>';

  // 排行榜开启时显示查看入口
  if (lbOn) {
    html += '<div class="setting-item" role="button" tabindex="0" aria-label="查看排行榜：点击查看">';
    html += '<span class="si-label">查看排行榜</span>';
    html += '<span class="si-value">点击查看</span>';
    html += '<span class="si-arrow">></span>';
    html += '</div>';
  }

  html += '</div>';

  showModal(html, null, "关闭", null);

  // 绑定点击事件
  setTimeout(function() {
    var items = document.querySelectorAll("#modal-box .setting-item");

    function updateItemValue(idx, text) {
      var valEl = items[idx].querySelector(".si-value");
      if (valEl) valEl.textContent = text;
    }

    if (items.length >= 1) items[0].addEventListener("click", function() {
      toggleSound();
      updateItemValue(0, getSoundEnabled() ? "已开启" : "已关闭");
    });
    if (items.length >= 2) items[1].addEventListener("click", function() { pickCustomSound(); });
    if (items.length >= 3) items[2].addEventListener("click", function() { showBackupMenu(); });
    if (items.length >= 4) items[3].addEventListener("click", function() {
      toggleCloudSync();
      updateItemValue(3, getCloudSyncEnabled() ? "已开启" : "已关闭");
    });
    if (items.length >= 5) items[4].addEventListener("click", function() {
      toggleLeaderboard();
      // 排行榜开关会增减"查看排行榜"项，需要重新渲染弹窗
      hideModal();
      setTimeout(function() { showSettingsMenu(); }, 80);
    });
    if (lbOn && items.length >= 6) {
      items[5].addEventListener("click", function() {
        initCloudBase(function(err) {
          if (err) { showToast("云服务未就绪"); return; }
          showLeaderboard();
        });
      });
    }
    // 隐藏确认按钮
    var confirmBtn = document.getElementById("modal-confirm-btn");
    if (confirmBtn) confirmBtn.style.display = "none";
  }, 50);
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
 * 登录 / 注册表单
 */
function showLoginRegister() {
  var html = '<div class="modal-title">登录 / 注册</div>';
  html += '<p style="font-size:12px;color:#999;margin-bottom:8px;text-align:center">首次使用请注册，之后可直接登录。注册后昵称将绑定账号。</p>';

  html += '<div class="form-group">';
  html += '<label class="form-label" for="lr-username">用户名</label>';
  html += '<input class="form-input" id="lr-username" type="text" placeholder="请输入用户名">';
  html += '</div>';

  html += '<div class="form-group">';
  html += '<label class="form-label" for="lr-password">密码</label>';
  html += '<input class="form-input" id="lr-password" type="password" placeholder="请输入密码">';
  html += '</div>';

  html += '<div style="display:flex;gap:10px;justify-content:center">';
  html += '<button class="btn-primary" id="lr-register" style="flex:1;min-height:44px">注册</button>';
  html += '<button class="btn-secondary" id="lr-login" style="flex:1;min-height:44px">登录</button>';
  html += '</div>';

  showModal(html, null, "取消", null, function() { hideModal(); });

  setTimeout(function() {
    var regBtn = document.getElementById("lr-register");
    var loginBtn = document.getElementById("lr-login");

    if (regBtn) regBtn.addEventListener("click", function(e) {
      e.stopPropagation();
      var username = document.getElementById("lr-username").value.trim();
      var password = document.getElementById("lr-password").value;
      if (!username || !password) { showToast("用户名和密码不能为空"); return; }
      if (username.length < 2) { showToast("用户名至少2个字符"); return; }
      if (password.length < 4) { showToast("密码至少4个字符"); return; }
      var result = registerAccount(username, password);
      if (result.ok) {
        // 同时注册 CloudBase 账号（同步功能用）
        if (getCloudSyncEnabled()) {
          initCloudBase(function() {
            cloudSignUp(username, password, function() {});
          });
        }
        hideModal();
        renderProfilePage();
        updateQuoteBar();
        showToast("注册成功！欢迎，" + username);
      } else {
        showToast(result.msg);
      }
    });

    if (loginBtn) loginBtn.addEventListener("click", function(e) {
      e.stopPropagation();
      var username = document.getElementById("lr-username").value.trim();
      var password = document.getElementById("lr-password").value;
      if (!username || !password) { showToast("用户名和密码不能为空"); return; }
      var result = loginAccount(username, password);
      if (result.ok) {
        // 同时登录 CloudBase（同步功能用）
        if (getCloudSyncEnabled()) {
          initCloudBase(function() {
            cloudSignIn(username, password, function() {
              // 登录后检查云端数据，提示是否覆盖本地
              cloudCheckAndPrompt(function() {
                renderProfilePage();
                updateQuoteBar();
                switchTab("checkin");
              });
            });
          });
        }
        hideModal();
        renderProfilePage();
        updateQuoteBar();
        showToast("欢迎回来，" + username);
      } else {
        showToast(result.msg);
      }
    });
  }, 50);
}

/**
 * 账号信息编辑（已登录）
 */
function showAccountInfo() {
  var uname = getUsername();
  var gender = getGender();
  var age = getAge();

  var html = '<div class="modal-title">账号管理</div>';
  html += '<div class="modal-body">';

  html += '<div class="form-group">';
  html += '<label class="form-label" for="ai-nickname">昵称</label>';
  html += '<input class="form-input" id="ai-nickname" type="text" placeholder="请输入昵称" value="' + uname + '">';
  html += '</div>';

  html += '<div class="form-group">';
  html += '<label class="form-label" for="ai-gender">性别</label>';
  html += '<select class="form-select" id="ai-gender">';
  html += '<option value="">保密</option>';
  html += '<option value="男"' + (gender === "男" ? " selected" : "") + '>男</option>';
  html += '<option value="女"' + (gender === "女" ? " selected" : "") + '>女</option>';
  html += '</select>';
  html += '</div>';

  html += '<div class="form-group">';
  html += '<label class="form-label" for="ai-age">年龄</label>';
  html += '<input class="form-input" id="ai-age" type="number" min="1" max="150" placeholder="请输入年龄" value="' + age + '">';
  html += '</div>';

  html += '</div>';

  html += '<div style="text-align:center;margin-top:8px">';
  html += '<button class="btn-danger" id="ai-logout" style="min-height:36px">退出登录</button>';
  html += '</div>';

  showModal(html, "保存", "取消", function() {
    var nick = document.getElementById("ai-nickname").value.trim();
    if (nick) setUsername(nick);
    var g = document.getElementById("ai-gender").value;
    setGender(g);
    var a = document.getElementById("ai-age").value;
    setAge(a);
    renderProfilePage();
    showToast("个人信息已保存");
    return true;
  });

  setTimeout(function() {
    var logoutBtn = document.getElementById("ai-logout");
    if (logoutBtn) logoutBtn.addEventListener("click", function(e) {
      e.stopPropagation();
      hideModal();
      showConfirmLogout();
    });
  }, 50);
}

function showConfirmLogout() {
  var html = '<div class="modal-title">确认退出</div>';
  html += '<div class="modal-body">退出登录后，本地数据仍保留。重新登录同一账号可继续使用。</div>';
  showModal(html, "退出", "取消", function() {
    logoutAccount();
    renderProfilePage();
    showToast("已退出登录");
    return true;
  });
  setTimeout(function() {
    var confirmBtn = document.getElementById("modal-confirm-btn");
    if (confirmBtn) { confirmBtn.classList.add("modal-btn-danger"); confirmBtn.textContent = "退出"; }
  }, 0);
}

// ══════════════════════════════════════════════
//  云同步 & 排行榜开关
// ══════════════════════════════════════════════

function getCloudSyncEnabled() {
  var key = "wenfeng_cloud_sync";
  return localStorage.getItem(key) === "true";
}

function setCloudSyncEnabled(on) {
  localStorage.setItem("wenfeng_cloud_sync", on ? "true" : "false");
}

function toggleCloudSync() {
  var on = !getCloudSyncEnabled();
  setCloudSyncEnabled(on);
  if (on) {
    showToast("多端云同步已开启，正在上传本地数据...");
    initCloudBase(function(err) {
      if (err) { showToast("云服务连接失败：" + err.message); return; }
      cloudSignInAnonymously(function() {
        cloudUploadData(function(e) {
          if (e) { showToast("同步失败：" + e.message); return; }
          showToast("同步完成！已备份：打卡记录、金币、书架、主题");
        });
      });
    });
  } else {
    showToast("多端云同步已关闭");
  }
  renderProfilePage();
}

function getLeaderboardEnabled() {
  var key = "wenfeng_leaderboard";
  return localStorage.getItem(key) === "true";
}

function setLeaderboardEnabled(on) {
  localStorage.setItem("wenfeng_leaderboard", on ? "true" : "false");
}

function toggleLeaderboard() {
  var on = !getLeaderboardEnabled();
  setLeaderboardEnabled(on);
  if (on) {
    initCloudBase(function() {}); // 静默初始化
  }
  showToast("金币排行榜已" + (on ? "开启" : "关闭"));
  renderProfilePage();
}

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
    brand: "#B39DDB", border: "#D1C4E9" },
  // ── 治愈系卡通系列 ──
  { id: "shiba", name: "微笑柴犬", cost: 10,
    bg: "#FFFDF5", bgSecondary: "#FFF3E0", textPrimary: "#5D4037",
    brand: "#FF8A65", border: "#FFCC80" },
  { id: "bunny", name: "奶糖白兔", cost: 10,
    bg: "#FFFBFB", bgSecondary: "#FFF0F5", textPrimary: "#4A2828",
    brand: "#F8BBD0", border: "#FFCDD2" },
  { id: "bear", name: "小熊软糖", cost: 10,
    bg: "#FFFDF9", bgSecondary: "#FDE8C8", textPrimary: "#4E342E",
    brand: "#FFB74D", border: "#FFE0B2" },
  { id: "deer", name: "小鹿斑比", cost: 10,
    bg: "#FFFDF7", bgSecondary: "#E8F5E9", textPrimary: "#2E4A2E",
    brand: "#8D6E63", border: "#C8E6C9" },
  { id: "cloud", name: "云朵棉花", cost: 10,
    bg: "#FBFDFF", bgSecondary: "#E3F2FD", textPrimary: "#1A3A4A",
    brand: "#90CAF9", border: "#BBDEFB" },
  { id: "sakura", name: "樱花飞舞", cost: 15,
    bg: "#FFFBFB", bgSecondary: "#FCE4EC", textPrimary: "#4A1A2A",
    brand: "#F48FB1", border: "#F8BBD0" },
  { id: "succulent", name: "多肉花园", cost: 10,
    bg: "#FDFDF5", bgSecondary: "#E8F5E9", textPrimary: "#2E4A2E",
    brand: "#81C784", border: "#C8E6C9" },
  { id: "dolphin", name: "海豚湾", cost: 15,
    bg: "#F5FDFF", bgSecondary: "#E0F7FA", textPrimary: "#0D3B4A",
    brand: "#4DD0E1", border: "#B2EBF2" },
  { id: "starry", name: "星空物语", cost: 15,
    bg: "#1A1A2E", bgSecondary: "#16213E", textPrimary: "#E0E0E0",
    brand: "#7C83FD", border: "#0F3460" },
  { id: "forest", name: "森林小熊", cost: 10,
    bg: "#F5F9F0", bgSecondary: "#E8F0DE", textPrimary: "#3D4A2E",
    brand: "#A5B87A", border: "#D4E0C8" }
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
    version: "2.5.0",
    exportDate: new Date().toISOString(),
    appData: loadData(),
    books: getBooks(),
    bookProgress: JSON.parse(localStorage.getItem("wenfeng_book_progress") || "{}"),
    theme: {
      current: getCurrentTheme(),
      purchased: getPurchasedThemes()
    },
    cloudSettings: {
      sync: getCloudSyncEnabled(),
      leaderboard: getLeaderboardEnabled()
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
    if (backup.cloudSettings) {
      setCloudSyncEnabled(backup.cloudSettings.sync || false);
      setLeaderboardEnabled(backup.cloudSettings.leaderboard || false);
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
  html += '<p>文峰手账 v2.5.0</p>';
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
