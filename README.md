# موقع وهج لخدمات التنظيف

موقع ثابت (HTML/CSS/JS) متعدد الصفحات، عربي من اليمين لليسار، مجهّز للـ SEO، بدون أي مكتبات أو قواعد بيانات.

## الرفع على GitHub ثم Vercel

### 1) GitHub
1. أنشئ مستودع جديد على GitHub (مثلاً `wahaj-site`).
2. ارفع كل ملفات هذا المجلد. من الطرفية داخل المجلد:
   ```bash
   git init
   git add .
   git commit -m "موقع وهج"
   git branch -M main
   git remote add origin https://github.com/<اسم-حسابك>/wahaj-site.git
   git push -u origin main
   ```
   أو من موقع GitHub: **Add file → Upload files** واسحب الملفات.

### 2) Vercel
1. من [vercel.com](https://vercel.com) اختر **Add New → Project** ثم **Import** المستودع.
2. الإعدادات تُقرأ تلقائيًا من `vercel.json`، لا تغيّر شيئًا:
   - Build Command: `node tools/build-all.mjs`
   - Output Directory: `dist`
3. اضغط **Deploy**.
4. لربط الدومين: **Settings → Domains** وأضف `wahjclean.sa` و`www.wahjclean.sa`، ثم عدّل سجلات DNS عند مزود الدومين كما يطلب Vercel.

> بديل سريع بدون GitHub: ارفع مجلد `dist` مباشرة على Vercel (الملف `wahaj-site-dist.zip` جاهز للرفع).

## تعديل المحتوى

بعد أي تعديل شغّل `node tools/build-all.mjs` (يحتاج Node 18 أو أحدث)، أو ارفع التعديل على GitHub وVercel يبني الموقع تلقائيًا.

| تبي تعدّل | الملف |
|---|---|
| نصوص الخدمات السبعة وأسئلتها | `tools/services-data.mjs` |
| أسعار حاسبة الأسعار | `data/pricing.json` |
| التقييمات (الرئيسية + صفحة الآراء) | `data/reviews.json` |
| معرض الأعمال (قبل/بعد) | `data/portfolio.json` |
| مقالات المدونة | `data/posts.json` |
| شعارات شركاء النجاح | `data/partners.json` |
| الأسئلة العامة | `tools/faq.mjs` |
| الصفحات القانونية | `tools/legal.mjs` |
| الهيدر والفوتر والرئيسية | `index.html` |
| باقي الصفحات | `pages/*.html` |
| الصفحة الإنجليزية | `en/index.html` |
| التصميم | `assets/site.css`, `assets/service.css`, `assets/calc.css` |

ملفات `data/*.json` تُقرأ مباشرة في المتصفح: تعديلها لا يحتاج بناء.

## قبل الإطلاق الرسمي (من العميل)

- [x] صورة الواجهة (فني بزي وهج، مولّدة على Canva)
- [ ] صورة فريق وهج لصفحة «من نحن»
- [ ] صور الخدمات بدقة أعلى
- [ ] صور قبل/بعد حقيقية (الحالية «مثال» مُحاكاة)
- [ ] تقييمات حقيقية من Google + رابط صفحة التقييم (الحالية «مثال»)
- [ ] الأسعار الحقيقية للحاسبة (الحالية تجريبية، ما عدا العروض)
- [ ] روابط سناب وإنستغرام وإكس ويوتيوب (تيك توك فقط حقيقي)
- [ ] شعارات شركاء النجاح بموافقة أصحابها
- [ ] مراجعة «وش تشمل الخدمة» والأسئلة الشائعة
- [ ] مراجعة الصفحات القانونية الأربعة (مسودات، والأجزاء المظللة تحتاج قرار)
- [ ] اسم ورابط شركة التصميم في آخر سطر بالفوتر
- [ ] بعد الإطلاق: إضافة الموقع في Google Search Console وإرسال `sitemap.xml`
