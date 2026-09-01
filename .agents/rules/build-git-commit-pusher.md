---
trigger: always_on
description: Aturan otomatis untuk sesi #Build — Menyiapkan commit dan push setiap selesai perubahan kode dengan modal konfirmasi interaktif (ask_question) sebelum dijalankan.
---

# 🚀 Git Commit & Push Workflow (Khusus Sesi #Build)

Setiap kali Anda berada dalam **sesi `#Build`** (atau ketika menyelesaikan task implementasi/perubahan kode pada projek ini), Anda **HARUS** mengikuti protokol berikut:

## 1. Deteksi Perubahan Setelah Task Selesai
Setelah menyelesaikan pengeditan kode, perbaikan bug, atau penambahan fitur baru:
1. Jalankan `git status` dan `git diff --stat` untuk melihat seluruh berkas yang telah dimodifikasi, dibuat, atau dihapus.
2. Analisis perubahan tersebut dan susun:
   - **Ringkasan Singkat Perubahan**: Poin-poin apa saja yang diubah.
   - **Rancangan Pesan Commit (Conventional Commits)**: Format standar seperti `feat(...)`, `fix(...)`, `refactor(...)`, `style(...)`, `docs(...)`, atau `chore(...)`.

## 2. WAJIB Munculkan Pop-up Interaktif (Approval Gate via `ask_question`)
**DILARANG KERAS** menjalankan `git commit` atau `git push` secara diam-diam tanpa persetujuan user.
Panggil tool `ask_question` untuk merender modal pop-up interaktif yang dapat diklik langsung oleh user:
- Tampilkan ringkasan file dan usulan pesan commit pada deskripsi/pertanyaan.
- Sediakan opsi tombol yang bisa diklik langsung:
  1. `(Recommended) Ya, Setujui & Push sekarang`
  2. `Ubah Pesan Commit`
  3. `Lewati / Batalkan`

## 3. Eksekusi Setelah Persetujuan
- **Jika User Menyetujui (Ya, Setujui & Push sekarang)**:
  1. `git add <files>` (atau `git add .` jika semua perubahan relevan).
  2. `git commit -m "<pesan yang disepakati>"`.
  3. `git push origin <branch_aktif>`.
  4. Berikan konfirmasi bahwa commit & push telah berhasil disertai hash commit atau status remote.
- **Jika User Memilih Ubah Pesan Commit**:
  - Tanyakan pesan commit baru melalui modal `ask_question` atau instruksi chat, lalu konfirmasi ulang sebelum eksekusi.
- **Jika User Memilih Lewati / Batalkan**:
  - Batalkan proses commit/push dan lanjutkan pekerjaan berikutnya.
