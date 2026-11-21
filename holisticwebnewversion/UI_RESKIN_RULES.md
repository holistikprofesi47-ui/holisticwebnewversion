# ATURAN KETAT REFACTORING UI (LOGIC-FREEZE & ANTI-AI SLOP)

Dokumen ini adalah aturan wajib setiap kali melakukan pembaruan tampilan (UI/UX reskin) pada project `webholistik`.

## 1. ZONA TERLARANG (LOGIC & DATA FREEZE — DILARANG KERAS DIUBAH)
AI **DILARANG** menyentuh, menghapus, atau memodifikasi bagian berikut:
- **State & Hooks:** Semua `useState`, `useEffect`, `useMemo`, `useCallback`, dan custom hooks harus tetap sama persis.
- **Event Handlers & Fungsi:** Semua fungsi `onClick`, `onSubmit`, `onChange`, validasi jadwal/klinik, dan logika bisnis tidak boleh berubah alurnya.
- **Firebase & API Calls:** Dilarang menyentuh pemanggilan fungsi dari `src/services/` (`firebaseFirestore.ts`, `firebaseAuth.ts`, `googleSheets.ts`, `googleDrive.ts`, `googleGmail.ts`). Jangan menambah listener `onSnapshot` atau `getDocs` baru.
- **Props & TypeScript Types:** Jangan mengubah nama `interface`, `type`, atau struktur `props` yang dikirim antar komponen.
- **Dependencies:** Dilarang menginstal library UI atau icon baru. Gunakan hanya Tailwind CSS dan `lucide-react` yang sudah terpasang.

## 2. ZONA YANG BOLEH DIUBAH (HANYA KULIT / PRESENTASI)
Perubahan hanya diizinkan pada:
- Class styling **Tailwind CSS** (`className`).
- Struktur pembungkus layout HTML/JSX (`div`, `section`, `header`, grid/flex) selama urutan rendering data dan binding event-nya tetap identik.
- Pembersihan teks UI (menghapus emoji berlebihan dan merapikan copywriting agar singkat dan natural).

## 3. STANDAR VISUAL BARU (MENGHILANGKAN KESAN "AI SLOP")
Ubah tampilan dari gaya template generik menjadi desain **Klinik Kesehatan Holistik Modern (Tenang, Bersih, Editorial)**:
- **Palet Warna:**
  - Background utama halaman: `bg-stone-50` (warm off-white, bukan putih polos atau abu-abu dingin).
  - Permukaan kartu/panel: `bg-white` dengan garis tepi tipis `border border-stone-200`.
  - Warna primer/aksen utama: Hijau tenang `emerald-800` / `emerald-900` (hover: `emerald-950`), dengan teks putih `text-white`.
  - Teks utama: `text-stone-900`, teks pendukung/label: `text-stone-500` atau `text-stone-600`.
  - **Larangan Warna:** Hapus semua gradien mencolok (`bg-gradient-to-r from-purple-...`, warna neon, atau kartu warna-warni berlebihan).
- **Elevasi & Bentuk:**
  - Hapus bayangan tebal (`shadow-lg`, `shadow-xl`, `shadow-2xl`). Gunakan permukaan datar dengan border halus (`border border-stone-200`) atau maksimal `shadow-xs`.
  - Gunakan sudut membulat yang proporsional (`rounded-xl` untuk kartu, `rounded-lg` untuk tombol dan input).
- **Tipografi & Ikonografi:**
  - Hapus semua emoji di judul, tombol, badge, dan tab navigasi.
  - Gunakan ikon garis tipis dari `lucide-react` dengan ukuran seragam (`w-4 h-4` di dalam tombol/badge, `w-5 h-5` di header) dan `strokeWidth={1.75}`.
  - Gunakan hierarki font yang jelas: judul utama tegas (`font-semibold tracking-tight text-stone-900`), angka statistik jelas (`tabular-nums`), dan hindari teks deskripsi panjang yang tidak perlu.

## 4. PROTOKOL EKSEKUSI KHUSUS ANTIGRAVITY AGENT
1. **Plan First:** Buat Implementation Plan singkat yang merinci perubahan visual/Tailwind saja sebelum menyentuh file.
2. **In-Place Visual Edit Only:** Edit file secara langsung (in-place) hanya pada bagian JSX/className dan teks UI. Dilarang menulis ulang atau mengubah fungsi logika, state, hooks, maupun query Firebase di bagian atas komponen.
3. **Verifikasi Mandiri:** Setelah mengedit, jalankan pengecekan TypeScript / build (`npm run build` atau `npx tsc --noEmit`) untuk memastikan tidak ada error atau props yang putus.
