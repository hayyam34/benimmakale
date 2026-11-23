/**
 * Canlı RSS Haber Akışı Modülü (Saf Vanilla JS)
 * Doğrulanmış ./data/rss-feeds.json kaynaklarından doğrudan CORS + rss2json yedek katmanıyla
 * haberleri çeker, tarihe göre sıralar, tekilleştirir ve sol panelde kesintisiz akıtır.
 */
(function () {
  'use strict';

  const RSS_CONFIG_URL = './data/rss-feeds.json';
  const RSS2JSON_ENDPOINT = 'https://api.rss2json.com/v1/api.json?rss_url=';
  const CACHE_TTL_MS = 3 * 60 * 1000;
  const AUTO_REFRESH_MS = 3 * 60 * 1000;
  const FETCH_TIMEOUT_MS = 8000;
  const SCROLL_SPEED_PX_PER_SEC = 22;
  const MAX_FEEDS_PER_BATCH = 14;
  const MAX_DISPLAY_ITEMS = 60;

  const rssState = {
    feeds: [],
    filter: 'all',
    batchOffset: 0,
    paused: false,
    userInteracting: false,
    cache: new Map(),
    rafId: null,
    lastFrameTs: 0,
    scrollCarry: 0,
    refreshTimerId: null,
    loadToken: 0
  };

  function escapeHtml(value) {
    if (value === null || value === undefined) return '';
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function sanitizeUrl(url) {
    if (!url || typeof url !== 'string') return '#';
    const trimmed = url.trim();
    if (trimmed.startsWith('https://') || trimmed.startsWith('http://')) {
      return trimmed;
    }
    return '#';
  }

  /** XML/HTML metinlerindeki etiketleri ve HTML entity'lerini temizler */
  function cleanText(raw) {
    if (!raw) return '';
    const str = String(raw).replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');
    const doc = new DOMParser().parseFromString(str, 'text/html');
    return (doc.body && doc.body.textContent ? doc.body.textContent : str)
      .replace(/\s+/g, ' ')
      .trim();
  }

  function parseTimestamp(rawDate) {
    if (!rawDate) return 0;
    const ms = Date.parse(String(rawDate).trim());
    return Number.isNaN(ms) ? 0 : ms;
  }

  function formatNewsTime(ts) {
    if (!ts) return 'Güncel';
    const d = new Date(ts);
    const now = new Date();
    const isSameDay =
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate();

    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    if (isSameDay) return `${hh}:${mm}`;

    const dd = String(d.getDate()).padStart(2, '0');
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    return `${dd}.${mo} ${hh}:${mm}`;
  }

  function fetchWithTimeout(url, timeoutMs) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    return fetch(url, { signal: controller.signal }).finally(() => clearTimeout(timer));
  }

  /** RSS 2.0, RDF ve Atom XML belgelerini ayrıştırır */
  function parseXmlFeed(xmlText, feedMeta) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, 'text/xml');
    if (doc.querySelector('parsererror')) {
      throw new Error('XML ayrıştırma hatası');
    }

    const items = [];
    const nodes = doc.querySelectorAll('item, entry');

    nodes.forEach((node) => {
      const titleEl = node.querySelector('title');
      const title = cleanText(titleEl ? titleEl.textContent : '');
      if (!title) return;

      let link = '';
      const linkEl = node.querySelector('link');
      if (linkEl) {
        link = linkEl.getAttribute('href') || linkEl.textContent || '';
      }
      if (!link) {
        const guidEl = node.querySelector('guid');
        if (guidEl && /^https?:\/\//i.test(guidEl.textContent.trim())) {
          link = guidEl.textContent.trim();
        }
      }

      const dateNode =
        node.querySelector('pubDate') ||
        node.querySelector('published') ||
        node.querySelector('updated') ||
        node.getElementsByTagName('dc:date')[0];
      const pubTime = parseTimestamp(dateNode ? dateNode.textContent : '');

      items.push({
        source: feedMeta.source,
        category: feedMeta.category,
        title,
        link: sanitizeUrl(link),
        pubTime
      });
    });

    return items.slice(0, 15);
  }

  /** Tek bir RSS kaynağını önbellek + doğrudan CORS + rss2json yedeğiyle çeker */
  async function fetchSingleFeed(feedMeta) {
    const cached = rssState.cache.get(feedMeta.url);
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
      return cached.items;
    }

    let items = null;

    if (feedMeta.directCors) {
      try {
        const resp = await fetchWithTimeout(feedMeta.url, FETCH_TIMEOUT_MS);
        if (resp.ok) {
          const xmlText = await resp.text();
          items = parseXmlFeed(xmlText, feedMeta);
        }
      } catch (_) {
        items = null;
      }
    }

    if (!items || items.length === 0) {
      const apiUrl = RSS2JSON_ENDPOINT + encodeURIComponent(feedMeta.url);
      const resp = await fetchWithTimeout(apiUrl, FETCH_TIMEOUT_MS);
      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status}`);
      }
      const data = await resp.json();
      if (data.status !== 'ok' || !Array.isArray(data.items)) {
        throw new Error('rss2json geçersiz yanıt');
      }
      items = data.items
        .map((entry) => ({
          source: feedMeta.source,
          category: feedMeta.category,
          title: cleanText(entry.title),
          link: sanitizeUrl(entry.link || entry.guid),
          pubTime: parseTimestamp(entry.pubDate)
        }))
        .filter((it) => it.title);
    }

    rssState.cache.set(feedMeta.url, {
      fetchedAt: Date.now(),
      items
    });

    return items;
  }

  /** Seçili filtreye göre çekilecek kaynak alt kümesini belirler */
  function selectTargetFeeds() {
    const all = rssState.feeds;
    if (all.length === 0) return [];

    if (rssState.filter === 'all') {
      const featured = all.filter((f) => f.featured);
      if (rssState.batchOffset === 0 && featured.length > 0) {
        return featured.slice(0, MAX_FEEDS_PER_BATCH);
      }
      const directPool = all.filter((f) => f.directCors);
      const pool = directPool.length > 0 ? directPool : all;
      const start = ((rssState.batchOffset - 1) * MAX_FEEDS_PER_BATCH) % pool.length;
      const batch = [];
      for (let i = 0; i < Math.min(MAX_FEEDS_PER_BATCH, pool.length); i++) {
        batch.push(pool[(start + i) % pool.length]);
      }
      return batch;
    }

    if (rssState.filter.startsWith('cat:')) {
      const targetCat = rssState.filter.slice(4);
      const matches = all.filter((f) => f.category === targetCat);
      matches.sort((a, b) => Number(b.directCors) - Number(a.directCors));
      return matches.slice(0, MAX_FEEDS_PER_BATCH);
    }

    if (rssState.filter.startsWith('src:')) {
      const targetSrc = rssState.filter.slice(4);
      const matches = all.filter((f) => f.source === targetSrc);
      matches.sort((a, b) => Number(b.directCors) - Number(a.directCors));
      return matches.slice(0, MAX_FEEDS_PER_BATCH);
    }

    return all.slice(0, MAX_FEEDS_PER_BATCH);
  }

  function populateFilterSelect() {
    const selectEl = document.getElementById('rss-filter-select');
    if (!selectEl) return;

    const categories = [...new Set(rssState.feeds.map((f) => f.category))];
    const sources = [...new Set(rssState.feeds.map((f) => f.source))];

    const optionsHtml = [
      `<option value="all">Tümü (Canlı Karma Akış — ${rssState.feeds.length} Kaynak)</option>`,
      `<optgroup label="Kategoriler">${categories
        .map((c) => `<option value="cat:${escapeHtml(c)}">${escapeHtml(c)}</option>`)
        .join('')}</optgroup>`,
      `<optgroup label="Haber Kaynakları">${sources
        .map((s) => `<option value="src:${escapeHtml(s)}">${escapeHtml(s)}</option>`)
        .join('')}</optgroup>`
    ].join('');

    selectEl.innerHTML = optionsHtml;
    selectEl.value = rssState.filter;
  }

  function setStatusText(text) {
    const el = document.getElementById('rss-status-text');
    if (el) el.textContent = text;
  }

  function renderNewsList(items) {
    const listEl = document.getElementById('rss-feed-list');
    if (!listEl) return;

    if (!items || items.length === 0) {
      listEl.innerHTML = `
        <div class="rss-empty-state">
          <p>Şu anda haberler alınamadı. İnternet bağlantınızı kontrol edip Yenile tuşuna basabilirsiniz.</p>
        </div>
      `;
      return;
    }

    listEl.innerHTML = items
      .map(
        (item) => `
        <a href="${escapeHtml(item.link)}" class="rss-item" target="_blank" rel="noopener noreferrer">
          <div class="rss-item-meta">
            <span class="rss-source-badge">${escapeHtml(item.source)}</span>
            <span class="rss-time">${escapeHtml(formatNewsTime(item.pubTime))}</span>
          </div>
          <p class="rss-item-title">${escapeHtml(item.title)}</p>
        </a>
      `
      )
      .join('');

    listEl.scrollTop = 0;
    rssState.scrollCarry = 0;
  }

  async function refreshNewsStream(forceReload) {
    if (rssState.feeds.length === 0) return;

    const token = ++rssState.loadToken;
    if (forceReload) {
      rssState.cache.clear();
    }

    const targets = selectTargetFeeds();
    setStatusText(`Güncelleniyor (${targets.length} kaynak)...`);

    const settled = await Promise.allSettled(targets.map((feed) => fetchSingleFeed(feed)));
    if (token !== rssState.loadToken) return;

    const merged = [];
    let okCount = 0;

    settled.forEach((res) => {
      if (res.status === 'fulfilled' && Array.isArray(res.value) && res.value.length > 0) {
        okCount += 1;
        merged.push(...res.value);
      }
    });

    // Tarihe göre yeniden eskiye sırala
    merged.sort((a, b) => b.pubTime - a.pubTime);

    // Aynı başlığa sahip haberleri tekilleştir
    const seenTitles = new Set();
    const uniqueItems = [];
    for (const item of merged) {
      const key = item.title.toLocaleLowerCase('tr-TR');
      if (seenTitles.has(key)) continue;
      seenTitles.add(key);
      uniqueItems.push(item);
      if (uniqueItems.length >= MAX_DISPLAY_ITEMS) break;
    }

    renderNewsList(uniqueItems);

    const nowTime = formatNewsTime(Date.now());
    setStatusText(`${uniqueItems.length} haber (${okCount}/${targets.length} kaynak) • ${nowTime}`);
  }

  function startAutoScrollLoop() {
    if (rssState.rafId !== null) return;
    rssState.lastFrameTs = 0;

    function tick(ts) {
      rssState.rafId = window.requestAnimationFrame(tick);
      if (rssState.paused || rssState.userInteracting) {
        rssState.lastFrameTs = ts;
        return;
      }

      const listEl = document.getElementById('rss-feed-list');
      if (!listEl) return;

      const maxScroll = listEl.scrollHeight - listEl.clientHeight;
      if (maxScroll <= 4) return;

      if (!rssState.lastFrameTs) {
        rssState.lastFrameTs = ts;
        return;
      }

      const dtSec = Math.min((ts - rssState.lastFrameTs) / 1000, 0.1);
      rssState.lastFrameTs = ts;
      rssState.scrollCarry += SCROLL_SPEED_PX_PER_SEC * dtSec;

      if (rssState.scrollCarry >= 1) {
        const step = Math.floor(rssState.scrollCarry);
        rssState.scrollCarry -= step;
        if (listEl.scrollTop + step >= maxScroll) {
          listEl.scrollTop = 0;
        } else {
          listEl.scrollTop += step;
        }
      }
    }

    rssState.rafId = window.requestAnimationFrame(tick);
  }

  function bindControls() {
    const filterEl = document.getElementById('rss-filter-select');
    const toggleBtn = document.getElementById('rss-toggle-scroll');
    const refreshBtn = document.getElementById('rss-refresh-btn');
    const listEl = document.getElementById('rss-feed-list');

    if (filterEl) {
      filterEl.addEventListener('change', () => {
        rssState.filter = filterEl.value || 'all';
        rssState.batchOffset = 0;
        refreshNewsStream(false);
      });
    }

    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        rssState.paused = !rssState.paused;
        toggleBtn.textContent = rssState.paused ? 'Başlat' : 'Duraklat';
        toggleBtn.setAttribute('aria-pressed', rssState.paused ? 'true' : 'false');
      });
    }

    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        if (rssState.filter === 'all') {
          rssState.batchOffset += 1;
        }
        refreshNewsStream(true);
      });
    }

    if (listEl) {
      const pauseHover = () => {
        rssState.userInteracting = true;
      };
      const resumeHover = () => {
        rssState.userInteracting = false;
      };

      listEl.addEventListener('mouseenter', pauseHover);
      listEl.addEventListener('mouseleave', resumeHover);
      listEl.addEventListener('focusin', pauseHover);
      listEl.addEventListener('focusout', resumeHover);
      listEl.addEventListener('touchstart', pauseHover, { passive: true });
      listEl.addEventListener('touchend', () => {
        setTimeout(resumeHover, 1500);
      }, { passive: true });
    }
  }

  async function initRssSidebar() {
    const sidebarEl = document.getElementById('news-sidebar');
    if (!sidebarEl) return;

    bindControls();

    try {
      const resp = await fetch(RSS_CONFIG_URL, { cache: 'no-cache' });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const payload = await resp.json();
      rssState.feeds = Array.isArray(payload.feeds) ? payload.feeds : [];

      populateFilterSelect();
      await refreshNewsStream(false);
      startAutoScrollLoop();

      rssState.refreshTimerId = window.setInterval(() => {
        refreshNewsStream(false);
      }, AUTO_REFRESH_MS);
    } catch (err) {
      setStatusText('Haber kaynak listesi yüklenemedi.');
      const listEl = document.getElementById('rss-feed-list');
      if (listEl) {
        listEl.innerHTML = `<div class="rss-empty-state"><p>RSS listesi okunamadı (${escapeHtml(err.message)}).</p></div>`;
      }
    }
  }

  document.addEventListener('DOMContentLoaded', initRssSidebar);
})();
