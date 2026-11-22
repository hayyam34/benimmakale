# Kişisel Makale & Proje Web Sitesi (Arşiv & Perspektif)

Hiçbir derleme (build) aracı, Node.js veya harici kütüphane gerektirmeyen; saf **HTML5**, **CSS3** ve **Vanilla JavaScript (JSON tabanlı)** ile hazırlanmış kişisel makale ve proje arşivi web sitesi. **GitHub Pages** ve **Cloudflare Pages** üzerinde doğrudan statik dosya olarak çalışır.

## Klasör ve Dosya Yapısı

```text
kisisel-makale-sitesi/
├── index.html             # Ana sayfa ve SPA iskeleti
├── style.css              # Dark Botanical Green tema ve responsive stiller
├── app.js                 # JSON yükleyici, hash router ve blok render motoru
├── data/
│   └── content.json       # Tüm site ayarları, kategoriler, makaleler ve footer verisi
├── assets/
│   └── images/            # Makale kapak görselleri ve içerik içi resimler
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

Site üzerindeki tüm kategoriler, makaleler, sosyal medya linkleri ve iletişim bilgileri `data/content.json` dosyasından yönetilir.

### 1. Yeni Kategori Ekleme

`data/content.json` içindeki `"categories"` dizisine yeni bir obje eklediğinizde, yeni kategori hem üst menüde hem de ana sayfada otomatik olarak görünür:

```json
{
  "id": "teknoloji-notlari",
  "title": "Teknoloji Notları",
  "description": "Yazılım mimarisi, açık kaynak ve yapay zeka sistemleri üzerine notlar.",
  "icon": "folder"
}
```
- `id`: URL hash adresinde (`#kategori/teknoloji-notlari`) kullanılacak benzersiz kimlik (Türkçe karakter ve boşluk kullanmayın).
- `icon`: `"compass"`, `"layers"` veya `"folder"` değerlerinden birini seçebilirsiniz.

---

### 2. Yeni Makale Ekleme

`data/content.json` içindeki `"articles"` dizisine yeni bir obje ekleyin. Uygulama makaleleri `date` alanına göre **otomatik olarak yeniden eskiye** sıralar; JSON içindeki sıranın önemi yoktur.

```json
{
  "slug": "ornek-yeni-makale",
  "categoryId": "turkiye-gercekleri",
  "title": "Yeni Makale Başlığı",
  "date": "2026-11-22",
  "readingTime": "5 dk okuma",
  "summary": "Kategori listesinde ve makale girişinde görünecek kısa özet metni.",
  "coverImage": "assets/images/ornek-kapak.png",
  "coverAlt": "Kapak görseli için erişilebilirlik açıklaması",
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

### 3. Sosyal Medya ve İletişim Bilgilerini Güncelleme

`data/content.json` içindeki `"footer"` bölümünü düzenleyerek alt bilgiyi güncelleyebilirsiniz:
- `"socials"`: `icon` değeri olarak `"github"`, `"x"`, `"youtube"`, `"linkedin"` veya `"link"` kullanılabilir.
- `"contact"`: `"copyable": true` olarak işaretlenen alanlar (ör. **Session ID**), ziyaretçilerin tek tıkla panoya kopyalayabileceği bir buton olarak render edilir.

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
