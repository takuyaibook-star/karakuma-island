(function () {
  'use strict';
  var panel = document.getElementById('loading');
  var message = document.getElementById('loading-message');
  var help = document.getElementById('loading-help');
  var retry = document.getElementById('retry');
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
    progress: function (text) { if (!done) message.textContent = text; },
    fail: fail,
    ready: function () { done = true; clearTimeout(timer); panel.hidden = true; }
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
