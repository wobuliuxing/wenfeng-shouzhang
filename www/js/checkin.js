/* ========================================
   打卡选项卡 - 微信会话列表风格
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
 * 刷新打卡任务列表
 */
function refreshCheckinList() {
  var listDiv = document.getElementById("checkin-list");
  if (!listDiv) return;
  listDiv.innerHTML = "";

  var tasks = getTasks();

  if (tasks.length === 0) {
    var empty = createEl("div", "empty-state");
    empty.innerHTML = "<p>还没有打卡任务</p><p>点击上方【新建打卡任务】开始吧</p>";
    listDiv.appendChild(empty);
    return;
  }

  tasks.forEach(function(task, idx) {
    var checked = isCheckedToday(task);
    var streak = getTaskStreak(task);
    var total = getTaskTotal(task);
    var statusIcon = checked ? "✓" : "O";
    var statusColor = checked ? "#07C160" : "#999";

    // 会话列表项
    var item = createEl("div", "conversation-item");
    item.setAttribute("role", "button");
    item.setAttribute("tabindex", "0");
    item.setAttribute("aria-label", (checked ? "已打卡 " : "未打卡 ") + task.name +
      "，" + freqLabel(task.freq) + "，连续" + streak + freqUnit(task.freq) + "，共" + total + "次");

    // 左侧状态图标
    var statusEl = createEl("div", "ci-status");
    statusEl.style.cssText = "color:" + statusColor + ";font-size:28px;font-weight:bold;";
    statusEl.textContent = statusIcon;
    item.appendChild(statusEl);

    // 中间内容
    var body = createEl("div", "ci-body");
    var title = createEl("div", "ci-title");
    title.textContent = task.name;
    if (task.signature) {
      title.textContent += "， " + task.signature + "";
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

    // 右侧操作
    var right = createEl("div", "ci-right");

    var btnCheckin = createEl("button", "ci-btn-checkin");
    if (checked) {
      btnCheckin.textContent = "已打卡";
      btnCheckin.classList.add("checked");
      btnCheckin.setAttribute("aria-label", task.name + " 今日已打卡");
    } else {
      btnCheckin.textContent = "打卡";
      btnCheckin.setAttribute("aria-label", task.name + " 点击打卡");
    }
    btnCheckin.addEventListener("click", function(e) {
      e.stopPropagation();
      if (!checked) handleCheckin(task.id);
    });

    var btnDetail = createEl("button", "ci-btn-detail");
    btnDetail.textContent = "详情";
    btnDetail.setAttribute("aria-label", task.name + " 查看详情");
    btnDetail.addEventListener("click", function(e) {
      e.stopPropagation();
      showTaskDetail(task);
    });

    right.appendChild(btnCheckin);
    right.appendChild(btnDetail);
    item.appendChild(right);

    // 点击卡片主体也可以打卡或查看详情
    item.addEventListener("click", function() {
      showTaskDetail(task);
    });

    // 长按删除
    var longPressTimer;
    item.addEventListener("touchstart", function() {
      longPressTimer = setTimeout(function() {
        confirmDeleteTask(task.id, task.name);
      }, 600);
    });
    item.addEventListener("touchend", function() { clearTimeout(longPressTimer); });
    item.addEventListener("touchmove", function() { clearTimeout(longPressTimer); });

    listDiv.appendChild(item);
  });
}

/**
 * 新建任务表单（弹窗）
 */
function showNewTaskForm() {
  var html = '<div class="modal-title">新建打卡任务</div>';

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

  showModal(html, "创建", "取消", function() {
    var name = getVal("nf-name").trim();
    if (!name) { showToast("任务名称不能为空"); return false; }
    var freq = getVal("nf-freq");
    var customDay = "";
    if (freq === "weekly" || freq === "monthly") {
      customDay = getVal("nf-custom");
    }
    var note = getVal("nf-note").trim();
    var sig = getVal("nf-signature").trim();
    addTask(name, freq, note, customDay, sig);
    refreshCheckinList();
    showToast("任务「" + name + "」创建成功");
    return true;
  });

  // 频率切换联动
  var freqSel = document.getElementById("nf-freq");
  var customGroup = document.getElementById("nf-custom-group");
  var customSel = document.getElementById("nf-custom");

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
    showToast(
      result.taskName + " 打卡成功！+" + result.coinsEarned +
      "金币（连续" + result.streak + "天）");
    refreshCheckinList();
    updateQuoteBar();
  }
}

/**
 * 查看任务详情（弹窗内显示记录列表）
 */
function showTaskDetail(task) {
  var checked = isCheckedToday(task);
  var streak = getTaskStreak(task);
  var total = getTaskTotal(task);

  var html = '<div class="modal-title">' + task.name + '</div>';
  html += '<div class="modal-body">';

  html += '<p>频率：' + freqLabel(task.freq) + '</p>';
  html += '<p>连续打卡：' + streak + freqUnit(task.freq) + '</p>';
  html += '<p>累计打卡：' + total + '次</p>';
  if (task.note) html += '<p>备注：' + task.note + '</p>';
  if (task.signature) html += '<p>签名：「' + task.signature + '」</p>';
  html += '<p>创建于：' + (task.created || "未知") + '</p>';

  if (checked) {
    html += '<p style="color:#07C160;margin-top:8px">今日已打卡 ✓</p>';
  }

  // 打卡记录列表
  if (task.records.length > 0) {
    html += '<hr style="margin:8px 0;border:0;border-top:1px solid #eee">';
    html += '<p style="font-weight:600">打卡记录（共' + task.records.length + '条）：</p>';
    var sorted = task.records.slice().sort().reverse();
    sorted.forEach(function(r) {
      html += '<p style="font-size:13px;margin:2px 0">✓ ' + r + '</p>';
    });
  }

  // 分享按钮
  html += '<div style="text-align:center;margin-top:12px">';
  html += '<button class="btn-share-card" id="btn-share-detail" aria-label="生成分享打卡卡片">分享打卡卡片</button>';
  html += '</div>';

  html += '</div>';

  showModal(html, checked ? null : "打卡", "关闭",
    function() {
      if (!checked) handleCheckin(task.id);
      return true;
    },
    function() { hideModal(); }
  );

  // 绑定分享按钮事件
  setTimeout(function() {
    var shareBtn = document.getElementById("btn-share-detail");
    if (shareBtn) {
      shareBtn.addEventListener("click", function(e) {
        e.stopPropagation();
        generateShareCard(task);
      });
    }
  }, 50);

  // 修改确认按钮文字
  setTimeout(function() {
    var confirmBtn = document.getElementById("modal-confirm-btn");
    if (confirmBtn && !checked && task) {
      confirmBtn.textContent = "打卡";
    }
  }, 0);
}

/**
 * 确认删除任务
 */
function confirmDeleteTask(tid, name) {
  var html = '<div class="modal-title">确认删除</div>';
  html += '<div class="modal-body">确定删除任务「' + name + '」及所有打卡记录吗？此操作不可撤销。</div>';

  showModal(html, "删除", "取消", function() {
    deleteTask(tid);
    refreshCheckinList();
    showToast("任务「" + name + "」已删除");
    return true;
  });

  setTimeout(function() {
    var confirmBtn = document.getElementById("modal-confirm-btn");
    if (confirmBtn) {
      confirmBtn.classList.add("modal-btn-danger");
      confirmBtn.textContent = "删除";
    }
  }, 0);
}
