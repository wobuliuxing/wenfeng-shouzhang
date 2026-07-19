/* ========================================
   我的选项卡 - 账号 / 梦想币 / 主题
   v4.0: 践行者和梦想中心移至专属tab
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

  // Lv等级 + 等级名 + 进度在一行
  var nameEl = createEl("div", "profile-name");
  var levelLine = '<span class="level-badge">' + level.badge + ' Lv.' + level.level + '</span> <span class="level-name">' + level.name + '</span>';
  if (level.level < 9) {
    var prog = getLevelProgress();
    var daysLeft = prog.next - prog.current;
    levelLine += ' <span class="level-progress" style="font-size:12px;color:#999">离下一级还剩' + daysLeft + '天</span>';
  }
  nameEl.innerHTML = levelLine;
  info.appendChild(nameEl);

  // 梦想币余额
  var statusEl = createEl("div", "profile-status");
  statusEl.textContent = "当前一共 " + coins + " 梦想币";
  info.appendChild(statusEl);
  profileHeader.appendChild(info);
  header.appendChild(profileHeader);
  page.appendChild(header);

  // ── 账号与功能 ──
  var mainSection = createEl("div", "profile-section");

  // 账号管理（放在最上面）
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

  // 设置入口
  var itemSettings = makeSettingItem("设置", "备份 / 云同步", function() {
    showSettingsMenu();
  });
  mainSection.appendChild(itemSettings);

  page.appendChild(mainSection);

  // 关于
  var aboutSection = createEl("div", "profile-section");
  var itemAbout = makeSettingItem("关于籽芽手账", "v5.0.0", function() {
    showAbout();
  });
  aboutSection.appendChild(itemAbout);
  page.appendChild(aboutSection);

  main.appendChild(page);
}

/**
 * 设置菜单（页面）
 */
function showSettingsMenu() {
  var syncOn = getCloudSyncEnabled();
  var configured = isCloudConfigured();
  var lastSync = getLastSyncTime();
  var syncStatus = "未配置";
  if (configured) {
    syncStatus = syncOn ? "已开启" : "已关闭";
    if (lastSync) {
      try {
        var dt = new Date(lastSync);
        syncStatus += "（上次：" + dt.getMonth()+1 + "月" + dt.getDate() + "日 " + dt.getHours() + ":" + (dt.getMinutes()<10?"0":"") + dt.getMinutes() + "）";
      } catch(e) {}
    }
  }

  var html = '<div class="settings-list">';

  // 1) 本地备份
  html += '<div class="setting-item" role="button" tabindex="0" id="set-backup">';
  html += '<span class="si-label">数据备份与恢复</span>';
  html += '<span class="si-value">导出/导入</span>';
  html += '<span class="si-arrow">\u203a</span>';
  html += '</div>';

  // 2) 云端同步设置
  html += '<div class="setting-item" role="button" tabindex="0" id="set-cloud-config">';
  html += '<span class="si-label">云端同步设置</span>';
  html += '<span class="si-value">' + (configured ? "已配置" : "未配置") + '</span>';
  html += '<span class="si-arrow">\u203a</span>';
  html += '</div>';

  // 3) 自动同步开关
  html += '<div class="setting-item" role="button" tabindex="0" id="set-sync">';
  html += '<span class="si-label">自动同步（10分钟）</span>';
  html += '<span class="si-value">' + (syncOn ? "已开启" : "已关闭") + '</span>';
  html += '<span class="si-arrow">\u203a</span>';
  html += '</div>';

  // 4) 立即备份同步
  html += '<div class="setting-item" role="button" tabindex="0" id="set-sync-now">';
  html += '<span class="si-label">立即备份同步</span>';
  html += '<span class="si-value">' + (configured ? "点击同步" : "需先配置") + '</span>';
  html += '<span class="si-arrow">\u203a</span>';
  html += '</div>';

  // 5) 云端数据恢复
  html += '<div class="setting-item" role="button" tabindex="0" id="set-download">';
  html += '<span class="si-label">云端数据恢复</span>';
  html += '<span class="si-value">覆盖本地</span>';
  html += '<span class="si-arrow">\u203a</span>';
  html += '</div>';

  html += '</div>';

  showPage("设置", html);

  var topPage = _pageStack[_pageStack.length - 1];
  if (!topPage) return;
  var pageEl = topPage.el;

  setTimeout(function() {
    var backupItem = pageEl.querySelector("#set-backup");
    if (backupItem) backupItem.addEventListener("click", function() { showBackupMenu(); });

    var cloudConfigItem = pageEl.querySelector("#set-cloud-config");
    if (cloudConfigItem) cloudConfigItem.addEventListener("click", function() { showCloudSyncSettings(); });

    var syncItem = pageEl.querySelector("#set-sync");
    if (syncItem) syncItem.addEventListener("click", function() {
      toggleCloudSync();
      syncItem.querySelector(".si-value").textContent = getCloudSyncEnabled() ? "已开启" : "已关闭";
    });

    var syncNowItem = pageEl.querySelector("#set-sync-now");
    if (syncNowItem) syncNowItem.addEventListener("click", function() {
      if (!isCloudConfigured()) {
        showToast("请先配置云端同步设置");
        return;
      }
      showToast("正在同步...");
      doManualSync(function() {});
    });

    var downloadItem = pageEl.querySelector("#set-download");
    if (downloadItem) downloadItem.addEventListener("click", function() { showCloudRestore(); });
  }, 50);
}

/**
 * 云端同步设置页面
 */
function showCloudSyncSettings() {
  var config = loadCloudConfig();

  var html = '<div class="form-page">';
  html += '<p style="font-size:13px;color:#999;margin-bottom:12px;text-align:center;line-height:1.6">配置中科院数据胶囊 S3 接口地址。<br>上传地址用于 PUT 上传，下载地址用于 GET 下载。<br>与电脑版使用相同的接口地址即可跨端同步。</p>';

  html += '<div class="form-group">';
  html += '<label class="form-label" for="cs-upload">上传接口地址（PUT）</label>';
  html += '<input class="form-input" id="cs-upload" type="url" placeholder="https://..." value="' + (config.upload_url || "") + '">';
  html += '</div>';

  html += '<div class="form-group">';
  html += '<label class="form-label" for="cs-download">下载直链地址（GET）</label>';
  html += '<input class="form-input" id="cs-download" type="url" placeholder="https://..." value="' + (config.download_url || "") + '">';
  html += '</div>';

  html += '<div class="form-group">';
  html += '<label class="form-label" for="cs-interval">自动同步间隔（分钟）</label>';
  html += '<input class="form-input" id="cs-interval" type="number" min="1" max="60" value="' + (config.interval_minutes || 10) + '">';
  html += '</div>';

  html += '<div style="display:flex;gap:8px;margin-top:16px">';
  html += '<button class="btn-secondary" id="cs-test" style="flex:1;min-height:44px">检测接口</button>';
  html += '<button class="btn-primary" id="cs-save" style="flex:1;min-height:44px">保存配置</button>';
  html += '</div>';

  html += '<div id="cs-test-result" style="margin-top:12px;font-size:13px;line-height:1.6"></div>';

  html += '</div>';

  showPage("云端同步设置", html);

  var topPage = _pageStack[_pageStack.length - 1];
  if (!topPage) return;
  var pageEl = topPage.el;

  setTimeout(function() {
    var saveBtn = pageEl.querySelector("#cs-save");
    if (saveBtn) saveBtn.addEventListener("click", function() {
      var uploadUrl = pageEl.querySelector("#cs-upload").value.trim();
      var downloadUrl = pageEl.querySelector("#cs-download").value.trim();
      var interval = parseInt(pageEl.querySelector("#cs-interval").value) || 10;

      if (!uploadUrl || !downloadUrl) {
        showToast("请填写上传和下载地址");
        return;
      }

      var newConfig = {
        upload_url: uploadUrl,
        download_url: downloadUrl,
        auto_sync: config.auto_sync !== false,
        interval_minutes: interval
      };
      saveCloudConfig(newConfig);

      // 重启自动同步定时器
      startAutoSyncTimer();

      showToast("配置已保存，自动同步已启动");
      hidePage();
      renderProfilePage();
    });

    var testBtn = pageEl.querySelector("#cs-test");
    if (testBtn) testBtn.addEventListener("click", function() {
      var uploadUrl = pageEl.querySelector("#cs-upload").value.trim();
      var downloadUrl = pageEl.querySelector("#cs-download").value.trim();
      var resultEl = pageEl.querySelector("#cs-test-result");

      if (!uploadUrl || !downloadUrl) {
        resultEl.innerHTML = '<span style="color:#E64340">请先填写地址</span>';
        return;
      }

      resultEl.innerHTML = '<span style="color:#999">正在检测...</span>';
      var results = [];
      var done = 0;

      testUploadUrl(uploadUrl, function(ok, msg) {
        results.push("上传：" + (ok ? "✓ " : "✗ ") + msg);
        done++;
        if (done === 2) {
          resultEl.innerHTML = results.join("<br>");
        }
      });

      testDownloadUrl(downloadUrl, function(ok, msg) {
        results.push("下载：" + (ok ? "✓ " : "✗ ") + msg);
        done++;
        if (done === 2) {
          resultEl.innerHTML = results.join("<br>");
        }
      });
    });
  }, 50);
}

/**
 * 云端数据恢复页面
 */
function showCloudRestore() {
  if (!isCloudConfigured()) {
    showToast("请先在云端同步设置中配置接口地址");
    return;
  }

  showPage("云端数据恢复", '<div class="confirm-page"><p class="confirm-message" style="text-align:center;padding:20px">正在从云端下载数据...</p></div>');

  restoreFromCloud(function(err, msg) {
    var topPage = _pageStack[_pageStack.length - 1];
    if (!topPage) {
      showToast(err ? "恢复失败：" + err.message : msg);
      return;
    }
    var pageEl = topPage.el;

    if (err) {
      pageEl.querySelector(".page-body").innerHTML =
        '<div class="confirm-page"><p class="confirm-message" style="color:#E64340;text-align:center">' + err.message + '</p>' +
        '<div class="confirm-actions"><button class="btn-secondary" id="cr-back" style="flex:1;min-height:44px">返回</button></div></div>';
      var backBtn = pageEl.querySelector("#cr-back");
      if (backBtn) backBtn.addEventListener("click", hidePage);
      return;
    }

    pageEl.querySelector(".page-body").innerHTML =
      '<div class="confirm-page">' +
      '<p class="confirm-message" style="text-align:center;color:#07C160">' + msg + '</p>' +
      '<p class="confirm-message" style="text-align:center;font-size:13px;color:#999">本地数据已被云端数据覆盖，点击下方按钮刷新页面。</p>' +
      '<div class="confirm-actions"><button class="btn-primary" id="cr-ok" style="flex:1;min-height:44px">刷新页面</button></div>' +
      '</div>';

    var okBtn = pageEl.querySelector("#cr-ok");
    if (okBtn) okBtn.addEventListener("click", function() {
      hidePage();
      initTheme();
      updateQuoteBar();
      renderProfilePage();
      switchTab("checkin");
    });
  });
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
  arrowEl.textContent = "\u203a";
  item.appendChild(arrowEl);

  item.addEventListener("click", onClick);
  return item;
}

/**
 * 登录 / 注册表单（页面）
 */
function showLoginRegister() {
  var html = '<div class="form-page">';
  html += '<p style="font-size:13px;color:#999;margin-bottom:12px;text-align:center">首次使用请注册，之后可直接登录。手机号用于跨设备数据同步。</p>';

  html += '<div class="form-group">';
  html += '<label class="form-label" for="lr-username">用户名</label>';
  html += '<input class="form-input" id="lr-username" type="text" placeholder="请输入用户名">';
  html += '</div>';

  html += '<div class="form-group">';
  html += '<label class="form-label" for="lr-phone">手机号</label>';
  html += '<input class="form-input" id="lr-phone" type="tel" placeholder="请输入手机号" maxlength="11">';
  html += '</div>';

  html += '<div class="form-group">';
  html += '<label class="form-label" for="lr-password">密码</label>';
  html += '<input class="form-input" id="lr-password" type="password" placeholder="请输入密码">';
  html += '</div>';

  html += '<div class="form-actions">';
  html += '<button class="btn-secondary" id="lr-login" style="flex:1;min-height:44px">登录</button>';
  html += '<button class="btn-primary" id="lr-register" style="flex:1;min-height:44px">注册</button>';
  html += '</div>';
  html += '</div>';

  showPage("登录 / 注册", html);

  var topPage = _pageStack[_pageStack.length - 1];
  if (!topPage) return;
  var pageEl = topPage.el;

  setTimeout(function() {
    var regBtn = pageEl.querySelector("#lr-register");
    var loginBtn = pageEl.querySelector("#lr-login");

    if (regBtn) regBtn.addEventListener("click", function(e) {
      e.stopPropagation();
      var username = pageEl.querySelector("#lr-username").value.trim();
      var phone = pageEl.querySelector("#lr-phone").value.trim();
      var password = pageEl.querySelector("#lr-password").value;
      if (!username || !password) { showToast("用户名和密码不能为空"); return; }
      if (!phone) { showToast("请输入手机号"); return; }
      if (!/^1\d{10}$/.test(phone)) { showToast("请输入正确的手机号"); return; }
      if (username.length < 2) { showToast("用户名至少2个字符"); return; }
      if (password.length < 4) { showToast("密码至少4个字符"); return; }
      var result = registerAccount(username, password, phone);
      if (result.ok) {
        // 注册成功后执行一次云同步
        if (getCloudSyncEnabled() && isCloudConfigured()) {
          doManualSync(function() {});
        }
        hidePage();
        renderProfilePage();
        updateQuoteBar();
        showToast("注册成功！欢迎，" + username);
      } else {
        showToast(result.msg);
      }
    });

    if (loginBtn) loginBtn.addEventListener("click", function(e) {
      e.stopPropagation();
      var username = pageEl.querySelector("#lr-username").value.trim();
      var phone = pageEl.querySelector("#lr-phone").value.trim();
      var password = pageEl.querySelector("#lr-password").value;
      if (!username || !password) { showToast("用户名和密码不能为空"); return; }

      var result = loginAccount(username, password);
      if (result.ok) {
        // 登录成功后执行一次云同步
        if (getCloudSyncEnabled() && isCloudConfigured()) {
          showToast("正在同步数据...");
          doManualSync(function() {});
        }
        hidePage();
        renderProfilePage();
        updateQuoteBar();
        showToast("欢迎回来，" + username);
      } else if (result.msg === "尚未注册，请先注册" && phone) {
        // 尝试从云端恢复数据
        if (!isCloudConfigured()) {
          showToast("该手机号本地未注册，且云端同步未配置");
          return;
        }
        showToast("正在从云端查找数据...");
        restoreFromCloud(function(err, msg) {
          if (err) {
            showToast("云端恢复失败：" + err.message);
            return;
          }
          setPhone(phone);
          hidePage();
          initTheme();
          updateQuoteBar();
          renderProfilePage();
          switchTab("checkin");
          showToast("账号恢复成功！欢迎回来，" + username);
        });
      } else {
        showToast(result.msg);
      }
    });
  }, 50);
}

/**
 * 账号信息编辑（页面）
 */
function showAccountInfo() {
  var uname = getUsername();
  var gender = getGender();
  var age = getAge();
  var phone = getPhone();

  var html = '<div class="form-page">';

  html += '<div class="form-group">';
  html += '<label class="form-label" for="ai-nickname">昵称</label>';
  html += '<input class="form-input" id="ai-nickname" type="text" placeholder="请输入昵称" value="' + uname + '">';
  html += '</div>';

  html += '<div class="form-group">';
  html += '<label class="form-label" for="ai-phone">手机号</label>';
  html += '<input class="form-input" id="ai-phone" type="tel" placeholder="用于跨设备数据同步" value="' + phone + '" maxlength="11">';
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

  html += '<div class="form-actions">';
  html += '<button class="btn-primary" id="ai-save" style="flex:1;min-height:44px">保存</button>';
  html += '</div>';

  html += '<div style="text-align:center;margin-top:16px">';
  html += '<button class="btn-danger" id="ai-logout" style="min-height:36px">退出登录</button>';
  html += '</div>';

  html += '</div>';

  showPage("账号管理", html);

  var topPage = _pageStack[_pageStack.length - 1];
  if (!topPage) return;
  var pageEl = topPage.el;

  setTimeout(function() {
    var saveBtn = pageEl.querySelector("#ai-save");
    if (saveBtn) saveBtn.addEventListener("click", function() {
      var nick = pageEl.querySelector("#ai-nickname").value.trim();
      if (nick) setUsername(nick);
      var p = pageEl.querySelector("#ai-phone").value.trim();
      if (p) setPhone(p);
      var g = pageEl.querySelector("#ai-gender").value;
      setGender(g);
      var a = pageEl.querySelector("#ai-age").value;
      setAge(a);
      renderProfilePage();
      showToast("个人信息已保存");
      hidePage();
    });

    var logoutBtn = pageEl.querySelector("#ai-logout");
    if (logoutBtn) logoutBtn.addEventListener("click", function(e) {
      e.stopPropagation();
      hidePage();
      setTimeout(function() { showConfirmLogout(); }, 100);
    });
  }, 50);
}

function showConfirmLogout() {
  showConfirm("确认退出", "退出登录后，本地数据仍保留。重新登录同一账号可继续使用。", "退出", function() {
    logoutAccount();
    renderProfilePage();
    showToast("已退出登录");
  }, true);
}

// ══════════════════════════════════════════════
//  梦想中心
// ══════════════════════════════════════════════

function showDreamCenter() {
  var dreams = getDreams();
  var streak = getCurrentStreak();

  var html = '<div class="dream-center">';

  // 当前坚持天数
  html += '<div class="dream-status-bar">';
  html += '<span>当前已坚持 </span>';
  html += '<span style="font-size:20px;font-weight:700;color:var(--brand)">' + streak + '</span>';
  html += '<span> 天</span>';
  html += '</div>';

  // 梦想列表
  dreams.forEach(function(dream) {
    var progress = Math.min(100, Math.round(streak / dream.targetDays * 100));
    var isCompleted = dream.completed;

    html += '<div class="dream-card' + (isCompleted ? ' dream-completed' : '') + '" id="dream-' + dream.id + '">';
    html += '<div class="dream-card-header">';
    html += '<span class="dream-name">' + dream.name + '</span>';
    if (isCompleted) {
      html += '<span class="dream-badge-done">已达成</span>';
    } else {
      html += '<span class="dream-badge-progress">进行中</span>';
    }
    html += '</div>';

    html += '<div class="dream-target">坚持 ' + dream.targetDays + ' 天</div>';
    html += '<div class="dream-reward">奖励：' + dream.reward + '</div>';

    // 进度条
    html += '<div class="dream-progress-bar">';
    html += '<div class="dream-progress-fill" style="width:' + progress + '%"></div>';
    html += '</div>';
    html += '<div class="dream-progress-text">' + streak + ' / ' + dream.targetDays + ' 天 (' + progress + '%)</div>';

    if (dream.completed && dream.completedDate) {
      html += '<div class="dream-done-date">达成日期：' + dream.completedDate + '</div>';
    }

    // 非默认梦想可以编辑/删除
    if (!dream.isDefault) {
      html += '<div style="display:flex;gap:8px;margin-top:8px">';
      html += '<button class="btn-secondary dream-edit-btn" id="edit-' + dream.id + '" style="flex:1;min-height:40px">编辑</button>';
      html += '<button class="btn-danger dream-delete-btn" id="del-' + dream.id + '" style="flex:1;min-height:40px">删除</button>';
      html += '</div>';
    }

    html += '</div>';
  });

  // 添加梦想按钮
  html += '<button class="btn-primary" id="btn-add-dream" style="width:calc(100% - 32px);margin:16px;min-height:44px">+ 添加新的梦想</button>';

  html += '</div>';

  showPage("梦想中心", html);

  var topPage = _pageStack[_pageStack.length - 1];
  if (!topPage) return;
  var pageEl = topPage.el;

  setTimeout(function() {
    var addBtn = pageEl.querySelector("#btn-add-dream");
    if (addBtn) addBtn.addEventListener("click", function() {
      showAddDreamForm();
    });

    // 绑定编辑/删除按钮
    dreams.forEach(function(dream) {
      if (!dream.isDefault) {
        var editBtn = pageEl.querySelector("#edit-" + dream.id);
        if (editBtn) editBtn.addEventListener("click", function(e) {
          e.stopPropagation();
          var dreamId = dream.id;
          hidePage();
          setTimeout(function() { showEditDreamForm(dreamId); }, 100);
        });

        var delBtn = pageEl.querySelector("#del-" + dream.id);
        if (delBtn) delBtn.addEventListener("click", function(e) {
          e.stopPropagation();
          var dreamId = dream.id;
          var dreamName = dream.name;
          hidePage();
          setTimeout(function() {
            showConfirm("确认删除", "确定删除梦想「" + dreamName + "」吗？", "删除", function() {
              deleteDream(dreamId);
              showToast("梦想已删除");
              hidePage();
              setTimeout(function() { showDreamCenter(); }, 100);
            }, true);
          }, 100);
        });
      }
    });
  }, 50);
}

function showEditDreamForm(dreamId) {
  var dreams = getDreams();
  var dream = null;
  for (var i = 0; i < dreams.length; i++) {
    if (dreams[i].id === dreamId) { dream = dreams[i]; break; }
  }
  if (!dream) { showToast("梦想不存在"); return; }

  var html = '<div class="form-page">';

  html += '<div class="form-group">';
  html += '<label class="form-label" for="edm-name">梦想名字</label>';
  html += '<input class="form-input" id="edm-name" type="text" value="' + (dream.name || "") + '">';
  html += '</div>';

  html += '<div class="form-group">';
  html += '<label class="form-label" for="edm-days">坚持多少天</label>';
  html += '<input class="form-input" id="edm-days" type="number" min="1" max="3650" value="' + (dream.targetDays || 7) + '">';
  html += '</div>';

  html += '<div class="form-group">';
  html += '<label class="form-label" for="edm-reward">给自己的奖励</label>';
  html += '<input class="form-input" id="edm-reward" type="text" value="' + (dream.reward || "") + '">';
  html += '</div>';

  html += '<div class="form-actions">';
  html += '<button class="btn-primary" id="edm-save" style="flex:1;min-height:44px">保存修改</button>';
  html += '</div>';

  html += '</div>';

  showPage("编辑梦想", html);

  var topPage = _pageStack[_pageStack.length - 1];
  if (!topPage) return;
  var pageEl = topPage.el;

  setTimeout(function() {
    var saveBtn = pageEl.querySelector("#edm-save");
    if (saveBtn) saveBtn.addEventListener("click", function() {
      var name = pageEl.querySelector("#edm-name").value.trim();
      var days = pageEl.querySelector("#edm-days").value.trim();
      var reward = pageEl.querySelector("#edm-reward").value.trim();

      if (!name) { showToast("请给梦想起个名字"); return; }
      if (!days || parseInt(days) < 1) { showToast("请输入坚持天数"); return; }
      if (!reward) { showToast("请给自己一个奖励"); return; }

      updateDream(dreamId, name, parseInt(days), reward);
      showToast("梦想已更新");
      hidePage();
      setTimeout(function() { showDreamCenter(); }, 100);
    });
  }, 50);
}

function showAddDreamForm() {
  var html = '<div class="form-page">';

  html += '<div class="form-group">';
  html += '<label class="form-label" for="dm-name">梦想名字</label>';
  html += '<input class="form-input" id="dm-name" type="text" placeholder="给你的小梦想起个温柔的名字吧">';
  html += '</div>';

  html += '<div class="form-group">';
  html += '<label class="form-label" for="dm-days">坚持多少天</label>';
  html += '<input class="form-input" id="dm-days" type="number" min="1" max="3650" placeholder="想坚持多少天呢？慢慢来，不着急">';
  html += '</div>';

  html += '<div class="form-group">';
  html += '<label class="form-label" for="dm-reward">给自己的奖励</label>';
  html += '<input class="form-input" id="dm-reward" type="text" placeholder="完成了想给自己什么小奖励呢？">';
  html += '</div>';

  html += '<div class="form-actions">';
  html += '<button class="btn-primary" id="dm-create" style="flex:1;min-height:44px">添加梦想</button>';
  html += '</div>';

  html += '</div>';

  showPage("添加梦想", html);

  var topPage = _pageStack[_pageStack.length - 1];
  if (!topPage) return;
  var pageEl = topPage.el;

  setTimeout(function() {
    var createBtn = pageEl.querySelector("#dm-create");
    if (createBtn) createBtn.addEventListener("click", function() {
      var name = pageEl.querySelector("#dm-name").value.trim();
      var days = pageEl.querySelector("#dm-days").value.trim();
      var reward = pageEl.querySelector("#dm-reward").value.trim();

      if (!name) { showToast("请给梦想起个名字"); return; }
      if (!days || parseInt(days) < 1) { showToast("请输入坚持天数"); return; }
      if (!reward) { showToast("请给自己一个奖励"); return; }

      addDream(name, parseInt(days), reward);
      showToast("梦想「" + name + "」已添加，加油哦！");
      hidePage();
      setTimeout(function() { showDreamCenter(); }, 100);
    });
  }, 50);
}

// ══════════════════════════════════════════════
//  云同步 & 排行榜开关
// ══════════════════════════════════════════════

function getCloudSyncEnabled() {
  var config = loadCloudConfig();
  return config.auto_sync !== false;
}

function setCloudSyncEnabled(on) {
  var config = loadCloudConfig();
  config.auto_sync = on;
  saveCloudConfig(config);
}

function toggleCloudSync() {
  var on = !getCloudSyncEnabled();
  setCloudSyncEnabled(on);
  if (on) {
    if (!isCloudConfigured()) {
      showToast("自动同步已开启，请配置云端同步地址");
    } else {
      showToast("自动同步已开启（每10分钟）");
      startAutoSyncTimer();
    }
  } else {
    showToast("自动同步已关闭");
    stopAutoSyncTimer();
  }
  renderProfilePage();
}

// ══════════════════════════════════════════════
//  主题商店
// ══════════════════════════════════════════════

var THEMES = [
  { id: "default", name: "简约白", cost: 0, icon: "✦",
    bg: "#FFFFFF", bgSecondary: "#F5F5F5", textPrimary: "#1A1A1A",
    brand: "#07C160", border: "#E0E0E0" },
  { id: "warm", name: "暖米色", cost: 10, icon: "☀",
    bg: "#FFFDF5", bgSecondary: "#FFF8E7", textPrimary: "#3D3226",
    brand: "#D4925A", border: "#E8DCC8" },
  { id: "mint", name: "薄荷绿", cost: 10, icon: "🌿",
    bg: "#F5FFFA", bgSecondary: "#E8F5E9", textPrimary: "#1B3B2B",
    brand: "#4CAF50", border: "#C8E6C9" },
  { id: "lavender", name: "薰衣草紫", cost: 10, icon: "❀",
    bg: "#FDFBFF", bgSecondary: "#F3E5F5", textPrimary: "#2D1B3D",
    brand: "#9C27B0", border: "#E1BEE7" },
  { id: "ocean", name: "海洋蓝", cost: 10, icon: "🌊",
    bg: "#F5FAFF", bgSecondary: "#E3F2FD", textPrimary: "#0D2137",
    brand: "#2196F3", border: "#BBDEFB" },
  { id: "dark", name: "暗夜黑", cost: 15, icon: "🌙",
    bg: "#1A1A1A", bgSecondary: "#2D2D2D", textPrimary: "#E0E0E0",
    brand: "#4FE387", border: "#444444" },
  { id: "cat_milk", name: "奶糖猫咪", cost: 12, icon: "🐱",
    bg: "#FFFDF9", bgSecondary: "#FFF3E0", textPrimary: "#5D4037",
    brand: "#FFAB91", border: "#FFCCBC" },
  { id: "cat_tabby", name: "虎斑猫咪", cost: 12, icon: "🐈",
    bg: "#FAF6F0", bgSecondary: "#EFEBE0", textPrimary: "#4E342E",
    brand: "#A1887F", border: "#D7CCC8" },
  { id: "cat_calico", name: "三花猫咪", cost: 12, icon: "🐈‍",
    bg: "#FFFBF7", bgSecondary: "#FDE8D0", textPrimary: "#3E2723",
    brand: "#FF8A65", border: "#FFCC80" },
  { id: "cat_tuxedo", name: "奶牛猫咪", cost: 12, icon: "🐈‍⬛",
    bg: "#FAFAFA", bgSecondary: "#ECEFF1", textPrimary: "#37474F",
    brand: "#546E7A", border: "#CFD8DC" },
  { id: "cat_ginger", name: "橘色猫咪", cost: 12, icon: "🐾",
    bg: "#FFFDF7", bgSecondary: "#FFF3CD", textPrimary: "#5D3A00",
    brand: "#FF9800", border: "#FFE082" },
  { id: "cat_silver", name: "银渐层猫咪", cost: 15, icon: "😺",
    bg: "#F8F9FB", bgSecondary: "#E8ECF1", textPrimary: "#37474F",
    brand: "#78909C", border: "#B0BEC5" },
  { id: "cat_blush", name: "害羞猫咪", cost: 15, icon: "😳",
    bg: "#FFF5F7", bgSecondary: "#FCE4EC", textPrimary: "#4A282F",
    brand: "#F48FB1", border: "#F8BBD0" },
  { id: "cat_sleep", name: "瞌睡猫咪", cost: 15, icon: "😴",
    bg: "#F5F0FF", bgSecondary: "#EDE7F6", textPrimary: "#311B92",
    brand: "#B39DDB", border: "#D1C4E9" },
  { id: "shiba", name: "微笑柴犬", cost: 10, icon: "🐕",
    bg: "#FFFDF5", bgSecondary: "#FFF3E0", textPrimary: "#5D4037",
    brand: "#FF8A65", border: "#FFCC80" },
  { id: "bunny", name: "奶糖白兔", cost: 10, icon: "🐰",
    bg: "#FFFBFB", bgSecondary: "#FFF0F5", textPrimary: "#4A2828",
    brand: "#F8BBD0", border: "#FFCDD2" },
  { id: "bear", name: "小熊软糖", cost: 10, icon: "🐻",
    bg: "#FFFDF9", bgSecondary: "#FDE8C8", textPrimary: "#4E342E",
    brand: "#FFB74D", border: "#FFE0B2" },
  { id: "deer", name: "小鹿斑比", cost: 10, icon: "🦌",
    bg: "#FFFDF7", bgSecondary: "#E8F5E9", textPrimary: "#2E4A2E",
    brand: "#8D6E63", border: "#C8E6C9" },
  { id: "cloud", name: "云朵棉花", cost: 10, icon: "☁",
    bg: "#FBFDFF", bgSecondary: "#E3F2FD", textPrimary: "#1A3A4A",
    brand: "#90CAF9", border: "#BBDEFB" },
  { id: "sakura", name: "樱花飞舞", cost: 15, icon: "🌸",
    bg: "#FFFBFB", bgSecondary: "#FCE4EC", textPrimary: "#4A1A2A",
    brand: "#F48FB1", border: "#F8BBD0" },
  { id: "succulent", name: "多肉花园", cost: 10, icon: "🌵",
    bg: "#FDFDF5", bgSecondary: "#E8F5E9", textPrimary: "#2E4A2E",
    brand: "#81C784", border: "#C8E6C9" },
  { id: "dolphin", name: "海豚湾", cost: 15, icon: "🐬",
    bg: "#F5FDFF", bgSecondary: "#E0F7FA", textPrimary: "#0D3B4A",
    brand: "#4DD0E1", border: "#B2EBF2" },
  { id: "starry", name: "星空物语", cost: 15, icon: "⭐",
    bg: "#1A1A2E", bgSecondary: "#16213E", textPrimary: "#E0E0E0",
    brand: "#7C83FD", border: "#0F3460" },
  { id: "forest", name: "森林小熊", cost: 10, icon: "🌲",
    bg: "#F5F9F0", bgSecondary: "#E8F0DE", textPrimary: "#3D4A2E",
    brand: "#A5B87A", border: "#D4E0C8" }
];

// 践行者专属主题（仅激活后可用，更精美）
var PRACTITIONER_THEMES = [
  { id: "zen", name: "禅意灰", cost: 0, icon: "🍃",
    bg: "#F8F8F8", bgSecondary: "#EEEEEE", textPrimary: "#2C2C2C",
    brand: "#8B7355", border: "#D5D5D5",
    desc: "极简禅意，静心修行" },
  { id: "aurora", name: "极光绿", cost: 0, icon: "🌌",
    bg: "#F0F8F0", bgSecondary: "#E0F0E0", textPrimary: "#1A3A1A",
    brand: "#5CB85C", border: "#C0E0C0",
    desc: "极光之色，生机盎然" },
  { id: "sunrise", name: "日出金", cost: 0, icon: "🌅",
    bg: "#FFFDF5", bgSecondary: "#FFF5E0", textPrimary: "#3D3018",
    brand: "#E6A817", border: "#E8D8B0",
    desc: "日出东方，金色希望" },
  { id: "bamboo", name: "竹林青", cost: 0, icon: "🎋",
    bg: "#F5F9F5", bgSecondary: "#E8F0E0", textPrimary: "#2A3A2A",
    brand: "#6B8E23", border: "#C8D8B8",
    desc: "竹林清风，心境澄明" },
  { id: "snow", name: "雪山白", cost: 0, icon: "❄",
    bg: "#FAFBFC", bgSecondary: "#F0F2F5", textPrimary: "#1A1D23",
    brand: "#4A90D9", border: "#D5DAE5",
    desc: "雪山之巅，纯净无暇" },
  { id: "desert", name: "沙漠金", cost: 0, icon: "🏜",
    bg: "#FFFDF7", bgSecondary: "#FFF5E0", textPrimary: "#3D3018",
    brand: "#D4A017", border: "#E8D8B0",
    desc: "大漠孤烟，坚韧修行" },
  { id: "cosmos", name: "宇宙紫", cost: 0, icon: "🌌",
    bg: "#1A1A2E", bgSecondary: "#1A1A35", textPrimary: "#E0E0F0",
    brand: "#9B59B6", border: "#2D2D4A",
    desc: "星辰大海，无限可能" },
  { id: "coral", name: "珊瑚橙", cost: 0, icon: "🪸",
    bg: "#FFF8F5", bgSecondary: "#FFE8E0", textPrimary: "#3D2018",
    brand: "#FF7F50", border: "#FFD0C0",
    desc: "珊瑚海洋，温暖治愈" },
  { id: "jade", name: "翡翠绿", cost: 0, icon: "💎",
    bg: "#F5FFF8", bgSecondary: "#E0F5E8", textPrimary: "#1A2A1E",
    brand: "#00A86B", border: "#C0E8D0",
    desc: "翡翠温润，君子之德" },
  { id: "ink", name: "水墨黑", cost: 0, icon: "🖌",
    bg: "#1A1A1A", bgSecondary: "#252525", textPrimary: "#D0D0D0",
    brand: "#C0A060", border: "#3A3A3A",
    desc: "水墨丹青，意境悠远" }
];

function getThemeName(themeId) {
  for (var i = 0; i < THEMES.length; i++) {
    if (THEMES[i].id === themeId) return THEMES[i].name;
  }
  for (var j = 0; j < PRACTITIONER_THEMES.length; j++) {
    if (PRACTITIONER_THEMES[j].id === themeId) return PRACTITIONER_THEMES[j].name;
  }
  return "简约白";
}

function getThemeIcon(themeId) {
  for (var i = 0; i < THEMES.length; i++) {
    if (THEMES[i].id === themeId) return THEMES[i].icon || "\u2726";
  }
  for (var j = 0; j < PRACTITIONER_THEMES.length; j++) {
    if (PRACTITIONER_THEMES[j].id === themeId) return PRACTITIONER_THEMES[j].icon || "\u2726";
  }
  return "\u2726";
}

/**
 * 根据当前主题和任务类型获取不同图案
 * taskType: task | nocomplaint | one | three | six | sunshine
 */
function getTaskTypeIcon(taskType) {
  var themeId = getCurrentTheme();
  var themeIcon = getThemeIcon(themeId);

  // 猫咪主题：每种任务用不同的猫咪表情
  if (themeId.indexOf("cat_") === 0) {
    var catIcons = {
      task: "\u{1F431}",
      nocomplaint: "\u{1F63E}",
      one: "\u{1F63A}",
      three: "\u{1F638}",
      six: "\u{1F63B}",
      sunshine: "\u{1F63C}"
    };
    return catIcons[taskType] || themeIcon;
  }

  // 动物类主题
  var animalThemes = ["shiba", "bunny", "bear", "deer", "dolphin"];
  if (animalThemes.indexOf(themeId) >= 0) {
    var animalIcons = {
      task: themeIcon,
      nocomplaint: "\u{1F610}",
      one: "\u{1F4D6}",
      three: "\u{1F4DD}",
      six: "\u{1F4D8}",
      sunshine: "\u{1F324}"
    };
    return animalIcons[taskType] || themeIcon;
  }

  // 植物类主题
  var plantThemes = ["mint", "succulent", "bamboo", "forest", "sakura", "zen", "aurora"];
  if (plantThemes.indexOf(themeId) >= 0) {
    var plantIcons = {
      task: themeIcon,
      nocomplaint: "\u{1F910}",
      one: "\u{1F33F}",
      three: "\u{1F331}",
      six: "\u{1F333}",
      sunshine: "\u{1F305}"
    };
    return plantIcons[taskType] || themeIcon;
  }

  // 暗色/星空主题
  var darkThemes = ["dark", "starry", "cosmos", "ink"];
  if (darkThemes.indexOf(themeId) >= 0) {
    var darkIcons = {
      task: themeIcon,
      nocomplaint: "\u{1F611}",
      one: "\u{1F4D6}",
      three: "\u{1F4DD}",
      six: "\u{1F4D8}",
      sunshine: "\u{1F319}"
    };
    return darkIcons[taskType] || themeIcon;
  }

  // 默认：普通任务用主题图标，其他类型用固定图标
  var defaultIcons = {
    task: themeIcon,
    nocomplaint: "\u{1F910}",
    one: "\u{1F4D6}",
    three: "\u{1F4DD}",
    six: "\u{1F4D8}",
    sunshine: "\u{1F324}"
  };
  return defaultIcons[taskType] || themeIcon;
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

  var html = '<div class="theme-shop">';
  html += '<div style="padding:12px 16px;font-size:13px;color:#999;text-align:center">当前梦想币：' + coins + '</div>';

  THEMES.forEach(function(theme) {
    var owned = purchased.indexOf(theme.id) >= 0;
    var isCurrent = theme.id === current;
    html += '<div class="theme-item">';
    html += '<div class="theme-item-info">';
    html += '<span class="theme-color-dot" style="background:' + theme.brand + '"></span>';
    html += '<span class="theme-item-icon">' + (theme.icon || "✦") + '</span>';
    html += '<span class="theme-item-name">' + theme.name + '</span>';
    if (isCurrent) html += '<span class="theme-current-tag">(当前)</span>';
    html += '</div>';
    html += '<div class="theme-item-action">';
    if (owned) {
      if (isCurrent) {
        html += '<span style="color:#999;font-size:12px">使用中</span>';
      } else {
        html += '<button class="btn-secondary theme-btn" data-action="use" data-id="' + theme.id + '" style="padding:4px 12px;font-size:12px;min-height:28px">使用</button>';
      }
    } else {
      html += '<button class="btn-primary theme-btn" data-action="buy" data-id="' + theme.id + '" data-cost="' + theme.cost + '" style="padding:4px 12px;font-size:12px;min-height:28px">' + theme.cost + '梦想币</button>';
    }
    html += '</div>';
    html += '</div>';
  });

  html += '</div>';

  showPage("背景主题商店", html);

  var topPage = _pageStack[_pageStack.length - 1];
  if (!topPage) return;
  var pageEl = topPage.el;

  setTimeout(function() {
    var buttons = pageEl.querySelectorAll(".theme-btn");
    buttons.forEach(function(btn) {
      btn.addEventListener("click", function() {
        var action = btn.getAttribute("data-action");
        var themeId = btn.getAttribute("data-id");
        if (action === "use") {
          applyTheme(themeId);
        } else if (action === "buy") {
          var cost = parseInt(btn.getAttribute("data-cost"));
          buyTheme(themeId, cost);
        }
      });
    });
  }, 50);
}

function buyTheme(themeId, cost) {
  var purchased = getPurchasedThemes();
  if (purchased.indexOf(themeId) >= 0) {
    applyTheme(themeId);
    return;
  }
  if (!purchaseTheme(themeId, cost)) {
    showToast("梦想币不足，需要" + cost + "梦想币");
    return;
  }
  applyTheme(themeId);
  showToast("主题已购买并应用！-" + cost + "梦想币");
  hidePage();
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

  var quoteBar = document.getElementById("top-quote-bar");
  if (quoteBar) quoteBar.style.background = theme.brand;

  hidePage();
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
  var html = '<div class="form-page">';
  html += '<p style="margin-bottom:8px;font-size:14px;color:var(--text-secondary);line-height:1.6">将你的打卡记录、梦想币、主题、书架数据导出为文件。手机版自动保存到"籽芽手账"文件夹，每天0点自动备份一次。</p>';
  html += '<div style="display:flex;flex-direction:column;gap:10px;margin-top:16px">';
  html += '<button class="btn-primary" id="bk-export" style="min-height:44px">导出备份文件</button>';
  html += '<button class="btn-secondary" id="bk-import" style="min-height:44px">从文件导入恢复</button>';
  html += '</div>';
  html += '</div>';

  showPage("数据备份与恢复", html);

  var topPage = _pageStack[_pageStack.length - 1];
  if (!topPage) return;
  var pageEl = topPage.el;

  setTimeout(function() {
    var exportBtn = pageEl.querySelector("#bk-export");
    if (exportBtn) exportBtn.addEventListener("click", exportData);

    var importBtn = pageEl.querySelector("#bk-import");
    if (importBtn) importBtn.addEventListener("click", function() {
      if (window.showOpenFilePicker) {
        window.showOpenFilePicker({
          types: [{
            description: "JSON 备份文件",
            accept: { "application/json": [".json"] }
          }]
        }).then(function(handles) {
          return handles[0].getFile();
        }).then(function(file) {
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
        }).catch(function(err) {
          if (err.name === "AbortError") return;
          _fallbackImport();
        });
      } else {
        _fallbackImport();
      }
    });
  }, 50);
}

function exportData() {
  var backup = {
    version: "5.0.0",
    exportDate: new Date().toISOString(),
    appData: loadData(),
    // 只备份书名列表（不备份书本身内容，避免文件过大）
    bookList: getBooks().map(function(b) { return { id: b.id, name: b.name, added: b.added }; }),
    // 只备份阅读进度（书签位置），不备份书内容
    bookProgress: JSON.parse(localStorage.getItem("wenfeng_book_progress") || "{}"),
    theme: {
      current: getCurrentTheme(),
      purchased: getPurchasedThemes()
    },
    cloudSettings: {
      sync: getCloudSyncEnabled()
    }
  };

  var json = JSON.stringify(backup, null, 2);
  var uname = getUsername();
  if (uname === "未设置") uname = "用户";
  var fileName = uname + "_备份_" + getTodayStr() + ".json";

  // APK 版本：使用 Capacitor Filesystem 保存到"籽芽手账"目录
  if (typeof window.Capacitor !== "undefined" && window.Capacitor.Plugins && window.Capacitor.Plugins.Filesystem) {
    var Filesystem = window.Capacitor.Plugins.Filesystem;
    var dirPath = "籽芽手账";

    Filesystem.mkdir({
      path: dirPath,
      directory: "DOCUMENTS",
      recursive: true
    }).then(function() {
      return Filesystem.writeFile({
        path: dirPath + "/" + fileName,
        data: json,
        directory: "DOCUMENTS",
        encoding: "utf8"
      });
    }).then(function() {
      hidePage();
      // 备份成功提示（明示路径，方便用户查找）
      showToast("备份成功！已保存到手机：Documents/籽芽手账/" + fileName, 4000);
      // 发送备份成功通知
      _sendBackupSuccessNotification(fileName, "Documents/籽芽手账");
    }).catch(function(err) {
      // 降级到 DOWNLOADS
      Filesystem.mkdir({
        path: dirPath,
        directory: "DOWNLOADS",
        recursive: true
      }).then(function() {
        return Filesystem.writeFile({
          path: dirPath + "/" + fileName,
          data: json,
          directory: "DOWNLOADS",
          encoding: "utf8"
        });
      }).then(function() {
        hidePage();
        showToast("备份成功！已保存到手机：Download/籽芽手账/" + fileName, 4000);
        _sendBackupSuccessNotification(fileName, "Download/籽芽手账");
      }).catch(function(err2) {
        _downloadBackup(json, fileName);
      });
    });
    return;
  }

  // 网页版本：优先使用 showSaveFilePicker
  if (window.showSaveFilePicker) {
    var blob = new Blob([json], { type: "application/json" });
    window.showSaveFilePicker({
      suggestedName: fileName,
      types: [{
        description: "JSON 备份文件",
        accept: { "application/json": [".json"] }
      }]
    }).then(function(handle) {
      return handle.createWritable().then(function(writable) {
        return writable.write(blob).then(function() {
          return writable.close();
        });
      });
    }).then(function() {
      hidePage();
      showToast("备份成功！已保存到本地：Documents/籽芽手账/" + fileName, 4000);
    }).catch(function(err) {
      if (err.name === "AbortError") return;
      _downloadBackup(json, fileName);
    });
  } else {
    _downloadBackup(json, fileName);
    showToast("备份成功！文件已下载到下载文件夹：籽芽手账/" + fileName, 4000);
  }
}

/**
 * 自动备份（0点触发）
 * 保存到"籽芽手账"目录，文件名带"自动备份"
 * 只备份书签（书名+进度），不备份书本身
 */
function autoBackupData() {
  var backup = {
    version: "4.1.0",
    exportDate: new Date().toISOString(),
    autoBackup: true,
    appData: loadData(),
    bookList: getBooks().map(function(b) { return { id: b.id, name: b.name, added: b.added }; }),
    bookProgress: JSON.parse(localStorage.getItem("wenfeng_book_progress") || "{}"),
    theme: {
      current: getCurrentTheme(),
      purchased: getPurchasedThemes()
    }
  };

  var json = JSON.stringify(backup, null, 2);
  var uname = getUsername();
  if (uname === "未设置") uname = "用户";
  var fileName = uname + "_自动备份_" + getTodayStr() + ".json";

  // APK 版本：自动保存到"籽芽手账"目录
  if (typeof window.Capacitor !== "undefined" && window.Capacitor.Plugins && window.Capacitor.Plugins.Filesystem) {
    var Filesystem = window.Capacitor.Plugins.Filesystem;
    var dirPath = "籽芽手账";

    Filesystem.mkdir({
      path: dirPath,
      directory: "DOCUMENTS",
      recursive: true
    }).then(function() {
      return Filesystem.writeFile({
        path: dirPath + "/" + fileName,
        data: json,
        directory: "DOCUMENTS",
        encoding: "utf8"
      });
    }).then(function() {
      localStorage.setItem("wenfeng_last_autobackup", getTodayStr());
      console.log("自动备份完成：" + fileName);
    }).catch(function(err) {
      console.warn("自动备份失败:", err);
    });
    return;
  }

  // 网页版本：自动备份存到 localStorage（因为无法自动写文件）
  try {
    localStorage.setItem("wenfeng_autobackup", json);
    localStorage.setItem("wenfeng_last_autobackup", getTodayStr());
    console.log("自动备份已存到本地存储");
  } catch(e) {
    console.warn("自动备份失败:", e);
  }
}

/**
 * 检查是否需要自动备份（每日0点后首次打开时触发）
 */
function checkAutoBackup() {
  var today = getTodayStr();
  var lastBackup = localStorage.getItem("wenfeng_last_autobackup") || "";
  if (lastBackup === today) return; // 今天已自动备份
  autoBackupData();
}

function _downloadBackup(json, fileName) {
  var blob = new Blob([json], { type: "application/json" });
  var url = URL.createObjectURL(blob);
  var a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  hidePage();
  showToast("备份文件已下载到下载文件夹");
}

function _fallbackImport() {
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
}

function importData(backup) {
  if (!backup || !backup.appData) {
    showToast("备份文件格式不正确");
    return;
  }

  var summary = "即将恢复以下数据：\n";
  if (backup.appData.tasks) summary += "打卡任务：" + backup.appData.tasks.length + "个\n";
  if (backup.bookList) summary += "书签名录：" + backup.bookList.length + "本（仅书名+进度，书本身不备份）\n";
  if (backup.appData.coins !== undefined) summary += "梦想币：" + backup.appData.coins + "\n";
  summary += "\n注意：导入将覆盖当前数据！";

  showConfirm("确认导入", summary, "确认导入", function() {
    saveData(backup.appData);
    // 备份文件不包含书本身内容，只恢复书签
    if (backup.bookProgress) localStorage.setItem("wenfeng_book_progress", JSON.stringify(backup.bookProgress));
    if (backup.theme) {
      setCurrentTheme(backup.theme.current || "default");
      if (backup.theme.purchased) localStorage.setItem("wenfeng_purchased_themes", JSON.stringify(backup.theme.purchased));
    }
    if (backup.cloudSettings) {
      setCloudSyncEnabled(backup.cloudSettings.sync || false);
    }
    hidePage();
    initTheme();
    updateQuoteBar();
    switchTab("checkin");
    showToast("数据恢复成功！");
  });
}

// ══════════════════════════════════════════════
//  关于
// ══════════════════════════════════════════════

function showAbout() {
  var html = '<div style="padding:32px 16px;text-align:center">';
  html += '<p style="font-size:16px;font-weight:600;margin-bottom:8px">籽芽手账 v5.0.0</p>';
  html += '<p style="font-size:13px;color:var(--brand);margin-bottom:16px;line-height:1.6">种子发芽，你每一次打卡都是对目标种子的一次施肥</p>';
  html += '<p style="font-size:14px;color:var(--text-secondary);margin-bottom:8px;line-height:1.8">每一天的坚持，都是送给未来的礼物。</p>';
  html += '<p style="font-size:14px;color:var(--text-secondary);margin-bottom:8px;line-height:1.8">小小的打卡，大大的改变。</p>';
  html += '<p style="font-size:14px;color:var(--text-secondary);margin-bottom:24px;line-height:1.8">愿你在这里，遇见更好的自己。</p>';
  html += '<div style="border-top:1px solid var(--border-light);padding-top:20px">';
  html += '<p style="font-size:13px;color:#999;margin-bottom:8px">联系作者</p>';
  html += '<p style="font-size:14px;color:var(--brand);font-weight:600">QQ：862324160</p>';
  html += '</div>';
  html += '</div>';

  showPage("关于籽芽手账", html);
}

/**
 * 发送备份成功通知
 * @param {string} fileName - 备份文件名
 * @param {string} dirPath - 保存目录
 */
function _sendBackupSuccessNotification(fileName, dirPath) {
  try {
    if (typeof window.Capacitor !== "undefined" &&
        window.Capacitor.Plugins &&
        window.Capacitor.Plugins.LocalNotifications) {
      var notif = window.Capacitor.Plugins.LocalNotifications;
      notif.create([{
        id: 8888,
        title: "备份成功",
        body: "数据已保存到 " + dirPath + "/" + fileName,
        schedule: { at: new Date(Date.now() + 500) },
        smallIcon: "ic_stat_icon",
        sound: "default",
        priority: 2
      }]);
    }
  } catch (e) {
    console.warn("发送备份通知失败:", e);
  }
}

// ══════════════════════════════════════════════
//  践行者模块 - 激活与中心
// ══════════════════════════════════════════════

/**
 * 践行者激活页面
 */
function showPractitionerActivation() {
  var html = '<div class="form-page">';

  html += '<div style="text-align:center;padding:20px 0">';
  html += '<div style="font-size:48px;margin-bottom:12px">⭐</div>';
  html += '<h3 style="font-size:18px;font-weight:600;color:var(--text-primary);margin-bottom:8px">践行者模块</h3>';
  html += '<p style="font-size:14px;color:var(--text-secondary);line-height:1.6">激活后解锁专属主题、不抱怨挑战、一时书<br>让修行更深入，让改变更真实</p>';
  html += '</div>';

  html += '<div class="form-group">';
  html += '<label class="form-label" for="pac-code">激活码</label>';
  html += '<input class="form-input" id="pac-code" type="text" placeholder="请输入激活码（格式：WF-XXXX-XXXX）" style="text-transform:uppercase;letter-spacing:1px">';
  html += '</div>';

  html += '<div style="padding:0 16px;margin-bottom:16px">';
  html += '<p style="font-size:12px;color:var(--text-hint);line-height:1.8">';
  html += '获取激活码请联系管理员<br>';
  html += 'QQ：862324160';
  html += '</p>';
  html += '</div>';

  html += '<div class="form-actions">';
  html += '<button class="btn-primary" id="pac-activate" style="flex:1;min-height:44px">激活践行者</button>';
  html += '</div>';

  html += '</div>';

  showPage("激活践行者", html);

  var topPage = _pageStack[_pageStack.length - 1];
  if (!topPage) return;
  var pageEl = topPage.el;

  setTimeout(function() {
    var activateBtn = pageEl.querySelector("#pac-activate");
    if (activateBtn) activateBtn.addEventListener("click", function() {
      var code = pageEl.querySelector("#pac-code").value.trim();
      if (!code) { showToast("请输入激活码"); return; }
      var result = activatePractitioner(code);
      if (result.success) {
        showToast(result.msg);
        hidePage();
        renderProfilePage();
      } else {
        showToast(result.msg);
      }
    });
  }, 50);
}

/**
 * 践行者中心页面（激活后）
 */
function showPractitionerCenter() {
  var html = '<div class="practitioner-center">';

  // 顶部状态
  html += '<div class="prac-header">';
  html += '<div class="prac-avatar">⭐</div>';
  html += '<div class="prac-info">';
  html += '<div class="prac-title">践行者</div>';
  html += '<div class="prac-subtitle">专属修行空间已开启</div>';
  html += '</div>';
  html += '</div>';

  // 功能入口
  html += '<div class="prac-menu">';

  html += '<div class="prac-menu-item" id="prac-nocomplain" role="button" tabindex="0">';
  html += '<span class="prac-menu-icon">🤐</span>';
  html += '<span class="prac-menu-label">不抱怨挑战</span>';
  html += '<span class="prac-menu-arrow">›</span>';
  html += '</div>';

  html += '<div class="prac-menu-item" id="prac-onemoment" role="button" tabindex="0">';
  html += '<span class="prac-menu-icon">📖</span>';
  html += '<span class="prac-menu-label">一时书</span>';
  html += '<span class="prac-menu-arrow">›</span>';
  html += '</div>';

  html += '<div class="prac-menu-item" id="prac-themes" role="button" tabindex="0">';
  html += '<span class="prac-menu-icon">🎨</span>';
  html += '<span class="prac-menu-label">专属主题</span>';
  html += '<span class="prac-menu-arrow">›</span>';
  html += '</div>';

  html += '</div>';
  html += '</div>';

  showPage("践行者中心", html);

  var topPage = _pageStack[_pageStack.length - 1];
  if (!topPage) return;
  var pageEl = topPage.el;

  setTimeout(function() {
    var ncItem = pageEl.querySelector("#prac-nocomplain");
    if (ncItem) ncItem.addEventListener("click", function() {
      hidePage();
      switchTab("practitioner");
    });

    var omItem = pageEl.querySelector("#prac-onemoment");
    if (omItem) omItem.addEventListener("click", function() {
      hidePage();
      switchTab("practitioner");
    });

    var thItem = pageEl.querySelector("#prac-themes");
    if (thItem) thItem.addEventListener("click", function() { showPractitionerThemes(); });
  }, 50);
}

/**
 * 专属主题商店（仅践行者）
 */
function showPractitionerThemes() {
  var current = getCurrentTheme();

  var html = '<div class="theme-shop">';
  html += '<div style="padding:12px 16px;font-size:13px;color:#999;text-align:center">⭐ 践行者专属主题，更精美更治愈</div>';

  PRACTITIONER_THEMES.forEach(function(theme) {
    var isCurrent = theme.id === current;
    html += '<div class="theme-item prac-theme-item">';
    html += '<div class="theme-item-info">';
    html += '<span class="theme-color-dot" style="background:' + theme.brand + '"></span>';
    html += '<div>';
    html += '<span class="theme-item-name">' + theme.name + '</span>';
    html += '<span style="font-size:11px;color:#999;display:block;margin-top:2px">' + (theme.desc || "") + '</span>';
    html += '</div>';
    if (isCurrent) html += '<span class="theme-current-tag">(当前)</span>';
    html += '</div>';
    html += '<div class="theme-item-action">';
    if (isCurrent) {
      html += '<span style="color:#999;font-size:12px">使用中</span>';
    } else {
      html += '<button class="btn-secondary theme-btn" data-action="use" data-id="' + theme.id + '" style="padding:4px 12px;font-size:12px;min-height:28px">使用</button>';
    }
    html += '</div>';
    html += '</div>';
  });

  html += '</div>';

  showPage("专属主题", html);

  var topPage = _pageStack[_pageStack.length - 1];
  if (!topPage) return;
  var pageEl = topPage.el;

  setTimeout(function() {
    var buttons = pageEl.querySelectorAll(".theme-btn");
    buttons.forEach(function(btn) {
      btn.addEventListener("click", function() {
        var themeId = btn.getAttribute("data-id");
        applyTheme(themeId);
        showToast("已切换到专属主题");
      });
    });
  }, 50);
}

// ══════════════════════════════════════════════
//  不抱怨模块 UI
// ══════════════════════════════════════════════

/**
 * 不抱怨挑战列表
 */
function showNoComplaintList() {
  var challenges = getNoComplaintChallenges();

  var html = '<div class="nocomplain-list">';

  if (challenges.length === 0) {
    html += '<div class="empty-state">';
    html += '<p>还没有不抱怨挑战</p>';
    html += '<p>点击下方按钮添加你的第一个挑战吧</p>';
    html += '</div>';
  }

  challenges.forEach(function(ch) {
    var todayRec = null;
    for (var i = 0; i < ch.records.length; i++) {
      if (ch.records[i].date === getTodayStr()) { todayRec = ch.records[i]; break; }
    }
    var todayCount = todayRec ? todayRec.count : 0;

    html += '<div class="nc-card">';
    html += '<div class="nc-card-header">';
    html += '<span class="nc-name">' + ch.name + '</span>';
    html += '<span class="nc-target">目标 ' + ch.targetDays + ' 天</span>';
    html += '</div>';
    if (ch.signature) {
      html += '<div class="nc-signature">「' + ch.signature + '」</div>';
    }
    html += '<div class="nc-today">今日抱怨：' + todayCount + ' 次</div>';
    html += '<div class="nc-actions">';
    html += '<button class="btn-primary nc-add-btn" data-id="' + ch.id + '" style="flex:1;min-height:40px">+ 记录一次抱怨</button>';
    html += '<button class="btn-secondary nc-detail-btn" data-id="' + ch.id + '" style="flex:1;min-height:40px">查看详情</button>';
    html += '</div>';
    html += '</div>';
  });

  html += '<button class="btn-primary" id="btn-add-nc" style="width:calc(100% - 32px);margin:16px;min-height:44px">+ 添加不抱怨挑战</button>';

  html += '</div>';

  showPage("不抱怨挑战", html);

  var topPage = _pageStack[_pageStack.length - 1];
  if (!topPage) return;
  var pageEl = topPage.el;

  setTimeout(function() {
    var addBtn = pageEl.querySelector("#btn-add-nc");
    if (addBtn) addBtn.addEventListener("click", function() { showAddNoComplaintForm(); });

    var addBtns = pageEl.querySelectorAll(".nc-add-btn");
    addBtns.forEach(function(btn) {
      btn.addEventListener("click", function() {
        var cid = btn.getAttribute("data-id");
        addComplaintRecord(cid);
        showToast("已记录一次抱怨");
        hidePage();
        setTimeout(function() { showNoComplaintList(); }, 100);
      });
    });

    var detailBtns = pageEl.querySelectorAll(".nc-detail-btn");
    detailBtns.forEach(function(btn) {
      btn.addEventListener("click", function() {
        var cid = btn.getAttribute("data-id");
        showNoComplaintDetail(cid);
      });
    });
  }, 50);
}

/**
 * 添加不抱怨挑战表单
 */
function showAddNoComplaintForm() {
  var html = '<div class="form-page">';

  html += '<div class="form-group">';
  html += '<label class="form-label" for="nc-name">挑战名字</label>';
  html += '<input class="form-input" id="nc-name" type="text" placeholder="给不抱怨取一个具体的名字吧">';
  html += '</div>';

  html += '<div class="form-group">';
  html += '<label class="form-label" for="nc-days">准备挑战多少天</label>';
  html += '<input class="form-input" id="nc-days" type="number" min="1" max="365" placeholder="21" value="21">';
  html += '</div>';

  html += '<div class="form-group">';
  html += '<label class="form-label" for="nc-note">备注（可选）</label>';
  html += '<input class="form-input" id="nc-note" type="text" placeholder="例如：工作中不抱怨">';
  html += '</div>';

  html += '<div class="form-group">';
  html += '<label class="form-label" for="nc-sig">自定义签名（可选）</label>';
  html += '<input class="form-input" id="nc-sig" type="text" placeholder="例如：口吐莲花，心存善意">';
  html += '</div>';

  html += '<div class="form-actions">';
  html += '<button class="btn-primary" id="nc-create" style="flex:1;min-height:44px">开始挑战</button>';
  html += '</div>';

  html += '</div>';

  showPage("添加不抱怨挑战", html);

  var topPage = _pageStack[_pageStack.length - 1];
  if (!topPage) return;
  var pageEl = topPage.el;

  setTimeout(function() {
    var createBtn = pageEl.querySelector("#nc-create");
    if (createBtn) createBtn.addEventListener("click", function() {
      var name = pageEl.querySelector("#nc-name").value.trim() || "不抱怨挑战";
      var days = pageEl.querySelector("#nc-days").value.trim() || "21";
      var note = pageEl.querySelector("#nc-note").value.trim();
      var sig = pageEl.querySelector("#nc-sig").value.trim();

      addNoComplaintChallenge(name, days, note, sig);
      showToast("不抱怨挑战已创建，加油哦！");
      hidePage();
      refreshCheckinList();
    });
  }, 50);
}

/**
 * 不抱怨挑战详情
 */
function showNoComplaintDetail(cid) {
  var challenge = getNoComplaintChallenge(cid);
  if (!challenge) { showToast("挑战不存在"); return; }

  var ncStreak = _getNoComplaintStreak(challenge);

  var html = '<div class="nc-detail">';

  html += '<div class="nc-detail-header">';
  html += '<p>目标 ' + challenge.targetDays + ' 天 | 已记录 ' + challenge.records.length + ' 天 | 连续' + ncStreak + '天</p>';
  if (challenge.signature) {
    html += '<p>签名：「' + challenge.signature + '」</p>';
  }
  html += '</div>';

  // 组合框选择统计周期
  html += '<div style="padding:12px 16px;background:var(--bg);border-bottom:1px solid var(--border-light)">';
  html += '<label for="nc-period-select" style="font-size:13px;color:var(--text-secondary);margin-right:8px">统计周期</label>';
  html += '<select id="nc-period-select" class="form-select" style="width:auto;display:inline-block;min-height:36px;padding:6px 12px">';
  html += '<option value="day">1天</option>';
  html += '<option value="week">1周</option>';
  html += '<option value="month">1月</option>';
  html += '<option value="year">1年</option>';
  html += '</select>';
  html += '</div>';

  html += '<div class="nc-stats-table" id="nc-stats-table">';
  html += _renderNoComplaintStats(challenge, "day");
  html += '</div>';

  html += '<div class="nc-summary" id="nc-summary">';
  html += _renderNoComplaintSummary(challenge, "day");
  html += '</div>';

  html += '<div style="display:flex;gap:10px;margin:16px;flex-wrap:wrap">';
  html += '<button class="btn-primary" id="nc-add-quick" style="flex:1;min-height:40px;min-width:100px">+ 记录一次抱怨</button>';
  html += '<button class="btn-secondary" id="nc-edit" style="flex:1;min-height:40px;min-width:80px">编辑</button>';
  html += '<button class="btn-danger" id="nc-delete" style="flex:1;min-height:40px;min-width:80px">删除</button>';
  html += '</div>';

  html += '</div>';

  showPage(challenge.name, html);

  var topPage = _pageStack[_pageStack.length - 1];
  if (!topPage) return;
  var pageEl = topPage.el;

  setTimeout(function() {
    var periodSelect = pageEl.querySelector("#nc-period-select");
    if (periodSelect) periodSelect.addEventListener("change", function() {
      var period = this.value;
      var tableEl = pageEl.querySelector("#nc-stats-table");
      var summaryEl = pageEl.querySelector("#nc-summary");
      if (tableEl) tableEl.innerHTML = _renderNoComplaintStats(challenge, period);
      if (summaryEl) summaryEl.innerHTML = _renderNoComplaintSummary(challenge, period);
    });

    var addQuickBtn = pageEl.querySelector("#nc-add-quick");
    if (addQuickBtn) addQuickBtn.addEventListener("click", function() {
      addComplaintRecord(cid);
      playCheckinSound();
      showToast("已记录一次抱怨");
      hidePage();
      setTimeout(function() { showNoComplaintDetail(cid); }, 100);
    });

    var editBtn = pageEl.querySelector("#nc-edit");
    if (editBtn) editBtn.addEventListener("click", function() {
      hidePage();
      setTimeout(function() { showEditNoComplaintForm(cid); }, 100);
    });

    var delBtn = pageEl.querySelector("#nc-delete");
    if (delBtn) delBtn.addEventListener("click", function() {
      hidePage();
      setTimeout(function() {
        showConfirm("确认删除", "确定删除「" + challenge.name + "」吗？所有记录将丢失。", "删除", function() {
          deleteNoComplaintChallenge(cid);
          showToast("挑战已删除");
          hidePage();
          refreshCheckinList();
        }, true);
      }, 100);
    });
  }, 50);
}

/**
 * 编辑不抱怨挑战表单
 */
function showEditNoComplaintForm(cid) {
  var challenge = getNoComplaintChallenge(cid);
  if (!challenge) { showToast("挑战不存在"); return; }

  var html = '<div class="form-page">';

  html += '<div class="form-group">';
  html += '<label class="form-label" for="enc-name">挑战名字</label>';
  html += '<input class="form-input" id="enc-name" type="text" value="' + challenge.name + '">';
  html += '</div>';

  html += '<div class="form-group">';
  html += '<label class="form-label" for="enc-days">准备挑战多少天</label>';
  html += '<input class="form-input" id="enc-days" type="number" min="1" max="365" value="' + challenge.targetDays + '">';
  html += '</div>';

  html += '<div class="form-group">';
  html += '<label class="form-label" for="enc-note">备注（可选）</label>';
  html += '<input class="form-input" id="enc-note" type="text" value="' + (challenge.note || "") + '">';
  html += '</div>';

  html += '<div class="form-group">';
  html += '<label class="form-label" for="enc-sig">自定义签名（可选）</label>';
  html += '<input class="form-input" id="enc-sig" type="text" value="' + (challenge.signature || "") + '">';
  html += '</div>';

  html += '<div class="form-actions">';
  html += '<button class="btn-primary" id="enc-save" style="flex:1;min-height:44px">保存修改</button>';
  html += '</div>';

  html += '</div>';

  showPage("编辑不抱怨挑战", html);

  var topPage = _pageStack[_pageStack.length - 1];
  if (!topPage) return;
  var pageEl = topPage.el;

  setTimeout(function() {
    var saveBtn = pageEl.querySelector("#enc-save");
    if (saveBtn) saveBtn.addEventListener("click", function() {
      var name = pageEl.querySelector("#enc-name").value.trim() || "不抱怨挑战";
      var days = pageEl.querySelector("#enc-days").value.trim() || "21";
      var note = pageEl.querySelector("#enc-note").value.trim();
      var sig = pageEl.querySelector("#enc-sig").value.trim();
      updateNoComplaintChallenge(cid, name, days, note, sig);
      showToast("挑战已更新");
      hidePage();
      refreshCheckinList();
    });
  }, 50);
}

function _renderNoComplaintStats(challenge, period) {
  var records = challenge.records.slice().reverse();
  var filtered = [];
  var today = new Date();
  var todayStr = formatDate(today);

  if (period === "day") {
    // 只显示今天
    filtered = records.filter(function(r) { return r.date === todayStr; });
  } else if (period === "week") {
    var weekAgo = new Date(today); weekAgo.setDate(weekAgo.getDate() - 7);
    filtered = records.filter(function(r) { return r.date >= formatDate(weekAgo); });
  } else if (period === "month") {
    filtered = records.filter(function(r) { return r.date.substr(0, 7) === todayStr.substr(0, 7); });
  } else if (period === "year") {
    filtered = records.filter(function(r) { return r.date.substr(0, 4) === todayStr.substr(0, 4); });
  }

  var html = '<table class="nc-table"><tr><th>日期</th><th>抱怨次数</th><th>时段</th></tr>';
  if (filtered.length === 0) {
    html += '<tr><td colspan="3" style="text-align:center;color:#999;padding:12px">暂无数据</td></tr>';
  }
  filtered.forEach(function(rec) {
    var times = rec.times ? rec.times.map(function(t) { return t.time; }).join("、") : "—";
    html += '<tr>';
    html += '<td>' + rec.date + '</td>';
    html += '<td style="color:' + (rec.count > 5 ? '#E64340' : '#07C160') + '">' + rec.count + ' 次</td>';
    html += '<td style="font-size:12px">' + times + '</td>';
    html += '</tr>';
  });
  html += '</table>';
  return html;
}

function _renderNoComplaintSummary(challenge, period) {
  var records = challenge.records;
  var today = new Date();
  var todayStr = formatDate(today);
  var currentCount = 0, currentDays = 0, prevCount = 0, prevDays = 0;
  var isFirstDay = false;

  if (period === "day") {
    // 今天 vs 昨天
    var yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
    var yesterdayStr = formatDate(yesterday);
    records.forEach(function(r) {
      if (r.date === todayStr) { currentCount += r.count; currentDays = 1; }
      else if (r.date === yesterdayStr) { prevCount += r.count; prevDays = 1; }
    });
    // 判断是否第一天
    if (currentDays === 0) {
      // 今天没有记录，看是否有任何历史记录
      isFirstDay = records.length === 0;
    } else {
      // 今天有记录，看昨天有没有
      isFirstDay = prevDays === 0 && records.length <= 1;
    }
  } else if (period === "week") {
    // 本周 vs 上周（周一为起始）
    var thisWeekStart = new Date(today);
    thisWeekStart.setDate(thisWeekStart.getDate() - today.getDay() + 1);
    if (thisWeekStart.getDay() === 0) thisWeekStart.setDate(thisWeekStart.getDate() - 6);
    var lastWeekStart = new Date(thisWeekStart); lastWeekStart.setDate(lastWeekStart.getDate() - 7);
    var lastWeekEnd = new Date(thisWeekStart); lastWeekEnd.setDate(lastWeekEnd.getDate() - 1);
    records.forEach(function(r) {
      var d = parseDate(r.date);
      if (d >= thisWeekStart) { currentCount += r.count; currentDays++; }
      else if (d >= lastWeekStart && d <= lastWeekEnd) { prevCount += r.count; prevDays++; }
    });
    if (prevDays === 0) isFirstDay = true;
  } else if (period === "month") {
    // 本月 vs 上月
    var thisMonth = today.getFullYear() + "-" + pad(today.getMonth() + 1);
    var lastMonth = today.getMonth() === 0
      ? (today.getFullYear() - 1) + "-12"
      : today.getFullYear() + "-" + pad(today.getMonth());
    records.forEach(function(r) {
      if (r.date.substr(0, 7) === thisMonth) { currentCount += r.count; currentDays++; }
      else if (r.date.substr(0, 7) === lastMonth) { prevCount += r.count; prevDays++; }
    });
    if (prevDays === 0) isFirstDay = true;
  } else if (period === "year") {
    // 本年 vs 上年
    var thisYear = today.getFullYear().toString();
    var lastYear = (today.getFullYear() - 1).toString();
    records.forEach(function(r) {
      if (r.date.substr(0, 4) === thisYear) { currentCount += r.count; currentDays++; }
      else if (r.date.substr(0, 4) === lastYear) { prevCount += r.count; prevDays++; }
    });
    if (prevDays === 0) isFirstDay = true;
  }

  var html = '<div class="nc-summary-box">';
  html += '<h4>统计总结</h4>';
  var avgPerDay = currentDays > 0 ? (currentCount / currentDays).toFixed(1) : "0";
  html += '<p>这段时间，你一共抱怨了 ' + currentCount + ' 次，平均每天 ' + avgPerDay + ' 次</p>';
  if (isFirstDay) {
    html += '<p style="color:#999">刚开始记录，继续坚持哦</p>';
  } else {
    var avgPrev = prevDays > 0 ? (prevCount / prevDays).toFixed(1) : "0";
    html += '<p>上次这段时间抱怨了 ' + prevCount + ' 次，平均每天 ' + avgPrev + ' 次</p>';
    var diff = currentCount - prevCount;
    var changeText;
    if (diff > 0) {
      changeText = "比上次多了 " + diff + " 次，多一点觉察，少一点抱怨";
    } else if (diff < 0) {
      changeText = "比上次少了 " + Math.abs(diff) + " 次，进步很大，继续保持";
    } else {
      changeText = "和上次一样多，继续加油";
    }
    html += '<p style="color:' + (diff <= 0 ? "#07C160" : "#E64340") + ';font-weight:600">' + changeText + '</p>';
  }
  html += '</div>';
  return html;
}

// ══════════════════════════════════════════════
//  一时书模块 UI
// ══════════════════════════════════════════════

function showOneMomentBookList() {
  var books = getOneMomentBooks();

  var html = '<div class="omb-list">';

  if (books.length === 0) {
    html += '<div class="empty-state">';
    html += '<p>还没有一时书</p>';
    html += '<p>点击下方按钮添加你的第一个目标吧</p>';
    html += '</div>';
  }

  books.forEach(function(book) {
    var todayRecords = book.records.filter(function(r) { return r.date === getTodayStr(); });

    html += '<div class="omb-card">';
    html += '<div class="omb-card-header">';
    html += '<span class="omb-name">' + book.name + '</span>';
    html += '</div>';
    if (book.prompt) {
      html += '<div class="omb-prompt">提示：' + book.prompt + '</div>';
    }
    if (book.signature) {
      html += '<div class="omb-signature">「' + book.signature + '」</div>';
    }
    html += '<div class="omb-today">今日记录：' + todayRecords.length + ' 次</div>';
    html += '<div class="omb-actions">';
    html += '<button class="btn-primary omb-checkin-btn" data-id="' + book.id + '" style="flex:1;min-height:40px">';
    html += todayRecords.length === 0 ? '六时书打卡' : '咖啡冥想';
    html += '</button>';
    html += '<button class="btn-secondary omb-detail-btn" data-id="' + book.id + '" style="flex:1;min-height:40px">查看记录</button>';
    html += '</div>';
    html += '</div>';
  });

  html += '<button class="btn-primary" id="btn-add-omb" style="width:calc(100% - 32px);margin:16px;min-height:44px">+ 添加一时书</button>';

  html += '</div>';

  showPage("一时书", html);

  var topPage = _pageStack[_pageStack.length - 1];
  if (!topPage) return;
  var pageEl = topPage.el;

  setTimeout(function() {
    var addBtn = pageEl.querySelector("#btn-add-omb");
    if (addBtn) addBtn.addEventListener("click", function() { showAddOneMomentBookForm(); });

    var checkinBtns = pageEl.querySelectorAll(".omb-checkin-btn");
    checkinBtns.forEach(function(btn) {
      btn.addEventListener("click", function() {
        var bid = btn.getAttribute("data-id");
        showOneMomentBookCheckin(bid);
      });
    });

    var detailBtns = pageEl.querySelectorAll(".omb-detail-btn");
    detailBtns.forEach(function(btn) {
      btn.addEventListener("click", function() {
        var bid = btn.getAttribute("data-id");
        showOneMomentBookDetail(bid);
      });
    });
  }, 50);
}

function showAddOneMomentBookForm() {
  var html = '<div class="form-page">';

  html += '<div class="form-group">';
  html += '<label class="form-label" for="omb-name">目标名字</label>';
  html += '<textarea class="form-input form-textarea" id="omb-name" placeholder="建议目标具体可落地，例如：每天记录3件善事、3件需要改进的事"></textarea>';
  html += '</div>';

  html += '<div class="form-group">';
  html += '<label class="form-label" for="omb-prompt">为什么要达成这个目标</label>';
  html += '<textarea class="form-input form-textarea" id="omb-prompt" placeholder="你想想为什么要达成这个目标"></textarea>';
  html += '</div>';

  html += '<div class="form-group">';
  html += '<label class="form-label" for="omb-time">提醒时间（可选）</label>';
  html += '<select class="form-select" id="omb-time">';
  html += '<option value="">不提醒</option>';
  for (var h = 0; h < 24; h++) {
    html += '<option value="' + pad(h) + ':00">' + pad(h) + ':00</option>';
  }
  html += '</select>';
  html += '</div>';

  html += '<div class="form-group">';
  html += '<label class="form-label" for="omb-sig">自定义签名（可选）</label>';
  html += '<input class="form-input" id="omb-sig" type="text" placeholder="例如：每天进步一点点">';
  html += '</div>';

  html += '<div class="form-actions">';
  html += '<button class="btn-primary" id="omb-create" style="flex:1;min-height:44px">确定</button>';
  html += '</div>';

  html += '</div>';

  showPage("添加一时书", html);

  var topPage = _pageStack[_pageStack.length - 1];
  if (!topPage) return;
  var pageEl = topPage.el;

  setTimeout(function() {
    var createBtn = pageEl.querySelector("#omb-create");
    if (createBtn) createBtn.addEventListener("click", function() {
      var name = pageEl.querySelector("#omb-name").value.trim();
      if (!name) { showToast("请填写目标名字"); return; }
      var prompt = pageEl.querySelector("#omb-prompt").value.trim();
      var time = pageEl.querySelector("#omb-time").value;
      var sig = pageEl.querySelector("#omb-sig").value.trim();

      addOneMomentBook(name, prompt, time, sig);
      showToast("一时书已创建");
      hidePage();
      refreshCheckinList();
    });
  }, 50);
}

function showOneMomentBookCheckin(bid) {
  var book = getOneMomentBook(bid);
  if (!book) { showToast("一时书不存在"); return; }

  var todayRecords = book.records.filter(function(r) { return r.date === getTodayStr(); });
  var isFirstCheckin = todayRecords.length === 0;

  var html = '<div class="form-page">';

  html += '<div style="text-align:center;padding:16px 0">';
  html += '<h3 style="font-size:18px;font-weight:600;color:var(--text-primary)">' + book.name + '</h3>';
  html += '</div>';

  if (isFirstCheckin) {
    html += '<div class="omb-section">';
    html += '<h4>正向的身、语、意</h4>';
    html += '<textarea class="form-input form-textarea" id="omb-positive" placeholder="记录今天做得好的地方..."></textarea>';
    html += '</div>';
    html += '<div class="omb-section">';
    html += '<h4>负面的身、语、意</h4>';
    html += '<textarea class="form-input form-textarea" id="omb-negative" placeholder="觉察今天需要改进的地方..."></textarea>';
    html += '</div>';
    html += '<div class="omb-section">';
    html += '<h4>我要主动做什么利他小事</h4>';
    html += '<textarea class="form-input form-textarea" id="omb-altruistic" placeholder="今天可以做的一件利他小事..."></textarea>';
    html += '</div>';
  } else {
    html += '<div style="text-align:center;padding:12px 0">';
    html += '<h3 style="font-size:18px;font-weight:600;color:var(--brand)">☕ 咖啡冥想</h3>';
    html += '</div>';
    html += '<div class="omb-section">';
    html += '<h4>挑3个善举，发自内心的感恩随喜</h4>';
    html += '<textarea class="form-input form-textarea" id="omb-merit1" placeholder="今天做的3件善事..."></textarea>';
    html += '</div>';
    html += '<div class="omb-section">';
    html += '<h4>挑3个最严重的负面行为，诚心忏悔，承诺修正</h4>';
    html += '<textarea class="form-input form-textarea" id="omb-merit2" placeholder="需要改进的3个行为..."></textarea>';
    html += '</div>';
    html += '<div class="omb-section">';
    html += '<h4>把今天所有正面种子，回向给自己的核心愿望，同时愿所有人同得圆满</h4>';
    html += '<textarea class="form-input form-textarea" id="omb-merit3" placeholder="回向愿..."></textarea>';
    html += '</div>';
  }

  html += '<div class="form-actions">';
  html += '<button class="btn-primary" id="omb-submit" style="flex:1;min-height:44px">' + (isFirstCheckin ? '提交六时书' : '提交咖啡冥想') + '</button>';
  html += '</div>';

  html += '</div>';

  showPage(isFirstCheckin ? book.name : "咖啡冥想", html);

  var topPage = _pageStack[_pageStack.length - 1];
  if (!topPage) return;
  var pageEl = topPage.el;

  setTimeout(function() {
    var submitBtn = pageEl.querySelector("#omb-submit");
    if (submitBtn) submitBtn.addEventListener("click", function() {
      var recordData;
      if (isFirstCheckin) {
        recordData = {
          positive: pageEl.querySelector("#omb-positive").value.trim(),
          negative: pageEl.querySelector("#omb-negative").value.trim(),
          altruistic: pageEl.querySelector("#omb-altruistic").value.trim()
        };
      } else {
        recordData = {
          merit1: pageEl.querySelector("#omb-merit1").value.trim(),
          merit2: pageEl.querySelector("#omb-merit2").value.trim(),
          merit3: pageEl.querySelector("#omb-merit3").value.trim()
        };
      }
      var type = isFirstCheckin ? "checkin" : "coffee";
      addOneMomentBookRecord(bid, type, recordData);
      playCheckinSound();
      showToast(isFirstCheckin ? "六时书已记录" : "咖啡冥想完成");
      hidePage();
      refreshCheckinList();
    });
  }, 50);
}

function showOneMomentBookDetail(bid) {
  var book = getOneMomentBook(bid);
  if (!book) { showToast("一时书不存在"); return; }

  var html = '<div class="omb-detail">';

  html += '<div class="omb-detail-header">';
  if (book.prompt) {
    html += '<p style="color:#999;font-size:13px">为什么：' + book.prompt + '</p>';
  }
  if (book.signature) {
    html += '<p>签名：「' + book.signature + '」</p>';
  }
  html += '<p>共 ' + book.records.length + ' 条记录</p>';
  html += '</div>';

  html += '<div class="nc-period-selector">';
  html += '<button class="nc-period-btn active" data-period="recent">最新7条</button>';
  html += '<button class="nc-period-btn" data-period="week">本周</button>';
  html += '<button class="nc-period-btn" data-period="month">本月</button>';
  html += '<button class="nc-period-btn" data-period="year">本年</button>';
  html += '</div>';

  html += '<div class="omb-records" id="omb-records">';
  html += _renderOneMomentBookRecords(book, "recent");
  html += '</div>';

  html += '<div style="display:flex;gap:10px;margin:16px">';
  html += '<button class="btn-secondary" id="omb-edit" style="flex:1;min-height:40px">编辑此一时书</button>';
  html += '<button class="btn-danger" id="omb-delete" style="flex:1;min-height:40px">删除此一时书</button>';
  html += '</div>';

  html += '</div>';

  showPage(book.name + " - 记录", html);

  var topPage = _pageStack[_pageStack.length - 1];
  if (!topPage) return;
  var pageEl = topPage.el;

  setTimeout(function() {
    var periodBtns = pageEl.querySelectorAll(".nc-period-btn");
    periodBtns.forEach(function(btn) {
      btn.addEventListener("click", function() {
        var period = btn.getAttribute("data-period");
        periodBtns.forEach(function(b) { b.classList.remove("active"); });
        btn.classList.add("active");
        var recordsEl = pageEl.querySelector("#omb-records");
        if (recordsEl) recordsEl.innerHTML = _renderOneMomentBookRecords(book, period);
      });
    });

    var editBtn = pageEl.querySelector("#omb-edit");
    if (editBtn) editBtn.addEventListener("click", function() {
      hidePage();
      setTimeout(function() { showEditOneMomentBookForm(bid); }, 100);
    });

    var delBtn = pageEl.querySelector("#omb-delete");
    if (delBtn) delBtn.addEventListener("click", function() {
      hidePage();
      setTimeout(function() {
        showConfirm("确认删除", "确定删除「" + book.name + "」吗？所有记录将丢失。", "删除", function() {
          deleteOneMomentBook(bid);
          showToast("一时书已删除");
          hidePage();
          refreshCheckinList();
        }, true);
      }, 100);
    });
  }, 50);
}

function showEditOneMomentBookForm(bid) {
  var book = getOneMomentBook(bid);
  if (!book) { showToast("一时书不存在"); return; }

  var html = '<div class="form-page">';

  html += '<div class="form-group">';
  html += '<label class="form-label" for="eomb-name">目标名字</label>';
  html += '<textarea class="form-input form-textarea" id="eomb-name">' + (book.name || "") + '</textarea>';
  html += '</div>';

  html += '<div class="form-group">';
  html += '<label class="form-label" for="eomb-prompt">为什么要达成这个目标</label>';
  html += '<textarea class="form-input form-textarea" id="eomb-prompt">' + (book.prompt || "") + '</textarea>';
  html += '</div>';

  html += '<div class="form-group">';
  html += '<label class="form-label" for="eomb-time">提醒时间（可选）</label>';
  html += '<select class="form-select" id="eomb-time">';
  html += '<option value="">不提醒</option>';
  for (var h = 0; h < 24; h++) {
    var v = pad(h) + ":00";
    var sel = (book.reminderTime === v) ? " selected" : "";
    html += '<option value="' + v + '"' + sel + '>' + v + '</option>';
  }
  html += '</select>';
  html += '</div>';

  html += '<div class="form-group">';
  html += '<label class="form-label" for="eomb-sig">自定义签名（可选）</label>';
  html += '<input class="form-input" id="eomb-sig" type="text" value="' + (book.signature || "") + '">';
  html += '</div>';

  html += '<div class="form-actions">';
  html += '<button class="btn-primary" id="eomb-save" style="flex:1;min-height:44px">保存修改</button>';
  html += '</div>';

  html += '</div>';

  showPage("编辑一时书", html);

  var topPage = _pageStack[_pageStack.length - 1];
  if (!topPage) return;
  var pageEl = topPage.el;

  setTimeout(function() {
    var saveBtn = pageEl.querySelector("#eomb-save");
    if (saveBtn) saveBtn.addEventListener("click", function() {
      var name = pageEl.querySelector("#eomb-name").value.trim();
      if (!name) { showToast("请填写目标名字"); return; }
      var prompt = pageEl.querySelector("#eomb-prompt").value.trim();
      var time = pageEl.querySelector("#eomb-time").value;
      var sig = pageEl.querySelector("#eomb-sig").value.trim();

      updateMomentBook("one", bid, name, prompt, time, sig);
      showToast("一时书已更新");
      hidePage();
      setTimeout(function() { showOneMomentBookDetail(bid); }, 100);
    });
  }, 50);
}

function _renderOneMomentBookRecords(book, period) {
  var records = book.records.slice().reverse();
  var filtered = records;
  var today = new Date();
  var todayStr = formatDate(today);

  if (period === "recent") {
    filtered = records.slice(0, 7);
  } else if (period === "week") {
    var weekAgo = new Date(today); weekAgo.setDate(weekAgo.getDate() - 7);
    filtered = records.filter(function(r) { return r.date >= formatDate(weekAgo); });
  } else if (period === "month") {
    filtered = records.filter(function(r) { return r.date.substr(0, 7) === todayStr.substr(0, 7); });
  } else if (period === "year") {
    filtered = records.filter(function(r) { return r.date.substr(0, 4) === todayStr.substr(0, 4); });
  }

  var html = '<div class="omb-record-list">';
  if (filtered.length === 0) {
    html += '<div style="text-align:center;padding:20px;color:#999">暂无记录</div>';
  }
  filtered.forEach(function(rec) {
    html += '<div class="omb-record-item">';
    html += '<div class="omb-record-date">' + rec.date + ' ' + (rec.type === "checkin" ? "六时书" : "咖啡冥想") + '</div>';
    if (rec.type === "checkin") {
      if (rec.data.positive) html += '<div class="omb-record-field">\u2705 ' + rec.data.positive + '</div>';
      if (rec.data.negative) html += '<div class="omb-record-field">\u26a0\ufe0f ' + rec.data.negative + '</div>';
      if (rec.data.altruistic) html += '<div class="omb-record-field">\u{1f49d} ' + rec.data.altruistic + '</div>';
    } else {
      if (rec.data.merit1) html += '<div class="omb-record-field">\u{1f64f} ' + rec.data.merit1 + '</div>';
      if (rec.data.merit2) html += '<div class="omb-record-field">\u2728 ' + rec.data.merit2 + '</div>';
      if (rec.data.merit3) html += '<div class="omb-record-field">\u{1f31f} ' + rec.data.merit3 + '</div>';
    }
    html += '</div>';
  });
  html += '</div>';
  return html;
}

// 辅助函数：格式化日期为 YYYY-MM-DD
function formatDate(d) {
  return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
}
