/**
 * Kişisel Makale & Proje Web Sitesi — Vanilla JavaScript Uygulama Mantığı
 * Harici kütüphane gerektirmez. Hash routing (#/, #kategori/..., #makale/...) ile çalışır.
 */

(function () {
  'use strict';

  /** Uygulama durumu */
  const state = {
    data: null,
    categoriesById: new Map(),
    articlesBySlug: new Map()
  };

  /** Sık kullanılan SVG ikonları (harici ikon paketine bağımlılık olmaması için) */
  const ICONS = {
    compass: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>',
    layers: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>',
    folder: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>',
    arrowLeft: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>',
    arrowRight: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>',
    github: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/></svg>',
    x: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 4l11.733 16h4.267l-11.733 -16z"/><path d="M4 20l6.768 -6.768m2.46 -2.46l6.772 -6.772"/></svg>',
    youtube: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"/><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"/></svg>',
    linkedin: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>',
    link: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>'
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

  /** Güvenli URL kontrolü (javascript: vb. protokolleri engeller) */
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

  /** Makaleleri 'date' (YYYY-MM-DD) alanına göre yeniden eskiye sıralar */
  function sortByDateDesc(articles) {
    return [...articles].sort((a, b) => {
      const dateA = String(a.date || '');
      const dateB = String(b.date || '');
      return dateB.localeCompare(dateA);
    });
  }

  /** YYYY-MM-DD formatını okunabilir Türkçe tarihe çevirir (ör. 18 Kasım 2026) */
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

  /**
   * Verilen metinden YouTube video ID'sini ayrıştırır.
   * Hem saf video ID ("aqz-KE-bpKQ") hem de watch / youtu.be / embed URL'lerini destekler.
   */
  function extractYouTubeId(input) {
    if (!input || typeof input !== 'string') return null;
    const trimmed = input.trim();

    // Doğrudan 11 karakterlik video ID ise
    if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
      return trimmed;
    }

    // URL formatlarını ayrıştır
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

  /** Üst başlık bilgilerini ve dinamik navigasyonu doldurur */
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

  /** Alt bilgi (Footer) alanını JSON verisinden oluşturur ve kopyalama butonlarını bağlar */
  function renderFooter() {
    const footerEl = document.getElementById('site-footer');
    if (!footerEl || !state.data) return;

    const footerData = state.data.footer || {};
    const siteData = state.data.site || {};

    const socialsHtml = (footerData.socials || [])
      .map((item) => {
        const iconSvg = ICONS[item.icon] || ICONS.link;
        return `
          <a href="${escapeHtml(sanitizeUrl(item.url))}" class="social-pill" target="_blank" rel="noopener noreferrer">
            ${iconSvg}
            <span>${escapeHtml(item.label || item.platform)}</span>
          </a>
        `;
      })
      .join('');

    const contactHtml = (footerData.contact || [])
      .map((item, idx) => {
        const label = escapeHtml(item.label);
        const value = escapeHtml(item.value);

        if (item.copyable) {
          return `
            <li class="contact-item">
              <span class="contact-label">${label}</span>
              <button type="button" class="copy-btn" data-copy-index="${idx}" title="Panoya kopyalamak için tıklayın">
                <span class="copy-btn-code">${value}</span>
                <span class="copy-badge" id="copy-badge-${idx}">Kopyala</span>
              </button>
            </li>
          `;
        }

        if (item.href) {
          return `
            <li class="contact-item">
              <span class="contact-label">${label}</span>
              <a class="contact-value" href="${escapeHtml(sanitizeUrl(item.href))}">${value}</a>
            </li>
          `;
        }

        return `
          <li class="contact-item">
            <span class="contact-label">${label}</span>
            <span class="contact-value">${value}</span>
          </li>
        `;
      })
      .join('');

    footerEl.innerHTML = `
      <div class="container">
        <div class="footer-grid">
          <div>
            <h2 class="footer-title">${escapeHtml(siteData.title || 'Arşiv')}</h2>
            <p class="footer-about">${escapeHtml(footerData.about || siteData.subtitle || '')}</p>
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
        <div class="footer-bottom">
          <span>${escapeHtml(siteData.copyright || '')}</span>
          <span>${escapeHtml(siteData.author || '')}</span>
        </div>
      </div>
    `;

    // Kopyalanabilir iletişim öğeleri (ör. Session ID) için olay dinleyicileri
    footerEl.querySelectorAll('.copy-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const index = Number(btn.getAttribute('data-copy-index'));
        const contactItem = (footerData.contact || [])[index];
        const badge = document.getElementById(`copy-badge-${index}`);
        if (!contactItem || !badge) return;

        try {
          await navigator.clipboard.writeText(contactItem.value);
          badge.textContent = 'Kopyalandı!';
        } catch (_) {
          // Clipboard API kısıtlı ortamlarda fallback
          const tempInput = document.createElement('textarea');
          tempInput.value = contactItem.value;
          tempInput.setAttribute('readonly', '');
          tempInput.style.position = 'absolute';
          tempInput.style.left = '-9999px';
          document.body.appendChild(tempInput);
          tempInput.select();
          document.execCommand('copy');
          document.body.removeChild(tempInput);
          badge.textContent = 'Kopyalandı!';
        }

        setTimeout(() => {
          badge.textContent = 'Kopyala';
        }, 2000);
      });
    });
  }

  /** Tek bir makale kartı HTML'i üretir */
  function createArticleCardHtml(article, showCategoryBadge) {
    const category = state.categoriesById.get(article.categoryId);
    const categoryTitle = category ? category.title : article.categoryId;
    const articleUrl = `#makale/${encodeURIComponent(article.slug)}`;

    const coverHtml = article.coverImage
      ? `
        <a href="${articleUrl}" class="article-card-media" tabindex="-1" aria-hidden="true">
          <img src="${escapeHtml(sanitizeUrl(article.coverImage))}" alt="${escapeHtml(article.coverAlt || article.title)}" loading="lazy">
        </a>
      `
      : '';

    const categoryBadgeHtml = showCategoryBadge
      ? `<span class="meta-pill">${escapeHtml(categoryTitle)}</span>`
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

  /** Ana Sayfa Görünümü: JSON'dan dinamik kategoriler + son eklenen makaleler */
  function renderHomeView() {
    const site = state.data.site || {};
    const categories = state.data.categories || [];
    const allArticles = sortByDateDesc(state.data.articles || []);

    document.title = site.title || 'Arşiv & Perspektif';

    const categoryCardsHtml = categories
      .map((category) => {
        const catArticles = allArticles.filter((a) => a.categoryId === category.id);
        const iconSvg = ICONS[category.icon] || ICONS.folder;

        const previewHtml = catArticles.slice(0, 2).length > 0
          ? `
            <ul class="category-preview-list">
              ${catArticles
                .slice(0, 2)
                .map(
                  (art) => `
                    <li class="category-preview-item">
                      <a href="#makale/${encodeURIComponent(art.slug)}" class="category-preview-link">${escapeHtml(art.title)}</a>
                      <span class="category-preview-date">${formatDateTR(art.date)}</span>
                    </li>
                  `
                )
                .join('')}
            </ul>
          `
          : '';

        return `
          <section class="category-card">
            <div>
              <div class="category-card-top">
                <span class="category-icon-box">${iconSvg}</span>
                <span class="category-count-badge">${catArticles.length} Makale</span>
              </div>
              <h2 class="category-card-title">${escapeHtml(category.title)}</h2>
              <p class="category-card-desc">${escapeHtml(category.description)}</p>
              ${previewHtml}
            </div>
            <div>
              <a href="#kategori/${encodeURIComponent(category.id)}" class="category-card-cta">
                <span>Kategoriyi İncele</span>
                ${ICONS.arrowRight}
              </a>
            </div>
          </section>
        `;
      })
      .join('');

    const recentArticlesHtml = allArticles
      .slice(0, 4)
      .map((article) => createArticleCardHtml(article, true))
      .join('');

    return `
      <div class="container">
        <section class="home-intro">
          <span class="home-intro-badge">Dijital Yayın &amp; Araştırma Arşivi</span>
          <h1 class="home-intro-title">${escapeHtml(site.subtitle || site.title)}</h1>
          <p class="home-intro-desc">${escapeHtml(site.author || '')} tarafından hazırlanan makale ve proje dosyalarına aşağıdaki kategorilerden ulaşabilirsiniz.</p>
        </section>

        <section aria-labelledby="categories-heading">
          <div class="section-heading-row">
            <h2 id="categories-heading" class="section-title">Kategoriler</h2>
            <span class="section-kicker">${categories.length} Ana Başlık</span>
          </div>
          <div class="category-grid">
            ${categoryCardsHtml}
          </div>
        </section>

        <section aria-labelledby="recent-heading">
          <div class="section-heading-row">
            <h2 id="recent-heading" class="section-title">Son Eklenen Yazılar</h2>
            <span class="section-kicker">Yeniden eskiye sıralı</span>
          </div>
          <div class="recent-grid">
            ${recentArticlesHtml}
          </div>
        </section>
      </div>
    `;
  }

  /** Kategori Görünümü: Seçili kategoriye ait makaleler yeniden eskiye listelenir */
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

  /** Makale Detay Görünümü: Maksimum 760px ortalanmış blok okuma alanı */
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

    return `
      <div class="container">
        <article class="article-reader">
          <div class="view-nav-bar">
            <a href="${categoryHash}" class="back-btn">
              ${ICONS.arrowLeft}
              <span>${escapeHtml(categoryTitle)}</span>
            </a>
            <a href="#/" class="back-btn">Ana Sayfa</a>
          </div>

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

          <nav class="article-end-nav" aria-label="Makale sonu gezinme">
            <a href="${categoryHash}" class="back-btn">
              ${ICONS.arrowLeft}
              <span>${escapeHtml(categoryTitle)} Kategorisine Dön</span>
            </a>
            <a href="#/" class="back-btn">Tüm Kategoriler</a>
          </nav>
        </article>
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

  /** Hash Router: URL hash değerini okuyup ilgili görünümü ekrana basar */
  function handleRoute() {
    if (!state.data) return;

    const appRoot = document.getElementById('app-root');
    if (!appRoot) return;

    const rawHash = window.location.hash || '#/';
    const normalizedHash = rawHash === '#' ? '#/' : rawHash;

    renderHeader(normalizedHash);

    let viewHtml = '';

    if (normalizedHash === '#/' || normalizedHash === '') {
      viewHtml = renderHomeView();
    } else if (normalizedHash.startsWith('#kategori/')) {
      const catId = decodeURIComponent(normalizedHash.slice('#kategori/'.length));
      viewHtml = renderCategoryView(catId);
    } else if (normalizedHash.startsWith('#makale/')) {
      const slug = decodeURIComponent(normalizedHash.slice('#makale/'.length));
      viewHtml = renderArticleView(slug);
    } else {
      viewHtml = renderNotFoundView('Geçersiz rota adresi.');
    }

    appRoot.innerHTML = viewHtml;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /** Veri yükleme hatası durumunda bilgilendirici mesaj gösterir */
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

  /** Uygulama başlatıcı: JSON verisini çeker, indeksler ve router'ı başlatır */
  async function initApp() {
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
