/* ========================================
   阅读选项卡 - 简单文本阅读器
   支持：添加本地txt文件、滑动阅读、自动书签、百分比跳转
   ======================================== */

var currentBook = null;       // { id, name, content }
var readerScrollPos = 0;      // 当前阅读位置（字符偏移）

/**
 * 渲染阅读页面（书架列表）
 */
function renderReaderPage() {
  var main = document.getElementById("main-content");
  main.innerHTML = "";

  var page = createEl("div", "tab-page active", { id: "page-reader" });

  // 操作栏
  var bar = createEl("div", "action-bar");
  bar.id = "reader-action-bar";
  var btnAdd = createEl("button", "btn-primary", { text: "+ 添加文本文件" });
  btnAdd.setAttribute("aria-label", "添加本地文本文件");
  btnAdd.addEventListener("click", openFilePicker);
  bar.appendChild(btnAdd);
  page.appendChild(bar);

  // 书架列表
  var listDiv = createEl("div", "reader-book-list", { id: "reader-book-list" });
  page.appendChild(listDiv);

  main.appendChild(page);
  refreshBookList();
}

/**
 * 刷新书架列表
 */
function refreshBookList() {
  var listDiv = document.getElementById("reader-book-list");
  if (!listDiv) return;
  listDiv.innerHTML = "";

  var books = getBooks();

  if (books.length === 0) {
    var empty = createEl("div", "empty-state");
    empty.innerHTML = "<p>书架空空如也</p><p>点击上方【添加文本文件】导入本地txt文件</p>";
    listDiv.appendChild(empty);
    return;
  }

  books.forEach(function(book) {
    var progress = getBookProgress(book.id);
    var totalChars = book.content.length;
    var percent = totalChars > 0 ? Math.round(progress / totalChars * 100) : 0;

    var item = createEl("div", "reader-book-item");
    item.setAttribute("role", "button");
    item.setAttribute("tabindex", "0");
    item.setAttribute("aria-label", book.name + "，阅读进度" + percent + "%");

    var nameEl = createEl("div", "reader-book-name");
    nameEl.textContent = book.name;
    item.appendChild(nameEl);

    var progEl = createEl("div", "reader-book-progress");
    progEl.textContent = percent + "%";
    item.appendChild(progEl);

    // 删除按钮
    var delBtn = createEl("button", "btn-danger");
    delBtn.textContent = "删除";
    delBtn.style.cssText = "margin-left:8px;flex-shrink:0;";
    delBtn.addEventListener("click", function(e) {
      e.stopPropagation();
      confirmDeleteBook(book.id, book.name);
    });
    item.appendChild(delBtn);

    item.addEventListener("click", function() {
      openReader(book);
    });

    // 长按删除
    var timer;
    item.addEventListener("touchstart", function() {
      timer = setTimeout(function() { confirmDeleteBook(book.id, book.name); }, 600);
    });
    item.addEventListener("touchend", function() { clearTimeout(timer); });
    item.addEventListener("touchmove", function() { clearTimeout(timer); });

    listDiv.appendChild(item);
  });
}

/**
 * 打开文件选择器
 */
function openFilePicker() {
  var input = document.createElement("input");
  input.type = "file";
  input.accept = ".txt,text/plain";
  input.addEventListener("change", function(e) {
    var file = e.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function(evt) {
      var content = evt.target.result;
      var name = file.name.replace(/\.txt$/i, "").replace(/\.text$/i, "");
      if (!name) name = "未命名文档";
      addBook(name, content);
      refreshBookList();
      showToast("「" + name + "」已添加到书架");
    };
    reader.readAsText(file, "UTF-8");
  });
  input.click();
}

/**
 * 打开阅读器
 */
function openReader(book) {
  currentBook = book;
  var pos = getBookProgress(book.id);
  readerScrollPos = pos;

  var main = document.getElementById("main-content");
  main.innerHTML = "";

  var page = createEl("div", "tab-page active", { id: "page-reader-view" });

  // 顶部工具栏
  var toolbar = createEl("div", "reader-toolbar");
  toolbar.setAttribute("role", "toolbar");
  toolbar.setAttribute("aria-label", "阅读工具栏");

  var backBtn = createEl("button", "btn-secondary");
  backBtn.textContent = "← 返回";
  backBtn.style.cssText = "padding:6px 12px;font-size:13px;";
  backBtn.addEventListener("click", closeReader);
  toolbar.appendChild(backBtn);

  var titleEl = createEl("div", "ci-title");
  titleEl.textContent = book.name;
  titleEl.style.cssText = "flex:1;text-align:center;";
  toolbar.appendChild(titleEl);

  var progressInfo = createEl("div", "reader-progress-info");
  progressInfo.id = "reader-progress-info";
  progressInfo.setAttribute("aria-live", "polite");
  toolbar.appendChild(progressInfo);

  page.appendChild(toolbar);

  // 阅读内容区
  var contentDiv = createEl("div", "reader-content");
  contentDiv.id = "reader-text-content";
  contentDiv.textContent = book.content;
  // 滚动到上次位置
  setTimeout(function() {
    if (pos > 0) {
      contentDiv.scrollTop = pos;
    }
    updateReaderProgress();
  }, 100);
  contentDiv.addEventListener("scroll", function() {
    readerScrollPos = contentDiv.scrollTop;
    updateReaderProgress();
  });
  page.appendChild(contentDiv);

  // 底部跳转栏
  var jumpBar = createEl("div", "reader-jump");
  jumpBar.setAttribute("role", "group");
  jumpBar.setAttribute("aria-label", "阅读跳转");

  var jumpLabel = createEl("span");
  jumpLabel.textContent = "跳转到";
  jumpLabel.style.cssText = "font-size:14px;color:#666;";
  jumpBar.appendChild(jumpLabel);

  var jumpInput = document.createElement("input");
  jumpInput.type = "number";
  jumpInput.min = "0";
  jumpInput.max = "100";
  jumpInput.value = "0";
  jumpInput.id = "reader-jump-input";
  jumpInput.setAttribute("aria-label", "输入百分比数字");
  jumpBar.appendChild(jumpInput);

  var jumpUnit = createEl("span");
  jumpUnit.textContent = "%";
  jumpUnit.style.cssText = "font-size:14px;color:#666;";
  jumpBar.appendChild(jumpUnit);

  var jumpBtn = createEl("button", "btn-primary");
  jumpBtn.textContent = "跳转";
  jumpBtn.style.cssText = "flex:none;padding:6px 16px;font-size:13px;";
  jumpBtn.addEventListener("click", function() {
    var pct = parseInt(jumpInput.value);
    if (isNaN(pct) || pct < 0) pct = 0;
    if (pct > 100) pct = 100;
    var target = Math.floor((pct / 100) * (contentDiv.scrollHeight - contentDiv.clientHeight));
    contentDiv.scrollTop = target;
    readerScrollPos = target;
    updateReaderProgress();
  });
  jumpBar.appendChild(jumpBtn);

  page.appendChild(jumpBar);
  main.appendChild(page);

  // 隐藏底部选项卡
  document.getElementById("tab-bar").style.display = "none";
}

/**
 * 关闭阅读器，保存书签
 */
function closeReader() {
  if (currentBook) {
    saveBookProgress(currentBook.id, readerScrollPos);
  }
  currentBook = null;
  document.getElementById("tab-bar").style.display = "flex";
  renderReaderPage();
}

/**
 * 更新阅读进度显示
 */
function updateReaderProgress() {
  var contentDiv = document.getElementById("reader-text-content");
  var progressInfo = document.getElementById("reader-progress-info");
  if (!contentDiv || !progressInfo) return;

  var total = contentDiv.scrollHeight - contentDiv.clientHeight;
  var percent = total > 0 ? Math.round((contentDiv.scrollTop / total) * 100) : 0;
  progressInfo.textContent = percent + "%";

  // 保存书签（每3秒自动保存一次）
  if (currentBook && readerScrollPos !== null) {
    clearTimeout(window._saveTimer);
    window._saveTimer = setTimeout(function() {
      saveBookProgress(currentBook.id, contentDiv.scrollTop);
    }, 3000);
  }
}

/**
 * 确认删除书籍
 */
function confirmDeleteBook(bid, name) {
  var html = '<div class="modal-title">确认删除</div>';
  html += '<div class="modal-body">确定从书架中删除「' + name + '」吗？阅读进度也会一并清除。</div>';
  showModal(html, "删除", "取消", function() {
    deleteBook(bid);
    refreshBookList();
    showToast("「" + name + "」已从书架移除");
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

/* ========================================
   书籍存储（基于 localStorage）
   ======================================== */

var BOOK_STORAGE_KEY = "wenfeng_books";
var PROGRESS_KEY = "wenfeng_book_progress";

function getBooks() {
  try {
    return JSON.parse(localStorage.getItem(BOOK_STORAGE_KEY) || "[]");
  } catch (e) { return []; }
}

function saveBooks(books) {
  localStorage.setItem(BOOK_STORAGE_KEY, JSON.stringify(books));
}

function addBook(name, content) {
  var books = getBooks();
  var bid = "b_" + Date.now() + "_" + Math.random().toString(36).substr(2, 6);

  // 限制单本书 2MB
  if (content.length > 2 * 1024 * 1024) {
    showToast("文件过大（最大2MB），请分割后再导入");
    return null;
  }

  var book = { id: bid, name: name, content: content, added: getTodayStr() };
  books.push(book);
  saveBooks(books);
  return book;
}

function deleteBook(bid) {
  var books = getBooks().filter(function(b) { return b.id !== bid; });
  saveBooks(books);
  // 清除进度
  var prog = getProgressMap();
  delete prog[bid];
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(prog));
}

function getProgressMap() {
  try {
    return JSON.parse(localStorage.getItem(PROGRESS_KEY) || "{}");
  } catch (e) { return {}; }
}

function getBookProgress(bid) {
  var map = getProgressMap();
  return map[bid] || 0;
}

function saveBookProgress(bid, pos) {
  var map = getProgressMap();
  map[bid] = Math.max(0, pos);
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(map));
}
