---
trigger: always_on
description: Aturan otomatis untuk sesi #Build — Menyiapkan commit dan push setiap selesai perubahan kode dengan konfirmasi eksplisit dari pengguna sebelum dijalankan.
---

# 🚀 Git Commit & Push Workflow (Khusus Sesi #Build)

Setiap kali Anda berada dalam **sesi `#Build`** (atau ketika menyelesaikan task implementasi/perubahan kode pada projek ini), Anda **HARUS** mengikuti protokol berikut:

## 1. Deteksi Perubahan Setelah Task Selesai
Setelah menyelesaikan pengeditan kode, perbaikan bug, atau penambahan fitur baru:
1. Jalankan `git status` dan `git diff --stat` untuk melihat seluruh berkas yang telah dimodifikasi, dibuat, atau dihapus.
2. Analisis perubahan tersebut dan susun:
   - **Ringkasan Singkat Perubahan**: Poin-poin apa saja yang diubah.
   - **Rancangan Pesan Commit (Conventional Commits)**: Format standar seperti `feat(...)`, `fix(...)`, `refactor(...)`, `style(...)`, `docs(...)`, atau `chore(...)`.

## 2. WAJIB Tanyakan Konfirmasi ke Pengguna (Approval Gate)
**DILARANG KERAS** menjalankan `git commit` atau `git push` secara diam-diam tanpa persetujuan user.
Tampilkan secara jelas ke user:
- Daftar file yang terpengaruh.
- Pesan commit yang diusulkan.
- Pertanyaan interaktif persetujuan:
  > *"Perubahan kode telah selesai. Apakah Anda ingin saya melakukan commit dan push dengan pesan di atas ke remote repository sekarang? [Ya / Ubah Pesan / Lewati]"*

## 3. Eksekusi Setelah Persetujuan
- **Jika User Menyetujui (Ya)**:
  1. `git add <files>` (atau `git add .` jika semua perubahan relevan).
  2. `git commit -m "<pesan yang disepakati>"`.
  3. `git push origin <branch_aktif>`.
  4. Berikan konfirmasi bahwa commit & push telah berhasil disertai hash commit atau status remote.
- **Jika User Menginginkan Revisi Pesan**:
  - Sesuaikan pesan commit sesuai instruksi user, lalu tanyakan konfirmasi ulang sebelum eksekusi.
- **Jika User Menolak / Memilih Lewati**:
  - Batalkan proses commit/push dan lanjutkan pekerjaan berikutnya.
