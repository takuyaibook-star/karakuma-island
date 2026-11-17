(function () {
  'use strict';
  function fitViewport() {
    var height = window.visualViewport && window.visualViewport.height || window.innerHeight;
    if (height > 0) document.documentElement.style.setProperty('--island-height', Math.floor(height) + 'px');
  }
  window.addEventListener('resize', fitViewport);
  if (window.visualViewport) window.visualViewport.addEventListener('resize', fitViewport);
  fitViewport();
  var panel = document.getElementById('loading');
  var message = document.getElementById('loading-message');
  var help = document.getElementById('loading-help');
  var retry = document.getElementById('retry');
  var bar = document.getElementById('loading-progress');
  var count = document.getElementById('loading-count');
  var done = false;
  function fail(text) {
    if (done) return;
    clearTimeout(timer);
    panel.hidden = false;
    message.textContent = text;
    help.hidden = false;
    retry.hidden = false;
  }
  var timer = setTimeout(function () {
    fail('起動に時間がかかっています。通信状態を確認して、もう一度お試しください。');
  }, 60000);
  window.__islandBoot = {
    progress: function (text, loaded, total) {
      if (done) return;
      message.textContent = text;
      var match = text.match(/(\d+)\/(\d+)/);
      if (typeof loaded !== 'number' && match) { loaded = Number(match[1]); total = Number(match[2]); }
      if (bar && total > 0) { bar.max = total; bar.value = loaded; }
      if (count && total > 0) count.textContent = loaded + ' / ' + total;
    },
    fail: fail,
    ready: function () { if (bar) bar.value = bar.max; done = true; clearTimeout(timer); panel.hidden = true; }
  };
  retry.addEventListener('click', function () { window.location.reload(); });
  window.addEventListener('error', function (event) {
    if (event.target && event.target.tagName === 'SCRIPT' || event.message) {
      fail('ゲームを起動できませんでした。もう一度読み込むか、Safariなどの標準ブラウザでお試しください。');
    }
  }, true);
  window.addEventListener('unhandledrejection', function () {
    fail('ゲームの準備中に問題が起きました。もう一度読み込んでください。');
  });
}());
