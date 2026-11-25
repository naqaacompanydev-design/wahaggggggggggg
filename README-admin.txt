لوحة تحكم وهج — الملفات والإعداد
==================================

ارفع ملفات الملف ده على نفس مستودع الموقع، فوق ملفات الموقع، بنفس الفولدرات:
  admin/            صفحة اللوحة  (/admin/)
  api/              السيرفر (Vercel Functions)
  assets/admin*.js  و  assets/admin*.css
  firestore.rules   قواعد حماية قاعدة البيانات

بعد الرفع، اللوحة بتفتح على: https://<دومين الموقع>/admin/
لحد ما تكمّل الإعداد اللي تحت، بتشتغل «وضع تجربة» (أي إيميل يدخل، والتعديلات على الجهاز بس).


الإعداد (مرة واحدة)
===================

1) Firebase  — console.firebase.google.com  (الخطة المجانية Spark، من غير كارت)
   - Add project ← اسم مثلًا wahaj-admin ← اقفل Google Analytics.
   - Build ← Authentication ← Get started ← Sign-in method ← فعّل Email/Password.
     ومن Users ← Add user ← إيميلك وكلمة مرور.
     ومن Settings ← Authorized domains ← ضيف دومين Vercel والدومين الحقيقي.
   - Build ← Firestore Database ← Create database ← Production mode.
     ومن Rules: الصق محتوى firestore.rules بعد ما تكتب إيميلك مكان owner@example.com ← Publish.
   - Project settings ← General ← Your apps ← أيقونة الويب </> ← سجّل التطبيق ← انسخ firebaseConfig
     وحطه في assets/admin-config.js مكان  window.WAHAJ_FIREBASE = null;
   - Project settings ← Service accounts ← Generate new private key ← بينزل ملف JSON.
     ⚠ الملف ده سري: ما تبعتهوش لحد ولا ترفعه على GitHub.

2) GitHub — Settings ← Developer settings ← Personal access tokens ← Fine-grained tokens ← Generate
   - Repository access: Only select repositories ← مستودع الموقع بس.
   - Permissions ← Repository ← Contents: Read and write.
   - انسخ التوكن (بيظهر مرة واحدة).

3) Vercel — مشروع الموقع ← Settings ← Environment Variables (Production و Preview):
   FIREBASE_PROJECT_ID     = project_id   من ملف JSON
   FIREBASE_CLIENT_EMAIL   = client_email من ملف JSON
   FIREBASE_PRIVATE_KEY    = private_key  من ملف JSON (كامل)
   GITHUB_TOKEN            = التوكن
   GITHUB_REPO             = اسم-الحساب/اسم-المستودع
   GITHUB_BRANCH           = main  (أو الفرع اللي Vercel بينشر منه)
   ADMIN_EMAILS            = إيميلات الملاك، بينهم فاصلة (نفس اللي في firestore.rules)
   وبعدين Redeploy.


بعد الإعداد
===========
- ادخل /admin/ بالإيميل اللي عملته في Firebase.
- «المستخدمين»: ضيف الموظفين بصلاحية (مدير / محرر محتوى / مبيعات).
- «أكواد الخصم»: اضغط «شيلها من الحاسبة» عشان الأكواد التجريبية تختفي، وبعدين «انشر التعديلات».
- «سجل التعديلات»: كل نشر بيتحفظ كنسخة وتقدر ترجع قبله.

لو حاجة ما اشتغلتش
------------------
- «إعداد ناقص في Vercel: …» = متغير ناقص من الخطوة 3.
- «الحساب ده ما عنده صلاحية» = الإيميل مش في ADMIN_EMAILS ولا مضاف في «المستخدمين».
- النشر بيقول «ما قدرنا نحفظ في الموقع» = توكن GitHub ناقص الصلاحية أو انتهى.
