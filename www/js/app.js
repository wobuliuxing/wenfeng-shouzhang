/* ========================================
   文峰手账 - 主控制器
   处理导航、弹窗、Toast、生命周期
   ======================================== */

var currentTab = null; // 初始为 null，确保首次 switchTab("checkin") 能正常渲染
var _modalStack = []; // 弹窗历史栈，支持层级返回

/** DOM Ready */
document.addEventListener("DOMContentLoaded", function() {
  initTheme();
  updateQuoteBar();
  switchTab("checkin");

  // 选项卡点击
  var tabBtns = document.querySelectorAll(".tab-btn");
  tabBtns.forEach(function(btn) {
    btn.addEventListener("click", function() {
      var tab = this.getAttribute("data-tab");
      switchTab(tab);
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

  // ★ History API：按返回键时关闭弹窗或阅读器，而不是退出 app
  window.addEventListener("popstate", function(e) {
    // 优先关弹窗
    if (_modalStack.length > 0) {
      _modalStack.pop();
      _doHideModal();
      return;
    }
    // 其次关阅读器
    if (currentBook) {
      closeReaderIfOpen();
      return;
    }
    // 都没有，阻止退出（回到首页）
    history.pushState({ home: true }, "", location.href);
  });

  // 初始 push 一个 home state，这样第一次按返回不会退出
  history.pushState({ home: true }, "", location.href);
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
    saveBookProgress(currentBook.id, readerScrollPos);
    currentBook = null;
    document.getElementById("tab-bar").style.display = "flex";
    history.back(); // 弹出阅读器的历史记录
  }

  // 渲染对应页面
  switch (tab) {
    case "checkin":
      renderCheckinPage();
      break;
    case "stats":
      renderStatsPage();
      break;
    case "reader":
      renderReaderPage();
      break;
    case "profile":
      renderProfilePage();
      break;
  }

  // 滚动到顶部
  var main = document.getElementById("main-content");
  if (main) main.scrollTop = 0;
}

/**
 * 更新顶部正能量签名
 */
function updateQuoteBar() {
  var quoteEl = document.getElementById("top-quote-text");
  if (quoteEl) {
    quoteEl.textContent = getTodayQuote();
  }
  var badge = document.getElementById("top-streak-badge");
  if (badge) {
    var streak = getCurrentStreak();
    badge.textContent = "连续" + streak + "天";
  }
}

function closeReaderIfOpen() {
  if (currentBook) {
    saveBookProgress(currentBook.id, readerScrollPos);
    currentBook = null;
    document.getElementById("tab-bar").style.display = "flex";
    renderReaderPage();
    history.back(); // 弹出阅读器的历史记录
  }
}

/* ========================================
   Modal / Toast 工具
   ======================================== */

/**
 * 显示弹窗
 * @param {string} html 弹窗 HTML
 * @param {string|null} confirmText 确认按钮文字（null 则隐藏）
 * @param {string|null} cancelText 取消按钮文字（null 则隐藏）
 * @param {function|null} onConfirm 确认回调，返回 false 则阻止关闭
 * @param {function|null} onCancel 取消回调
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

  // ★ push 历史记录，这样按返回键可以关闭弹窗
  _modalStack.push({ onConfirm: onConfirm, onCancel: onCancel });
  history.pushState({ modal: true }, "", location.href);

  // 焦点放到弹窗
  setTimeout(function() {
    var firstFocus = box.querySelector("button, input, select, [tabindex]");
    if (firstFocus) firstFocus.focus();
    else box.focus();
    box.setAttribute("tabindex", "-1");
  }, 100);

  // 点击遮罩关闭
  overlay.addEventListener("click", function(e) {
    if (e.target === overlay) hideModal();
  }, { once: true });
}

function hideModal() {
  if (_modalStack.length > 0) {
    _modalStack.pop();
    // 手动触发 history.back()，会触发 popstate 事件
    history.back();
    return;
  }
  _doHideModal();
}

function _doHideModal() {
  var overlay = document.getElementById("modal-overlay");
  overlay.classList.remove("modal-visible");
  overlay.classList.add("hidden");
  overlay.setAttribute("aria-hidden", "true");
  document.getElementById("modal-box").innerHTML = "";
}

/**
 * Toast 提示
 */
function showToast(msg) {
  var toast = document.getElementById("toast");
  toast.textContent = msg;
  toast.classList.remove("hidden");
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(function() {
    toast.classList.add("hidden");
  }, 2000);
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
