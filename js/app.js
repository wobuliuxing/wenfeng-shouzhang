/* ========================================
   文峰手账 - 主控制器
   处理导航、弹窗、Toast、生命周期
   ======================================== */

var currentTab = null;
var _modalStack = [];

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
    // 如果已开启云同步且已登录，上传本地数据到云端
    if (getCloudSyncEnabled() && isCloudLoggedIn()) {
      cloudUploadData(function(e) {
        if (!e) showToast("数据已同步到云端");
      });
    }
  });

  // 选项卡点击
  var tabBtns = document.querySelectorAll(".tab-btn");
  tabBtns.forEach(function(btn) {
    btn.addEventListener("click", function() {
      switchTab(this.getAttribute("data-tab"));
    });
  });

  // 全局按键（Esc 关闭弹窗）
  document.addEventListener("keydown", function(e) {
    if (e.key === "Escape") {
      hideModal();
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
      // 优先关弹窗
      if (_modalStack.length > 0) {
        _modalStack.pop();
        _doHideModal();
        return;
      }
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
    // popstate 统一处理：无论是程序主动 history.back() 还是系统返回键，
    // 都走同一条路径 pop + hide，避免"先pop再back"导致的状态不一致
    window.addEventListener("popstate", function(e) {
      if (_modalStack.length > 0) {
        _modalStack.pop();
        _doHideModal();
        history.pushState({ home: true }, "", location.href);
        return;
      }
      if (currentBook) {
        saveBookProgress(currentBook.id, currentPage);
        currentBook = null;
        currentPage = 1;
        totalPages = 1;
        document.documentElement.classList.remove("reader-open");
        document.getElementById("tab-bar").style.display = "flex";
        renderReaderPage();
        history.pushState({ home: true }, "", location.href);
        return;
      }
      // 都没有，留在首页
      history.pushState({ home: true }, "", location.href);
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
   Modal / Toast 工具
   ======================================== */

/**
 * 显示弹窗
 */
function showModal(html, confirmText, cancelText, onConfirm, onCancel) {
  var overlay = document.getElementById("modal-overlay");
  var box = document.getElementById("modal-box");

  box.innerHTML = html;

  // 按钮区
  if (confirmText || cancelText) {
    var actions = createEl("div", "modal-actions");

    if (cancelText) {
      var btnCancel = createEl("button", "modal-btn modal-btn-cancel");
      btnCancel.textContent = cancelText;
      btnCancel.addEventListener("click", function() {
        if (onCancel) onCancel();
        hideModal();
      });
      actions.appendChild(btnCancel);
    }

    if (confirmText) {
      var btnConfirm = createEl("button", "modal-btn modal-btn-confirm");
      btnConfirm.id = "modal-confirm-btn";
      btnConfirm.textContent = confirmText;
      btnConfirm.addEventListener("click", function() {
        if (onConfirm) {
          var shouldClose = onConfirm();
          if (shouldClose !== false) hideModal();
        } else {
          hideModal();
        }
      });
      actions.appendChild(btnConfirm);
    }

    box.appendChild(actions);
  }

  overlay.classList.remove("hidden");
  overlay.classList.add("modal-visible");
  overlay.setAttribute("aria-hidden", "false");

  // ★ 锁定滚动（overflow:hidden，不用 position:fixed 避免跳动）
  document.body.classList.add("modal-open");

  // 入栈
  _modalStack.push({ onConfirm: onConfirm, onCancel: onCancel });

  // 网页模式 push 历史记录
  if (!_isCapacitor()) {
    history.pushState({ modal: true }, "", location.href);
  }

  // 焦点放到弹窗（preventScroll 避免浏览器自动滚动导致跳动）
  setTimeout(function() {
    var firstFocus = box.querySelector("button, input, select, [tabindex]");
    if (firstFocus) firstFocus.focus({ preventScroll: true });
    else { box.setAttribute("tabindex", "-1"); box.focus({ preventScroll: true }); }
  }, 100);

  // 点击遮罩关闭
  overlay.addEventListener("click", function(e) {
    if (e.target === overlay) hideModal();
  }, { once: true });
}

/**
 * 关闭弹窗
 * ★ 不提前 pop 栈也不直接 hide，只调 history.back()
 *   由 popstate 统一处理 pop + hide，避免状态不一致导致跳动
 */
function hideModal() {
  if (_isCapacitor()) {
    // APK 模式：无 History API，直接处理
    if (_modalStack.length > 0) _modalStack.pop();
    _doHideModal();
  } else {
    // 网页模式：只 back，popstate 会处理 pop + hide
    if (_modalStack.length > 0) {
      history.back();
    }
  }
}

function _doHideModal() {
  var overlay = document.getElementById("modal-overlay");
  overlay.classList.remove("modal-visible");
  overlay.classList.add("hidden");
  overlay.setAttribute("aria-hidden", "true");
  document.getElementById("modal-box").innerHTML = "";
  document.body.classList.remove("modal-open");
}

/**
 * Toast 提示（30秒后自动消失）
 */
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
