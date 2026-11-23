# Kişisel Makale & Proje Web Sitesi (Arşiv & Perspektif)

Hiçbir derleme (build) aracı, Node.js veya harici kütüphane gerektirmeyen; saf **HTML5**, **CSS3** ve **Vanilla JavaScript (JSON tabanlı)** ile hazırlanmış kişisel makale ve proje arşivi web sitesi. **GitHub Pages** ve **Cloudflare Pages** üzerinde doğrudan statik dosya olarak çalışır.

## Özellikler

- **4 Renk Teması (Sağ Üst Köşe):** Varsayılan olarak **Yeşil** (`Dark Botanical Green`) açılır; kullanıcı isterse sağ üst köşeden **Karanlık**, **Parlak** veya **Gri** moda geçebilir. Seçim `localStorage` üzerinde hatırlanır.
- **Vikipedi Tarzı Görünüm Paneli:** Makale sayfalarının yanında (mobil ve tablette makale üzerinde açılır panel olarak) **Metin** (`Küçük`, `Ölçünlü`, `Büyük`) ve **Genişlik** (`Ölçünlü`, `Geniş`) ayarları yer alır.
- **Sesli Dinleme:** Her makalenin altında tarayıcının yerleşik `Web Speech API` altyapısını kullanan Türkçe sesli okuma oynatıcısı (`Oynat / Duraklat / Durdur` ve `0.85x – 1.5x` hız kontrolü) bulunur.
- **Karekod (QR) Desteği:** Footer bölümündeki **Sosyal Medya** ve **İletişim & Kanallar** öğeleri için harici kütüphanesiz `qr.js` modülü ile otomatik SVG karekod üretilir; her öğenin yanındaki karekod tuşuyla büyütülebilir, indirilebilir veya **"Tüm Karekodları Göster"** butonuyla toplu olarak açılabilir.
- **Hashtagler & Etiket Sayfası:** Makalelerin altında `#hashtag` etiketleri yer alır; tıklandığında ilgili etikete sahip makaleler `#etiket/<etiket>` görünümünde listelenir.
- **Kaynaklar Bölümü:** Her makalenin altında numaralandırılmış referans ve bağlantı listesi gösterilir.
- **İki Yana Yaslı (Justify) Tipografi & Responsive Tasarım:** Tüm metin blokları yaslı hizalanır; PC, tablet ve telefon ekranlarına tam uyumludur.
- **Galata Kulesi Favicon:** Tarayıcı sekmesi için özel vektörel [favicon-galata.svg](assets/images/favicon-galata.svg) ikonu eklenmiştir.

## Klasör ve Dosya Yapısı

```text
kisisel-makale-sitesi/
├── index.html             # Ana sayfa, tema seçici, QR modal ve SPA iskeleti
├── style.css              # 4 tema paleti, yaslı tipografi ve responsive stiller
├── qr.js                  # Çevrimdışı ISO/IEC 18004 SVG karekod üreticisi
├── app.js                 # JSON yükleyici, hash router, sesli okuma ve render motoru
├── data/
│   └── content.json       # Site ayarları, kategoriler, makaleler, etiketler, kaynaklar ve footer
├── assets/
│   └── images/            # Galata Kulesi favicon, kapak görselleri ve isteğe bağlı özel QR görselleri
└── README.md              # Kullanım ve içerik ekleme rehberi
```

---

## Yerel Bilgisayarda Çalıştırma

Güvenlik politikaları (`CORS`) gereği tarayıcılar `file://` protokolü üzerinden `fetch('data/content.json')` isteğine izin vermez. Yerelde test etmek için basit bir statik HTTP sunucusu kullanın:

### Yöntem 1: Python (Önerilen)
Proje klasörünün içinde terminal açın ve şu komutu çalıştırın:
```bash
python -m http.server 8000
```
Ardından tarayıcıda `http://localhost:8000` adresine gidin.

### Yöntem 2: VS Code Live Server
`index.html` dosyasına sağ tıklayıp **"Open with Live Server"** seçeneğine tıklayın.

---

## İçerik Yönetimi (`data/content.json`)

Site üzerindeki tüm kategoriler, makaleler, etiketler, kaynaklar, sosyal medya linkleri ve iletişim bilgileri `data/content.json` dosyasından yönetilir.

### 1. Yeni Kategori Ekleme

`data/content.json` içindeki `"categories"` dizisine yeni bir obje eklediğinizde, yeni kategori üst navigasyon menüsünde otomatik olarak görünür:

```json
{
  "id": "teknoloji-notlari",
  "title": "Teknoloji Notları",
  "description": "Yazılım mimarisi, açık kaynak ve yapay zeka sistemleri üzerine notlar.",
  "icon": "folder"
}
```
- `id`: URL hash adresinde (`#kategori/teknoloji-notlari`) kullanılacak benzersiz kimlik (Türkçe karakter ve boşluk kullanmayın).

---

### 2. Yeni Makale Ekleme (Hashtag ve Kaynaklar Dahil)

`data/content.json` içindeki `"articles"` dizisine yeni bir obje ekleyin. Uygulama makaleleri `date` alanına göre **otomatik olarak yeniden eskiye** sıralar; JSON içindeki sıranın önemi yoktur.

```json
{
  "slug": "ornek-yeni-makale",
  "categoryId": "turkiye-gercekleri",
  "title": "Yeni Makale Başlığı",
  "date": "2026-11-23",
  "readingTime": "5 dk okuma",
  "summary": "Kategori listesinde ve makale girişinde görünecek kısa özet metni.",
  "coverImage": "assets/images/ornek-kapak.png",
  "coverAlt": "Kapak görseli için erişilebilirlik açıklaması",
  "tags": ["Analiz", "TürkiyeGerçekleri", "Veri"],
  "blocks": [
    {
      "type": "paragraph",
      "text": "Giriş paragrafı metni buraya yazılır."
    },
    {
      "type": "heading",
      "text": "Ana Alt Başlık"
    },
    {
      "type": "heading",
      "level": 3,
      "text": "Daha Küçük Alt Başlık (İsteğe Bağlı)"
    },
    {
      "type": "image",
      "src": "assets/images/ornek-grafik.png",
      "alt": "Görsel açıklaması",
      "caption": "Şekil 1: Görselin altında görünecek açıklama."
    },
    {
      "type": "youtube",
      "videoId": "aqz-KE-bpKQ",
      "caption": "İlgili YouTube videosu açıklaması."
    }
  ],
  "references": [
    {
      "title": "Örnek Kurum Raporu (2026)",
      "url": "https://ornek-kaynak.org/rapor",
      "note": "Verilerin alındığı temel kaynak açıklaması."
    }
  ]
}
```

#### Desteklenen `blocks` Tipleri
| Tip | Alanlar | Açıklama |
| :--- | :--- | :--- |
| `paragraph` | `text` | Normal okuma paragrafı. |
| `heading` | `text`, `level` (opsiyonel: `2` veya `3`) | Bölüm alt başlığı (`h2` veya `h3`). |
| `image` | `src`, `alt`, `caption` (opsiyonel) | Yerel (`assets/images/...`) veya harici görsel. |
| `youtube` | `videoId`, `caption` (opsiyonel) | Yalnızca 11 haneli YouTube ID'si (`aqz-KE-bpKQ`) ya da tam YouTube URL'si (`watch?v=...`, `youtu.be/...`, `embed/...`) verilebilir. 16:9 responsive olarak gömülür. |

---

### 3. Sosyal Medya, İletişim ve Karekod (QR) Ayarları

`data/content.json` içindeki `"footer"` bölümünde:
- `"socials"`: Her öğe için otomatik karekod oluşturulur (`"qr": false` diyerek kapatılabilir).
- `"contact"`: `"qr": true` verilen öğeler (ör. **E-posta** ve **Session ID**) için karekod üretilir. `"copyable": true` alanı ise tek tıkla panoya kopyalama butonu ekler.
- İsteğe bağlı alanlar:
  - `"qrValue"`: Karekod içinde linkten/değerden farklı bir metin kodlamak isterseniz kullanabilirsiniz.
  - `"qrImage"`: Otomatik SVG yerine kendi PNG/SVG karekod görselinizi göstermek isterseniz dosya yolunu (`"assets/images/session-qr.png"`) verebilirsiniz.

---

## Yayınlama (Deploy)

### GitHub Pages
1. Bu klasördeki tüm dosyaları bir GitHub deposuna (repository) yükleyin.
2. Depo ayarlarından **Settings → Pages** bölümüne gidin.
3. **Build and deployment** kaynağını **Deploy from a branch** seçip `main` dalını ve `/ (root)` klasörünü onaylayın.

### Cloudflare Pages
1. Cloudflare Dashboard üzerinden **Workers & Pages → Create → Pages → Connect to Git** yolunu izleyin.
2. Deponuzu seçin.
3. **Build command** alanını **boş** bırakın (derleme gerekmez), **Build output directory** alanını `/` olarak bırakıp **Save and Deploy** butonuna tıklayın.
