// 연구기록 달력: 날짜별 기록을 달력에 표시하고, 날짜를 누르면 아래 목록을 그날 기록으로 바꿉니다.
(function () {
  var dataEl = document.getElementById("research-data");
  if (!dataEl) return;

  var entries = [];
  try { entries = JSON.parse(dataEl.textContent) || []; } catch (e) { entries = []; }

  var label = document.getElementById("cal-label");
  var prevBtn = document.getElementById("cal-prev");
  var nextBtn = document.getElementById("cal-next");
  var calendar = document.getElementById("calendar");
  var grid = document.getElementById("cal-grid");
  var listTitle = document.getElementById("list-title");
  var list = document.getElementById("research-list");
  var listEmpty = document.getElementById("list-empty");
  var clearBtn = document.getElementById("list-clear");

  function pad(n) { return n < 10 ? "0" + n : "" + n; }

  var now = new Date();
  var todayKey = now.getFullYear() + "-" + pad(now.getMonth() + 1) + "-" + pad(now.getDate());

  // 처음 보여줄 달: 가장 최근 기록이 있는 달 (없으면 이번 달)
  var start = entries.length ? entries[0].date : todayKey;
  var state = { y: parseInt(start.slice(0, 4), 10), m: parseInt(start.slice(5, 7), 10), sel: null };

  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
  }

  function renderList(items, title) {
    listTitle.textContent = title;
    list.textContent = "";
    items.forEach(function (e) {
      var li = el("li", "row");
      var head = el("div", "row-head");
      var a = el("a", "row-title", e.title);
      a.href = e.url;
      head.appendChild(a);
      head.appendChild(el("p", "row-date", e.date.replace(/-/g, ".") + (e.tag ? " · " + e.tag : "")));
      li.appendChild(head);
      li.appendChild(el("p", "row-body", e.summary));
      list.appendChild(li);
    });
    listEmpty.hidden = items.length > 0;
  }

  function render() {
    var y = state.y, m = state.m;
    var prefix = y + "-" + pad(m) + "-";
    var monthEntries = entries.filter(function (e) { return e.date.indexOf(prefix) === 0; });

    label.textContent = y + "." + pad(m);
    grid.textContent = "";

    var firstDow = new Date(y, m - 1, 1).getDay();
    var daysIn = new Date(y, m, 0).getDate();
    var count = 0;

    for (var i = 0; i < firstDow; i++) { grid.appendChild(el("div", "cal-cell")); count++; }

    for (var day = 1; day <= daysIn; day++) {
      var key = prefix + pad(day);
      var items = monthEntries.filter(function (e) { return e.date === key; });
      var cell;
      if (items.length) {
        cell = el("button", "cal-cell");
        cell.type = "button";
        cell.setAttribute("aria-pressed", state.sel === key ? "true" : "false");
        cell.setAttribute("aria-label", m + "월 " + day + "일, 기록 " + items.length + "개");
        (function (k) {
          cell.addEventListener("click", function () {
            state.sel = state.sel === k ? null : k;
            render();
          });
        })(key);
      } else {
        cell = el("div", "cal-cell");
      }
      cell.appendChild(el("span", "cal-num" + (key === todayKey ? " today" : ""), "" + day));
      items.forEach(function (e) {
        var row = el("span", "cal-item");
        row.appendChild(el("span", "cal-dot"));
        row.appendChild(el("span", "cal-text", e.title));
        cell.appendChild(row);
      });
      grid.appendChild(cell);
      count++;
    }
    while (count % 7 !== 0) { grid.appendChild(el("div", "cal-cell")); count++; }

    if (state.sel) {
      var dayItems = monthEntries.filter(function (e) { return e.date === state.sel; });
      renderList(dayItems, m + "월 " + parseInt(state.sel.slice(8), 10) + "일의 기록");
    } else {
      renderList(monthEntries, m + "월의 기록 · " + monthEntries.length);
    }
    clearBtn.hidden = !state.sel;
  }

  function go(delta) {
    var m = state.m + delta, y = state.y;
    if (m < 1) { m = 12; y -= 1; }
    if (m > 12) { m = 1; y += 1; }
    state = { y: y, m: m, sel: null };
    render();
  }

  prevBtn.addEventListener("click", function () { go(-1); });
  nextBtn.addEventListener("click", function () { go(1); });
  clearBtn.addEventListener("click", function () { state.sel = null; render(); });

  prevBtn.hidden = false;
  nextBtn.hidden = false;
  calendar.hidden = false;
  render();
})();
