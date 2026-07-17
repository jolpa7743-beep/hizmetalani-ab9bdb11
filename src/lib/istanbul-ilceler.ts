// Istanbul 39 ilce — slug + display name + short SEO note.
// Sluglar Türkçe karakterlerden sadeleştirilmiş, URL güvenli.

export type IstanbulIlce = {
  slug: string;
  name: string;
  yaka: "Anadolu" | "Avrupa";
  nufus: string;
  ozet: string;
};

export const ISTANBUL_ILCELERI: IstanbulIlce[] = [
  { slug: "adalar", name: "Adalar", yaka: "Anadolu", nufus: "~16.000", ozet: "Prens Adaları; sezonluk temizlik ve yazlık bakım ağırlıklı." },
  { slug: "arnavutkoy", name: "Arnavutköy", yaka: "Avrupa", nufus: "~330.000", ozet: "Müstakil ev ve bahçe hizmetleri yoğun, tadilat talebi yüksek." },
  { slug: "atasehir", name: "Ataşehir", yaka: "Anadolu", nufus: "~425.000", ozet: "İş merkezleri ve rezidans; ofis temizliği ve çocuk bakıcısı en çok aranan hizmetler." },
  { slug: "avcilar", name: "Avcılar", yaka: "Avrupa", nufus: "~450.000", ozet: "Öğrenci ve orta gelirli aileler; haftalık ev temizliği ağırlıklı." },
  { slug: "bagcilar", name: "Bağcılar", yaka: "Avrupa", nufus: "~730.000", ozet: "Kalabalık aile yapısı; genel ev temizliği ve tadilat en çok tercih edilen hizmetler." },
  { slug: "bahcelievler", name: "Bahçelievler", yaka: "Avrupa", nufus: "~600.000", ozet: "Apartman yoğunluğu; merdiven temizliği ve düzenli ev bakımı öne çıkıyor." },
  { slug: "bakirkoy", name: "Bakırköy", yaka: "Avrupa", nufus: "~230.000", ozet: "Orta-üst gelir; bakıcı, düzenli temizlik ve pet sitter talebi güçlü." },
  { slug: "basaksehir", name: "Başakşehir", yaka: "Avrupa", nufus: "~475.000", ozet: "Yeni siteler, genç aileler; çocuk bakıcısı ve haftalık temizlik başta." },
  { slug: "bayrampasa", name: "Bayrampaşa", yaka: "Avrupa", nufus: "~275.000", ozet: "Karma yapı; ev ve iş yeri temizliği dengeli dağılım gösteriyor." },
  { slug: "besiktas", name: "Beşiktaş", yaka: "Avrupa", nufus: "~185.000", ozet: "Yüksek gelir; düzenli temizlik, evcil hayvan gezdirme ve özel bakıcı yaygın." },
  { slug: "beykoz", name: "Beykoz", yaka: "Anadolu", nufus: "~250.000", ozet: "Yalı ve villa; sezonluk açılış-kapanış, bahçe bakımı ve kombi bakımı önde." },
  { slug: "beylikduzu", name: "Beylikdüzü", yaka: "Avrupa", nufus: "~370.000", ozet: "Yeni siteler; profesyonel ev temizliği ve çocuk bakıcısı en yoğun kategoriler." },
  { slug: "beyoglu", name: "Beyoğlu", yaka: "Avrupa", nufus: "~230.000", ozet: "Tarihi doku; deneyimli tadilat, tesisat ve elektrik hizmetleri kritik." },
  { slug: "buyukcekmece", name: "Büyükçekmece", yaka: "Avrupa", nufus: "~260.000", ozet: "Müstakil ev + site karışımı; bahçe, boya ve mevsimlik temizlik yoğun." },
  { slug: "catalca", name: "Çatalca", yaka: "Avrupa", nufus: "~75.000", ozet: "Kırsal karakterli; bahçe, tarım desteği ve tadilat ustaları aranıyor." },
  { slug: "cekmekoy", name: "Çekmeköy", yaka: "Anadolu", nufus: "~280.000", ozet: "Müstakil ev oranı yüksek; bahçe bakımı, boya-badana ve hamallık talep görüyor." },
  { slug: "esenler", name: "Esenler", yaka: "Avrupa", nufus: "~430.000", ozet: "Yoğun apartman; genel ev temizliği en çok tercih edilen kategori." },
  { slug: "esenyurt", name: "Esenyurt", yaka: "Avrupa", nufus: "~975.000", ozet: "İstanbul’un en kalabalık ilçesi; her tür ev hizmetinde talep yüksek." },
  { slug: "eyupsultan", name: "Eyüpsultan", yaka: "Avrupa", nufus: "~410.000", ozet: "Tarihi ve modern karışımı; tadilat, tesisat ve düzenli temizlik dengeli." },
  { slug: "fatih", name: "Fatih", yaka: "Avrupa", nufus: "~395.000", ozet: "Tarihi yarımada; eski bina uzmanlığı gerektiren tadilat ve tesisat işleri öne çıkıyor." },
  { slug: "gaziosmanpasa", name: "Gaziosmanpaşa", yaka: "Avrupa", nufus: "~490.000", ozet: "Aile yoğun; genel ev temizliği ve çocuk bakıcısı istekleri yaygın." },
  { slug: "gungoren", name: "Güngören", yaka: "Avrupa", nufus: "~280.000", ozet: "Küçük daire çoğunluğu; hızlı ev temizliği ve ütü hizmeti tercih ediliyor." },
  { slug: "kadikoy", name: "Kadıköy", yaka: "Anadolu", nufus: "~485.000", ozet: "Çalışan aileler; çocuk bakıcısı, düzenli temizlik ve ders arkadaşı hizmetleri en aranan kategoriler." },
  { slug: "kagithane", name: "Kağıthane", yaka: "Avrupa", nufus: "~445.000", ozet: "Ofis ve rezidans karışımı; ofis temizliği ve haftalık ev bakımı öne çıkıyor." },
  { slug: "kartal", name: "Kartal", yaka: "Anadolu", nufus: "~475.000", ozet: "Sahil şeridi ve site yoğun; ev temizliği, yaşlı bakıcısı ve cam silme en çok talep edilen hizmetler." },
  { slug: "kucukcekmece", name: "Küçükçekmece", yaka: "Avrupa", nufus: "~795.000", ozet: "Kalabalık ve karma; her segmentte ev hizmetleri talebi güçlü." },
  { slug: "maltepe", name: "Maltepe", yaka: "Anadolu", nufus: "~525.000", ozet: "Sahil bandı, site yoğun; haftalık temizlik ve klima bakımı çok tercih ediliyor." },
  { slug: "pendik", name: "Pendik", yaka: "Anadolu", nufus: "~750.000", ozet: "Geniş metrekare siteler; genel temizlik, cam silme ve tadilat en aktif kategoriler." },
  { slug: "sancaktepe", name: "Sancaktepe", yaka: "Anadolu", nufus: "~470.000", ozet: "Müstakil ev + site; boya, tadilat ve hamallık talebi yoğun." },
  { slug: "sariyer", name: "Sarıyer", yaka: "Avrupa", nufus: "~350.000", ozet: "Boğaz yalıları ve villalar; özel bakıcı, pet sitter ve düzenli temizlik ağırlıklı." },
  { slug: "silivri", name: "Silivri", yaka: "Avrupa", nufus: "~215.000", ozet: "Sahil + tarım karışımı; bahçe bakımı ve sezonluk temizlik öne çıkıyor." },
  { slug: "sultanbeyli", name: "Sultanbeyli", yaka: "Anadolu", nufus: "~355.000", ozet: "Aile yoğun; genel ev temizliği ve tadilat başlıca hizmet kategorileri." },
  { slug: "sultangazi", name: "Sultangazi", yaka: "Avrupa", nufus: "~535.000", ozet: "Kalabalık ilçe; ev temizliği ve çocuk bakıcısı en çok aranan hizmetler." },
  { slug: "sile", name: "Şile", yaka: "Anadolu", nufus: "~40.000", ozet: "Yazlık ağırlıklı; sezon açılış-kapanış, bahçe ve kombi bakımı önemli." },
  { slug: "sisli", name: "Şişli", yaka: "Avrupa", nufus: "~265.000", ozet: "Rezidans ve iş merkezleri; ofis temizliği, düzenli ev bakımı ve özel bakıcı yaygın." },
  { slug: "tuzla", name: "Tuzla", yaka: "Anadolu", nufus: "~285.000", ozet: "Sanayi + site; ev temizliği, hamallık ve tadilat dengeli dağılım gösteriyor." },
  { slug: "umraniye", name: "Ümraniye", yaka: "Anadolu", nufus: "~715.000", ozet: "Karma yapı; her ev hizmeti kategorisinde talep güçlü." },
  { slug: "uskudar", name: "Üsküdar", yaka: "Anadolu", nufus: "~525.000", ozet: "Tarihi ve modern; düzenli ev temizliği, çocuk ve yaşlı bakıcısı yaygın." },
  { slug: "zeytinburnu", name: "Zeytinburnu", yaka: "Avrupa", nufus: "~295.000", ozet: "Merkezi konum; ev temizliği ve tadilat işleri en çok talep gören kategoriler." },
];

export const ISTANBUL_ILCE_SLUGS = new Set(ISTANBUL_ILCELERI.map((i) => i.slug));

export function getIlce(slug: string): IstanbulIlce | undefined {
  return ISTANBUL_ILCELERI.find((i) => i.slug === slug);
}
