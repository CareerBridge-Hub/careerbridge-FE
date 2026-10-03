# Kamus Data CareerBridge

Dokumen ini menjelaskan isi dua gambar ERD di folder ini:

- `erd-tanpa-chatbot.png`: 17 tabel inti untuk fitur wajib F1 sampai F7 dan fitur simpan favorit.
- `erd-dengan-chatbot.png`: 17 tabel yang sama ditambah 2 tabel untuk fitur chatbot AI (berwarna biru).

Tabel inti di kedua gambar sama persis. Artinya, chatbot bisa ditambahkan di akhir proyek tanpa mengubah tabel yang sudah ada; cukup membuat dua tabel baru.

---

## 1. Perubahan dari rancangan sebelumnya

| Perubahan | Alasan |
|---|---|
| Kolom `users.role` dipindah ke tabel `roles` | Peran akun dikelola sebagai data. Nama dan deskripsi peran bisa ditampilkan di halaman admin, dan peran baru (misalnya akun LPK) bisa ditambah tanpa mengubah struktur tabel `users`. |
| `job_roles` diganti nama menjadi `occupations` | Kata "role" sebelumnya mudah tertukar dengan peran akun. `occupations` berarti jenis pekerjaan (Data Analyst, Web Developer, dan seterusnya). Ikut berganti: `job_role_skills` menjadi `occupation_skills`, kolom `job_role_id` menjadi `occupation_id`. |
| `kode_kbji` dan `kode_isco` digabung menjadi `kode_kbji` | Sampai 4 digit, kode KBJI 2014 sama dengan ISCO-08, jadi dua kolom itu selalu berisi angka yang sama. |
| Tabel baru `provinces` | Provinsi dipakai untuk filter pelatihan. Kalau diketik bebas, "DKI Jakarta" dan "Jakarta" dianggap berbeda dan filter tidak menemukan datanya. Dengan tabel referensi, semua data memakai provinsi yang sama. |
| Tabel baru `fetch_logs` | Mencatat setiap panggilan ke JSearch dan Jooble. Dipakai untuk menjaga kuota (JSearch 200 per bulan, Jooble 500 seumur key) dan sebagai bahan laporan pengujian. |
| Tabel baru `password_reset_tokens` | Untuk fitur lupa password. Hampir pasti diminta pengguna saat uji coba. |
| Tabel baru `favorites` | Untuk fitur simpan favorit: pengguna menyimpan pekerjaan dan pelatihan yang ingin dilihat lagi. |
| Kolom tambahan `created_at`, `updated_at`, `aktif`, `model_ai`, `file_hash`, dan lainnya | Dijelaskan per kolom di bagian 3. |

## 2. Aturan penamaan dan tipe data

- Nama tabel memakai bahasa Inggris bentuk jamak (`users`, `skills`), sedangkan nama kolom memakai bahasa Indonesia (`nama`, `biaya`). Ini mengikuti rancangan awal tim.
- `uuid` dipakai untuk ID data yang terus bertambah, supaya ID tidak bisa ditebak dari URL (misalnya `/cv/3` lalu dicoba `/cv/4`).
- `smallint` dipakai untuk ID tabel referensi yang isinya tetap dan sedikit (`roles`, `provinces`).
- `null` berarti kolom boleh kosong. Kolom tanpa tanda `null` wajib diisi.
- `created_at` diisi otomatis saat baris dibuat; `updated_at` diperbarui setiap kali baris diubah.
- Tipe data ditulis untuk PostgreSQL. Di MySQL, `uuid` menjadi `char(36)` dan `json` tetap `json`.

## 3. Kamus data per tabel

### 3.1 `roles`: peran akun

Menentukan hak akses pengguna. Isinya dibuat sekali saat database disiapkan.

| Kolom | Tipe | Keterangan |
|---|---|---|
| id (PK) | smallint | ID peran. |
| kode (UK) | varchar(20) | Kode yang dibaca program untuk cek hak akses: `user` atau `admin`. Program selalu mengecek `kode`, bukan `id`, supaya tidak bergantung pada urutan data. |
| nama | varchar(50) | Nama yang tampil di layar, misalnya "Pencari Kerja". |
| deskripsi | varchar(255) | Penjelasan singkat hak akses peran ini. |

Data awal:

| id | kode | nama | deskripsi |
|---|---|---|---|
| 1 | user | Pencari Kerja | Mengunggah CV, melihat kecocokan pekerjaan, skill gap, pelatihan, dan lowongan. |
| 2 | admin | Admin | Mengelola kamus skill, pekerjaan, lembaga, pelatihan, dan lowongan. |

### 3.2 `provinces`: daftar provinsi

| Kolom | Tipe | Keterangan |
|---|---|---|
| id (PK) | smallint | ID provinsi. |
| kode_bps (UK) | char(2) | Kode wilayah BPS, misalnya `31` untuk DKI Jakarta. Memudahkan pencocokan dengan data BPS. |
| nama (UK) | varchar(50) | Nama resmi provinsi. Diisi 38 provinsi. |

### 3.3 `users`: akun pencari kerja dan admin

| Kolom | Tipe | Keterangan |
|---|---|---|
| id (PK) | uuid | ID pengguna. |
| role_id (FK) | smallint | Peran akun, mengacu ke `roles.id`. Pendaftaran lewat aplikasi selalu `user`; akun admin dibuat langsung di database. |
| nama | varchar(100) | Nama lengkap. Wajib. |
| email (UK) | varchar(150) | Dipakai untuk login. Disimpan huruf kecil dan tidak boleh dobel. |
| password_hash | varchar(255) | Password yang sudah di-hash dengan bcrypt. Password asli tidak pernah disimpan. Minimal 8 karakter saat dibuat. |
| pendidikan | enum | Pendidikan terakhir: `SMA`, `SMK`, `D3`, `D4`, `S1`, `S2`. |
| jurusan | varchar(100) null | Jurusan sekolah atau kuliah. Boleh kosong. |
| province_id (FK) | smallint | Provinsi domisili, mengacu ke `provinces.id`. Dipakai sebagai filter awal pelatihan. |
| kota | varchar(80) | Kota domisili. |
| target_occupation_id (FK) | uuid null | Pekerjaan yang sedang diincar, mengacu ke `occupations.id`. Kosong sampai pengguna memilih target. |
| persetujuan_cv_at | timestamp | Waktu pengguna mencentang persetujuan pemrosesan CV saat daftar. Disimpan sebagai bukti persetujuan sesuai UU Pelindungan Data Pribadi; jauh lebih kuat daripada sekadar `true`/`false`. |
| aktif | boolean | `false` berarti akun dinonaktifkan admin dan tidak bisa login, tanpa menghapus datanya. Default `true`. |
| last_login_at | timestamp null | Waktu login terakhir. Berguna untuk menghitung pengguna aktif saat uji SUS. |
| created_at | timestamp | Waktu daftar. |
| updated_at | timestamp | Waktu profil terakhir diubah. |

### 3.4 `password_reset_tokens`: lupa password

| Kolom | Tipe | Keterangan |
|---|---|---|
| id (PK) | uuid | ID token. |
| user_id (FK) | uuid | Pemilik token, mengacu ke `users.id`. |
| token_hash (UK) | char(64) | Hash SHA-256 dari token yang dikirim lewat email. Token asli tidak disimpan, jadi kebocoran database tidak bisa dipakai untuk mengambil alih akun. |
| expires_at | timestamp | Batas berlaku, disarankan 30 menit setelah dibuat. |
| used_at | timestamp null | Diisi saat token dipakai, supaya satu token hanya bisa dipakai sekali. |
| created_at | timestamp | Waktu permintaan reset. |

### 3.5 `cv_uploads`: file CV dan hasil bacaan AI

| Kolom | Tipe | Keterangan |
|---|---|---|
| id (PK) | uuid | ID unggahan. |
| user_id (FK) | uuid | Pemilik CV, mengacu ke `users.id`. |
| file_path | varchar(255) | Lokasi file di storage privat. File tidak boleh bisa diakses lewat URL publik. |
| file_name | varchar(255) | Nama file asli, untuk ditampilkan ke pengguna. |
| ukuran_byte | int | Ukuran file. Maksimal 2.097.152 byte (2 MB). |
| file_hash | char(64) | Hash SHA-256 isi file. Kalau pengguna mengunggah file yang sama lagi, hasil lama dipakai ulang tanpa memanggil DeepSeek, jadi menghemat biaya. |
| raw_text | text null | Teks hasil ekstraksi dari PDF. Kosong selama masih diproses. |
| parsed_json | json null | Hasil DeepSeek: pendidikan, pengalaman, dan daftar skill mentah sebelum disamakan dengan kamus. |
| status | enum | `proses` (sedang dibaca), `selesai`, atau `gagal`. |
| pesan_error | text null | Alasan gagal, misalnya "PDF hasil scan, teks tidak terbaca". Membantu saat debugging dan pengujian. |
| model_ai | varchar(50) null | Nama model yang membaca CV, misalnya `deepseek-chat`. Penting untuk laporan akurasi kalau model diganti di tengah jalan. |
| created_at | timestamp | Waktu unggah. |
| updated_at | timestamp | Waktu status terakhir berubah. |

CV yang berlaku adalah unggahan terbaru milik pengguna yang berstatus `selesai`.

### 3.6 `skills`: kamus skill

| Kolom | Tipe | Keterangan |
|---|---|---|
| id (PK) | uuid | ID skill. |
| nama (UK) | varchar(100) | Nama baku skill, misalnya "Microsoft Excel". |
| kategori | varchar(50) | Pengelompokan untuk tampilan: Umum, Perkantoran, Keuangan, dan seterusnya. |
| created_at | timestamp | Waktu dibuat. |
| updated_at | timestamp | Waktu terakhir diubah. |

### 3.7 `skill_aliases`: nama lain skill

Dipakai saat normalisasi hasil CV, supaya "excel", "ms excel", dan "spreadsheet" dihitung sebagai satu skill.

| Kolom | Tipe | Keterangan |
|---|---|---|
| id (PK) | uuid | ID alias. |
| skill_id (FK) | uuid | Skill yang dimaksud, mengacu ke `skills.id`. |
| alias (UK) | varchar(100) | Nama lain dalam huruf kecil. Unik di seluruh tabel; kalau satu alias boleh menunjuk dua skill, normalisasi tidak tahu harus memilih yang mana. |

### 3.8 `user_skills`: skill milik pengguna

| Kolom | Tipe | Keterangan |
|---|---|---|
| user_id (PK, FK) | uuid | Pemilik skill, mengacu ke `users.id`. |
| skill_id (PK, FK) | uuid | Skill yang dimiliki, mengacu ke `skills.id`. |
| sumber | enum | `cv` kalau berasal dari bacaan CV, `manual` kalau dipilih sendiri. Dipakai untuk menghitung akurasi bacaan CV. |
| created_at | timestamp | Waktu skill ditambahkan. |

Primary key gabungan `(user_id, skill_id)` memastikan satu skill tidak tercatat dua kali untuk pengguna yang sama.

### 3.9 `occupations`: jenis pekerjaan

| Kolom | Tipe | Keterangan |
|---|---|---|
| id (PK) | uuid | ID pekerjaan. |
| nama (UK) | varchar(100) | Nama pekerjaan, misalnya "Staf Administrasi". |
| kode_kbji | char(4) | Kode KBJI 2014 (sama dengan ISCO-08 sampai 4 digit), misalnya `4110`. Dipakai sebagai dasar resmi daftar pekerjaan dan jembatan ke database skill ESCO. |
| bidang | varchar(50) | Kelompok bidang: Teknologi Informasi, Administrasi, dan seterusnya. |
| deskripsi | text | Ringkasan tugas pekerjaan. |
| created_at | timestamp | Waktu dibuat. |
| updated_at | timestamp | Waktu terakhir diubah. |

### 3.10 `occupation_skills`: skill yang dibutuhkan pekerjaan

| Kolom | Tipe | Keterangan |
|---|---|---|
| occupation_id (PK, FK) | uuid | Mengacu ke `occupations.id`. |
| skill_id (PK, FK) | uuid | Mengacu ke `skills.id`. |
| tipe | enum | `wajib` (bobot 2) atau `opsional` (bobot 1). Bobot ini dipakai di rumus skor kecocokan. |

Setiap pekerjaan wajib punya minimal satu skill bertipe `wajib`. Aturan ini dicek di backend saat admin menyimpan pekerjaan.

### 3.11 `job_postings`: lowongan hasil tarikan API

| Kolom | Tipe | Keterangan |
|---|---|---|
| id (PK) | uuid | ID lowongan di sistem kita. |
| occupation_id (FK) | uuid | Pekerjaan yang dicari saat lowongan ini ditarik. |
| sumber_api | enum | `JSearch` atau `Jooble`. |
| id_eksternal | varchar(100) | ID lowongan di sistem sumber. Bersama `sumber_api` menjadi kunci unik, jadi tarikan berikutnya memperbarui baris lama, bukan membuat duplikat. |
| judul | varchar(200) | Judul iklan. |
| perusahaan | varchar(150) | Nama perusahaan. |
| lokasi | varchar(100) | Kota atau provinsi lowongan. |
| cuplikan | text null | Potongan deskripsi lowongan. Disiapkan untuk fitur tambahan "baca skill dari lowongan" dan untuk jawaban chatbot. |
| url_sumber (UK) | varchar(500) | Link ke iklan asli. Pengguna melamar di situs sumber, bukan di aplikasi kita. |
| tanggal_posting | date null | Tanggal iklan terbit. Ada sumber yang tidak menyertakannya. |
| fetched_at | timestamp | Waktu terakhir ditarik. Lowongan yang lebih lama dari 30 hari dihapus otomatis. |
| hidden | boolean | `true` kalau disembunyikan admin karena tidak relevan. Tarikan ulang tidak mengubah kolom ini. Default `false`. |

### 3.12 `fetch_logs`: catatan pemanggilan API lowongan

| Kolom | Tipe | Keterangan |
|---|---|---|
| id (PK) | uuid | ID catatan. |
| occupation_id (FK) | uuid null | Pekerjaan yang ditarik. Menjadi kosong kalau pekerjaannya dihapus, tapi catatannya tetap ada supaya hitungan kuota tidak berkurang. |
| sumber_api | enum | `JSearch` atau `Jooble`. |
| status | enum | `ok` (ada hasil), `kosong` (berhasil tapi tanpa hasil), atau `gagal` (error atau timeout). |
| jumlah_hasil | int | Banyaknya lowongan yang diterima. |
| pesan_error | text null | Pesan error dari API kalau gagal. |
| created_at | timestamp | Waktu pemanggilan. |

Cara pakai untuk menjaga kuota:
- JSearch: hitung baris `sumber_api = 'JSearch'` di bulan berjalan, berhenti di 180.
- Jooble: hitung semua baris `sumber_api = 'Jooble'` sejak awal, berhenti di 450.

### 3.13 `institutions`: lembaga pelatihan

| Kolom | Tipe | Keterangan |
|---|---|---|
| id (PK) | uuid | ID lembaga. |
| nama | varchar(150) | Nama lembaga. |
| jenis | enum | `LPK`, `BLK`, atau `Platform` (kursus online). |
| province_id (FK) | smallint | Provinsi lembaga, mengacu ke `provinces.id`. Dipakai untuk filter provinsi. |
| kota | varchar(80) | Kota lembaga. |
| kontak | varchar(100) null | Telepon atau email. |
| website | varchar(255) null | Situs resmi. |
| created_at | timestamp | Waktu dibuat. |
| updated_at | timestamp | Waktu terakhir diubah. |

### 3.14 `trainings`: program pelatihan

| Kolom | Tipe | Keterangan |
|---|---|---|
| id (PK) | uuid | ID program. |
| institution_id (FK) | uuid | Penyelenggara, mengacu ke `institutions.id`. |
| nama | varchar(150) | Nama program. |
| deskripsi | text null | Penjelasan singkat program. Dipakai di kartu pelatihan dan sebagai bahan jawaban chatbot. |
| biaya | int | Biaya dalam rupiah. `0` berarti gratis. |
| moda | enum | `daring` (online) atau `luring` (tatap muka). Program daring selalu lolos filter provinsi karena bisa diikuti dari mana saja. |
| durasi | varchar(50) | Lama pelatihan, misalnya "4 minggu" atau "40 JP". |
| url_daftar | varchar(500) | Link pendaftaran di situs penyelenggara. |
| aktif | boolean | `false` kalau program sudah tidak dibuka. Program tetap tersimpan tapi tidak direkomendasikan. Default `true`. |
| created_at | timestamp | Waktu dibuat. |
| updated_at | timestamp | Waktu terakhir diubah. |

### 3.15 `training_skills`: skill yang diajarkan pelatihan

| Kolom | Tipe | Keterangan |
|---|---|---|
| training_id (PK, FK) | uuid | Mengacu ke `trainings.id`. |
| skill_id (PK, FK) | uuid | Mengacu ke `skills.id`. |

Setiap program wajib mengajarkan minimal satu skill. Tanpa itu, program tidak akan pernah muncul di rekomendasi.

### 3.16 `analyses`: riwayat analisis skill gap

| Kolom | Tipe | Keterangan |
|---|---|---|
| id (PK) | uuid | ID analisis. |
| user_id (FK) | uuid | Pengguna yang dianalisis. |
| occupation_id (FK) | uuid | Pekerjaan pembanding. |
| skor | decimal(5,2) | Persentase kecocokan 0 sampai 100. |
| gap_json | json | Tiga daftar ID skill: dimiliki, wajib yang kurang, opsional yang kurang. Disimpan apa adanya, jadi riwayat tetap benar walaupun data pekerjaan berubah kemudian. |
| penjelasan_ai | text null | Saran belajar dari DeepSeek. Disimpan supaya tidak memanggil AI lagi setiap halaman dibuka. |
| model_ai | varchar(50) null | Model yang menulis penjelasan. |
| created_at | timestamp | Waktu analisis. Dipakai untuk fitur tambahan "riwayat analisis" (membandingkan skor sebelum dan sesudah menambah skill). |

### 3.17 `favorites`: pekerjaan dan pelatihan yang disimpan pengguna

Satu baris berarti satu item favorit. Item bisa berupa pekerjaan atau pelatihan, tapi tidak keduanya sekaligus.

| Kolom | Tipe | Keterangan |
|---|---|---|
| id (PK) | uuid | ID favorit. |
| user_id (FK) | uuid | Pengguna yang menyimpan, mengacu ke `users.id`. |
| training_id (FK) | uuid null | Pelatihan yang disimpan, mengacu ke `trainings.id`. Kosong kalau yang disimpan adalah pekerjaan. |
| occupation_id (FK) | uuid null | Pekerjaan yang disimpan, mengacu ke `occupations.id`. Kosong kalau yang disimpan adalah pelatihan. |
| created_at | timestamp | Waktu disimpan. Dipakai untuk mengurutkan daftar favorit dari yang terbaru. |

Aturan di database:

- `CHECK (num_nonnulls(training_id, occupation_id) = 1)`: tepat satu dari dua kolom itu harus terisi. Favorit kosong atau favorit ganda dalam satu baris ditolak.
- `UNIQUE (user_id, training_id)` dan `UNIQUE (user_id, occupation_id)`: pengguna tidak bisa menyimpan item yang sama dua kali. Tombol favorit cukup menambah atau menghapus baris.

Kenapa satu tabel dengan dua kolom FK, bukan dua tabel terpisah: halaman "Favorit saya" menampilkan pekerjaan dan pelatihan dalam satu daftar yang diurutkan berdasarkan waktu simpan. Dengan satu tabel, daftar itu cukup diambil dengan satu query.

### 3.18 `chat_sessions`: percakapan chatbot (khusus ERD dengan chatbot)

Satu baris berarti satu percakapan, seperti daftar chat di samping layar.

| Kolom | Tipe | Keterangan |
|---|---|---|
| id (PK) | uuid | ID percakapan. |
| user_id (FK) | uuid | Pemilik percakapan. Pengguna hanya bisa melihat percakapannya sendiri. |
| occupation_id (FK) | uuid null | Pekerjaan yang jadi konteks, kalau percakapan dibuka dari halaman detail pekerjaan ("Tanya soal pekerjaan ini"). Kosong kalau percakapan umum. |
| judul | varchar(150) | Judul percakapan, diambil dari pertanyaan pertama. |
| created_at | timestamp | Waktu percakapan dimulai. |
| updated_at | timestamp | Waktu pesan terakhir, untuk mengurutkan daftar percakapan. |

### 3.19 `chat_messages`: isi percakapan (khusus ERD dengan chatbot)

| Kolom | Tipe | Keterangan |
|---|---|---|
| id (PK) | uuid | ID pesan. |
| session_id (FK) | uuid | Percakapan tempat pesan ini, mengacu ke `chat_sessions.id`. |
| peran | enum | `user` (pertanyaan pengguna), `assistant` (jawaban AI), atau `tool` (hasil data yang diambil sistem untuk AI). |
| isi | text | Isi pesan. |
| tool_nama | varchar(50) null | Kalau `peran = tool`: nama data yang diambil, misalnya `lihat_skill_gap` atau `cari_pelatihan`. |
| tool_data | json null | Kalau `peran = tool`: data yang diberikan ke AI. Disimpan supaya jawaban AI bisa diperiksa ulang: AI menjawab dari data mana. |
| model_ai | varchar(50) null | Model yang menjawab. Diisi untuk pesan `assistant`. |
| token_input | int null | Jumlah token masuk. Dipakai untuk menghitung biaya DeepSeek. |
| token_output | int null | Jumlah token keluar. |
| rating | smallint null | Penilaian pengguna atas jawaban: `1` membantu, `-1` tidak membantu. Bahan evaluasi chatbot di laporan. |
| created_at | timestamp | Waktu pesan dikirim. |

## 4. Relasi dan aturan hapus

| Relasi | Kardinalitas | Foreign key | ON DELETE |
|---|---|---|---|
| roles → users | 1 : 0..N | users.role_id | RESTRICT (peran yang masih dipakai tidak bisa dihapus) |
| provinces → users | 1 : 0..N | users.province_id | RESTRICT |
| provinces → institutions | 1 : 0..N | institutions.province_id | RESTRICT |
| users → password_reset_tokens | 1 : 0..N | password_reset_tokens.user_id | CASCADE |
| users → cv_uploads | 1 : 0..N | cv_uploads.user_id | CASCADE (file di storage juga dihapus oleh backend) |
| users ↔ skills (lewat user_skills) | M : N | user_skills.user_id, skill_id | CASCADE |
| skills → skill_aliases | 1 : 0..N | skill_aliases.skill_id | CASCADE |
| occupations ↔ skills (lewat occupation_skills) | M : N, minimal 1 | occupation_skills.occupation_id, skill_id | CASCADE |
| occupations → job_postings | 1 : 0..N | job_postings.occupation_id | CASCADE |
| occupations → fetch_logs | 0..1 : 0..N | fetch_logs.occupation_id | SET NULL (log tetap ada untuk hitungan kuota) |
| occupations → users (target) | 0..1 : 0..N | users.target_occupation_id | SET NULL |
| institutions → trainings | 1 : 0..N | trainings.institution_id | CASCADE |
| trainings ↔ skills (lewat training_skills) | M : N, minimal 1 | training_skills.training_id, skill_id | CASCADE |
| users → analyses | 1 : 0..N | analyses.user_id | CASCADE |
| occupations → analyses | 1 : 0..N | analyses.occupation_id | CASCADE |
| users → favorites | 1 : 0..N | favorites.user_id | CASCADE |
| occupations → favorites | 0..1 : 0..N | favorites.occupation_id | CASCADE (pekerjaan yang dihapus hilang dari daftar favorit) |
| trainings → favorites | 0..1 : 0..N | favorites.training_id | CASCADE |
| users → chat_sessions | 1 : 0..N | chat_sessions.user_id | CASCADE |
| occupations → chat_sessions | 0..1 : 0..N | chat_sessions.occupation_id | SET NULL (percakapan tetap ada) |
| chat_sessions → chat_messages | 1 : 1..N | chat_messages.session_id | CASCADE |

Kalau pengguna menghapus akunnya, semua data pribadinya ikut terhapus: CV, skill, analisis, favorit, dan percakapan. Ini memenuhi hak hapus data di UU Pelindungan Data Pribadi.

## 5. Index yang perlu dibuat

Selain primary key dan kolom unik (yang otomatis ber-index):

| Index | Untuk |
|---|---|
| `job_postings (occupation_id, hidden, tanggal_posting)` | Menampilkan lowongan terbaru per pekerjaan. |
| `job_postings (sumber_api, id_eksternal)` UNIQUE | Mencegah lowongan dobel saat ditarik ulang. |
| `fetch_logs (sumber_api, created_at)` | Hitungan kuota per bulan. |
| `cv_uploads (user_id, created_at)` | Mengambil CV terbaru. |
| `cv_uploads (file_hash)` | Mengecek CV yang sama sebelum memanggil AI. |
| `analyses (user_id, occupation_id, created_at)` | Riwayat analisis. |
| `favorites (user_id, created_at)` | Daftar favorit pengguna, terbaru di atas. |
| `chat_messages (session_id, created_at)` | Menampilkan isi percakapan berurutan. |
| `chat_sessions (user_id, updated_at)` | Daftar percakapan pengguna. |

## 6. Cara kerja chatbot dengan rancangan ini

Chatbot tidak diberi akses langsung ke database. Alurnya:

1. Pengguna mengirim pertanyaan, misalnya "Pelatihan gratis apa yang cocok supaya saya bisa jadi Data Analyst?". Pertanyaan disimpan sebagai pesan `user`.
2. Backend memberi DeepSeek daftar "alat" yang boleh dipakai, misalnya `lihat_skill_gap`, `cari_pelatihan`, `cari_lowongan`. Setiap alat adalah fungsi backend yang hanya membaca data milik pengguna itu dan data umum.
3. DeepSeek memilih alat. Backend menjalankannya dan menyimpan hasilnya sebagai pesan `tool`, lengkap dengan `tool_nama` dan `tool_data`.
4. DeepSeek menyusun jawaban dari data itu. Jawaban disimpan sebagai pesan `assistant`, beserta jumlah token.

Kenapa memakai cara ini:

- **Jawaban berdasar data kita.** Aturan "AI tidak boleh mengarang skill" tetap berlaku, karena AI hanya menjawab dari hasil alat.
- **Aman.** Pengguna tidak bisa membuat AI membaca data orang lain, karena setiap alat sudah dikunci ke `user_id` yang sedang login.
- **Biaya bisa dibatasi.** Contoh: maksimal 30 pesan per hari per pengguna, dihitung dari `chat_messages` dengan `peran = 'user'` hari ini. Tidak perlu tabel tambahan.
- **Bisa dievaluasi.** Kolom `rating` dan `tool_data` menjadi bahan bab pengujian chatbot di laporan.
