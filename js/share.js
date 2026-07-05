/* ========================================
   打卡分享卡片生成器 - Canvas 绘制
   生成精美图片，可保存到手机相册
   ======================================== */

var SHARE_CARD_W = 750;
var SHARE_CARD_H = 1200;

/**
 * 生成并下载打卡分享卡片
 * @param {object} task 任务对象
 */
function generateShareCard(task) {
  var canvas = document.createElement("canvas");
  canvas.width = SHARE_CARD_W;
  canvas.height = SHARE_CARD_H;
  var ctx = canvas.getContext("2d");

  var w = SHARE_CARD_W;
  var h = SHARE_CARD_H;
  var padding = 48;

  var streak = getTaskStreak(task);
  var total = getTaskTotal(task);
  var checked = isCheckedToday(task);
  var todayStr = getTodayStr();
  var quote = getTodayQuote();

  // 获取当前主题
  var theme = getThemeById(getCurrentTheme());
  var isCatTheme = theme.id.indexOf("cat_") === 0;

  // ── 背景：使用主题色 ──
  var bgGrad = ctx.createLinearGradient(0, 0, 0, h);
  bgGrad.addColorStop(0, theme.bg);
  bgGrad.addColorStop(0.5, theme.bgSecondary);
  bgGrad.addColorStop(1, theme.bg);
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, w, h);

  // ── 顶部品牌色带 ──
  var bannerH = 160;
  var bannerGrad = ctx.createLinearGradient(0, 0, w, 0);
  bannerGrad.addColorStop(0, theme.brand);
  bannerGrad.addColorStop(1, lightenColor(theme.brand, 0.85));
  ctx.fillStyle = bannerGrad;
  ctx.fillRect(0, 0, w, bannerH);

  // 品牌名
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "bold 42px -apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("文峰手账", w / 2, 72);

  // 副标题
  ctx.font = "22px -apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.8)";
  ctx.fillText("坚持打卡，成为更好的自己", w / 2, 120);

  // 底部波浪装饰
  ctx.beginPath();
  ctx.moveTo(0, bannerH);
  ctx.quadraticCurveTo(w / 4, bannerH + 30, w / 2, bannerH + 15);
  ctx.quadraticCurveTo(3 * w / 4, bannerH, w, bannerH + 25);
  ctx.lineTo(w, bannerH);
  ctx.lineTo(0, bannerH);
  ctx.closePath();
  ctx.fillStyle = theme.bg;
  ctx.fill();

  // ── 猫咪主题装饰：猫爪印 ──
  if (isCatTheme) {
    drawCatPaw(ctx, 100, bannerH + 95, 0.8, theme.brand);
    drawCatPaw(ctx, 650, bannerH + 85, 0.5, theme.brand);
    drawCatPaw(ctx, 580, bannerH + 120, 0.35, theme.brand);
  }

  // ── 中央任务信息卡片 ──
  var cardY = bannerH + 50;
  var cardX = padding;
  var cardW = w - padding * 2;

  // 白色卡片背景
  roundRect(ctx, cardX, cardY, cardW, 340, 20);
  ctx.fillStyle = theme.id === "dark" ? "#2D2D2D" : "#FFFFFF";
  ctx.fill();
  ctx.strokeStyle = theme.border;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // 打卡状态图标（大圆）
  var iconCX = w / 2;
  var iconCY = cardY + 70;
  var iconR = 50;
  ctx.beginPath();
  ctx.arc(iconCX, iconCY, iconR, 0, Math.PI * 2);
  if (checked) {
    var checkGrad = ctx.createLinearGradient(iconCX - iconR, iconCY, iconCX + iconR, iconCY);
    checkGrad.addColorStop(0, "#07C160");
    checkGrad.addColorStop(1, "#4FE387");
    ctx.fillStyle = checkGrad;
    ctx.fill();
    // 对勾
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 8;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(iconCX - 22, iconCY);
    ctx.lineTo(iconCX - 5, iconCY + 18);
    ctx.lineTo(iconCX + 25, iconCY - 16);
    ctx.stroke();
  } else {
    ctx.fillStyle = "#FFFDF7";
    ctx.fill();
    ctx.strokeStyle = "#DDD";
    ctx.lineWidth = 5;
    ctx.stroke();
    // 空心圆
    ctx.beginPath();
    ctx.arc(iconCX, iconCY, 18, 0, Math.PI * 2);
    ctx.strokeStyle = "#CCC";
    ctx.lineWidth = 4;
    ctx.stroke();
  }

  // 状态文字
  ctx.fillStyle = checked ? "#07C160" : "#999";
  ctx.font = "20px -apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(checked ? "今日已打卡" : "今日待打卡", w / 2, iconCY + iconR + 32);

  // 任务名称
  var nameY = cardY + 185;
  ctx.fillStyle = "#2D2416";
  ctx.font = "bold 40px -apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif";
  ctx.textAlign = "center";

  // 超长文本缩放
  var displayName = task.name;
  var nameWidth = ctx.measureText(displayName).width;
  if (nameWidth > cardW - 80) {
    ctx.font = "bold 32px -apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif";
    nameWidth = ctx.measureText(displayName).width;
  }
  if (nameWidth > cardW - 80) {
    while (displayName.length > 2 && ctx.measureText(displayName + "...").width > cardW - 80) {
      displayName = displayName.slice(0, -1);
    }
    displayName += "...";
  }
  ctx.fillText(displayName, w / 2, nameY);

  // 签名
  if (task.signature) {
    ctx.fillStyle = "#8B7355";
    ctx.font = "italic 22px -apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif";
    ctx.fillText("「" + task.signature + "」", w / 2, nameY + 40);
  }

  // 频率
  var freqY = task.signature ? nameY + 75 : nameY + 48;
  ctx.fillStyle = "#07C160";
  ctx.font = "22px -apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif";
  ctx.fillText(freqLabel(task.freq), w / 2, freqY);

  // ── 统计数据行 ──
  var statsY = cardY + 340 + 40;
  var statItems = [
    { value: streak + freqUnit(task.freq), label: "连续打卡" },
    { value: total + "次", label: "累计打卡" },
    { value: getCoins() + "", label: "梦想币余额" }
  ];

  var statW = (cardW - 10) / 3;
  statItems.forEach(function(s, i) {
    var sx = cardX + statW * i;
    var sxCenter = sx + statW / 2;

    // 数值
    ctx.fillStyle = "#2D2416";
    ctx.font = "bold 36px -apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(s.value, sxCenter, statsY);

    // 标签
    ctx.fillStyle = "#999";
    ctx.font = "20px -apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif";
    ctx.fillText(s.label, sxCenter, statsY + 36);
  });

  // ── 分割线 ──
  var sepY = statsY + 90;
  ctx.beginPath();
  ctx.moveTo(padding + 30, sepY);
  ctx.lineTo(w - padding - 30, sepY);
  ctx.strokeStyle = theme.border;
  ctx.lineWidth = 1;
  ctx.setLineDash([6, 6]);
  ctx.stroke();
  ctx.setLineDash([]);

  // ── 正能量话语 ──
  var quoteY = sepY + 50;

  // 引号装饰
  ctx.fillStyle = "#07C160";
  ctx.font = "48px Georgia, serif";
  ctx.textAlign = "center";
  ctx.fillText('"', w / 2, quoteY - 10);

  // 话语（自动换行）
  ctx.fillStyle = "#5D4037";
  ctx.font = "bold 28px -apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif";
  ctx.textAlign = "center";
  var quoteLines = wrapText(ctx, quote, w - padding * 2 - 80, 1.6);
  quoteLines.forEach(function(line, i) {
    ctx.fillText(line, w / 2, quoteY + 40 + i * 42);
  });

  // 署名（截取 — 后面的部分）
  var authorY = quoteY + 55 + quoteLines.length * 42;
  ctx.fillStyle = "#B8A088";
  ctx.font = "18px -apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif";
  var dashIdx = quote.lastIndexOf("——");
  if (dashIdx >= 0) {
    ctx.fillText(quote.slice(dashIdx), w / 2, authorY);
  }

  // ── 日期 ──
  var dateY = h - 140;
  ctx.fillStyle = "#B8A088";
  ctx.font = "22px -apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif";
  ctx.textAlign = "center";
  var dateDisplay = todayStr.replace(/-/g, " / ");
  ctx.fillText(dateDisplay, w / 2, dateY);

  // 底部品牌
  ctx.fillStyle = "#CCC";
  ctx.font = "18px -apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif";
  ctx.fillText("— 文峰手账 · 记录每一天 —", w / 2, dateY + 50);

  // ── 底部水印装饰 ──
  var wmAlpha = theme.id === "dark" ? 0.08 : 0.04;
  ctx.fillStyle = hexToRgba(theme.brand, wmAlpha);
  ctx.beginPath();
  ctx.arc(w - 80, h - 80, 120, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(80, h - 200, 60, 0, Math.PI * 2);
  ctx.fill();

  // 主题名
  ctx.fillStyle = hexToRgba(theme.textPrimary, 0.25);
  ctx.font = "16px -apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("主题：" + theme.name, w / 2, h - 30);

  // ── 导出图片 ──
  canvas.toBlob(function(blob) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = task.name + "_打卡_" + todayStr + ".png";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast("打卡卡片已保存，快去分享吧！");
  }, "image/png");

  // 同时预览（移动端更友好）
  showPreviewOverlay(canvas, task.name, todayStr);
}

/**
 * 预览分享卡片
 */
function showPreviewOverlay(canvas, taskName, dateStr) {
  var overlay = document.createElement("div");
  overlay.style.cssText =
    "position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.85);" +
    "z-index:500;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px;";

  // 预览图片
  var img = document.createElement("img");
  img.src = canvas.toDataURL("image/png");
  img.style.cssText = "max-width:90%;max-height:70%;border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,0.5);";

  // 提示文字
  var tip = document.createElement("p");
  tip.style.cssText = "color:#FFF;font-size:14px;margin:12px 0;text-align:center";
  tip.textContent = "长按图片可保存到相册";

  // 按钮区
  var btnRow = document.createElement("div");
  btnRow.style.cssText = "display:flex;gap:12px;margin-top:8px;flex-wrap:wrap;justify-content:center";

  var btnSave = document.createElement("button");
  btnSave.textContent = "保存图片";
  btnSave.style.cssText =
    "background:#07C160;color:#FFF;border:none;padding:12px 28px;border-radius:8px;font-size:16px;min-height:44px;cursor:pointer";
  btnSave.addEventListener("click", function() {
    var a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = taskName + "_打卡_" + dateStr + ".png";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast("打卡卡片已保存！");
  });

  var btnClose = document.createElement("button");
  btnClose.textContent = "关闭";
  btnClose.style.cssText =
    "background:rgba(255,255,255,0.15);color:#FFF;border:1px solid rgba(255,255,255,0.3);padding:12px 28px;border-radius:8px;font-size:16px;min-height:44px;cursor:pointer";
  btnClose.addEventListener("click", function() {
    document.body.removeChild(overlay);
  });

  btnRow.appendChild(btnSave);
  btnRow.appendChild(btnClose);

  overlay.appendChild(img);
  overlay.appendChild(tip);
  overlay.appendChild(btnRow);

  // 点击遮罩关闭
  overlay.addEventListener("click", function(e) {
    if (e.target === overlay) document.body.removeChild(overlay);
  });

  document.body.appendChild(overlay);
}

/**
 * 文字自动换行
 */
function wrapText(ctx, text, maxWidth, lineHeight) {
  var words = text.split("");
  var lines = [];
  var currentLine = "";

  for (var i = 0; i < words.length; i++) {
    var testLine = currentLine + words[i];
    var metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && currentLine.length > 0) {
      lines.push(currentLine);
      currentLine = words[i];
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);

  return lines;
}

/**
 * Canvas 圆角矩形
 */
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/**
 * 颜色加亮
 */
function lightenColor(hex, factor) {
  var r = parseInt(hex.slice(1, 3), 16);
  var g = parseInt(hex.slice(3, 5), 16);
  var b = parseInt(hex.slice(5, 7), 16);
  r = Math.min(255, Math.round(r + (255 - r) * factor));
  g = Math.min(255, Math.round(g + (255 - g) * factor));
  b = Math.min(255, Math.round(b + (255 - b) * factor));
  return "rgb(" + r + "," + g + "," + b + ")";
}

/**
 * hex 转 rgba
 */
function hexToRgba(hex, alpha) {
  var r = parseInt(hex.slice(1, 3), 16);
  var g = parseInt(hex.slice(3, 5), 16);
  var b = parseInt(hex.slice(5, 7), 16);
  return "rgba(" + r + "," + g + "," + b + "," + alpha + ")";
}

/**
 * 绘制猫爪印
 */
function drawCatPaw(ctx, x, y, scale, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.15;
  // 主肉垫
  ctx.beginPath();
  ctx.ellipse(0, 10, 14, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  // 四个趾头
  var toes = [[-14, -8], [-5, -16], [5, -16], [14, -8]];
  toes.forEach(function(t) {
    ctx.beginPath();
    ctx.ellipse(t[0], t[1], 5, 6, 0, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
}
