(function () {
  var nav = document.querySelector('.code-tabs');
  if (!nav) return;
  var tabs = Array.from(nav.querySelectorAll('.code-tab'));
  var panels = tabs.map(function (t) { return document.getElementById(t.dataset.target); }).filter(Boolean);

  // 첫 번째만 보이고 나머지 숨기기
  panels.forEach(function (p, i) { if (i > 0) p.hidden = true; });

  function activate(tab) {
    var target = document.getElementById(tab.dataset.target);
    if (!target) return;
    panels.forEach(function (p) { p.hidden = true; });
    tabs.forEach(function (t) { t.classList.remove('on'); });
    target.hidden = false;
    tab.classList.add('on');
  }

  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () { activate(tab); });
  });
})();
