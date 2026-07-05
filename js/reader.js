/* ========================================
   阅读选项卡 - 简单文本阅读器
   支持：添加本地txt文件、分页阅读、横滑行、自动书签
   ======================================== */

var currentBook = null;       // { id, name, content }
var currentPage = 1;          // 当前页码
var totalPages = 1;           // 总页数
var CHARS_PER_PAGE = 3000;    // 每页约3000字

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
    // 按字符数估算总页数
    var totalChars = book.content.length;
    var estPages = Math.max(1, Math.ceil(totalChars / CHARS_PER_PAGE));
    var percent = Math.round(progress / estPages * 100);

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

  // 按固定字符数分页（约3000字/页，段落边界断开）
  var paragraphs = book.content.split(/\n+/);
  currentBook._pages = [];
  var currentPageContent = [];
  var charCount = 0;

  for (var i = 0; i < paragraphs.length; i++) {
    var para = paragraphs[i];
    var paraLen = para.length;

    // 如果当前页已经有内容，且加上这个段落会超过限制
    if (charCount > 0 && charCount + paraLen > CHARS_PER_PAGE) {
      currentBook._pages.push(currentPageContent);
      currentPageContent = [];
      charCount = 0;
    }

    currentPageContent.push(para);
    charCount += paraLen;

    // 如果单段落就超过限制，也推到下一页
    if (charCount >= CHARS_PER_PAGE && i < paragraphs.length - 1) {
      currentBook._pages.push(currentPageContent);
      currentPageContent = [];
      charCount = 0;
    }
  }

  // 最后一页
  if (currentPageContent.length > 0) {
    currentBook._pages.push(currentPageContent);
  }

  totalPages = Math.max(1, currentBook._pages.length);

  // 恢复上次页码
  var savedPage = getBookProgress(book.id);
  currentPage = Math.min(savedPage || 1, totalPages);

  // ★ push 历史记录（仅网页模式）
  if (!_isCapacitor()) {
    history.pushState({ reader: true }, "", location.href);
  }

  // 进入阅读器模式
  document.documentElement.classList.add("reader-open");
  document.getElementById("tab-bar").style.display = "none";

  renderReaderView();
}

/**
 * 渲染阅读器视图（当前页）
 */
function renderReaderView() {
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
  titleEl.textContent = currentBook.name;
  titleEl.style.cssText = "flex:1;text-align:center;";
  toolbar.appendChild(titleEl);

  // 页码显示
  var pageInfo = createEl("div", "reader-progress-info");
  pageInfo.id = "reader-page-info";
  pageInfo.setAttribute("aria-live", "polite");
  pageInfo.textContent = currentPage + "/" + totalPages;
  toolbar.appendChild(pageInfo);

  page.appendChild(toolbar);

  // 阅读内容区 - 分页 + 逐行横滑
  var contentDiv = createEl("div", "reader-content");
  contentDiv.id = "reader-text-content";

  var lines = currentBook._pages[currentPage - 1] || [];
  lines.forEach(function(line) {
    var lineBlock = createEl("div", "reader-line");
    if (line === "" || line === null || line === undefined) {
      lineBlock.style.minHeight = "1.2em";
    } else {
      lineBlock.textContent = line;
    }
    contentDiv.appendChild(lineBlock);
  });

  page.appendChild(contentDiv);

  // 底部导航栏：上一页 / 页码 / 下一页
  var navBar = createEl("div", "reader-nav");
  navBar.setAttribute("role", "group");
  navBar.setAttribute("aria-label", "页面导航");

  var prevBtn = createEl("button", "btn-secondary reader-nav-btn");
  prevBtn.textContent = "上一页";
  prevBtn.setAttribute("aria-label", "上一页，第" + (currentPage - 1) + "页");
  if (currentPage <= 1) {
    prevBtn.disabled = true;
    prevBtn.style.opacity = "0.4";
  }
  prevBtn.addEventListener("click", function() {
    if (currentPage > 1) goToPage(currentPage - 1);
  });
  navBar.appendChild(prevBtn);

  // 页码跳转输入
  var pageInput = document.createElement("input");
  pageInput.type = "number";
  pageInput.min = "1";
  pageInput.max = totalPages;
  pageInput.value = currentPage;
  pageInput.id = "reader-page-input";
  pageInput.setAttribute("aria-label", "跳转到第几页，共" + totalPages + "页");
  pageInput.style.cssText = "width:60px;text-align:center;padding:6px;border:1px solid #ccc;border-radius:4px;font-size:14px;";
  pageInput.addEventListener("change", function() {
    var p = parseInt(this.value);
    if (!isNaN(p) && p >= 1 && p <= totalPages) {
      goToPage(p);
    } else {
      this.value = currentPage;
    }
  });
  navBar.appendChild(pageInput);

  var pageLabel = createEl("span");
  pageLabel.textContent = "/ " + totalPages + " 页";
  pageLabel.style.cssText = "font-size:13px;color:#999;white-space:nowrap;";
  navBar.appendChild(pageLabel);

  var nextBtn = createEl("button", "btn-secondary reader-nav-btn");
  nextBtn.textContent = "下一页";
  nextBtn.setAttribute("aria-label", "下一页，第" + (currentPage + 1) + "页");
  if (currentPage >= totalPages) {
    nextBtn.disabled = true;
    nextBtn.style.opacity = "0.4";
  }
  nextBtn.addEventListener("click", function() {
    if (currentPage < totalPages) goToPage(currentPage + 1);
  });
  navBar.appendChild(nextBtn);

  page.appendChild(navBar);
  main.appendChild(page);
}

/**
 * 跳转到指定页
 */
function goToPage(pageNum) {
  if (pageNum < 1 || pageNum > totalPages) return;
  currentPage = pageNum;
  saveBookProgress(currentBook.id, currentPage);
  renderReaderView();
  // 滚动内容区到顶部
  var content = document.getElementById("reader-text-content");
  if (content) content.scrollTop = 0;
}

/**
 * 关闭阅读器，保存书签
 */
function closeReader() {
  if (currentBook) {
    saveBookProgress(currentBook.id, currentPage);
  }
  currentBook = null;
  currentPage = 1;
  totalPages = 1;
  document.documentElement.classList.remove("reader-open");
  document.getElementById("tab-bar").style.display = "flex";
  renderReaderPage();
  // 网页模式消耗历史记录
  if (!_isCapacitor()) {
    history.back();
  }
}

/**
 * 更新阅读进度显示（已废弃，页码直接显示）
 */
function updateReaderProgress() {
  // 分页模式不需要 scroll-based 进度
}

/**
 * 确认删除书籍
 */
function confirmDeleteBook(bid, name) {
  showConfirm("确认删除", "确定从书架中删除「" + name + "」吗？阅读进度也会一并清除。", "删除", function() {
    deleteBook(bid);
    refreshBookList();
    showToast("「" + name + "」已从书架移除");
  }, true);
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
