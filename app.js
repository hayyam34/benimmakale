/**
 * Kişisel Makale & Proje Web Sitesi — Vanilla JavaScript Uygulama Mantığı
 * Özellikler: 4 Tema Seçimi (Varsayılan: Yeşil), Hash Routing, Vikipedi Görünüm Paneli,
 * Türkçe Sesli Okuma (Web Speech API), Hashtag Filtreleme, Kaynaklar ve Çevrimdışı Karekodlar.
 */

(function () {
  'use strict';

  /** Tema tanımları (kullanıcı değiştirmediği sürece varsayılan: green) */
  const THEMES = {
    green: '#0B1911',
    dark: '#090A0D',
    light: '#F6F8F7',
    gray: '#222428'
  };

  /** Uygulama durumu */
  const state = {
    data: null,
    categoriesById: new Map(),
    articlesBySlug: new Map(),
    qrRegistry: [],
    qrDrawerOpen: false,
    activeQrBlobUrl: null,
    readerPrefs: {
      textSize: 'standard',
      width: 'standard'
    },
    speech: {
      supported: typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined',
      status: 'idle', // idle | playing | paused
      rate: 1,
      chunks: [],
      chunkIndex: 0,
      voices: [],
      sessionToken: 0
    }
  };

  /** Sık kullanılan SVG ikonları */
  const ICONS = {
    arrowLeft: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>',
    arrowRight: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>',
    github: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/></svg>',
    x: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 4l11.733 16h4.267l-11.733 -16z"/><path d="M4 20l6.768 -6.768m2.46 -2.46l6.772 -6.772"/></svg>',
    youtube: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"/><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"/></svg>',
    linkedin: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>',
    link: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>',
    qr: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 14h3v3h-3z"/><path d="M17 17h4v4h-4z"/><path d="M14 20h1"/><path d="M20 14h1"/></svg>',
    volume: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>',
    pause: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>',
    stop: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="5" width="14" height="14" rx="2"/></svg>'
  };

  /** HTML enjeksiyonunu önlemek için metin kaçış fonksiyonu */
  function escapeHtml(value) {
    if (value === null || value === undefined) return '';
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /** Güvenli URL kontrolü */
  function sanitizeUrl(url) {
    if (!url || typeof url !== 'string') return '#';
    const trimmed = url.trim();
    if (
      trimmed.startsWith('https://') ||
      trimmed.startsWith('http://') ||
      trimmed.startsWith('mailto:') ||
      trimmed.startsWith('assets/') ||
      trimmed.startsWith('./') ||
      trimmed.startsWith('/') ||
      trimmed.startsWith('#')
    ) {
      return trimmed;
    }
    return '#';
  }

  /** Panoya metin kopyalama yardımcısı */
  async function copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (_) {
      const tempInput = document.createElement('textarea');
      tempInput.value = text;
      tempInput.setAttribute('readonly', '');
      tempInput.style.position = 'absolute';
      tempInput.style.left = '-9999px';
      document.body.appendChild(tempInput);
      tempInput.select();
      let copied = false;
      try {
        copied = document.execCommand('copy');
      } catch (e) {
        copied = false;
      }
      document.body.removeChild(tempInput);
      return copied;
    }
  }

  /** Makaleleri 'date' (YYYY-MM-DD) alanına göre yeniden eskiye sıralar */
  function sortByDateDesc(articles) {
    return [...articles].sort((a, b) => {
      const dateA = String(a.date || '');
      const dateB = String(b.date || '');
      return dateB.localeCompare(dateA);
    });
  }

  /** YYYY-MM-DD formatını okunabilir Türkçe tarihe çevirir */
  function formatDateTR(dateStr) {
    if (!dateStr) return '';
    const parts = String(dateStr).split('-');
    if (parts.length !== 3) return escapeHtml(dateStr);

    const year = Number(parts[0]);
    const month = Number(parts[1]) - 1;
    const day = Number(parts[2]);
    const dateObj = new Date(Date.UTC(year, month, day));

    if (Number.isNaN(dateObj.getTime())) return escapeHtml(dateStr);

    return new Intl.DateTimeFormat('tr-TR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC'
    }).format(dateObj);
  }

  /** YouTube video ID ayrıştırıcı */
  function extractYouTubeId(input) {
    if (!input || typeof input !== 'string') return null;
    const trimmed = input.trim();

    if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
      return trimmed;
    }

    try {
      const parsed = new URL(trimmed);
      if (parsed.hostname.includes('youtu.be')) {
        const id = parsed.pathname.replace('/', '').split('/')[0];
        return /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
      }
      if (parsed.hostname.includes('youtube.com') || parsed.hostname.includes('youtube-nocookie.com')) {
        if (parsed.searchParams.has('v')) {
          const id = parsed.searchParams.get('v');
          return /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
        }
        const match = parsed.pathname.match(/\/(?:embed|shorts|live)\/([a-zA-Z0-9_-]{11})/);
        if (match) return match[1];
      }
    } catch (_) {
      return null;
    }

    return null;
  }

  /* ========================================================================
     Tema Yönetimi (Varsayılan: Yeşil)
     ======================================================================== */

  function applyTheme(themeKey, persist) {
    const validTheme = THEMES[themeKey] ? themeKey : 'green';
    document.documentElement.dataset.theme = validTheme;

    const meta = document.getElementById('meta-theme-color');
    if (meta) {
      meta.setAttribute('content', THEMES[validTheme]);
    }

    document.querySelectorAll('.theme-btn').forEach((btn) => {
      const isMatch = btn.getAttribute('data-theme-choice') === validTheme;
      btn.classList.toggle('is-active', isMatch);
      btn.setAttribute('aria-pressed', isMatch ? 'true' : 'false');
    });

    if (persist) {
      try {
        localStorage.setItem('site-theme', validTheme);
      } catch (_) {}
    }
  }

  function initThemeSwitcher() {
    let initialTheme = 'green';
    try {
      const saved = localStorage.getItem('site-theme');
      if (saved && THEMES[saved]) initialTheme = saved;
    } catch (_) {}

    applyTheme(initialTheme, false);

    const switcher = document.getElementById('theme-switcher');
    if (!switcher) return;

    switcher.addEventListener('click', (event) => {
      const btn = event.target.closest('[data-theme-choice]');
      if (!btn) return;
      const choice = btn.getAttribute('data-theme-choice');
      applyTheme(choice, true);
    });
  }

  /* ========================================================================
     Vikipedi Tarzı Görünüm Tercihleri (Metin Boyutu & Genişlik)
     ======================================================================== */

  function initReaderPrefs() {
    let savedSize = 'standard';
    let savedWidth = 'standard';
    try {
      const s = localStorage.getItem('reader-text-size');
      const w = localStorage.getItem('reader-width');
      if (s === 'small' || s === 'standard' || s === 'large') savedSize = s;
      if (w === 'standard' || w === 'wide') savedWidth = w;
    } catch (_) {}

    applyReaderPrefs(savedSize, savedWidth, false);
  }

  function applyReaderPrefs(textSize, width, persist) {
    if (textSize === 'small' || textSize === 'standard' || textSize === 'large') {
      state.readerPrefs.textSize = textSize;
      document.documentElement.dataset.textSize = textSize;
    }
    if (width === 'standard' || width === 'wide') {
      state.readerPrefs.width = width;
      document.documentElement.dataset.readerWidth = width;
    }

    if (persist) {
      try {
        localStorage.setItem('reader-text-size', state.readerPrefs.textSize);
        localStorage.setItem('reader-width', state.readerPrefs.width);
      } catch (_) {}
    }
  }

  function bindAppearancePanel() {
    const panel = document.getElementById('appearance-panel');
    if (!panel) return;

    const toggleBtn = document.getElementById('appearance-mobile-toggle');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        const isOpen = panel.classList.toggle('is-open');
        toggleBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      });
    }

    panel.querySelectorAll('input[name="reader-text-size"]').forEach((radio) => {
      radio.addEventListener('change', () => {
        if (radio.checked) {
          applyReaderPrefs(radio.value, state.readerPrefs.width, true);
        }
      });
    });

    panel.querySelectorAll('input[name="reader-width"]').forEach((radio) => {
      radio.addEventListener('change', () => {
        if (radio.checked) {
          applyReaderPrefs(state.readerPrefs.textSize, radio.value, true);
        }
      });
    });
  }

  /* ========================================================================
     Sesli Dinleme Motoru (Web Speech API - Parçalı Türkçe Okuma)
     ======================================================================== */

  function refreshVoices() {
    if (!state.speech.supported) return;
    const list = window.speechSynthesis.getVoices();
    if (list && list.length > 0) {
      state.speech.voices = list;
    }
  }

  function pickTurkishVoice() {
    refreshVoices();
    const voices = state.speech.voices || [];
    return (
      voices.find((v) => v.lang && v.lang.toLowerCase() === 'tr-tr') ||
      voices.find((v) => v.lang && v.lang.toLowerCase().startsWith('tr')) ||
      null
    );
  }

  /** Makale metnini tarayıcı sentezleyicisinin takılmaması için 220 karakterlik cümle parçalarına böler */
  function buildSpeechChunks(article) {
    const rawSections = [];
    if (article.title) rawSections.push(article.title);
    if (article.summary) rawSections.push(article.summary);

    (article.blocks || []).forEach((block) => {
      if ((block.type === 'heading' || block.type === 'paragraph') && block.text) {
        rawSections.push(block.text);
      }
    });

    const chunks = [];
    rawSections.forEach((section) => {
      const cleaned = String(section).replace(/\s+/g, ' ').trim();
      if (!cleaned) return;
      const sentences = cleaned.match(/[^.!?]+[.!?…]*(?:\s+|$)/g) || [cleaned];
      let current = '';

      sentences.forEach((sentence) => {
        const piece = sentence.trim();
        if (!piece) return;

        if (piece.length > 220) {
          if (current) {
            chunks.push(current.trim());
            current = '';
          }
          const words = piece.split(' ');
          let line = '';
          words.forEach((word) => {
            if ((line + ' ' + word).trim().length > 210) {
              if (line) chunks.push(line.trim());
              line = word;
            } else {
              line = (line + ' ' + word).trim();
            }
          });
          if (line) chunks.push(line.trim());
        } else if ((current + ' ' + piece).trim().length > 220) {
          if (current) chunks.push(current.trim());
          current = piece;
        } else {
          current = (current + ' ' + piece).trim();
        }
      });

      if (current) chunks.push(current.trim());
    });

    return chunks;
  }

  function updateAudioUi() {
    const playBtn = document.getElementById('audio-play-btn');
    const stopBtn = document.getElementById('audio-stop-btn');
    const statusEl = document.getElementById('audio-status-text');
    if (!playBtn || !statusEl) return;

    if (!state.speech.supported) {
      playBtn.disabled = true;
      playBtn.innerHTML = `${ICONS.volume}<span>Sesli Okuma Desteklenmiyor</span>`;
      if (stopBtn) stopBtn.hidden = true;
      statusEl.textContent = 'Bu tarayıcı yerleşik sesli okuma (Web Speech API) özelliğini desteklemiyor.';
      return;
    }

    const total = state.speech.chunks.length;
    const current = Math.min(state.speech.chunkIndex + 1, total);

    if (state.speech.status === 'playing') {
      playBtn.innerHTML = `${ICONS.pause}<span>Duraklat</span>`;
      if (stopBtn) stopBtn.hidden = false;
      statusEl.textContent = `Okunuyor (${current} / ${total} bölüm) • Hız: ${state.speech.rate}x`;
    } else if (state.speech.status === 'paused') {
      playBtn.innerHTML = `${ICONS.volume}<span>Devam Et</span>`;
      if (stopBtn) stopBtn.hidden = false;
      statusEl.textContent = `Duraklatıldı (${current} / ${total} bölüm)`;
    } else {
      playBtn.innerHTML = `${ICONS.volume}<span>Makaleyi Sesli Dinle</span>`;
      if (stopBtn) stopBtn.hidden = true;
      statusEl.textContent = `Makaleyi tarayıcınızın ses motoruyla dinlemeye hazır (${total} bölüm).`;
    }

    document.querySelectorAll('.audio-speed-btn').forEach((btn) => {
      const rate = Number(btn.getAttribute('data-speech-rate'));
      btn.classList.toggle('is-active', rate === state.speech.rate);
    });
  }

  function speakChunkAt(index) {
    if (!state.speech.supported) return;
    if (index >= state.speech.chunks.length) {
      stopArticleSpeech();
      const statusEl = document.getElementById('audio-status-text');
      if (statusEl) statusEl.textContent = 'Sesli okuma tamamlandı.';
      return;
    }

    const token = state.speech.sessionToken;
    state.speech.chunkIndex = index;
    state.speech.status = 'playing';
    updateAudioUi();

    const utterance = new SpeechSynthesisUtterance(state.speech.chunks[index]);
    utterance.lang = 'tr-TR';
    utterance.rate = state.speech.rate;
    const trVoice = pickTurkishVoice();
    if (trVoice) utterance.voice = trVoice;

    utterance.onend = () => {
      if (token !== state.speech.sessionToken || state.speech.status !== 'playing') return;
      speakChunkAt(index + 1);
    };

    utterance.onerror = () => {
      if (token !== state.speech.sessionToken) return;
      stopArticleSpeech();
    };

    window.speechSynthesis.speak(utterance);
  }

  function stopArticleSpeech() {
    state.speech.sessionToken += 1;
    state.speech.status = 'idle';
    state.speech.chunkIndex = 0;
    if (state.speech.supported) {
      try {
        window.speechSynthesis.cancel();
      } catch (_) {}
    }
    updateAudioUi();
  }

  function bindArticleAudioControls(article) {
    stopArticleSpeech();
    state.speech.chunks = buildSpeechChunks(article);
    updateAudioUi();

    const playBtn = document.getElementById('audio-play-btn');
    const stopBtn = document.getElementById('audio-stop-btn');

    if (playBtn && state.speech.supported) {
      playBtn.addEventListener('click', () => {
        if (state.speech.chunks.length === 0) return;

        if (state.speech.status === 'idle') {
          window.speechSynthesis.cancel();
          state.speech.sessionToken += 1;
          speakChunkAt(0);
        } else if (state.speech.status === 'playing') {
          state.speech.status = 'paused';
          window.speechSynthesis.pause();
          updateAudioUi();
        } else if (state.speech.status === 'paused') {
          state.speech.status = 'playing';
          window.speechSynthesis.resume();
          updateAudioUi();
        }
      });
    }

    if (stopBtn) {
      stopBtn.addEventListener('click', stopArticleSpeech);
    }

    document.querySelectorAll('.audio-speed-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const newRate = Number(btn.getAttribute('data-speech-rate')) || 1;
        state.speech.rate = newRate;

        if (state.speech.supported && state.speech.status === 'playing') {
          const resumeIdx = state.speech.chunkIndex;
          state.speech.sessionToken += 1;
          window.speechSynthesis.cancel();
          speakChunkAt(resumeIdx);
        } else {
          updateAudioUi();
        }
      });
    });
  }

  /* ========================================================================
     Karekod (QR) Üretimi ve Büyütülebilir Modal
     ======================================================================== */

  function generateQrMarkup(qrItem, displaySize) {
    if (qrItem.qrImage) {
      return `<img src="${escapeHtml(sanitizeUrl(qrItem.qrImage))}" alt="${escapeHtml(qrItem.label)} Karekodu" width="${displaySize}" height="${displaySize}">`;
    }
    if (typeof window.QRCodeSVG !== 'undefined' && qrItem.qrValue) {
      try {
        return window.QRCodeSVG.generate(qrItem.qrValue, { size: displaySize, margin: 4 });
      } catch (err) {
        return `<span class="audio-status-text">QR oluşturulamadı</span>`;
      }
    }
    return '';
  }

  function openQrModal(qrId) {
    const item = state.qrRegistry[Number(qrId)];
    const modal = document.getElementById('qr-modal');
    const titleEl = document.getElementById('qr-modal-title');
    const bodyEl = document.getElementById('qr-modal-body');
    const valueEl = document.getElementById('qr-modal-value');
    const copyBtn = document.getElementById('qr-modal-copy');
    const downloadLink = document.getElementById('qr-modal-download');

    if (!item || !modal || !titleEl || !bodyEl || !valueEl) return;

    titleEl.textContent = `${item.label} Karekodu`;
    const svgMarkup = generateQrMarkup(item, 220);
    bodyEl.innerHTML = svgMarkup;
    valueEl.textContent = item.qrValue;

    if (copyBtn) {
      copyBtn.textContent = 'Kopyala';
      copyBtn.onclick = async () => {
        await copyToClipboard(item.qrValue);
        copyBtn.textContent = 'Kopyalandı!';
        setTimeout(() => {
          copyBtn.textContent = 'Kopyala';
        }, 1800);
      };
    }

    if (downloadLink) {
      if (state.activeQrBlobUrl) {
        URL.revokeObjectURL(state.activeQrBlobUrl);
        state.activeQrBlobUrl = null;
      }
      const safeName = String(item.label || 'karekod').toLowerCase().replace(/[^a-z0-9]+/gi, '-');
      if (item.qrImage) {
        downloadLink.href = sanitizeUrl(item.qrImage);
        downloadLink.download = `${safeName}.png`;
        downloadLink.textContent = 'Görseli İndir';
      } else {
        const blob = new Blob([svgMarkup], { type: 'image/svg+xml;charset=utf-8' });
        const objectUrl = URL.createObjectURL(blob);
        state.activeQrBlobUrl = objectUrl;
        downloadLink.href = objectUrl;
        downloadLink.download = `${safeName}-qr.svg`;
        downloadLink.textContent = 'SVG İndir';
      }
    }

    modal.hidden = false;
    document.body.style.overflow = 'hidden';
  }

  function closeQrModal() {
    const modal = document.getElementById('qr-modal');
    if (!modal || modal.hidden) return;
    modal.hidden = true;
    document.body.style.overflow = '';
  }

  function initQrModal() {
    const modal = document.getElementById('qr-modal');
    const closeBtn = document.getElementById('qr-modal-close');
    if (!modal) return;

    if (closeBtn) {
      closeBtn.addEventListener('click', closeQrModal);
    }

    modal.addEventListener('click', (event) => {
      if (event.target.hasAttribute('data-qr-close')) {
        closeQrModal();
      }
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        closeQrModal();
      }
    });
  }

  /* ========================================================================
     Üst Başlık ve Alt Bilgi (Footer) Render İşlemleri
     ======================================================================== */

  function renderHeader(activeHash) {
    const site = state.data.site || {};
    const titleEl = document.getElementById('site-title-text');
    const subtitleEl = document.getElementById('site-subtitle');
    const navEl = document.getElementById('site-nav');

    if (titleEl) titleEl.textContent = site.title || 'Kişisel Arşiv';
    if (subtitleEl) subtitleEl.textContent = site.subtitle || '';

    if (navEl) {
      const isHome = activeHash === '' || activeHash === '#' || activeHash === '#/';
      const navItems = [
        `<a href="#/" class="nav-link ${isHome ? 'is-active' : ''}">Ana Sayfa</a>`
      ];

      (state.data.categories || []).forEach((cat) => {
        const isCatActive = activeHash === `#kategori/${cat.id}`;
        navItems.push(
          `<a href="#kategori/${encodeURIComponent(cat.id)}" class="nav-link ${isCatActive ? 'is-active' : ''}">${escapeHtml(cat.title)}</a>`
        );
      });

      navEl.innerHTML = navItems.join('');
    }
  }

  function renderFooter() {
    const footerEl = document.getElementById('site-footer');
    if (!footerEl || !state.data) return;

    const footerData = state.data.footer || {};
    const siteData = state.data.site || {};
    state.qrRegistry = [];

    const socialsHtml = (footerData.socials || [])
      .map((item) => {
        const iconSvg = ICONS[item.icon] || ICONS.link;
        const label = item.label || item.platform;
        const qrEnabled = item.qr !== false && (item.qrValue || item.url || item.qrImage);
        let qrBtnHtml = '';

        if (qrEnabled) {
          const qrIdx = state.qrRegistry.push({
            label: label,
            qrValue: item.qrValue || item.url,
            qrImage: item.qrImage || ''
          }) - 1;
          qrBtnHtml = `
            <button type="button" class="qr-inline-btn" data-open-qr="${qrIdx}" title="${escapeHtml(label)} Karekodunu Göster" aria-label="${escapeHtml(label)} Karekodunu Göster">
              ${ICONS.qr}
            </button>
          `;
        }

        return `
          <div class="social-chip-group">
            <a href="${escapeHtml(sanitizeUrl(item.url))}" class="social-pill" target="_blank" rel="noopener noreferrer">
              ${iconSvg}
              <span>${escapeHtml(label)}</span>
            </a>
            ${qrBtnHtml}
          </div>
        `;
      })
      .join('');

    const contactHtml = (footerData.contact || [])
      .map((item, idx) => {
        const label = escapeHtml(item.label);
        const value = escapeHtml(item.value);
        const qrEnabled = item.qr === true || Boolean(item.qrValue || item.qrImage);
        let qrBtnHtml = '';

        if (qrEnabled) {
          const qrVal = item.qrValue || item.href || item.value;
          const qrIdx = state.qrRegistry.push({
            label: item.label,
            qrValue: qrVal,
            qrImage: item.qrImage || ''
          }) - 1;
          qrBtnHtml = `
            <button type="button" class="contact-qr-btn" data-open-qr="${qrIdx}" title="${label} Karekodunu Göster">
              ${ICONS.qr}
              <span>Karekod</span>
            </button>
          `;
        }

        if (item.copyable) {
          return `
            <li class="contact-item">
              <span class="contact-label">${label}</span>
              <div class="contact-actions-row">
                <button type="button" class="copy-btn" data-copy-index="${idx}" title="Panoya kopyalamak için tıklayın">
                  <span class="copy-btn-code">${value}</span>
                  <span class="copy-badge" id="copy-badge-${idx}">Kopyala</span>
                </button>
                ${qrBtnHtml}
              </div>
            </li>
          `;
        }

        if (item.href) {
          return `
            <li class="contact-item">
              <span class="contact-label">${label}</span>
              <div class="contact-actions-row">
                <a class="contact-value" href="${escapeHtml(sanitizeUrl(item.href))}">${value}</a>
                ${qrBtnHtml}
              </div>
            </li>
          `;
        }

        return `
          <li class="contact-item">
            <span class="contact-label">${label}</span>
            <div class="contact-actions-row">
              <span class="contact-value">${value}</span>
              ${qrBtnHtml}
            </div>
          </li>
        `;
      })
      .join('');

    const qrDrawerCardsHtml = state.qrRegistry
      .map((item, qrIdx) => {
        const svgMarkup = generateQrMarkup(item, 102);
        return `
          <button type="button" class="footer-qr-card" data-open-qr="${qrIdx}" title="Büyütmek için tıklayın">
            <div class="footer-qr-frame">${svgMarkup}</div>
            <span class="footer-qr-name">${escapeHtml(item.label)}</span>
            <span class="footer-qr-hint">Büyütmek için tıklayın</span>
          </button>
        `;
      })
      .join('');

    const hasQrItems = state.qrRegistry.length > 0;

    footerEl.innerHTML = `
      <div class="container">
        <div class="footer-grid">
          <div>
            <h2 class="footer-title">${escapeHtml(siteData.title || 'Arşiv')}</h2>
            <p class="footer-about">${escapeHtml(footerData.about || siteData.subtitle || '')}</p>
            ${
              hasQrItems
                ? `<button type="button" id="footer-qr-toggle" class="footer-qr-toggle" aria-expanded="${state.qrDrawerOpen ? 'true' : 'false'}">
                    ${ICONS.qr}
                    <span>${state.qrDrawerOpen ? 'Karekodları Gizle' : 'Tüm Karekodları Göster'}</span>
                  </button>`
                : ''
            }
          </div>
          <div>
            <h2 class="footer-title">Sosyal Medya</h2>
            <div class="footer-socials">${socialsHtml}</div>
          </div>
          <div>
            <h2 class="footer-title">İletişim &amp; Kanallar</h2>
            <ul class="footer-contact-list">${contactHtml}</ul>
          </div>
        </div>

        ${
          hasQrItems
            ? `<div id="footer-qr-drawer" class="footer-qr-drawer" ${state.qrDrawerOpen ? '' : 'hidden'}>
                <div class="footer-qr-grid">${qrDrawerCardsHtml}</div>
              </div>`
            : ''
        }

        <div class="footer-bottom">
          <span>${escapeHtml(siteData.copyright || '')}</span>
          <span>${escapeHtml(siteData.author || '')}</span>
        </div>
      </div>
    `;

    // Kopyalama butonları
    footerEl.querySelectorAll('.copy-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const index = Number(btn.getAttribute('data-copy-index'));
        const contactItem = (footerData.contact || [])[index];
        const badge = document.getElementById(`copy-badge-${index}`);
        if (!contactItem || !badge) return;

        await copyToClipboard(contactItem.value);
        badge.textContent = 'Kopyalandı!';
        setTimeout(() => {
          badge.textContent = 'Kopyala';
        }, 2000);
      });
    });

    // Tekil karekod açma butonları
    footerEl.querySelectorAll('[data-open-qr]').forEach((btn) => {
      btn.addEventListener('click', () => {
        openQrModal(btn.getAttribute('data-open-qr'));
      });
    });

    // Toplu karekod paneli aç/kapat
    const qrToggle = document.getElementById('footer-qr-toggle');
    const qrDrawer = document.getElementById('footer-qr-drawer');
    if (qrToggle && qrDrawer) {
      qrToggle.addEventListener('click', () => {
        state.qrDrawerOpen = !state.qrDrawerOpen;
        qrDrawer.hidden = !state.qrDrawerOpen;
        qrToggle.setAttribute('aria-expanded', state.qrDrawerOpen ? 'true' : 'false');
        const span = qrToggle.querySelector('span');
        if (span) {
          span.textContent = state.qrDrawerOpen ? 'Karekodları Gizle' : 'Tüm Karekodları Göster';
        }
      });
    }
  }

  /* ========================================================================
     Görünüm Render Fonksiyonları
     ======================================================================== */

  function createArticleCardHtml(article, showCategoryBadge) {
    const category = state.categoriesById.get(article.categoryId);
    const categoryTitle = category ? category.title : article.categoryId;
    const categoryUrl = `#kategori/${encodeURIComponent(article.categoryId)}`;
    const articleUrl = `#makale/${encodeURIComponent(article.slug)}`;

    const coverHtml = article.coverImage
      ? `
        <a href="${articleUrl}" class="article-card-media" tabindex="-1" aria-hidden="true">
          <img src="${escapeHtml(sanitizeUrl(article.coverImage))}" alt="${escapeHtml(article.coverAlt || article.title)}" loading="lazy">
        </a>
      `
      : '';

    const categoryBadgeHtml = showCategoryBadge
      ? `<a href="${categoryUrl}" class="meta-pill">${escapeHtml(categoryTitle)}</a>`
      : '';

    const readingTimeHtml = article.readingTime
      ? `<span>• ${escapeHtml(article.readingTime)}</span>`
      : '';

    return `
      <article class="article-card">
        ${coverHtml}
        <div class="article-card-body">
          <div class="article-meta-row">
            ${categoryBadgeHtml}
            <time datetime="${escapeHtml(article.date)}">${formatDateTR(article.date)}</time>
            ${readingTimeHtml}
          </div>
          <h3 class="article-card-title">
            <a href="${articleUrl}">${escapeHtml(article.title)}</a>
          </h3>
          <p class="article-card-summary">${escapeHtml(article.summary)}</p>
          <div class="article-card-footer">
            <a href="${articleUrl}" class="read-more-link">
              <span>Devamını Oku</span>
              ${ICONS.arrowRight}
            </a>
          </div>
        </div>
      </article>
    `;
  }

  /** Ana Sayfa: Üstte kategoriler zaten menüde olduğu için doğrudan giriş ve güncel yazılar gösterilir */
  function renderHomeView() {
    const site = state.data.site || {};
    const allArticles = sortByDateDesc(state.data.articles || []);

    document.title = site.title || 'Arşiv & Perspektif';

    const recentArticlesHtml = allArticles
      .map((article) => createArticleCardHtml(article, true))
      .join('');

    return `
      <div class="container">
        <section class="home-intro">
          <span class="home-intro-badge">Dijital Yayın &amp; Araştırma Arşivi</span>
          <h1 class="home-intro-title">${escapeHtml(site.subtitle || site.title)}</h1>
          <p class="home-intro-desc">${escapeHtml(site.author || '')} tarafından hazırlanan güncel makale ve proje dosyalarına aşağıdan veya üst menüdeki kategori başlıklarından ulaşabilirsiniz.</p>
        </section>

        <section aria-labelledby="recent-heading">
          <div class="section-heading-row">
            <h2 id="recent-heading" class="section-title">Son Eklenen Yazılar</h2>
            <span class="section-kicker">${allArticles.length} Makale • Yeniden eskiye sıralı</span>
          </div>
          <div class="recent-grid">
            ${recentArticlesHtml}
          </div>
        </section>
      </div>
    `;
  }

  /** Kategori Görünümü */
  function renderCategoryView(categoryId) {
    const category = state.categoriesById.get(categoryId);
    if (!category) {
      return renderNotFoundView(`"${categoryId}" kimliğine sahip bir kategori bulunamadı.`);
    }

    const siteTitle = (state.data.site && state.data.site.title) || 'Arşiv';
    document.title = `${category.title} | ${siteTitle}`;

    const filteredArticles = sortByDateDesc(
      (state.data.articles || []).filter((article) => article.categoryId === category.id)
    );

    const listContent =
      filteredArticles.length > 0
        ? `<div class="article-list-grid">${filteredArticles.map((art) => createArticleCardHtml(art, false)).join('')}</div>`
        : `
          <div class="status-panel">
            <h2>Henüz Makale Eklenmemiş</h2>
            <p>Bu kategoriye henüz içerik eklenmedi. <span class="code-inline">data/content.json</span> üzerinden yeni makaleler tanımlayabilirsiniz.</p>
          </div>
        `;

    return `
      <div class="container">
        <div class="view-nav-bar">
          <a href="#/" class="back-btn">
            ${ICONS.arrowLeft}
            <span>Ana Sayfaya Dön</span>
          </a>
        </div>

        <header class="category-hero">
          <h1 class="category-hero-title">${escapeHtml(category.title)}</h1>
          <p class="category-hero-desc">${escapeHtml(category.description)}</p>
          <div class="category-hero-stats">Toplam ${filteredArticles.length} makale • Tarihe göre yeniden eskiye sıralanmıştır</div>
        </header>

        ${listContent}
      </div>
    `;
  }

  /** Etiket (#hashtag) Görünümü */
  function renderTagView(tagQuery) {
    const normalizedTarget = tagQuery.toLocaleLowerCase('tr-TR');
    const siteTitle = (state.data.site && state.data.site.title) || 'Arşiv';
    document.title = `#${tagQuery} | ${siteTitle}`;

    const matchingArticles = sortByDateDesc(
      (state.data.articles || []).filter((article) =>
        (article.tags || []).some((t) => String(t).toLocaleLowerCase('tr-TR') === normalizedTarget)
      )
    );

    const listContent =
      matchingArticles.length > 0
        ? `<div class="article-list-grid">${matchingArticles.map((art) => createArticleCardHtml(art, true)).join('')}</div>`
        : `
          <div class="status-panel">
            <h2>Etikete Ait Yazı Bulunamadı</h2>
            <p><span class="code-inline">#${escapeHtml(tagQuery)}</span> etiketi ile eşleşen bir makale bulunamadı.</p>
          </div>
        `;

    return `
      <div class="container">
        <div class="view-nav-bar">
          <a href="#/" class="back-btn">
            ${ICONS.arrowLeft}
            <span>Ana Sayfaya Dön</span>
          </a>
        </div>

        <header class="category-hero">
          <h1 class="category-hero-title">#${escapeHtml(tagQuery)}</h1>
          <p class="category-hero-desc">Bu etiketle ilişkilendirilmiş tüm analiz ve proje dosyaları aşağıda yeniden eskiye doğru sıralanmaktadır.</p>
          <div class="category-hero-stats">${matchingArticles.length} makale listelendi</div>
        </header>

        ${listContent}
      </div>
    `;
  }

  /** Blok tabanlı makale içerik parçalarını HTML'e dönüştürür */
  function renderArticleBlock(block) {
    if (!block || !block.type) return '';

    switch (block.type) {
      case 'paragraph':
        return `<p class="block-paragraph">${escapeHtml(block.text)}</p>`;

      case 'heading': {
        const isSub = Number(block.level) === 3;
        const tag = isSub ? 'h3' : 'h2';
        const cls = isSub ? 'block-heading block-heading-sub' : 'block-heading';
        return `<${tag} class="${cls}">${escapeHtml(block.text)}</${tag}>`;
      }

      case 'image': {
        const captionHtml = block.caption
          ? `<figcaption class="block-caption">${escapeHtml(block.caption)}</figcaption>`
          : '';
        return `
          <figure class="block-image">
            <img src="${escapeHtml(sanitizeUrl(block.src))}" alt="${escapeHtml(block.alt || '')}" loading="lazy">
            ${captionHtml}
          </figure>
        `;
      }

      case 'youtube': {
        const ytId = extractYouTubeId(block.videoId);
        if (!ytId) {
          return `
            <div class="status-panel">
              <p>Geçersiz YouTube video bağlantısı veya ID'si.</p>
            </div>
          `;
        }
        const embedUrl = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(ytId)}`;
        const captionHtml = block.caption
          ? `<figcaption class="block-caption">${escapeHtml(block.caption)}</figcaption>`
          : '';
        return `
          <figure class="block-youtube">
            <div class="video-wrapper">
              <iframe
                src="${embedUrl}"
                title="${escapeHtml(block.caption || 'YouTube Video')}"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowfullscreen
                loading="lazy"
              ></iframe>
            </div>
            ${captionHtml}
          </figure>
        `;
      }

      default:
        return '';
    }
  }

  /** Vikipedi tarzı yan Görünüm Paneli HTML'i */
  function renderAppearancePanelHtml() {
    const size = state.readerPrefs.textSize;
    const width = state.readerPrefs.width;

    return `
      <aside id="appearance-panel" class="article-appearance-panel" aria-label="Görünüm ayarları">
        <button type="button" id="appearance-mobile-toggle" class="appearance-mobile-toggle" aria-expanded="false">
          <span>Görünüm (Metin &amp; Genişlik)</span>
          <span>▾</span>
        </button>

        <div class="appearance-desktop-header">
          <h2 class="appearance-title">Görünüm</h2>
          <span class="appearance-badge">Okuma</span>
        </div>

        <div class="appearance-body">
          <fieldset class="appearance-group">
            <legend class="appearance-group-label">Metin</legend>
            <div class="appearance-options">
              <label class="appearance-radio-label">
                <input type="radio" name="reader-text-size" value="small" ${size === 'small' ? 'checked' : ''}>
                <span>Küçük</span>
              </label>
              <label class="appearance-radio-label">
                <input type="radio" name="reader-text-size" value="standard" ${size === 'standard' ? 'checked' : ''}>
                <span>Ölçünlü</span>
              </label>
              <label class="appearance-radio-label">
                <input type="radio" name="reader-text-size" value="large" ${size === 'large' ? 'checked' : ''}>
                <span>Büyük</span>
              </label>
            </div>
          </fieldset>

          <fieldset class="appearance-group">
            <legend class="appearance-group-label">Genişlik</legend>
            <div class="appearance-options">
              <label class="appearance-radio-label">
                <input type="radio" name="reader-width" value="standard" ${width === 'standard' ? 'checked' : ''}>
                <span>Ölçünlü</span>
              </label>
              <label class="appearance-radio-label">
                <input type="radio" name="reader-width" value="wide" ${width === 'wide' ? 'checked' : ''}>
                <span>Geniş</span>
              </label>
            </div>
          </fieldset>
        </div>
      </aside>
    `;
  }

  /** Makale Detay Görünümü: Yan Görünüm Paneli + Sesli Dinleme + Hashtag + Kaynaklar */
  function renderArticleView(slug) {
    const article = state.articlesBySlug.get(slug);
    if (!article) {
      return renderNotFoundView(`"${slug}" adresine sahip bir makale bulunamadı.`);
    }

    const category = state.categoriesById.get(article.categoryId);
    const categoryTitle = category ? category.title : 'Kategori';
    const categoryHash = `#kategori/${encodeURIComponent(article.categoryId)}`;
    const siteTitle = (state.data.site && state.data.site.title) || 'Arşiv';

    document.title = `${article.title} | ${siteTitle}`;

    const coverHtml = article.coverImage
      ? `
        <figure class="article-cover">
          <img src="${escapeHtml(sanitizeUrl(article.coverImage))}" alt="${escapeHtml(article.coverAlt || article.title)}">
        </figure>
      `
      : '';

    const blocksHtml = (article.blocks || []).map(renderArticleBlock).join('');
    const readingTimeHtml = article.readingTime
      ? `<span>• ${escapeHtml(article.readingTime)}</span>`
      : '';

    const tags = Array.isArray(article.tags) ? article.tags : [];
    const hashtagsHtml =
      tags.length > 0
        ? `
          <section class="article-hashtags" aria-labelledby="tags-title">
            <h2 id="tags-title" class="article-subblock-title">
              <span>Etiketler</span>
              <span class="section-kicker">${tags.length} Etiket</span>
            </h2>
            <div class="hashtag-list">
              ${tags
                .map((tag) => {
                  const cleanTag = String(tag).replace(/^#+/, '').trim();
                  return `<a href="#etiket/${encodeURIComponent(cleanTag)}" class="hashtag-pill">#${escapeHtml(cleanTag)}</a>`;
                })
                .join('')}
            </div>
          </section>
        `
        : '';

    const references = Array.isArray(article.references) ? article.references : [];
    const referencesHtml =
      references.length > 0
        ? `
          <section class="article-references" aria-labelledby="references-title">
            <h2 id="references-title" class="article-subblock-title">
              <span>Kaynaklar</span>
              <span class="section-kicker">${references.length} Kaynak</span>
            </h2>
            <ol class="article-references-list">
              ${references
                .map((ref) => {
                  const title = escapeHtml(ref.title || ref.url || 'Kaynak');
                  const noteHtml = ref.note
                    ? `<span class="reference-note">${escapeHtml(ref.note)}</span>`
                    : '';
                  const titleNode = ref.url
                    ? `<a href="${escapeHtml(sanitizeUrl(ref.url))}" class="reference-link" target="_blank" rel="noopener noreferrer">${title} ↗</a>`
                    : `<span class="reference-title-text">${title}</span>`;
                  return `<li class="article-references-item">${titleNode}${noteHtml}</li>`;
                })
                .join('')}
            </ol>
          </section>
        `
        : '';

    return `
      <div class="container article-page-container">
        <div class="view-nav-bar">
          <a href="${categoryHash}" class="back-btn">
            ${ICONS.arrowLeft}
            <span>${escapeHtml(categoryTitle)}</span>
          </a>
          <a href="#/" class="back-btn">Ana Sayfa</a>
        </div>

        <div class="article-layout">
          <article class="article-reader">
            <header class="article-header">
              <div class="article-meta-row">
                <a href="${categoryHash}" class="meta-pill">${escapeHtml(categoryTitle)}</a>
                <time datetime="${escapeHtml(article.date)}">${formatDateTR(article.date)}</time>
                ${readingTimeHtml}
              </div>
              <h1 class="article-title">${escapeHtml(article.title)}</h1>
              <p class="article-lead">${escapeHtml(article.summary)}</p>
            </header>

            ${coverHtml}

            <div class="article-content">
              ${blocksHtml}
            </div>

            <!-- Makale Altı Sesli Dinleme Paneli -->
            <section class="article-audio-bar" aria-label="Makaleyi sesli dinle">
              <div class="audio-controls-row">
                <div class="audio-primary-actions">
                  <button type="button" id="audio-play-btn" class="audio-play-btn">
                    ${ICONS.volume}
                    <span>Makaleyi Sesli Dinle</span>
                  </button>
                  <button type="button" id="audio-stop-btn" class="audio-stop-btn" hidden>
                    ${ICONS.stop}
                    <span>Durdur</span>
                  </button>
                </div>

                <div class="audio-speed-group" role="group" aria-label="Okuma hızı">
                  <button type="button" class="audio-speed-btn" data-speech-rate="0.85">0.85x</button>
                  <button type="button" class="audio-speed-btn is-active" data-speech-rate="1">1x</button>
                  <button type="button" class="audio-speed-btn" data-speech-rate="1.25">1.25x</button>
                  <button type="button" class="audio-speed-btn" data-speech-rate="1.5">1.5x</button>
                </div>
              </div>
              <p id="audio-status-text" class="audio-status-text">Hazır</p>
            </section>

            ${hashtagsHtml}
            ${referencesHtml}

            <nav class="article-end-nav" aria-label="Makale sonu gezinme">
              <a href="${categoryHash}" class="back-btn">
                ${ICONS.arrowLeft}
                <span>${escapeHtml(categoryTitle)} Kategorisine Dön</span>
              </a>
              <a href="#/" class="back-btn">Ana Sayfa</a>
            </nav>
          </article>

          ${renderAppearancePanelHtml()}
        </div>
      </div>
    `;
  }

  /** Geçersiz rota / 404 görünümü */
  function renderNotFoundView(message) {
    const siteTitle = (state.data && state.data.site && state.data.site.title) || 'Arşiv';
    document.title = `Sayfa Bulunamadı | ${siteTitle}`;

    return `
      <div class="container">
        <div class="status-panel">
          <h2>İçerik Bulunamadı</h2>
          <p>${escapeHtml(message || 'Aradığınız sayfa kaldırılmış veya bağlantı adresi hatalı olabilir.')}</p>
          <a href="#/" class="back-btn">
            ${ICONS.arrowLeft}
            <span>Ana Sayfaya Dön</span>
          </a>
        </div>
      </div>
    `;
  }

  /** Hash Router */
  function handleRoute() {
    if (!state.data) return;

    stopArticleSpeech();

    const appRoot = document.getElementById('app-root');
    if (!appRoot) return;

    const rawHash = window.location.hash || '#/';
    const normalizedHash = rawHash === '#' ? '#/' : rawHash;

    renderHeader(normalizedHash);

    let viewHtml = '';
    let activeArticle = null;

    if (normalizedHash === '#/' || normalizedHash === '') {
      viewHtml = renderHomeView();
    } else if (normalizedHash.startsWith('#kategori/')) {
      const catId = decodeURIComponent(normalizedHash.slice('#kategori/'.length));
      viewHtml = renderCategoryView(catId);
    } else if (normalizedHash.startsWith('#etiket/')) {
      const tagName = decodeURIComponent(normalizedHash.slice('#etiket/'.length));
      viewHtml = renderTagView(tagName);
    } else if (normalizedHash.startsWith('#makale/')) {
      const slug = decodeURIComponent(normalizedHash.slice('#makale/'.length));
      activeArticle = state.articlesBySlug.get(slug) || null;
      viewHtml = renderArticleView(slug);
    } else {
      viewHtml = renderNotFoundView('Geçersiz rota adresi.');
    }

    appRoot.innerHTML = viewHtml;

    if (activeArticle) {
      bindAppearancePanel();
      bindArticleAudioControls(activeArticle);
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /** Veri yükleme hatası */
  function renderLoadError(error) {
    const appRoot = document.getElementById('app-root');
    if (!appRoot) return;

    const isFileProtocol = window.location.protocol === 'file:';
    const hintHtml = isFileProtocol
      ? `<p>Tarayıcı güvenlik kısıtlamaları nedeniyle JSON dosyası <span class="code-inline">file://</span> üzerinden doğrudan okunamaz. Lütfen proje klasöründe <span class="code-inline">python -m http.server 8000</span> veya VS Code Live Server başlatın.</p>`
      : `<p><span class="code-inline">data/content.json</span> dosyası yüklenirken bir hata oluştu: ${escapeHtml(error.message)}</p>`;

    appRoot.innerHTML = `
      <div class="container">
        <div class="status-panel" role="alert">
          <h2>Veri Yüklenemedi</h2>
          ${hintHtml}
        </div>
      </div>
    `;
  }

  /** Uygulama başlatıcı */
  async function initApp() {
    initThemeSwitcher();
    initReaderPrefs();
    initQrModal();

    if (state.speech.supported && typeof window.speechSynthesis.onvoiceschanged !== 'undefined') {
      window.speechSynthesis.addEventListener('voiceschanged', refreshVoices);
      refreshVoices();
    }

    window.addEventListener('beforeunload', stopArticleSpeech);

    try {
      const response = await fetch('./data/content.json', { cache: 'no-cache' });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} (${response.statusText})`);
      }

      const data = await response.json();
      state.data = data;

      state.categoriesById.clear();
      (data.categories || []).forEach((cat) => {
        state.categoriesById.set(cat.id, cat);
      });

      state.articlesBySlug.clear();
      (data.articles || []).forEach((article) => {
        state.articlesBySlug.set(article.slug, article);
      });

      renderFooter();
      handleRoute();

      window.addEventListener('hashchange', handleRoute);
    } catch (error) {
      renderLoadError(error);
    }
  }

  document.addEventListener('DOMContentLoaded', initApp);
})();
