/* Кнопка «назад в портфолио» и плавный вход для демо-проектов.
   Подключение: <script src="../back.js" data-href="../../index.html#p2"></script>
   data-tab="0" — не рисовать кнопку (только window.zvBack() для своих кнопок). */
(function () {
  var me = document.currentScript;
  if (window.top !== window.self) return; // внутри рамки телефона ничего не показываем

  var ss = {
    get: function (k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { sessionStorage.setItem(k, v); } catch (e) { } },
    del: function (k) { try { sessionStorage.removeItem(k); } catch (e) { } }
  };
  var href = (me && me.getAttribute('data-href')) || '../../index.html';
  var fromPortfolio = ss.get('zv-warp') === '1'; ss.del('zv-warp');
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  var theme = 'neon'; try { theme = localStorage.getItem('zv-theme') || 'neon'; } catch (e) { }
  var T = { neon: ['#ff2bd6', '#09050f'], yellow: ['#fcee0a', '#07080a'], red: ['#ff2244', '#0b0405'], acid: ['#c8ff3d', '#050607'] }[theme] || ['#ff2bd6', '#09050f'];
  var C = T[0], BG = T[1];

  window.zvBack = function () {
    ss.set('zv-back', '1');
    if (fromPortfolio && history.length > 1) history.back(); else location.href = href;
  };

  var st = document.createElement('style');
  st.textContent =
    '#zv-back{position:fixed;left:0;top:50%;z-index:190;transform:translateY(-50%);display:flex;flex-direction:column;align-items:center;gap:8px;' +
    'padding:12px 7px 14px 5px;background:' + BG + 'e0;border:1px solid ' + C + ';border-left:0;color:' + C + ';' +
    'font:500 10.5px/1 "JetBrains Mono",ui-monospace,Consolas,monospace;letter-spacing:.22em;text-transform:uppercase;text-decoration:none;' +
    'box-shadow:0 0 18px ' + C + '55;-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);transition:padding .2s,background .2s,color .2s;cursor:pointer!important}' +
    '#zv-back span{writing-mode:vertical-rl;transform:rotate(180deg)}' +
    '#zv-back i{font-style:normal;font-size:17px;letter-spacing:0;line-height:.8}' +
    '#zv-back:hover,#zv-back:focus-visible{padding-left:11px;background:' + C + ';color:#000;outline:none}' +
    '@media (max-width:760px){#zv-back{padding:10px 5px 12px 3px;font-size:9.5px;gap:6px}}' +
    '#zv-in{position:fixed;inset:0;z-index:2147483000;pointer-events:none;background:' + BG + ';animation:zvIn .6s cubic-bezier(.7,0,.3,1) .05s both}' +
    '#zv-in::after{content:"";position:absolute;left:0;right:0;top:50%;height:2px;margin-top:-1px;background:' + C + ';box-shadow:0 0 18px 4px ' + C + '}' +
    '@keyframes zvIn{0%{clip-path:inset(0)}55%{clip-path:inset(49.5% 0 49.5% 0);opacity:1}100%{clip-path:inset(50% 0 50% 0);opacity:0}}';
  document.head.appendChild(st);

  if (!me || me.getAttribute('data-tab') !== '0') {
    var a = document.createElement('a');
    a.id = 'zv-back'; a.href = href; a.title = 'Назад в портфолио'; a.setAttribute('aria-label', 'Назад в портфолио');
    a.innerHTML = '<i>‹</i><span>Портфолио</span>';
    a.addEventListener('click', function (e) {
      if (e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault(); window.zvBack();
    });
    document.body.appendChild(a);
  }

  if (fromPortfolio && !reduce) {
    var o = document.createElement('div'); o.id = 'zv-in';
    document.body.appendChild(o);
    setTimeout(function () { o.remove(); }, 900);
  }
})();
