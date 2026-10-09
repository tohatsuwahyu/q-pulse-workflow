# Q-Pulse 使用マニュアル（Panduan Pengguna）

Panduan ini menjelaskan cara memakai aplikasi **Q-Pulse** untuk 品質管理生産技術部. Tampilan aplikasi memakai bahasa Jepang agar sesuai penggunaan di departemen.

## 1. Sebelum mulai

1. Buka aplikasi Q-Pulse.
2. Pastikan status di kiri bawah bertuliskan `システム稼働中` (sistem berjalan).
3. Jika daftar task, proyek, atau member kosong, berarti data di Google Spreadsheet belum diisi atau backend Apps Script belum terhubung.

## 2. Arti menu

| Menu Jepang | Arti Indonesia | Kegunaan |
|---|---|---|
| ダッシュボード | Dashboard | Ringkasan task prioritas, beban kerja, dan proyek |
| タスク | Task | Membuat, mengubah, dan menghapus pekerjaan |
| プロジェクト | Proyek | Memantau aktivitas improvement atau persiapan produksi |
| メンバー | Anggota | Mengatur nama, email, peran, dan kapasitas kerja |
| スケジュール | Jadwal | Rencana audit, rapat, dan kalibrasi |
| 作業日報 | Laporan kerja harian | Mencatat pekerjaan harian |

## 3. Menambahkan member baru

1. Buka menu **メンバー**.
2. Klik **＋ メンバー追加**.
3. Isi:
   - **氏名**: nama anggota.
   - **会社メールアドレス**: email perusahaan.
   - **役割**: pilih メンバー (Member), マネージャー (Manager), atau 管理者 (Admin).
   - **週の作業可能時間**: kapasitas kerja per minggu, misalnya 40.
   - **在籍状況**: pilih 有効 untuk anggota aktif.
4. Klik **保存**.

Catatan: jika belum menggunakan sistem login, peran pada tahap ini hanya data pengelolaan. Hak akses yang benar-benar terkunci akan dibuat saat Cloudflare Access dipasang nanti.

## 4. Membuat task biasa

1. Buka **タスク**.
2. Klik **＋ 新規タスク**.
3. Isi nama task, proyek, 担当者 (PIC), 期限 (deadline), dan 予定工数（時間）.
4. Pilih:
   - **優先度**: 最優先 / 高 / 中 / 低.
   - **状態**: 未着手 / 進行中 / 完了.
5. Klik **保存**.

## 5. Pekerjaan mendadak: mesin rusak atau produksi berhenti

1. Dari Dashboard klik **⚠ 緊急対応**.
2. Form akan otomatis memilih prioritas **最優先** dan status **進行中**.
3. Pada **緊急対応の種類**, pilih:
   - 設備故障 = mesin/peralatan rusak
   - 品質不良 = masalah kualitas
   - 安全リスク = risiko keselamatan
   - 生産停止 = produksi berhenti
4. Isi **設備・ライン・影響内容**, misalnya: “Assembly Line 2, mesin press berhenti, produksi 300 unit tertunda”.
5. Tetapkan PIC dan deadline, lalu klik **保存**.

## 6. Mengubah atau menghapus data

- Klik **編集** untuk mengubah data.
- Klik **削除** untuk menghapus data.
- Pilih **キャンセル** atau tombol **×** jika tidak jadi menyimpan.

## 7. Membaca beban kerja

Di menu **メンバー**:
- **週の容量** = kapasitas anggota per minggu.
- **予定工数** = total jam task belum selesai yang diberikan ke anggota.
- **適正** = beban masih dalam kapasitas.
- **過負荷** = planned hours lebih besar dari kapasitas. Pindahkan sebagian task ke anggota lain atau ubah deadline.

## 8. Mengisi 作業日報 (laporan harian)

1. Buka **作業日報**.
2. Klik **＋ 日報を書く**.
3. Isi tanggal, jam kerja, pekerjaan yang dilakukan, masalah, serta rencana besok.
4. Klik **保存**.

## 9. Jika data tidak tersimpan ke Spreadsheet

Aplikasi web menampilkan data secara langsung, tetapi penyimpanan permanen memerlukan Apps Script terbaru.

1. Buka proyek Apps Script yang terhubung ke Spreadsheet.
2. Salin isi file `gas/Code.gs` dari GitHub.
3. Tempel seluruh isi tersebut ke file `Code.gs` di Apps Script.
4. Klik **Save**.
5. Klik **Deploy → Manage deployments → Edit → Deploy**.
6. Buka ulang aplikasi dan tekan `Ctrl + F5`.

## 10. Istilah penting

| Jepang | Indonesia |
|---|---|
| PIC / 担当者 | Orang yang bertanggung jawab |
| 期限 | Tenggat waktu |
| 予定工数 | Estimasi jam kerja |
| 週の容量 | Kapasitas jam kerja per minggu |
| 要注意 | Proyek memiliki risiko keterlambatan |
| 作業日報 | Laporan pekerjaan harian |
