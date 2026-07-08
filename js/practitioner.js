/* ========================================
   籽芽手账 - 践行者选项卡
   v4.1: 模块入口式布局 + 激活机制 + 阳光雨露
   ======================================== */

/**
 * 渲染践行者页面（主tab）
 * v4.2: 未激活也显示所有模块入口+待激活天数，最下面才是激活码
 */
function renderPractitionerPage() {
  var main = document.getElementById("main-content");
  main.innerHTML = "";

  var page = createEl("div", "tab-page active", { id: "page-practitioner" });

  var isActivated = isPractitionerActivated();

  // 标题区
  var section = createEl("div", "profile-section");
  var titleBox = createEl("div", "prac-title-box");
  if (isActivated) {
    titleBox.innerHTML = '<div style="padding:16px;text-align:center;color:var(--brand);font-weight:600">⭐ 践行者（已激活）</div>';
  } else {
    titleBox.innerHTML = '<div style="padding:16px;text-align:center;color:var(--text-hint)">⭐ 践行者（未激活）</div>';
  }
  section.appendChild(titleBox);

  // ── 阳光雨露 ──
  if (isActivated) {
    var sunCount = getSunshineEntries().length;
    var sunStreak = getSunshineActivationProgress();
    var itemSun = makeSettingItem("阳光雨露", sunCount + " 条记录 · " + (sunStreak >= 3 ? "已激活" : "连续" + sunStreak + "天"), function() {
      showSunshineModule();
    });
    section.appendChild(itemSun);
  } else {
    var sunLeft = 3 - getSunshineActivationProgress();
    if (sunLeft < 0) sunLeft = 0;
    var itemSun = makeSettingItem("阳光雨露", "待激活 · 还需连续打卡" + sunLeft + "天", null);
    itemSun.classList.add("setting-item-disabled");
    itemSun.setAttribute("aria-disabled", "true");
    section.appendChild(itemSun);
  }

  // ── 梦想中心 ──
  if (isActivated) {
    var dreams = getDreams();
    var completedCount = dreams.filter(function(d) { return d.completed; }).length;
    var itemDream = makeSettingItem("梦想中心", completedCount + "/" + dreams.length + " 已达成", function() {
      showDreamCenter();
    });
    section.appendChild(itemDream);
  } else {
    var dreamLeft = 7 - getDreamCenterActivationProgress();
    if (dreamLeft < 0) dreamLeft = 0;
    var itemDream = makeSettingItem("梦想中心", "待激活 · 还需连续打卡" + dreamLeft + "天", null);
    itemDream.classList.add("setting-item-disabled");
    itemDream.setAttribute("aria-disabled", "true");
    section.appendChild(itemDream);
  }

  // ── 不抱怨 ──
  if (isActivated) {
    var ncCount = getNoComplaintChallenges().length;
    var itemNC = makeSettingItem("不抱怨", ncCount + " 个挑战", function() {
      showNoComplaintModule();
    });
    section.appendChild(itemNC);
  } else {
    var ncLeft = 21 - getNoComplaintActivationProgress();
    if (ncLeft < 0) ncLeft = 0;
    var itemNC = makeSettingItem("不抱怨", "待激活 · 还需连续打卡" + ncLeft + "天", null);
    itemNC.classList.add("setting-item-disabled");
    itemNC.setAttribute("aria-disabled", "true");
    section.appendChild(itemNC);
  }

  // ── 六时书（一时书/三时书/六时书） ──
  if (isActivated) {
    var oneCount = getMomentBooks("one").length;
    var threeCount = getMomentBooks("three").length;
    var sixCount = getMomentBooks("six").length;
    var totalMB = oneCount + threeCount + sixCount;
    var itemMB = makeSettingItem("六时书", totalMB + " 个目标", function() {
      showMomentBookModule();
    });
    section.appendChild(itemMB);
  } else {
    var mbLeft = 30 - getMomentBookActivationProgress("one");
    if (mbLeft < 0) mbLeft = 0;
    var itemMB = makeSettingItem("六时书", "待激活 · 还需连续打卡" + mbLeft + "天", null);
    itemMB.classList.add("setting-item-disabled");
    itemMB.setAttribute("aria-disabled", "true");
    section.appendChild(itemMB);
  }

  // ── 专属主题 ──
  if (isActivated) {
    var currentThemeName = getThemeName(getCurrentTheme());
    var itemTheme = makeSettingItem("专属主题", currentThemeName, function() {
      showPractitionerThemes();
    });
    section.appendChild(itemTheme);
  } else {
    var itemTheme = makeSettingItem("专属主题", "待激活 · 需激活践行者后开放", null);
    itemTheme.classList.add("setting-item-disabled");
    itemTheme.setAttribute("aria-disabled", "true");
    section.appendChild(itemTheme);
  }

  page.appendChild(section);

  // ── 激活状态入口（仅未激活时显示，可查看进度） ──
  if (!isActivated) {
    var actSection = createEl("div", "profile-section");
    var itemAct = makeSettingItem("激活状态", "查看连续打卡进度", function() {
      showActivationStatus();
    });
    actSection.appendChild(itemAct);
    page.appendChild(actSection);
  }

  // ── 激活码入口（已激活则不显示） ──
  if (!isActivated) {
    var codeSection = createEl("div", "profile-section");
    var itemCode = makeSettingItem("输入激活码", "联系管理员 QQ：862324160", function() {
      showPractitionerActivation();
    });
    codeSection.appendChild(itemCode);
    page.appendChild(codeSection);
  }

  main.appendChild(page);
}

// ══════════════════════════════════════════════
//  六时书模块（一时书/三时书/六时书统一入口）
// ══════════════════════════════════════════════

function showMomentBookModule() {
  var oneBooks = getMomentBooks("one");
  var threeBooks = getMomentBooks("three");
  var sixBooks = getMomentBooks("six");

  var html = '<div class="dream-center">';

  // 添加按钮
  html += '<div style="display:flex;gap:8px;padding:12px 16px;flex-wrap:wrap">';
  html += '<button class="btn-secondary" id="mb-add-one" style="flex:1;min-height:40px;min-width:100px">+ 一时书</button>';
  html += '<button class="btn-secondary" id="mb-add-three" style="flex:1;min-height:40px;min-width:100px">+ 三时书</button>';
  html += '<button class="btn-secondary" id="mb-add-six" style="flex:1;min-height:40px;min-width:100px">+ 六时书</button>';
  html += '</div>';

  // 一时书列表
  html += _renderMomentBookSection("一时书", "one", oneBooks);
  // 三时书列表
  html += _renderMomentBookSection("三时书", "three", threeBooks);
  // 六时书列表
  html += _renderMomentBookSection("六时书", "six", sixBooks);

  html += '</div>';

  showPage("六时书", html);

  var topPage = _pageStack[_pageStack.length - 1];
  if (!topPage) return;
  var pageEl = topPage.el;

  setTimeout(function() {
    var addOneBtn = pageEl.querySelector("#mb-add-one");
    if (addOneBtn) addOneBtn.addEventListener("click", function() { showAddMomentBookForm("one"); });

    var addThreeBtn = pageEl.querySelector("#mb-add-three");
    if (addThreeBtn) addThreeBtn.addEventListener("click", function() { showAddMomentBookForm("three"); });

    var addSixBtn = pageEl.querySelector("#mb-add-six");
    if (addSixBtn) addSixBtn.addEventListener("click", function() { showAddMomentBookForm("six"); });

    // 绑定列表项点击
    _bindMomentBookItems(pageEl, "one", oneBooks);
    _bindMomentBookItems(pageEl, "three", threeBooks);
    _bindMomentBookItems(pageEl, "six", sixBooks);
  }, 50);
}

function _renderMomentBookSection(title, type, books) {
  var config = MOMENT_BOOK_CONFIG[type];
  var html = '<div style="padding:8px 16px">';
  html += '<div style="font-size:14px;font-weight:600;color:var(--text-primary);margin-bottom:8px">' + title + '（每天' + config.maxPerDay + '次）</div>';

  if (books.length === 0) {
    html += '<div style="color:#999;font-size:13px;padding:8px 0">暂无' + title + '</div>';
  } else {
    books.forEach(function(book) {
      var todayRecords = book.records.filter(function(r) { return r.date === getTodayStr(); });
      var todayCount = todayRecords.length;
      var statusText, statusColor;

      if (todayCount === 0) {
        statusText = "未打卡";
        statusColor = "#999";
      } else if (todayCount < config.maxPerDay) {
        statusText = todayCount + "/" + config.maxPerDay;
        statusColor = "#E6A817";
      } else {
        statusText = "今日已完成";
        statusColor = "#07C160";
      }

      html += '<div class="conversation-item mb-module-item" data-type="' + type + '" data-id="' + book.id + '" role="button" tabindex="0">';
      html += '<div class="ci-body">';
      html += '<div class="ci-title">' + book.name + '</div>';
      html += '<div class="ci-subtitle"><span style="color:' + statusColor + '">' + statusText + '</span></div>';
      html += '</div>';
      html += '<div class="ci-right"><span class="ci-tag" style="color:' + statusColor + '">' + statusText + '</span></div>';
      html += '</div>';
    });
  }

  html += '</div>';
  return html;
}

function _bindMomentBookItems(pageEl, type, books) {
  var items = pageEl.querySelectorAll('.mb-module-item[data-type="' + type + '"]');
  items.forEach(function(item) {
    var bid = item.getAttribute("data-id");
    item.addEventListener("click", function() {
      var book = null;
      for (var i = 0; i < books.length; i++) {
        if (books[i].id === bid) { book = books[i]; break; }
      }
      if (!book) return;

      var config = MOMENT_BOOK_CONFIG[type];
      var todayRecords = book.records.filter(function(r) { return r.date === getTodayStr(); });
      var todayCount = todayRecords.length;

      if (todayCount >= config.maxPerDay) {
        showToast("今日" + config.name + "已完成");
        return;
      }
      showMomentBookCheckin(type, bid);
    });

    var longPressTimer;
    item.addEventListener("touchstart", function() {
      longPressTimer = setTimeout(function() {
        showMomentBookDetail(type, bid);
      }, 600);
    });
    item.addEventListener("touchend", function() { clearTimeout(longPressTimer); });
    item.addEventListener("touchmove", function() { clearTimeout(longPressTimer); });
  });
}

// ══════════════════════════════════════════════
//  不抱怨模块入口
// ══════════════════════════════════════════════

function showNoComplaintModule() {
  var challenges = getNoComplaintChallenges();

  var html = '<div class="dream-center">';

  // 添加按钮
  html += '<div style="padding:12px 16px">';
  html += '<button class="btn-primary" id="nc-add-btn" style="width:100%;min-height:44px">+ 添加不抱怨挑战</button>';
  html += '</div>';

  if (challenges.length === 0) {
    html += '<div class="empty-state"><p>还没有不抱怨挑战</p><p>点击上方按钮开始吧</p></div>';
  } else {
    challenges.forEach(function(ch) {
      var todayRec = null;
      for (var i = 0; i < ch.records.length; i++) {
        if (ch.records[i].date === getTodayStr()) { todayRec = ch.records[i]; break; }
      }
      var todayCount = todayRec ? todayRec.count : 0;
      var ncStreak = _getNoComplaintStreak(ch);

      html += '<div class="conversation-item nc-module-item" data-id="' + ch.id + '" role="button" tabindex="0">';
      html += '<div class="ci-body">';
      html += '<div class="ci-title">' + ch.name + '</div>';
      html += '<div class="ci-subtitle">';
      html += '<span style="color:' + (todayCount > 0 ? '#E64340' : '#07C160') + '">今日' + todayCount + '次</span>';
      html += '<span>连续' + ncStreak + '天</span>';
      html += '</div>';
      html += '</div>';
      html += '<div class="ci-right"><span class="ci-tag" style="color:' + (todayCount > 0 ? '#E64340' : '#07C160') + '">' + (todayCount > 0 ? todayCount + '次' : '无抱怨') + '</span></div>';
      html += '</div>';
    });
  }

  html += '</div>';

  showPage("不抱怨挑战", html);

  var topPage = _pageStack[_pageStack.length - 1];
  if (!topPage) return;
  var pageEl = topPage.el;

  setTimeout(function() {
    var addBtn = pageEl.querySelector("#nc-add-btn");
    if (addBtn) addBtn.addEventListener("click", function() { showAddNoComplaintForm(); });

    var items = pageEl.querySelectorAll(".nc-module-item");
    items.forEach(function(item) {
      var cid = item.getAttribute("data-id");
      item.addEventListener("click", function() {
        // 点击 = 记录一次抱怨
        addComplaintRecord(cid);
        playCheckinSound();
        var ch = getNoComplaintChallenge(cid);
        var todayCount = 0;
        if (ch) {
          for (var i = 0; i < ch.records.length; i++) {
            if (ch.records[i].date === getTodayStr()) { todayCount = ch.records[i].count; break; }
          }
        }
        showToast("已记录一次抱怨（今日" + todayCount + "次）");
        hidePage();
        setTimeout(function() { showNoComplaintModule(); }, 100);
      });

      var longPressTimer;
      item.addEventListener("touchstart", function() {
        longPressTimer = setTimeout(function() {
          showNoComplaintDetail(cid);
        }, 600);
      });
      item.addEventListener("touchend", function() { clearTimeout(longPressTimer); });
      item.addEventListener("touchmove", function() { clearTimeout(longPressTimer); });
    });
  }, 50);
}

// ══════════════════════════════════════════════
//  阳光雨露模块
// ══════════════════════════════════════════════

function showSunshineModule() {
  var entries = getSunshineEntries();

  var html = '<div class="dream-center">';

  // 添加按钮
  html += '<div style="padding:12px 16px">';
  html += '<button class="btn-primary" id="sun-add-btn" style="width:100%;min-height:44px">+ 添加阳光雨露</button>';
  html += '</div>';

  if (entries.length === 0) {
    html += '<div class="empty-state"><p>还没有阳光雨露</p><p>记录你的感悟与成长</p></div>';
  } else {
    entries.forEach(function(entry) {
      var todayChecked = entry.records.indexOf(getTodayStr()) >= 0;
      var sunStreak = _calcStreakFromDates(_datesToObject(entry.records));

      html += '<div class="conversation-item sun-module-item" data-id="' + entry.id + '" role="button" tabindex="0">';
      html += '<div class="ci-body">';
      html += '<div class="ci-title">' + entry.name + '</div>';
      html += '<div class="ci-subtitle">';
      html += '<span style="color:' + (todayChecked ? '#07C160' : '#999') + '">' + (todayChecked ? '今日已记录' : '今日未记录') + '</span>';
      html += '<span>连续' + sunStreak + '天</span>';
      html += '</div>';
      html += '</div>';
      html += '<div class="ci-right"><span class="ci-tag" style="color:' + (todayChecked ? '#07C160' : '#999') + '">' + (todayChecked ? '已记录' : '点击记录') + '</span></div>';
      html += '</div>';
    });
  }

  html += '</div>';

  showPage("阳光雨露", html);

  var topPage = _pageStack[_pageStack.length - 1];
  if (!topPage) return;
  var pageEl = topPage.el;

  setTimeout(function() {
    var addBtn = pageEl.querySelector("#sun-add-btn");
    if (addBtn) addBtn.addEventListener("click", function() { showAddSunshineForm(); });

    var items = pageEl.querySelectorAll(".sun-module-item");
    items.forEach(function(item) {
      var eid = item.getAttribute("data-id");
      item.addEventListener("click", function() {
        // 点击 = 打卡记录 + 查看详情
        var entry = getSunshineEntry(eid);
        if (!entry) return;
        var todayChecked = entry.records.indexOf(getTodayStr()) >= 0;
        if (!todayChecked) {
          addSunshineRecord(eid);
          playCheckinSound();
          showToast("阳光雨露已记录");
        }
        showSunshineDetail(eid);
      });
    });
  }, 50);
}

function _datesToObject(dates) {
  var obj = {};
  dates.forEach(function(d) { obj[d] = true; });
  return obj;
}

function showAddSunshineForm() {
  var html = '<div class="form-page">';

  html += '<div class="form-group">';
  html += '<label class="form-label" for="sun-name">阳光雨露的名字</label>';
  html += '<input class="form-input" id="sun-name" type="text" placeholder="你可以用一句话总结">';
  html += '</div>';

  html += '<div class="form-group">';
  html += '<label class="form-label" for="sun-content">具体的内容</label>';
  html += '<textarea class="form-input form-textarea" id="sun-content" placeholder="你此刻领悟到了什么"></textarea>';
  html += '</div>';

  html += '<div class="form-group">';
  html += '<label class="form-label" for="sun-action">知道后，我以后要怎么做</label>';
  html += '<textarea class="form-input form-textarea" id="sun-action" placeholder="写下你的行动计划"></textarea>';
  html += '</div>';

  html += '<div class="form-actions">';
  html += '<button class="btn-primary" id="sun-create" style="flex:1;min-height:44px">添加</button>';
  html += '</div>';

  html += '</div>';

  showPage("添加阳光雨露", html);

  var topPage = _pageStack[_pageStack.length - 1];
  if (!topPage) return;
  var pageEl = topPage.el;

  setTimeout(function() {
    var createBtn = pageEl.querySelector("#sun-create");
    if (createBtn) createBtn.addEventListener("click", function() {
      var name = pageEl.querySelector("#sun-name").value.trim();
      if (!name) { showToast("请填写阳光雨露的名字"); return; }
      var content = pageEl.querySelector("#sun-content").value.trim();
      var action = pageEl.querySelector("#sun-action").value.trim();

      addSunshineEntry(name, content, action);
      showToast("阳光雨露已添加");
      hidePage();
      setTimeout(function() { showSunshineModule(); }, 100);
    });
  }, 50);
}

function showSunshineDetail(eid) {
  var entry = getSunshineEntry(eid);
  if (!entry) { showToast("不存在"); return; }

  var sunStreak = _calcStreakFromDates(_datesToObject(entry.records));

  var html = '<div class="omb-detail">';

  html += '<div class="omb-detail-header">';
  html += '<h3>' + entry.name + '</h3>';
  html += '<p>共 ' + entry.records.length + ' 条记录，连续' + sunStreak + '天</p>';
  html += '</div>';

  if (entry.content) {
    html += '<div class="omb-section">';
    html += '<h4>具体的内容</h4>';
    html += '<p style="font-size:14px;line-height:1.8;color:var(--text-primary)">' + entry.content + '</p>';
    html += '</div>';
  }

  if (entry.action) {
    html += '<div class="omb-section">';
    html += '<h4>知道后，我以后要怎么做</h4>';
    html += '<p style="font-size:14px;line-height:1.8;color:var(--text-primary)">' + entry.action + '</p>';
    html += '</div>';
  }

  // 记录列表
  if (entry.records.length > 0) {
    html += '<div class="nc-period-selector">';
    html += '<button class="nc-period-btn active" data-period="recent">最新7条</button>';
    html += '<button class="nc-period-btn" data-period="week">本周</button>';
    html += '<button class="nc-period-btn" data-period="month">本月</button>';
    html += '<button class="nc-period-btn" data-period="year">本年</button>';
    html += '</div>';

    html += '<div id="sun-records">' + _renderSunshineRecords(entry, "recent") + '</div>';
  }

  html += '<div style="display:flex;gap:10px;margin:16px">';
  html += '<button class="btn-primary" id="sun-checkin-quick" style="flex:1;min-height:40px">今日记录</button>';
  html += '<button class="btn-secondary" id="sun-edit" style="flex:1;min-height:40px">编辑</button>';
  html += '<button class="btn-danger" id="sun-delete" style="flex:1;min-height:40px">删除</button>';
  html += '</div>';

  html += '</div>';

  showPage(entry.name, html);

  var topPage = _pageStack[_pageStack.length - 1];
  if (!topPage) return;
  var pageEl = topPage.el;

  setTimeout(function() {
    var checkinBtn = pageEl.querySelector("#sun-checkin-quick");
    if (checkinBtn) checkinBtn.addEventListener("click", function() {
      var todayChecked = entry.records.indexOf(getTodayStr()) >= 0;
      if (todayChecked) {
        showToast("今日已记录");
        return;
      }
      addSunshineRecord(eid);
      playCheckinSound();
      showToast("阳光雨露已记录");
      hidePage();
      setTimeout(function() { showSunshineDetail(eid); }, 100);
    });

    var editBtn = pageEl.querySelector("#sun-edit");
    if (editBtn) editBtn.addEventListener("click", function() {
      hidePage();
      setTimeout(function() { showEditSunshineForm(eid); }, 100);
    });

    var delBtn = pageEl.querySelector("#sun-delete");
    if (delBtn) delBtn.addEventListener("click", function() {
      hidePage();
      setTimeout(function() {
        showConfirm("确认删除", "确定删除「" + entry.name + "」吗？所有记录将丢失。", "删除", function() {
          deleteSunshineEntry(eid);
          showToast("已删除");
          hidePage();
          setTimeout(function() { showSunshineModule(); }, 100);
        }, true);
      }, 100);
    });

    var periodBtns = pageEl.querySelectorAll(".nc-period-btn");
    periodBtns.forEach(function(btn) {
      btn.addEventListener("click", function() {
        var period = btn.getAttribute("data-period");
        periodBtns.forEach(function(b) { b.classList.remove("active"); });
        btn.classList.add("active");
        var recordsEl = pageEl.querySelector("#sun-records");
        if (recordsEl) recordsEl.innerHTML = _renderSunshineRecords(entry, period);
      });
    });
  }, 50);
}

/**
 * 编辑阳光雨露表单
 */
function showEditSunshineForm(eid) {
  var entry = getSunshineEntry(eid);
  if (!entry) { showToast("不存在"); return; }

  var html = '<div class="form-page">';

  html += '<div class="form-group">';
  html += '<label class="form-label" for="esun-name">阳光雨露的名字</label>';
  html += '<input class="form-input" id="esun-name" type="text" value="' + (entry.name || "") + '">';
  html += '</div>';

  html += '<div class="form-group">';
  html += '<label class="form-label" for="esun-content">具体的内容</label>';
  html += '<textarea class="form-input form-textarea" id="esun-content">' + (entry.content || "") + '</textarea>';
  html += '</div>';

  html += '<div class="form-group">';
  html += '<label class="form-label" for="esun-action">知道后，我以后要怎么做</label>';
  html += '<textarea class="form-input form-textarea" id="esun-action">' + (entry.action || "") + '</textarea>';
  html += '</div>';

  html += '<div class="form-actions">';
  html += '<button class="btn-primary" id="esun-save" style="flex:1;min-height:44px">保存修改</button>';
  html += '</div>';

  html += '</div>';

  showPage("编辑阳光雨露", html);

  var topPage = _pageStack[_pageStack.length - 1];
  if (!topPage) return;
  var pageEl = topPage.el;

  setTimeout(function() {
    var saveBtn = pageEl.querySelector("#esun-save");
    if (saveBtn) saveBtn.addEventListener("click", function() {
      var name = pageEl.querySelector("#esun-name").value.trim();
      if (!name) { showToast("请填写阳光雨露的名字"); return; }
      var content = pageEl.querySelector("#esun-content").value.trim();
      var action = pageEl.querySelector("#esun-action").value.trim();

      updateSunshineEntry(eid, name, content, action);
      showToast("阳光雨露已更新");
      hidePage();
      setTimeout(function() { showSunshineModule(); }, 100);
    });
  }, 50);
}

function _renderSunshineRecords(entry, period) {
  var records = entry.records.slice().sort().reverse();
  var filtered = records;
  var today = new Date();
  var todayStr = formatDate(today);

  if (period === "recent") {
    filtered = records.slice(0, 7);
  } else if (period === "week") {
    var weekAgo = new Date(today); weekAgo.setDate(weekAgo.getDate() - 7);
    filtered = records.filter(function(r) { return r >= formatDate(weekAgo); });
  } else if (period === "month") {
    filtered = records.filter(function(r) { return r.substr(0, 7) === todayStr.substr(0, 7); });
  } else if (period === "year") {
    filtered = records.filter(function(r) { return r.substr(0, 4) === todayStr.substr(0, 4); });
  }

  var html = '<div class="omb-record-list">';
  if (filtered.length === 0) {
    html += '<div style="text-align:center;padding:20px;color:#999">暂无记录</div>';
  }
  filtered.forEach(function(rec) {
    html += '<div class="omb-record-item">';
    html += '<div class="omb-record-date">' + rec + '</div>';
    html += '</div>';
  });
  html += '</div>';
  return html;
}

// ══════════════════════════════════════════════
//  激活状态页面（替代连续打卡目标）
// ══════════════════════════════════════════════

function showActivationStatus() {
  var hasCode = isPractitionerActivated();

  var html = '<div class="streak-tracking">';

  if (hasCode) {
    html += '<div style="padding:12px 16px;font-size:14px;color:#07C160;text-align:center">';
    html += '已通过激活码激活全部模块';
    html += '</div>';
  } else {
    html += '<div style="padding:12px 16px;font-size:13px;color:#999;text-align:center">';
    html += '连续打卡达标后自动激活，或输入激活码一次性激活';
    html += '</div>';
  }

  // 逐个显示激活状态
  var keys = ["dream", "nocomplain", "one", "three", "six", "sunshine"];
  keys.forEach(function(key) {
    var target = ACTIVATION_TARGETS[key];
    var activated = isModuleActivated(key);
    var currentStreak = _getModuleStreak(key);
    var daysLeft = Math.max(0, target.targetDays - currentStreak);

    html += '<div class="streak-item">';
    html += '<div class="streak-item-header">';
    html += '<span class="streak-item-name">' + target.name + '</span>';
    if (activated) {
      html += '<span style="color:#07C160;font-size:13px;font-weight:600">已激活</span>';
    } else {
      html += '<span style="color:#999;font-size:12px">未激活，还剩' + daysLeft + '天</span>';
    }
    html += '</div>';
    html += '<div class="dream-progress-bar" style="margin:8px 0">';
    var progress = Math.min(100, Math.round(currentStreak / target.targetDays * 100));
    html += '<div class="dream-progress-fill" style="width:' + progress + '%"></div>';
    html += '</div>';
    html += '<div class="dream-progress-text">' + currentStreak + ' / ' + target.targetDays + ' 天 (' + progress + '%)</div>';
    html += '</div>';
  });

  html += '</div>';

  showPage("激活状态", html);
}

// ══════════════════════════════════════════════
//  通用时刻书 UI（一时书/三时书/六时书）
// ══════════════════════════════════════════════

/**
 * 添加时刻书表单
 */
function showAddMomentBookForm(type) {
  var config = MOMENT_BOOK_CONFIG[type];

  var html = '<div class="form-page">';

  html += '<div class="form-group">';
  html += '<label class="form-label" for="mb-name">目标名字</label>';
  html += '<textarea class="form-input form-textarea" id="mb-name" placeholder="建议目标具体可落地，例如：每天记录3件善事、3件需要改进的事"></textarea>';
  html += '</div>';

  html += '<div class="form-group">';
  html += '<label class="form-label" for="mb-prompt">为什么要达成这个目标</label>';
  html += '<textarea class="form-input form-textarea" id="mb-prompt" placeholder="你想想为什么要达成这个目标"></textarea>';
  html += '</div>';

  html += '<div class="form-group">';
  html += '<label class="form-label" for="mb-time">提醒时间（可选）</label>';
  html += '<select class="form-select" id="mb-time">';
  html += '<option value="">不提醒</option>';
  for (var h = 0; h < 24; h++) {
    html += '<option value="' + pad(h) + ':00">' + pad(h) + ':00</option>';
  }
  html += '</select>';
  html += '</div>';

  html += '<div class="form-group">';
  html += '<label class="form-label" for="mb-sig">自定义签名（可选）</label>';
  html += '<input class="form-input" id="mb-sig" type="text" placeholder="例如：每天进步一点点">';
  html += '</div>';

  html += '<div style="padding:0 16px;margin-bottom:12px">';
  html += '<p style="font-size:12px;color:#999">' + config.name + '每天可打卡' + config.maxPerDay + '次，最后一次为咖啡冥想</p>';
  html += '</div>';

  html += '<div class="form-actions">';
  html += '<button class="btn-primary" id="mb-create" style="flex:1;min-height:44px">确定</button>';
  html += '</div>';

  html += '</div>';

  showPage("添加" + config.name, html);

  var topPage = _pageStack[_pageStack.length - 1];
  if (!topPage) return;
  var pageEl = topPage.el;

  setTimeout(function() {
    var createBtn = pageEl.querySelector("#mb-create");
    if (createBtn) createBtn.addEventListener("click", function() {
      var name = pageEl.querySelector("#mb-name").value.trim();
      if (!name) { showToast("请填写目标名字"); return; }
      var prompt = pageEl.querySelector("#mb-prompt").value.trim();
      var time = pageEl.querySelector("#mb-time").value;
      var sig = pageEl.querySelector("#mb-sig").value.trim();

      addMomentBook(type, name, prompt, time, sig);
      showToast(config.name + "已创建");
      hidePage();
      setTimeout(function() { showMomentBookModule(); }, 100);
    });
  }, 50);
}

/**
 * 时刻书打卡
 */
function showMomentBookCheckin(type, bid) {
  var book = getMomentBook(type, bid);
  if (!book) { showToast("不存在"); return; }

  var config = MOMENT_BOOK_CONFIG[type];
  var todayRecords = book.records.filter(function(r) { return r.date === getTodayStr(); });
  var todayCount = todayRecords.length;
  var isLastCheckin = (todayCount === config.maxPerDay - 1);

  var html = '<div class="form-page">';

  html += '<div style="text-align:center;padding:16px 0">';
  html += '<h3 style="font-size:18px;font-weight:600;color:var(--text-primary)">' + book.name + '</h3>';
  html += '<p style="font-size:12px;color:#999;margin-top:4px">今日第' + (todayCount + 1) + '次 / 共' + config.maxPerDay + '次</p>';
  html += '</div>';

  if (!isLastCheckin) {
    html += '<div class="omb-section">';
    html += '<h4>正向的身、语、意</h4>';
    html += '<textarea class="form-input form-textarea" id="mb-positive" placeholder="记录今天做得好的地方..."></textarea>';
    html += '</div>';
    html += '<div class="omb-section">';
    html += '<h4>负面的身、语、意</h4>';
    html += '<textarea class="form-input form-textarea" id="mb-negative" placeholder="觉察今天需要改进的地方..."></textarea>';
    html += '</div>';
    html += '<div class="omb-section">';
    html += '<h4>我要主动做什么利他小事</h4>';
    html += '<textarea class="form-input form-textarea" id="mb-altruistic" placeholder="今天可以做的一件利他小事..."></textarea>';
    html += '</div>';
  } else {
    html += '<div style="text-align:center;padding:12px 0">';
    html += '<h3 style="font-size:18px;font-weight:600;color:var(--brand)">' + '\u2615 咖啡冥想</h3>';
    html += '</div>';
    html += '<div class="omb-section">';
    html += '<h4>挑3个善举，发自内心的感恩随喜</h4>';
    html += '<textarea class="form-input form-textarea" id="mb-merit1" placeholder="今天做的3件善事..."></textarea>';
    html += '</div>';
    html += '<div class="omb-section">';
    html += '<h4>挑3个最严重的负面行为，诚心忏悔，承诺修正</h4>';
    html += '<textarea class="form-input form-textarea" id="mb-merit2" placeholder="需要改进的3个行为..."></textarea>';
    html += '</div>';
    html += '<div class="omb-section">';
    html += '<h4>把今天所有正面种子，回向给自己的核心愿望</h4>';
    html += '<textarea class="form-input form-textarea" id="mb-merit3" placeholder="回向愿..."></textarea>';
    html += '</div>';
  }

  html += '<div class="form-actions">';
  html += '<button class="btn-primary" id="mb-submit" style="flex:1;min-height:44px">' + (isLastCheckin ? '提交咖啡冥想' : '提交六时书') + '</button>';
  html += '</div>';

  html += '</div>';

  showPage(isLastCheckin ? '\u2615 咖啡冥想' : book.name, html);

  var topPage = _pageStack[_pageStack.length - 1];
  if (!topPage) return;
  var pageEl = topPage.el;

  setTimeout(function() {
    var submitBtn = pageEl.querySelector("#mb-submit");
    if (submitBtn) submitBtn.addEventListener("click", function() {
      var recordData;
      var recordType;
      if (!isLastCheckin) {
        recordData = {
          positive: pageEl.querySelector("#mb-positive").value.trim(),
          negative: pageEl.querySelector("#mb-negative").value.trim(),
          altruistic: pageEl.querySelector("#mb-altruistic").value.trim()
        };
        recordType = "checkin";
      } else {
        recordData = {
          merit1: pageEl.querySelector("#mb-merit1").value.trim(),
          merit2: pageEl.querySelector("#mb-merit2").value.trim(),
          merit3: pageEl.querySelector("#mb-merit3").value.trim()
        };
        recordType = "coffee";
      }
      addMomentBookRecord(type, bid, recordType, recordData);
      playCheckinSound();
      showToast(isLastCheckin ? "咖啡冥想完成" : "六时书已记录");
      hidePage();
      setTimeout(function() { showMomentBookModule(); }, 100);
    });
  }, 50);
}

/**
 * 时刻书详情
 */
function showMomentBookDetail(type, bid) {
  var book = getMomentBook(type, bid);
  if (!book) { showToast("不存在"); return; }

  var config = MOMENT_BOOK_CONFIG[type];
  var html = '<div class="omb-detail">';

  // 顶栏已经是"目标名 - 记录"，所以详情里只显示副信息（不再重复显示名字）
  html += '<div class="omb-detail-header">';
  if (book.prompt) {
    html += '<p style="color:var(--text-secondary);font-size:14px;line-height:1.6">为什么：' + book.prompt + '</p>';
  }
  if (book.signature) {
    html += '<p style="color:var(--text-hint);font-size:13px">签名：「' + book.signature + '」</p>';
  }
  html += '<p style="color:var(--text-hint);font-size:12px;margin-top:4px">共 ' + book.records.length + ' 条记录</p>';
  html += '</div>';

  html += '<div class="nc-period-selector">';
  html += '<button class="nc-period-btn active" data-period="recent">最新7条</button>';
  html += '<button class="nc-period-btn" data-period="week">本周</button>';
  html += '<button class="nc-period-btn" data-period="month">本月</button>';
  html += '<button class="nc-period-btn" data-period="year">本年</button>';
  html += '</div>';

  html += '<div class="omb-records" id="mb-records">';
  html += _renderMomentBookRecords(book, "recent");
  html += '</div>';

  html += '<div style="display:flex;gap:10px;margin:16px">';
  html += '<button class="btn-secondary" id="mb-edit" style="flex:1;min-height:40px">编辑</button>';
  html += '<button class="btn-danger" id="mb-delete" style="flex:1;min-height:40px">删除此' + config.name + '</button>';
  html += '</div>';

  html += '</div>';

  showPage(config.name + " - 记录", html);

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
        var recordsEl = pageEl.querySelector("#mb-records");
        if (recordsEl) recordsEl.innerHTML = _renderMomentBookRecords(book, period);
      });
    });

    var editBtn = pageEl.querySelector("#mb-edit");
    if (editBtn) editBtn.addEventListener("click", function() {
      hidePage();
      setTimeout(function() { showEditMomentBookForm(type, bid); }, 100);
    });

    var delBtn = pageEl.querySelector("#mb-delete");
    if (delBtn) delBtn.addEventListener("click", function() {
      hidePage();
      setTimeout(function() {
        showConfirm("确认删除", "确定删除「" + book.name + "」吗？所有记录将丢失。", "删除", function() {
          deleteMomentBook(type, bid);
          showToast(config.name + "已删除");
          hidePage();
          setTimeout(function() { showMomentBookModule(); }, 100);
        }, true);
      }, 100);
    });
  }, 50);
}

/**
 * 编辑时刻书表单
 */
function showEditMomentBookForm(type, bid) {
  var book = getMomentBook(type, bid);
  if (!book) { showToast("不存在"); return; }

  var config = MOMENT_BOOK_CONFIG[type];

  var html = '<div class="form-page">';

  html += '<div class="form-group">';
  html += '<label class="form-label" for="emb-name">目标名字</label>';
  html += '<textarea class="form-input form-textarea" id="emb-name">' + (book.name || "") + '</textarea>';
  html += '</div>';

  html += '<div class="form-group">';
  html += '<label class="form-label" for="emb-prompt">为什么要达成这个目标</label>';
  html += '<textarea class="form-input form-textarea" id="emb-prompt">' + (book.prompt || "") + '</textarea>';
  html += '</div>';

  html += '<div class="form-group">';
  html += '<label class="form-label" for="emb-time">提醒时间（可选）</label>';
  html += '<select class="form-select" id="emb-time">';
  html += '<option value="">不提醒</option>';
  for (var h = 0; h < 24; h++) {
    var v = pad(h) + ":00";
    var sel = (book.reminderTime === v) ? " selected" : "";
    html += '<option value="' + v + '"' + sel + '>' + v + '</option>';
  }
  html += '</select>';
  html += '</div>';

  html += '<div class="form-group">';
  html += '<label class="form-label" for="emb-sig">自定义签名（可选）</label>';
  html += '<input class="form-input" id="emb-sig" type="text" value="' + (book.signature || "") + '">';
  html += '</div>';

  html += '<div class="form-actions">';
  html += '<button class="btn-primary" id="emb-save" style="flex:1;min-height:44px">保存修改</button>';
  html += '</div>';

  html += '</div>';

  showPage("编辑" + config.name, html);

  var topPage = _pageStack[_pageStack.length - 1];
  if (!topPage) return;
  var pageEl = topPage.el;

  setTimeout(function() {
    var saveBtn = pageEl.querySelector("#emb-save");
    if (saveBtn) saveBtn.addEventListener("click", function() {
      var name = pageEl.querySelector("#emb-name").value.trim();
      if (!name) { showToast("请填写目标名字"); return; }
      var prompt = pageEl.querySelector("#emb-prompt").value.trim();
      var time = pageEl.querySelector("#emb-time").value;
      var sig = pageEl.querySelector("#emb-sig").value.trim();

      updateMomentBook(type, bid, name, prompt, time, sig);
      showToast(config.name + "已更新");
      hidePage();
      setTimeout(function() { showMomentBookModule(); }, 100);
    });
  }, 50);
}

function _renderMomentBookRecords(book, period) {
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

/**
 * 计算时刻书的连续天数
 */
function _getMomentBookStreak(book) {
  var records = book.records;
  if (!records || records.length === 0) return 0;

  var dateSet = {};
  records.forEach(function(r) { dateSet[r.date] = true; });

  return _calcStreakFromDates(dateSet);
}
