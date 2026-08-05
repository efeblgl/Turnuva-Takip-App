/**
 * Açılış ekranının arka plan "hero" öğesi: büyük, metalik gümüş kupa.
 *
 * Saf SVG'dir (yeni bağımlılık veya raster görsel yok), hook içermez —
 * sunucu bileşeni olarak da render edilir. Kupa gövdesine "ŞAMPİYON"
 * kabartma etkisiyle işlenmiştir (koyu gövde + 1px açık üst kopya).
 *
 * Ölçek: yükseklik viewport'a göre verilir, genişlik `max-w` ile sınırlanır;
 * böylece hem masaüstünde hem dar mobil ekranlarda TAŞMADAN ortalanır
 * (preserveAspectRatio varsayılanı "xMidYMid meet" içeri sığdırır).
 */
export function TrophyBackdrop() {
  return (
    <div
      className="splash-trophy pointer-events-none absolute inset-0 flex items-center justify-center px-[2vw] py-[5vh] sm:py-[7vh]"
      aria-hidden="true"
    >
      {/*
        Mobil: yükseklikle ölçeklenir; kulp uçlarının en fazla ~%8'i her iki
        yandan SİMETRİK olarak kırpılabilir (`.splash` overflow-hidden) —
        böylece dar ekranda kupa cılız kalmaz. Kase ve yazı asla kırpılmaz.
        sm ve üzeri: kutunun tamamına sığdırılır (preserveAspectRatio "meet"),
        hiç kırpılma olmaz.
      */}
      <svg
        viewBox="0 0 1000 1040"
        role="presentation"
        className="h-[62vh] w-auto shrink-0 drop-shadow-[0_18px_40px_rgba(15,23,42,0.14)] sm:h-full sm:w-full"
      >
        <defs>
          {/* Krom bantlaması: açık/koyu şeritler metalik yansıma hissi verir */}
          <linearGradient id="ky-cup-body" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#6f7883" />
            <stop offset="7%" stopColor="#aab2bc" />
            <stop offset="15%" stopColor="#ffffff" />
            <stop offset="25%" stopColor="#98a1ac" />
            <stop offset="35%" stopColor="#eef2f6" />
            <stop offset="45%" stopColor="#c2cad3" />
            <stop offset="55%" stopColor="#ffffff" />
            <stop offset="66%" stopColor="#8b939e" />
            <stop offset="77%" stopColor="#dde2e8" />
            <stop offset="89%" stopColor="#a2aab4" />
            <stop offset="100%" stopColor="#69727d" />
          </linearGradient>

          <linearGradient id="ky-cup-rim" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#6b747f" />
            <stop offset="14%" stopColor="#eef2f6" />
            <stop offset="30%" stopColor="#9aa3ad" />
            <stop offset="48%" stopColor="#ffffff" />
            <stop offset="66%" stopColor="#8e97a1" />
            <stop offset="84%" stopColor="#e2e7ec" />
            <stop offset="100%" stopColor="#646d78" />
          </linearGradient>

          <radialGradient id="ky-cup-mouth" cx="50%" cy="42%" r="62%">
            <stop offset="0%" stopColor="#4e5761" />
            <stop offset="55%" stopColor="#6d7681" />
            <stop offset="100%" stopColor="#9aa3ad" />
          </radialGradient>

          <linearGradient id="ky-cup-handle" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="28%" stopColor="#aeb6c0" />
            <stop offset="52%" stopColor="#f4f7fa" />
            <stop offset="76%" stopColor="#98a0aa" />
            <stop offset="100%" stopColor="#727b86" />
          </linearGradient>

          <linearGradient id="ky-cup-base" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#6f7883" />
            <stop offset="18%" stopColor="#e9eef3" />
            <stop offset="40%" stopColor="#a5adb7" />
            <stop offset="62%" stopColor="#ffffff" />
            <stop offset="82%" stopColor="#9ba3ad" />
            <stop offset="100%" stopColor="#69727d" />
          </linearGradient>
        </defs>

        {/* Zemin gölgesi */}
        <ellipse cx="500" cy="1006" rx="228" ry="20" fill="#0f172a" opacity="0.10" />

        {/* Kulplar (sol çizilir, sağ aynalanır) */}
        <g
          fill="none"
          stroke="url(#ky-cup-handle)"
          strokeWidth="38"
          strokeLinecap="round"
        >
          <path d="M 306,250 C 178,204 88,270 92,378 C 96,496 212,586 344,654" />
          <path d="M 306,250 C 268,202 206,194 182,238 C 160,278 194,316 232,300" strokeWidth="30" />
        </g>
        <g
          fill="none"
          stroke="url(#ky-cup-handle)"
          strokeWidth="38"
          strokeLinecap="round"
          transform="translate(1000,0) scale(-1,1)"
        >
          <path d="M 306,250 C 178,204 88,270 92,378 C 96,496 212,586 344,654" />
          <path d="M 306,250 C 268,202 206,194 182,238 C 160,278 194,316 232,300" strokeWidth="30" />
        </g>

        {/* Kase gövdesi */}
        <path
          d="M 276,214 C 276,500 322,652 430,726 L 570,726 C 678,652 724,500 724,214 Z"
          fill="url(#ky-cup-body)"
          stroke="#79828d"
          strokeWidth="2"
          strokeOpacity="0.55"
        />

        {/* Gövde üzerinde ince dekoratif kavisler (referanstaki yaprak hattı) */}
        <path
          d="M 352,300 C 372,470 420,596 500,672"
          fill="none"
          stroke="#ffffff"
          strokeWidth="6"
          opacity="0.5"
        />
        <path
          d="M 648,300 C 628,470 580,596 500,672"
          fill="none"
          stroke="#8f97a1"
          strokeWidth="5"
          opacity="0.35"
        />

        {/* Ağız kenarı (rim) */}
        <rect x="272" y="168" width="456" height="46" fill="url(#ky-cup-rim)" />
        <ellipse cx="500" cy="214" rx="228" ry="34" fill="url(#ky-cup-rim)" />
        <ellipse cx="500" cy="168" rx="228" ry="34" fill="url(#ky-cup-mouth)" />
        <ellipse cx="500" cy="168" rx="228" ry="34" fill="none" stroke="#ffffff" strokeWidth="4" opacity="0.75" />
        <path d="M 276,232 H 724" stroke="#7c848e" strokeWidth="3" opacity="0.35" />

        {/* Kabartma "ŞAMPİYON" yazısı: koyu gövde + 2px yukarı açık kopya */}
        <g
          textAnchor="middle"
          fontFamily="Georgia, 'Times New Roman', serif"
          fontSize="96"
          letterSpacing="10"
        >
          <text x="500" y="386" fill="#ffffff" opacity="0.85">ŞAMPİYON</text>
          <text x="500" y="390" fill="#78808b" opacity="0.95">ŞAMPİYON</text>
        </g>
        <path d="M 356,432 H 644" stroke="#78808b" strokeWidth="3" opacity="0.5" />
        <path d="M 356,428 H 644" stroke="#ffffff" strokeWidth="3" opacity="0.7" />

        {/* Boyun, topuz ve kaide */}
        <ellipse cx="500" cy="726" rx="74" ry="16" fill="url(#ky-cup-base)" />
        <path d="M 470,730 C 466,766 462,788 452,808 L 548,808 C 538,788 534,766 530,730 Z" fill="url(#ky-cup-base)" />
        <ellipse cx="500" cy="822" rx="58" ry="26" fill="url(#ky-cup-base)" />
        <rect x="476" y="840" width="48" height="44" fill="url(#ky-cup-base)" />
        <path d="M 424,884 C 424,906 410,918 394,926 L 606,926 C 590,918 576,906 576,884 Z" fill="url(#ky-cup-base)" />
        <rect x="372" y="926" width="256" height="34" rx="10" fill="url(#ky-cup-base)" />
        <rect x="344" y="960" width="312" height="40" rx="12" fill="url(#ky-cup-base)" />
      </svg>
    </div>
  );
}
