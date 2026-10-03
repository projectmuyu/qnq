(function () {
  var links = document.querySelectorAll('a.tree-file[data-path]');
  for (var i = 0; i < links.length; i++) {
    var link = links[i];
    if (link.href === location.href) {
      link.classList.add('on');
      var el = link.parentElement;
      while (el) {
        if (el.tagName === 'DETAILS') el.open = true;
        el = el.parentElement;
      }
      link.scrollIntoView({ block: 'nearest' });
      break;
    }
  }
})();
