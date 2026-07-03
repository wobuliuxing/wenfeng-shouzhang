/* ========================================
   数据选项卡 - 打卡统计可视化
   ======================================== */

/**
 * 渲染数据页面
 */
function renderStatsPage() {
  var main = document.getElementById("main-content");
  main.innerHTML = "";

  var page = createEl("div", "tab-page active", { id: "page-stats" });

  var tasks = getTasks();
  var allRecs = getAllRecords();

  if (tasks.length === 0) {
    var empty = createEl("div", "empty-state");
    empty.innerHTML = "<p>还没有打卡数据</p><p>先去【打卡】页面创建任务并打卡吧</p>";
    page.appendChild(empty);
    main.appendChild(page);
    return;
  }

  // 统计数据卡片
  var statsGrid = createEl("div", "stats-grid");

  // 总打卡次数
  statsGrid.appendChild(makeStatCard(allRecs.length, "总打卡次数"));

  // 打卡天数
  var daysSet = {};
  allRecs.forEach(function(r) { daysSet[r.date] = true; });
  statsGrid.appendChild(makeStatCard(Object.keys(daysSet).length, "打卡天数"));

  // 当前连续
  statsGrid.appendChild(makeStatCard(getCurrentStreak(), "当前连续", "天"));

  // 今日打卡数
  var today = getTodayStr();
  var todayCount = 0;
  allRecs.forEach(function(r) { if (r.date === today) todayCount++; });
  var todayCard = createEl("div", "stat-card");
  var todayVal = createEl("div", "stat-value");
  todayVal.textContent = todayCount + "/" + tasks.length;
  todayVal.style.fontSize = "22px";
  var todayLabel = createEl("div", "stat-label");
  todayLabel.textContent = "今日打卡进度";
  todayCard.appendChild(todayVal);
  todayCard.appendChild(todayLabel);
  statsGrid.appendChild(todayCard);

  page.appendChild(statsGrid);

  // 打卡热力图（最近91天）
  var heatmap = createEl("div", "heatmap");
  var hmTitle = createEl("div", "heatmap-title");
  hmTitle.textContent = "打卡热力图（近91天）";
  heatmap.appendChild(hmTitle);

  var hmGrid = createEl("div", "heatmap-grid");
  // 统计每天打卡次数
  var dayCount = {};
  allRecs.forEach(function(r) {
    dayCount[r.date] = (dayCount[r.date] || 0) + 1;
  });

  for (var i = 90; i >= 0; i--) {
    var d = getDateStr(-i);
    var count = dayCount[d] || 0;
    var cell = createEl("div", "heatmap-cell");
    if (count >= 7) cell.classList.add("level-4");
    else if (count >= 4) cell.classList.add("level-3");
    else if (count >= 2) cell.classList.add("level-2");
    else if (count >= 1) cell.classList.add("level-1");
    cell.setAttribute("aria-label", d + "：" + count + "次打卡");
    cell.setAttribute("title", d + "：" + count + "次打卡");
    hmGrid.appendChild(cell);
  }
  heatmap.appendChild(hmGrid);

  // 图例
  var legend = createEl("div", "heatmap-legend");
  legend.innerHTML = '少 <span class="heatmap-legend-cell" style="background:#EEEEEE"></span> <span class="heatmap-legend-cell" style="background:#C8E6C9"></span> <span class="heatmap-legend-cell" style="background:#81C784"></span> <span class="heatmap-legend-cell" style="background:#4CAF50"></span> <span class="heatmap-legend-cell" style="background:#388E3C"></span> 多';
  heatmap.appendChild(legend);
  page.appendChild(heatmap);

  // 各任务统计
  var sectionHdr = createEl("div", "section-header");
  sectionHdr.textContent = "各任务统计";
  page.appendChild(sectionHdr);

  var taskStatsList = createEl("div", "conversation-list");
  tasks.forEach(function(task) {
    var streak = getTaskStreak(task);
    var total = getTaskTotal(task);
    var checked = isCheckedToday(task);

    var item = createEl("div", "conversation-item");
    var statusEl = createEl("div", "ci-status");
    statusEl.textContent = checked ? "✓" : "O";
    statusEl.style.color = checked ? "#07C160" : "#999";
    statusEl.style.fontSize = "22px";
    statusEl.style.fontWeight = "bold";
    item.appendChild(statusEl);

    var body = createEl("div", "ci-body");
    var title = createEl("div", "ci-title");
    title.textContent = task.name;
    body.appendChild(title);

    var sub = createEl("div", "ci-subtitle");
    sub.textContent = freqLabel(task.freq) + "  |  连续" + streak + freqUnit(task.freq) + "  |  共" + total + "次";
    body.appendChild(sub);
    item.appendChild(body);

    taskStatsList.appendChild(item);
  });
  page.appendChild(taskStatsList);

  main.appendChild(page);
}

function makeStatCard(value, label, unit) {
  var card = createEl("div", "stat-card");
  var valEl = createEl("div", "stat-value");
  valEl.textContent = value;
  if (unit) valEl.textContent += " " + unit;
  var labelEl = createEl("div", "stat-label");
  labelEl.textContent = label;
  card.appendChild(valEl);
  card.appendChild(labelEl);
  return card;
}

function renderCalendarHeatmap() {
  // 此函数已合并到 renderStatsPage 中
  return "";
}
