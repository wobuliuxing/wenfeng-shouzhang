/* ========================================
   文峰手账 - 主控制器
   处理导航、页面栈、Toast、生命周期
   v3.0: 弹窗改为页面导航，解决跳动问题
   ======================================== */

var currentTab = null;
var _pageStack = [];

/**
 * 检测是否在 Capacitor APK 中运行
 */
function _isCapacitor() {
  try {
    return typeof window.Capacitor !== "undefined" &&
           window.Capacitor.Plugins &&
           window.Capacitor.Plugins.App;
  } catch(e) { return false; }
}

/** DOM Ready */
document.addEventListener("DOMContentLoaded", function() {
  initTheme();
  updateQuoteBar();
  switchTab("checkin");

  // 初始化 CloudBase（异步，不阻塞页面）
  initCloudBase(function(err) {
    if (err) { console.warn("CloudBase 初始化失败:", err); return; }
    if (getCloudSyncEnabled() && isCloudLoggedIn()) {
      cloudUploadData(function(e) {
        if (!e) showToast("数据已同步到云端");
      });
    }
  });

  // 检查梦想中心是否有新完成的梦想
  checkDreamCompletion();

  // 选项卡点击
  var tabBtns = document.querySelectorAll(".tab-btn");
  tabBtns.forEach(function(btn) {
    btn.addEventListener("click", function() {
      switchTab(this.getAttribute("data-tab"));
    });
  });

  // 全局按键（Esc 关闭页面）
  document.addEventListener("keydown", function(e) {
    if (e.key === "Escape") {
      hidePage();
      closeReaderIfOpen();
    }
  });

  // 防止双击缩放
  document.addEventListener("dblclick", function(e) {
    e.preventDefault();
  }, { passive: false });

  // ★ 返回键处理：APK 用 Capacitor App 插件，网页用 History API
  if (_isCapacitor()) {
    // ── APK 模式 ──
    var appPlugin = window.Capacitor.Plugins.App;
    appPlugin.addListener("backButton", function() {
      // 优先关页面
      if (_pageStack.length > 0) { hidePage(); return; }
      // 其次关阅读器
      if (currentBook) {
        saveBookProgress(currentBook.id, currentPage);
        currentBook = null;
        currentPage = 1;
        totalPages = 1;
        document.documentElement.classList.remove("reader-open");
        document.getElementById("tab-bar").style.display = "flex";
        renderReaderPage();
        return;
      }
      // 都没有，退出 APP
      appPlugin.exitApp();
    });
  } else {
    // ── 网页模式 ──
    // popstate 处理浏览器返回键和 in-app 返回按钮
    // 统一在 popstate 中移除 DOM，避免双重弹出
    window.addEventListener("popstate", function(e) {
      if (_pageStack.length > 0) {
        var entry = _pageStack.pop();
        entry.el.remove();
      } else if (currentBook) {
        saveBookProgress(currentBook.id, currentPage);
        currentBook = null;
        currentPage = 1;
        totalPages = 1;
        document.documentElement.classList.remove("reader-open");
        document.getElementById("tab-bar").style.display = "flex";
        renderReaderPage();
        history.pushState({ home: true }, "", location.href);
      } else {
        history.pushState({ home: true }, "", location.href);
      }
    });
    // 初始 push 一个 home state
    history.pushState({ home: true }, "", location.href);
  }
});

/**
 * 切换选项卡
 */
function switchTab(tab) {
  if (tab === currentTab) return;
  currentTab = tab;

  // 关闭所有打开的页面（直接移除 DOM，不触发 history.back）
  _pageStack.forEach(function(entry) {
    entry.el.remove();
  });
  _pageStack = [];

  // 更新底部按钮状态
  var btns = document.querySelectorAll(".tab-btn");
  btns.forEach(function(btn) {
    var isActive = btn.getAttribute("data-tab") === tab;
    btn.classList.toggle("active", isActive);
    btn.setAttribute("aria-selected", isActive ? "true" : "false");
  });

  // 关闭阅读器（如果在阅读中切走）
  if (currentBook) {
    saveBookProgress(currentBook.id, currentPage);
    currentBook = null;
    document.documentElement.classList.remove("reader-open");
    document.getElementById("tab-bar").style.display = "flex";
    if (!_isCapacitor()) {
      history.back();
    }
  }

  // 渲染对应页面
  switch (tab) {
    case "checkin":
      renderCheckinPage();
      break;
    case "reader":
      renderReaderPage();
      break;
    case "profile":
      renderProfilePage();
      break;
  }

  // 滚动到顶部
  if (window.scrollY > 10) {
    window.scrollTo({ top: 0, behavior: "instant" });
  }
}

/**
 * 更新顶部正能量签名
 */
function updateQuoteBar() {
  var quoteEl = document.getElementById("top-quote-text");
  if (quoteEl) {
    quoteEl.textContent = getTodayQuote();
  }
}

function closeReaderIfOpen() {
  if (currentBook) {
    saveBookProgress(currentBook.id, currentPage);
    currentBook = null;
    currentPage = 1;
    totalPages = 1;
    document.documentElement.classList.remove("reader-open");
    document.getElementById("tab-bar").style.display = "flex";
    renderReaderPage();
    if (!_isCapacitor()) {
      history.back();
    }
  }
}

/* ========================================
   页面导航系统（替代弹窗，解决跳动）
   微信/QQ 风格：全屏页面 + 顶部返回栏
   ======================================== */

/**
 * 打开新页面
 * @param {string} title - 页面标题
 * @param {string} contentHTML - 页面内容
 * @returns {HTMLElement} 页面元素，用于绑定事件
 */
function showPage(title, contentHTML) {
  var overlay = document.createElement("div");
  overlay.className = "page-overlay";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-label", title);

  overlay.innerHTML =
    '<div class="page-header">' +
      '<button class="page-back-btn" aria-label="返回上一页">‹ 返回</button>' +
      '<span class="page-title">' + title + '</span>' +
    '</div>' +
    '<div class="page-body">' + contentHTML + '</div>';

  document.body.appendChild(overlay);
  _pageStack.push({ el: overlay });

  // 返回按钮
  overlay.querySelector(".page-back-btn").addEventListener("click", hidePage);

  // 网页模式 push 历史记录
  if (!_isCapacitor()) {
    history.pushState({ page: true }, "");
  }

  // 滚动到顶部
  overlay.scrollTop = 0;

  return overlay;
}

/**
 * 关闭当前页面
 * 网页模式：只调 history.back()，由 popstate 统一移除 DOM
 * APK 模式：直接移除 DOM
 */
function hidePage() {
  if (_pageStack.length === 0) return;

  if (_isCapacitor()) {
    // APK 模式：无 History API，直接移除
    var entry = _pageStack.pop();
    entry.el.remove();
  } else {
    // 网页模式：只调 back，popstate 会移除 DOM
    history.back();
  }
}

/**
 * 确认对话框（以页面形式展示）
 */
function showConfirm(title, message, confirmText, onConfirm, isDanger) {
  var html = '<div class="confirm-page">';
  html += '<p class="confirm-message">' + message + '</p>';
  html += '<div class="confirm-actions">';
  html += '<button class="btn-secondary" id="cf-cancel" style="flex:1">取消</button>';
  var btnClass = isDanger ? "btn-danger-confirm" : "btn-primary";
  html += '<button class="' + btnClass + '" id="cf-ok" style="flex:1">' + (confirmText || "确认") + '</button>';
  html += '</div>';
  html += '</div>';

  var page = showPage(title, html);
  page.querySelector("#cf-cancel").addEventListener("click", hidePage);
  page.querySelector("#cf-ok").addEventListener("click", function() {
    hidePage();
    if (onConfirm) onConfirm();
  });
}

/* ========================================
   打卡提示音（Web Audio API 生成）
   ======================================== */
function playCheckinSound() {
  try {
    var ctx = new (window.AudioContext || window.webkitAudioContext)();
    var now = ctx.currentTime;
    // 清脆 ascending chime: C5, E5, G5
    var notes = [523.25, 659.25, 783.99];
    notes.forEach(function(freq, i) {
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = 'sine';
      var startTime = now + i * 0.08;
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.25, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.3);
      osc.start(startTime);
      osc.stop(startTime + 0.3);
    });
    setTimeout(function() { try { ctx.close(); } catch(e) {} }, 800);
  } catch(e) {}
}

/* ========================================
   Toast 提示
   ======================================== */
function showToast(msg) {
  var toast = document.getElementById("toast");
  toast.textContent = msg;
  toast.classList.remove("hidden");
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(function() {
    toast.classList.add("hidden");
  }, 30000);
}

/* ========================================
   DOM 工具函数
   ======================================== */

function createEl(tag, className, opts) {
  opts = opts || {};
  var el = document.createElement(tag);
  if (className) el.className = className;
  if (opts.id) el.id = opts.id;
  if (opts.text) el.textContent = opts.text;
  if (opts.html) el.innerHTML = opts.html;
  return el;
}

function getVal(id) {
  var el = document.getElementById(id);
  return el ? el.value : "";
}

function setVal(id, val) {
  var el = document.getElementById(id);
  if (el) el.value = val;
}
