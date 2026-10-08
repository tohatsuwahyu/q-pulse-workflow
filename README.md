# Q-Pulse — 品質管理生産技術部 Workflow App

Dashboard dua bahasa (Jepang / Inggris) untuk manajemen tugas, jadwal, 作業日報, dan proyek.

## Isi proyek

- Dashboard elegan dan responsif; bahasa awal Jepang dengan tombol pindah ke Inggris.
- Halaman tugas, proyek, jadwal, dan laporan kerja harian.
- Heatmap beban kerja, status kesehatan/risiko proyek, dan ringkasan untuk atasan.
- API Google Apps Script (`gas/Code.gs`) yang menyimpan data ke Google Spreadsheet.
- Data demo dapat dipakai langsung. Setelah API dipasang, data baru akan dikirim ke Spreadsheet.

## Membuka demo

Buka `index.html` dengan browser. Agar preview stabil di VS Code, gunakan ekstensi **Live Server**.

## Struktur Google Spreadsheet

Sesudah Web App Google Apps Script dideploy, jalankan sekali URL dengan tambahan `?action=setup`. Script akan membuat:

| Sheet | Fungsi |
|---|---|
| `Tasks` | Tugas individual, PIC, tenggat, prioritas, dan status |
| `Projects` | Proyek perbaikan / produk baru, progres dan risiko |
| `Members` | Kapasitas anggota untuk heatmap beban kerja |
| `Schedules` | Audit, rapat, kalibrasi, dan milestone |
| `DailyReports` | 作業日報, masalah dan rencana besok |
| `KPI_Monthly` | Rekap KPI bulanan bagi atasan |

## Cara pemasangan untuk pemula

1. Buat Google Spreadsheet kosong bernama **Q-Pulse Database**.
2. Di Spreadsheet, klik **Extensions → Apps Script**.
3. Hapus kode bawaan, lalu tempel seluruh isi `gas/Code.gs`. Ganti juga manifest memakai `gas/appsscript.json` (Project Settings → centang **Show appsscript.json**).
4. Klik **Deploy → New deployment → Web app**. Pilih **Execute as: Me**, pilih akses yang sesuai kebijakan perusahaan, lalu lakukan otorisasi.
5. Salin URL Web app. Buka `app.js`, lalu ganti `const API_URL = "";` menjadi `const API_URL = "URL_WEB_APP_ANDA";`.
6. Buka `URL_WEB_APP_ANDA?action=setup` satu kali. Semua sheet dan header dibuat otomatis.
7. Muat ulang `index.html`. Entri baru akan dikirim ke Spreadsheet.

> Catatan keamanan: jangan membuka aplikasi perusahaan ke publik tanpa izin perusahaan. Versi awal ini belum memiliki login dan pengaturan peran; tambahkan autentikasi Google Workspace sebelum memasukkan data rahasia.

## Upload ke GitHub

1. Buat repository kosong di GitHub, misalnya `q-pulse-workflow`.
2. Buka Terminal di folder proyek ini, lalu jalankan:

```bash
git init
git add .
git commit -m "Initial Q-Pulse workflow app"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/q-pulse-workflow.git
git push -u origin main
```

3. Ganti `YOUR-USERNAME` dengan nama pengguna GitHub Anda. Jika diminta login, selesaikan login di browser.

## Pengembangan berikutnya yang disarankan

1. Tambahkan login Google Workspace dan peran: Admin, Manager, Member.
2. Hitung overload dari `Members.Capacity Hours / Week` dibanding jam kerja tugas yang direncanakan.
3. Kirim alert email / Google Chat untuk tugas yang tenggatnya kurang dari 3 hari atau proyek berstatus **At Risk**.
4. Tambahkan data kualitas: jenis defect, proses, nomor lot, perubahan 4M, tautan NCR / CAPA, dan revisi FMEA.
5. Buat dashboard KPI bulanan khusus atasan: ketepatan waktu, tingkat submit 日報, tren defect, closure CAPA, dan keseimbangan beban kerja.
