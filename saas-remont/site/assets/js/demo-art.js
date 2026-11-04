/* Условные «фото» для демо: рисованные SVG-иллюстрации этапов ремонта (не реальные фотографии) */
(function () {
  "use strict";

  function base(o) {
    o = o || {};
    return '' +
      '<rect width="400" height="300" fill="#d8d2c8"/>' +
      '<polygon points="0,0 400,0 310,60 90,60" fill="' + (o.ceil || "#e3ded5") + '"/>' +
      '<polygon points="0,0 90,60 90,215 0,300" fill="' + (o.left || "#aea698") + '"/>' +
      '<polygon points="400,0 310,60 310,215 400,300" fill="' + (o.right || "#b8b0a3") + '"/>' +
      '<rect x="90" y="60" width="220" height="155" fill="' + (o.back || "#c4bcaf") + '"/>' +
      '<polygon points="0,300 90,215 310,215 400,300" fill="' + (o.floor || "#8e877c") + '"/>';
  }
  var win = '<rect x="168" y="82" width="64" height="86" fill="#dcebf5" stroke="#f1f1ef" stroke-width="5"/>' +
    '<line x1="200" y1="82" x2="200" y2="168" stroke="#f1f1ef" stroke-width="4"/>';
  var mark = '<text x="390" y="290" text-anchor="end" font-size="13" font-weight="700" fill="rgba(255,255,255,.85)" font-family="Arial,sans-serif">ДЕМО</text>';

  var ART = {
    demolition: function () {
      return base({ floor: "#8a8277" }) + win +
        '<polygon points="96,215 96,120 112,112 118,140 110,160 124,215" fill="#b1a99c"/>' +
        '<polygon points="40,292 80,250 130,246 170,270 150,296" fill="#9b9286"/>' +
        '<polygon points="70,270 96,256 120,262 104,280" fill="#7d766c"/>' +
        '<polygon points="150,280 190,252 226,262 236,292" fill="#a39a8d"/>' +
        '<rect x="262" y="228" width="44" height="54" rx="12" fill="#f0efe9"/>' +
        '<rect x="300" y="238" width="40" height="48" rx="12" fill="#e8e6de"/>' +
        '<path d="M276 228q8-10 16 0" stroke="#cfcdc4" stroke-width="3" fill="none"/>' + mark;
    },
    primer: function () {
      return base({ back: "#b3aa9b", left: "#9f9688" }) + win +
        '<path d="M90 60h70v155H90z" fill="#a59b8b" opacity=".7"/>' +
        '<path d="M240 60h70v155h-70z" fill="#a89e8f" opacity=".6"/>' +
        '<rect x="250" y="236" width="38" height="44" rx="4" fill="#3f6fb5"/>' +
        '<rect x="250" y="236" width="38" height="10" fill="#2f5a99"/>' +
        '<line x1="120" y1="290" x2="160" y2="150" stroke="#6b5a45" stroke-width="5"/>' +
        '<rect x="148" y="136" width="34" height="16" rx="6" fill="#f2f2ee" transform="rotate(-18 165 144)"/>' + mark;
    },
    wiring: function () {
      return base() + win +
        '<path d="M96 100H162M238 100H304" stroke="#958c7f" stroke-width="10"/>' +
        '<path d="M96 100H162M238 100H304" stroke="#e8772e" stroke-width="3"/>' +
        '<path d="M120 100V188M286 100V188M140 100V150" stroke="#958c7f" stroke-width="10"/>' +
        '<path d="M120 100V188M286 100V188M140 100V150" stroke="#f2f2f2" stroke-width="3"/>' +
        '<circle cx="120" cy="192" r="9" fill="#4f5966"/><circle cx="286" cy="192" r="9" fill="#4f5966"/><circle cx="140" cy="154" r="9" fill="#4f5966"/>' +
        '<path d="M30 40 70 72V160" stroke="#958c7f" stroke-width="9" fill="none"/>' +
        '<path d="M30 40 70 72V160" stroke="#e8772e" stroke-width="3" fill="none"/>' +
        '<ellipse cx="200" cy="262" rx="40" ry="12" fill="#e8772e" opacity=".9"/><ellipse cx="200" cy="258" rx="22" ry="6" fill="#8e877c"/>' + mark;
    },
    panel: function () {
      var rows = "";
      for (var r = 0; r < 3; r++) {
        for (var c = 0; c < 8; c++) {
          rows += '<rect x="' + (156 + c * 12) + '" y="' + (98 + r * 30) + '" width="9" height="20" rx="1.5" fill="' + (c === 0 ? "#e2e2e2" : "#f7f7f7") + '"/>' +
            '<rect x="' + (158 + c * 12) + '" y="' + (104 + r * 30) + '" width="5" height="6" fill="#2d6cdf"/>';
        }
      }
      return base() +
        '<rect x="144" y="82" width="120" height="110" rx="6" fill="#eceeef" stroke="#aab1b8" stroke-width="3"/>' +
        '<rect x="150" y="90" width="108" height="94" fill="#d9dde1"/>' + rows +
        '<path d="M204 192v23M220 192v23M188 192v23" stroke="#e8772e" stroke-width="4"/>' +
        '<rect x="152" y="196" width="40" height="14" rx="2" fill="#fff" opacity=".9"/>' +
        '<text x="172" y="207" text-anchor="middle" font-size="9" font-family="Arial,sans-serif" fill="#333">ЩР-1</text>' + mark;
    },
    plumbing: function () {
      return base({ back: "#bdb5a8" }) +
        '<path d="M110 70v130M126 70v130" stroke="#f3f3f0" stroke-width="7"/>' +
        '<path d="M110 70v130" stroke="#d64545" stroke-width="2" stroke-dasharray="10 14"/>' +
        '<path d="M126 70v130" stroke="#3a7bd5" stroke-width="2" stroke-dasharray="10 14"/>' +
        '<path d="M110 150H220V176M126 160H240V176" stroke="#f3f3f0" stroke-width="7" fill="none"/>' +
        '<rect x="208" y="170" width="20" height="12" rx="3" fill="#c9a227"/><rect x="230" y="170" width="20" height="12" rx="3" fill="#c9a227"/>' +
        '<path d="M300 205H352L380 260" stroke="#9aa3ab" stroke-width="16" fill="none" stroke-linecap="round"/>' +
        '<rect x="250" y="96" width="44" height="80" rx="3" fill="#d7dade" stroke="#9aa3ab" stroke-width="3"/>' +
        '<path d="M258 110h28M258 124h28M258 138h28" stroke="#9aa3ab" stroke-width="3"/>' + mark;
    },
    pressure: function () {
      return base({ back: "#bdb5a8" }) +
        '<path d="M90 170H320" stroke="#f3f3f0" stroke-width="9"/>' +
        '<path d="M200 170V140" stroke="#f3f3f0" stroke-width="9"/>' +
        '<circle cx="200" cy="112" r="34" fill="#f7f7f5" stroke="#596270" stroke-width="5"/>' +
        '<path d="M178 126a26 26 0 1 1 44 0" stroke="#d6dbe0" stroke-width="5" fill="none"/>' +
        '<path d="M200 112 222 96" stroke="#d64545" stroke-width="4" stroke-linecap="round"/>' +
        '<circle cx="200" cy="112" r="4" fill="#333"/>' +
        '<text x="200" y="136" text-anchor="middle" font-size="9" font-family="Arial,sans-serif" fill="#333">бар</text>' +
        '<rect x="120" y="230" width="70" height="40" rx="6" fill="#d64545"/><rect x="132" y="220" width="10" height="12" fill="#555"/>' + mark;
    },
    plaster: function () {
      return base() + win +
        '<path d="M90 60h78v155H90z" fill="#e7e2d8"/>' +
        '<path d="M110 60v155M136 60v155M262 60v155M288 60v155" stroke="#9aa3ad" stroke-width="3"/>' +
        '<path d="M20 20 70 52v120L20 230z" fill="#ddd7cc" opacity=".9"/>' +
        '<rect x="300" y="236" width="56" height="34" rx="4" fill="#e9e4d6"/><text x="328" y="257" text-anchor="middle" font-size="9" font-family="Arial,sans-serif" fill="#7a6f5c">ГИПС</text>' +
        '<rect x="220" y="238" width="60" height="8" rx="2" fill="#b7bcc2" transform="rotate(-8 250 242)"/>' + mark;
    },
    plaster2: function () {
      return base({ back: "#e6e1d7", left: "#d6d0c5", right: "#dcd6cb" }) + win +
        '<path d="M60 296 120 240h150l40 56z" fill="#9a9387" opacity=".5"/>' +
        '<rect x="96" y="236" width="40" height="40" rx="4" fill="#e9e4d6"/>' + mark;
    },
    screed: function () {
      return base({ back: "#e2ddd3", left: "#d3cdc2", right: "#d9d3c8", floor: "#bfb9ae" }) +
        '<path d="M40 280 110 222M150 290 170 222M262 290 238 222M360 280 292 222" stroke="#9aa3ad" stroke-width="3"/>' +
        '<polygon points="200,300 220,258 330,258 380,300" fill="#cfcac1"/>' +
        '<rect x="60" y="232" width="46" height="32" rx="4" fill="#e9e4d6"/><text x="83" y="252" text-anchor="middle" font-size="8" font-family="Arial,sans-serif" fill="#7a6f5c">СТЯЖКА</text>' +
        '<rect x="150" y="262" width="90" height="8" rx="2" fill="#2f9e44" transform="rotate(-4 195 266)"/><rect x="190" y="263" width="10" height="5" fill="#ffd43b"/>' + mark;
    },
    tile: function () {
      var t = "";
      for (var y = 60; y < 215; y += 22) for (var x = 90; x < 310; x += 31) t += '<rect x="' + (x + 1) + '" y="' + (y + 1) + '" width="29" height="20" fill="#f4f1ea"/>';
      return base({ back: "#c9c4bb" }) + t + mark;
    }
  };

  window.demoArt = function (kind) {
    var fn = ART[kind] || ART.plaster;
    return '<svg viewBox="0 0 400 300" role="img" aria-label="Условная иллюстрация этапа (демо)" preserveAspectRatio="xMidYMid slice">' + fn() + "</svg>";
  };
})();
