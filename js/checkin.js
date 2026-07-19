/* ========================================
   打卡选项卡 - 微信会话列表风格
   v4.1: 显示所有类型任务（普通+不抱怨+六时书）
   ======================================== */

/**
 * 渲染打卡页面
 */
function renderCheckinPage() {
  var main = document.getElementById("main-content");
  main.innerHTML = "";

  var page = createEl("div", "tab-page active", { id: "page-checkin" });

  // 操作栏
  var bar = createEl("div", "action-bar");
  var btnNew = createEl("button", "btn-primary", { text: "+ 新建打卡任务" });
  btnNew.setAttribute("aria-label", "新建打卡任务");
  btnNew.addEventListener("click", showNewTaskForm);
  bar.appendChild(btnNew);

  page.appendChild(bar);

  // 任务列表
  var listDiv = createEl("div", "conversation-list", { id: "checkin-list" });
  page.appendChild(listDiv);

  main.appendChild(page);
  refreshCheckinList();
}

/**
 * 刷新打卡任务列表（所有类型）
 */
function refreshCheckinList() {
  var listDiv = document.getElementById("checkin-list");
  if (!listDiv) return;
  listDiv.innerHTML = "";

  var tasks = getTasks();
  var isPrac = isPractitionerActivated();
  var ncChallenges = isPrac ? getNoComplaintChallenges() : [];
  var oneBooks = isPrac ? getMomentBooks("one") : [];
  var threeBooks = isPrac ? getMomentBooks("three") : [];
  var sixBooks = isPrac ? getMomentBooks("six") : [];
  var hasAny = tasks.length > 0 || ncChallenges.length > 0 || oneBooks.length > 0 || threeBooks.length > 0 || sixBooks.length > 0;

  if (!hasAny) {
    var empty = createEl("div", "empty-state");
    empty.innerHTML = "<p>还没有打卡任务</p><p>点击上方按钮开始吧</p>";
    listDiv.appendChild(empty);
    return;
  }

  // ── 普通打卡任务 ──
  tasks.forEach(function(task) {
    var checked = isCheckedToday(task);
    var streak = getTaskStreak(task);
    var total = getTaskTotal(task);
    var themeIcon = (typeof getTaskTypeIcon === "function") ? getTaskTypeIcon("task") : "";
    var statusIcon = (checked ? "\u2713" : "\u25CB") + (themeIcon ? " " + themeIcon : "");
    var statusColor = checked ? "#07C160" : "#999";

    var item = createEl("div", "conversation-item");
    item.setAttribute("role", "button");
    item.setAttribute("tabindex", "0");
    var ariaLabel = (checked ? "已打卡 " : "未打卡 ") + task.name;
    if (task.signature) ariaLabel += "，" + task.signature;
    ariaLabel += "，" + freqLabel(task.freq) + "，连续" + streak + freqUnit(task.freq) + "，共" + total + "次";
    item.setAttribute("aria-label", ariaLabel);

    var statusEl = createEl("div", "ci-status");
    statusEl.style.cssText = "color:" + statusColor + ";font-size:28px;font-weight:bold;";
    statusEl.textContent = statusIcon;
    item.appendChild(statusEl);

    var body = createEl("div", "ci-body");
    var title = createEl("div", "ci-title");
    title.textContent = task.name;
    if (task.signature) {
      title.textContent += "，" + task.signature;
    }
    body.appendChild(title);

    var sub = createEl("div", "ci-subtitle");
    var freqSpan = createEl("span");
    freqSpan.textContent = freqLabel(task.freq) + "";
    freqSpan.style.color = "#07C160";
    sub.appendChild(freqSpan);

    var streakSpan = createEl("span");
    streakSpan.textContent = "连续" + streak + freqUnit(task.freq);
    sub.appendChild(streakSpan);

    var totalSpan = createEl("span");
    totalSpan.textContent = "共" + total + "次";
    sub.appendChild(totalSpan);

    body.appendChild(sub);
    item.appendChild(body);

    var right = createEl("div", "ci-right");
    var tagEl = createEl("span", "ci-tag");
    if (checked) {
      tagEl.textContent = "已打卡";
      tagEl.style.color = "#07C160";
    } else {
      tagEl.textContent = "未打卡";
      tagEl.style.color = "#999";
    }
    right.appendChild(tagEl);
    item.appendChild(right);

    item.addEventListener("click", function() {
      if (!checked) {
        handleCheckin(task.id);
      } else {
        showToast("今天已经打过卡了");
      }
    });

    var longPressTimer;
    item.addEventListener("touchstart", function() {
      longPressTimer = setTimeout(function() {
        showTaskDetail(task);
      }, 600);
    });
    item.addEventListener("touchend", function() { clearTimeout(longPressTimer); });
    item.addEventListener("touchmove", function() { clearTimeout(longPressTimer); });

    listDiv.appendChild(item);
  });

  // ── 不抱怨挑战任务 ──
  if (isPrac) {
    ncChallenges.forEach(function(ch) {
      var todayRec = null;
      for (var i = 0; i < ch.records.length; i++) {
        if (ch.records[i].date === getTodayStr()) { todayRec = ch.records[i]; break; }
      }
      var todayCount = todayRec ? todayRec.count : 0;
      var ncStreak = _getNoComplaintStreak(ch);

      var item = createEl("div", "conversation-item nc-list-item");
      item.setAttribute("role", "button");
      item.setAttribute("tabindex", "0");
      var ariaLabel = "不抱怨 " + ch.name + "，今日抱怨" + todayCount + "次";
      if (ch.signature) ariaLabel += "，" + ch.signature;
      ariaLabel += "，连续" + ncStreak + "天，点击记录一次抱怨，长按查看详情";
      item.setAttribute("aria-label", ariaLabel);

      var statusEl = createEl("div", "ci-status");
      statusEl.style.cssText = "color:#E6A817;font-size:24px;";
      statusEl.textContent = (typeof getTaskTypeIcon === "function") ? getTaskTypeIcon("nocomplaint") : "\u{1F910}";
      item.appendChild(statusEl);

      var body = createEl("div", "ci-body");
      var title = createEl("div", "ci-title");
      title.textContent = ch.name;
      if (ch.signature) title.textContent += "，" + ch.signature;
      body.appendChild(title);

      var sub = createEl("div", "ci-subtitle");
      var countSpan = createEl("span");
      countSpan.textContent = "今日" + todayCount + "次";
      countSpan.style.color = todayCount > 0 ? "#E64340" : "#07C160";
      sub.appendChild(countSpan);

      var streakSpan = createEl("span");
      streakSpan.textContent = "连续" + ncStreak + "天";
      sub.appendChild(streakSpan);
      body.appendChild(sub);
      item.appendChild(body);

      var right = createEl("div", "ci-right");
      var tagEl = createEl("span", "ci-tag");
      tagEl.textContent = todayCount > 0 ? todayCount + "次" : "无抱怨";
      tagEl.style.color = todayCount > 0 ? "#E64340" : "#07C160";
      right.appendChild(tagEl);
      item.appendChild(right);

      item.addEventListener("click", function() {
        addComplaintRecord(ch.id);
        playCheckinSound();
        showToast("已记录一次抱怨（今日" + (todayCount + 1) + "次）");
        refreshCheckinList();
      });

      var longPressTimer;
      item.addEventListener("touchstart", function() {
        longPressTimer = setTimeout(function() {
          showNoComplaintDetail(ch.id);
        }, 600);
      });
      item.addEventListener("touchend", function() { clearTimeout(longPressTimer); });
      item.addEventListener("touchmove", function() { clearTimeout(longPressTimer); });

      listDiv.appendChild(item);
    });

    // ── 一时书/三时书/六时书 ──
    _renderMomentBookListItems(listDiv, "one", oneBooks);
    _renderMomentBookListItems(listDiv, "three", threeBooks);
    _renderMomentBookListItems(listDiv, "six", sixBooks);
  }
}

/**
 * 渲染时刻书在打卡列表中的项
 */
function _renderMomentBookListItems(listDiv, type, books) {
  var config = MOMENT_BOOK_CONFIG[type];
  var iconMap = { one: "\u{1F4D6}", three: "\u{1F4DD}", six: "\u{1F4D8}" };
  var colorMap = { one: "#7C83FD", three: "#E67E22", six: "#8E44AD" };

  books.forEach(function(book) {
    var todayRecords = book.records.filter(function(r) { return r.date === getTodayStr(); });
    var todayCount = todayRecords.length;
    var maxPerDay = config.maxPerDay;
    var statusText, statusColor;

    if (todayCount === 0) {
      statusText = "未打卡";
      statusColor = "#999";
    } else if (todayCount < maxPerDay) {
      statusText = todayCount + "/" + maxPerDay;
      statusColor = "#E6A817";
    } else {
      statusText = "今日已完成";
      statusColor = "#07C160";
    }

    var item = createEl("div", "conversation-item");
    item.setAttribute("role", "button");
    item.setAttribute("tabindex", "0");
    var ariaLabel = config.name + " " + book.name;
    if (book.signature) ariaLabel += "，" + book.signature;
    ariaLabel += "，" + statusText + "，点击打卡，长按查看详情";
    item.setAttribute("aria-label", ariaLabel);

    var statusEl = createEl("div", "ci-status");
    statusEl.style.cssText = "color:" + colorMap[type] + ";font-size:24px;";
    statusEl.textContent = (typeof getTaskTypeIcon === "function") ? getTaskTypeIcon(type) : iconMap[type];
    item.appendChild(statusEl);

    var body = createEl("div", "ci-body");
    var title = createEl("div", "ci-title");
    title.textContent = config.name + "：" + book.name;
    if (book.signature) title.textContent += "，" + book.signature;
    body.appendChild(title);

    var sub = createEl("div", "ci-subtitle");
    if (book.prompt) {
      var promptSpan = createEl("span");
      promptSpan.textContent = book.prompt;
      promptSpan.style.color = "#999";
      sub.appendChild(promptSpan);
    }
    var statusSpan = createEl("span");
    statusSpan.textContent = statusText;
    statusSpan.style.color = statusColor;
    sub.appendChild(statusSpan);
    body.appendChild(sub);
    item.appendChild(body);

    var right = createEl("div", "ci-right");
    var tagEl = createEl("span", "ci-tag");
    tagEl.textContent = statusText;
    tagEl.style.color = statusColor;
    right.appendChild(tagEl);
    item.appendChild(right);

    item.addEventListener("click", function() {
      if (todayCount >= maxPerDay) {
        showToast("今日" + config.name + "已完成");
        return;
      }
      showMomentBookCheckin(type, book.id);
    });

    var longPressTimer;
    item.addEventListener("touchstart", function() {
      longPressTimer = setTimeout(function() { showMomentBookDetail(type, book.id); }, 600);
    });
    item.addEventListener("touchend", function() { clearTimeout(longPressTimer); });
    item.addEventListener("touchmove", function() { clearTimeout(longPressTimer); });

    listDiv.appendChild(item);
  });
}

/**
 * 计算不抱怨挑战的连续天数
 * 从今天往前数，有记录的连续天数
 */
function _getNoComplaintStreak(challenge) {
  var records = challenge.records;
  if (!records || records.length === 0) return 0;

  var dateSet = {};
  records.forEach(function(r) { dateSet[r.date] = true; });

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
 * 新建任务表单（页面）
 */
function showNewTaskForm() {
  var html = '<div class="form-page">';

  html += '<div class="form-group">';
  html += '<label class="form-label" for="nf-name">任务名称（必填）</label>';
  html += '<input class="form-input" id="nf-name" type="text" placeholder="如：晨跑、读书、喝水">';
  html += '</div>';

  html += '<div class="form-group">';
  html += '<label class="form-label" for="nf-freq">打卡频率</label>';
  html += '<select class="form-select" id="nf-freq">';
  html += '<option value="daily">每天</option>';
  html += '<option value="weekly">每周</option>';
  html += '<option value="monthly">每月</option>';
  html += '</select>';
  html += '</div>';

  html += '<div class="form-group" id="nf-custom-group" style="display:none">';
  html += '<label class="form-label" for="nf-custom">指定日期</label>';
  html += '<select class="form-select" id="nf-custom"></select>';
  html += '</div>';

  html += '<div class="form-group">';
  html += '<label class="form-label" for="nf-note">备注（可选）</label>';
  html += '<input class="form-input" id="nf-note" type="text" placeholder="如：每天早上7点">';
  html += '</div>';

  html += '<div class="form-group">';
  html += '<label class="form-label" for="nf-signature">自定义签名（可选）</label>';
  html += '<input class="form-input" id="nf-signature" type="text" placeholder="如：坚持就是胜利">';
  html += '</div>';

  html += '<div class="form-actions">';
  html += '<button class="btn-primary" id="nf-create" style="flex:1;min-height:44px">创建任务</button>';
  html += '</div>';
  html += '</div>';

  var page = showPage("新建打卡任务", html);

  var freqSel = page.querySelector("#nf-freq");
  var customGroup = page.querySelector("#nf-custom-group");
  var customSel = page.querySelector("#nf-custom");

  function updateCustom() {
    var val = freqSel.value;
    if (val === "weekly") {
      customGroup.style.display = "block";
      customSel.innerHTML = "";
      ["周一","周二","周三","周四","周五","周六","周日"].forEach(function(d, i) {
        customSel.innerHTML += '<option value="' + i + '">' + d + '</option>';
      });
    } else if (val === "monthly") {
      customGroup.style.display = "block";
      customSel.innerHTML = "";
      for (var i = 1; i <= 31; i++) {
        customSel.innerHTML += '<option value="' + i + '">' + i + '号</option>';
      }
    } else {
      customGroup.style.display = "none";
    }
  }

  freqSel.addEventListener("change", updateCustom);
  updateCustom();

  page.querySelector("#nf-create").addEventListener("click", function() {
    var name = getVal("nf-name").trim();
    if (!name) { showToast("任务名称不能为空"); return; }
    var existing = getTasks();
    for (var i = 0; i < existing.length; i++) {
      if (existing[i].name === name) {
        showToast("已存在同名任务「" + name + "」，请换一个名称");
        return;
      }
    }
    var freq = getVal("nf-freq");
    var customDay = "";
    if (freq === "weekly" || freq === "monthly") {
      customDay = getVal("nf-custom");
    }
    var note = getVal("nf-note").trim();
    var sig = getVal("nf-signature").trim();
    addTask(name, freq, note, customDay, sig);
    refreshCheckinList();
    if (typeof refreshNotifications === "function") refreshNotifications();
    showToast("任务「" + name + "」创建成功");
    hidePage();
  });
}

/**
 * 打卡操作
 */
function handleCheckin(tid) {
  var result = doCheckin(tid);
  if (result.alreadyChecked) {
    showToast("今天已经打过卡了");
    return;
  }
  if (result.success) {
    playCheckinSound();

    if (result.coinsEarned > 0) {
      showToast(
        result.taskName + " 打卡成功！+" + result.coinsEarned +
        "梦想币（连续" + result.streak + "天）");
    } else {
      showToast(result.taskName + " 打卡成功！（今日梦想币已领取）");
    }
    refreshCheckinList();
    updateQuoteBar();
    if (typeof refreshNotifications === "function") refreshNotifications();

    var newDreams = checkDreamCompletion();
    newDreams.forEach(function(dream) {
      setTimeout(function() {
        showToast("梦想达成！「" + dream.name + "」奖励：" + dream.reward);
      }, 500);
    });

    if (getCloudSyncEnabled() && isCloudConfigured()) {
      fullSync(function(e) {
        if (!e) showToast("数据已自动同步到云端");
      });
    }
  }
}

/**
 * 查看任务详情（页面）
 */
function showTaskDetail(task) {
  var checked = isCheckedToday(task);
  var streak = getTaskStreak(task);
  var total = getTaskTotal(task);

  var html = '<div class="detail-page">';

  html += '<div class="detail-info">';
  html += '<p>频率：' + freqLabel(task.freq) + '</p>';
  html += '<p>连续打卡：' + streak + freqUnit(task.freq) + '</p>';
  html += '<p>累计打卡：' + total + '次</p>';
  if (task.note) html += '<p>备注：' + task.note + '</p>';
  if (task.signature) html += '<p>签名：「' + task.signature + '」</p>';
  html += '<p>创建于：' + (task.created || "未知") + '</p>';
  if (checked) {
    html += '<p style="color:#07C160;margin-top:8px">今日已打卡 \u2713</p>';
  }
  html += '</div>';

  if (task.records.length > 0) {
    html += '<div class="detail-section-title">打卡记录（共' + task.records.length + '条）</div>';
    var sorted = task.records.slice().sort().reverse();
    var showCount = Math.min(5, sorted.length);
    html += '<div id="detail-records-container">';
    for (var ri = 0; ri < showCount; ri++) {
      html += '<div class="record-item">\u2713 ' + sorted[ri] + '</div>';
    }
    html += '</div>';
    if (sorted.length > 5) {
      html += '<div style="text-align:center;margin-top:4px">';
      html += '<button class="btn-text-link" id="btn-expand-records" aria-label="展开更多打卡记录">展开更多记录</button>';
      html += '</div>';
    }
  }

  html += '<div class="detail-actions">';
  html += '<button class="btn-secondary" id="btn-edit-detail" style="min-height:40px" aria-label="编辑此任务">编辑任务</button>';
  html += '<button class="btn-share-card" id="btn-share-detail" aria-label="生成分享打卡卡片">分享打卡卡片</button>';
  html += '<button class="btn-danger" id="btn-delete-detail" aria-label="删除此任务">删除任务</button>';
  html += '</div>';

  html += '</div>';

  showPage(task.name, html);

  var topPage = _pageStack[_pageStack.length - 1];
  if (!topPage) return;
  var pageEl = topPage.el;

  setTimeout(function() {
    var editBtn = pageEl.querySelector("#btn-edit-detail");
    if (editBtn) {
      editBtn.addEventListener("click", function(e) {
        e.stopPropagation();
        hidePage();
        setTimeout(function() { showEditTaskForm(task); }, 100);
      });
    }
    var shareBtn = pageEl.querySelector("#btn-share-detail");
    if (shareBtn) {
      shareBtn.addEventListener("click", function(e) {
        e.stopPropagation();
        generateShareCard(task);
      });
    }
    var delBtn = pageEl.querySelector("#btn-delete-detail");
    if (delBtn) {
      delBtn.addEventListener("click", function(e) {
        e.stopPropagation();
        hidePage();
        setTimeout(function() {
          confirmDeleteTask(task.id, task.name);
        }, 100);
      });
    }
    var expandBtn = pageEl.querySelector("#btn-expand-records");
    if (expandBtn) {
      expandBtn.addEventListener("click", function(e) {
        e.stopPropagation();
        var container = pageEl.querySelector("#detail-records-container");
        if (container) {
          container.innerHTML = "";
          var sortedRecords = task.records.slice().sort().reverse();
          for (var ri = 0; ri < sortedRecords.length; ri++) {
            var div = document.createElement("div");
            div.className = "record-item";
            div.textContent = "\u2713 " + sortedRecords[ri];
            container.appendChild(div);
          }
        }
        expandBtn.style.display = "none";
      });
    }
  }, 50);
}

/**
 * 确认删除任务
 */
function confirmDeleteTask(tid, name) {
  showConfirm("确认删除", "确定删除任务「" + name + "」及所有打卡记录吗？此操作不可撤销。", "删除", function() {
    deleteTask(tid);
    refreshCheckinList();
    if (typeof refreshNotifications === "function") refreshNotifications();
    showToast("任务「" + name + "」已删除");
  }, true);
}

/**
 * 编辑任务表单（页面）
 */
function showEditTaskForm(task) {
  var html = '<div class="form-page">';

  html += '<div class="form-group">';
  html += '<label class="form-label" for="ef-name">任务名称（必填）</label>';
  html += '<input class="form-input" id="ef-name" type="text" value="' + task.name + '">';
  html += '</div>';

  html += '<div class="form-group">';
  html += '<label class="form-label" for="ef-freq">打卡频率</label>';
  html += '<select class="form-select" id="ef-freq">';
  html += '<option value="daily"' + (task.freq === "daily" ? " selected" : "") + '>每天</option>';
  html += '<option value="weekly"' + (task.freq === "weekly" ? " selected" : "") + '>每周</option>';
  html += '<option value="monthly"' + (task.freq === "monthly" ? " selected" : "") + '>每月</option>';
  html += '</select>';
  html += '</div>';

  html += '<div class="form-group">';
  html += '<label class="form-label" for="ef-note">备注（可选）</label>';
  html += '<input class="form-input" id="ef-note" type="text" value="' + (task.note || "") + '">';
  html += '</div>';

  html += '<div class="form-group">';
  html += '<label class="form-label" for="ef-signature">自定义签名（可选）</label>';
  html += '<input class="form-input" id="ef-signature" type="text" value="' + (task.signature || "") + '">';
  html += '</div>';

  html += '<div class="form-actions">';
  html += '<button class="btn-primary" id="ef-save" style="flex:1;min-height:44px">保存修改</button>';
  html += '</div>';
  html += '</div>';

  var page = showPage("编辑任务", html);

  setTimeout(function() {
    var saveBtn = page.querySelector("#ef-save");
    if (saveBtn) saveBtn.addEventListener("click", function() {
      var name = getVal("ef-name").trim();
      if (!name) { showToast("任务名称不能为空"); return; }
      var freq = getVal("ef-freq");
      var note = getVal("ef-note").trim();
      var sig = getVal("ef-signature").trim();
      updateTask(task.id, name, freq, note, task.customDay, sig);
      refreshCheckinList();
      showToast("任务已更新");
      hidePage();
    });
  }, 50);
}
