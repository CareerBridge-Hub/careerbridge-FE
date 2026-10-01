// Demo data. Companies, institutions and programs are invented; KBJI codes are the ISCO-08 unit groups
// KBJI 2014 follows, picked as the closest fit. Links go to real search pages so they open something
// honest instead of a made-up URL. Replace all of this with the team's Google Sheet via the admin CSV import.
import type { Db, Institution, JobPosting, JobRole, JobSkill, Skill, Training, User } from '../lib/types.ts'

const S = (id: string, nama: string, kategori: string, alias: string[] = []): Skill => ({ id, nama, kategori, alias })

export const SKILLS: Skill[] = [
  // Umum
  S('komunikasi', 'Komunikasi', 'Umum', ['komunikasi efektif', 'communication', 'communication skills']),
  S('kerja-tim', 'Kerja Tim', 'Umum', ['teamwork', 'kerja sama tim', 'kerjasama tim']),
  S('manajemen-waktu', 'Manajemen Waktu', 'Umum', ['time management']),
  S('pemecahan-masalah', 'Pemecahan Masalah', 'Umum', ['problem solving']),
  S('bahasa-inggris', 'Bahasa Inggris', 'Umum', ['english', 'inggris', 'toefl']),
  // Perkantoran
  S('ms-excel', 'Microsoft Excel', 'Perkantoran', ['excel', 'ms excel', 'ms. excel', 'spreadsheet']),
  S('ms-word', 'Microsoft Word', 'Perkantoran', ['word', 'ms word', 'ms. word']),
  S('ms-powerpoint', 'Microsoft PowerPoint', 'Perkantoran', ['powerpoint', 'ppt', 'ms powerpoint']),
  S('google-workspace', 'Google Workspace', 'Perkantoran', ['google docs', 'google sheets', 'g suite', 'gsuite']),
  S('administrasi-perkantoran', 'Administrasi Perkantoran', 'Perkantoran', ['administrasi', 'admin kantor', 'office administration']),
  S('pengarsipan', 'Pengarsipan', 'Perkantoran', ['arsip', 'filing', 'kearsipan']),
  S('korespondensi', 'Korespondensi Bisnis', 'Perkantoran', ['korespondensi', 'surat menyurat', 'menulis surat resmi']),
  S('entri-data', 'Entri Data', 'Perkantoran', ['data entry', 'input data']),
  // Keuangan
  S('akuntansi-dasar', 'Akuntansi Dasar', 'Keuangan', ['akuntansi', 'accounting', 'pembukuan', 'jurnal umum']),
  S('laporan-keuangan', 'Laporan Keuangan', 'Keuangan', ['financial report', 'financial statement']),
  S('software-akuntansi', 'Software Akuntansi', 'Keuangan', ['accurate', 'myob', 'zahir', 'jurnal.id']),
  S('perpajakan-dasar', 'Perpajakan Dasar', 'Keuangan', ['pajak', 'perpajakan', 'brevet', 'e-faktur']),
  S('rekonsiliasi-bank', 'Rekonsiliasi Bank', 'Keuangan', ['bank reconciliation']),
  S('penagihan', 'Penagihan dan Faktur', 'Keuangan', ['invoicing', 'invoice', 'faktur', 'penagihan']),
  // Layanan pelanggan
  S('layanan-pelanggan', 'Layanan Pelanggan', 'Layanan Pelanggan', ['customer service', 'pelayanan pelanggan', 'cs']),
  S('penanganan-keluhan', 'Penanganan Keluhan', 'Layanan Pelanggan', ['complaint handling', 'menangani komplain']),
  S('crm', 'CRM', 'Layanan Pelanggan', ['customer relationship management', 'salesforce', 'hubspot']),
  // Pemasaran digital
  S('media-sosial', 'Pemasaran Media Sosial', 'Pemasaran Digital', ['social media', 'social media marketing', 'sosmed', 'instagram marketing']),
  S('copywriting', 'Copywriting', 'Pemasaran Digital', ['menulis iklan', 'content writing']),
  S('seo', 'SEO', 'Pemasaran Digital', ['search engine optimization']),
  S('google-analytics', 'Google Analytics', 'Pemasaran Digital', ['ga4', 'analytics']),
  S('iklan-digital', 'Iklan Digital', 'Pemasaran Digital', ['google ads', 'meta ads', 'facebook ads', 'sem', 'digital ads']),
  S('desain-konten', 'Desain Konten', 'Pemasaran Digital', ['canva', 'content design', 'desain feed']),
  S('email-marketing', 'Email Marketing', 'Pemasaran Digital', ['mailchimp', 'email blast']),
  // Data
  S('sql', 'SQL', 'Data', ['mysql', 'postgresql', 'query database', 'database query']),
  S('python', 'Python', 'Data', ['python3', 'pandas']),
  S('statistik', 'Statistika', 'Data', ['statistik', 'statistics', 'statistika dasar']),
  S('visualisasi-data', 'Visualisasi Data', 'Data', ['data visualization', 'dashboard', 'data viz']),
  S('pembersihan-data', 'Pembersihan Data', 'Data', ['data cleaning', 'data wrangling']),
  S('power-bi', 'Power BI', 'Data', ['powerbi', 'ms power bi']),
  S('tableau', 'Tableau', 'Data'),
  // Pengembangan web
  S('html', 'HTML', 'Pengembangan Web', ['html5']),
  S('css', 'CSS', 'Pengembangan Web', ['css3', 'tailwind', 'bootstrap']),
  S('javascript', 'JavaScript', 'Pengembangan Web', ['js', 'javascript es6', 'es6']),
  S('typescript', 'TypeScript', 'Pengembangan Web', ['ts']),
  S('react', 'React', 'Pengembangan Web', ['reactjs', 'react.js']),
  S('nodejs', 'Node.js', 'Pengembangan Web', ['node', 'nodejs', 'express']),
  S('php', 'PHP', 'Pengembangan Web', ['laravel', 'codeigniter']),
  S('git', 'Git', 'Pengembangan Web', ['github', 'gitlab', 'version control']),
  S('rest-api', 'REST API', 'Pengembangan Web', ['api', 'restful api', 'rest']),
  // Desain
  S('figma', 'Figma', 'Desain'),
  S('desain-ui', 'Desain UI', 'Desain', ['ui design', 'user interface design', 'ui designer']),
  S('wireframing', 'Wireframing', 'Desain', ['wireframe']),
  S('prototyping', 'Prototyping', 'Desain', ['prototype', 'prototipe']),
  S('riset-pengguna', 'Riset Pengguna', 'Desain', ['user research', 'ux research', 'usability testing']),
  S('adobe-illustrator', 'Adobe Illustrator', 'Desain', ['illustrator', 'ai design']),
  // Infrastruktur TI
  S('troubleshooting-hardware', 'Troubleshooting Hardware', 'Infrastruktur TI', ['perbaikan komputer', 'hardware repair', 'servis komputer']),
  S('instalasi-os', 'Instalasi Sistem Operasi', 'Infrastruktur TI', ['instal windows', 'install os', 'instalasi windows', 'linux']),
  S('jaringan-komputer', 'Jaringan Komputer', 'Infrastruktur TI', ['networking', 'lan', 'tcp/ip', 'tcp ip']),
  S('helpdesk', 'Helpdesk TI', 'Infrastruktur TI', ['it helpdesk', 'it support', 'technical support']),
  S('mikrotik', 'MikroTik', 'Infrastruktur TI', ['mtcna', 'routerboard']),
  S('keamanan-jaringan', 'Keamanan Jaringan Dasar', 'Infrastruktur TI', ['network security', 'keamanan siber dasar']),
  // Produksi
  S('k3-dasar', 'K3 Dasar', 'Produksi', ['k3', 'keselamatan kerja', 'keselamatan dan kesehatan kerja', 'hse']),
  S('operasi-forklift', 'Operasi Forklift', 'Produksi', ['forklift', 'sio forklift', 'operator forklift']),
  S('mesin-produksi', 'Pengoperasian Mesin Produksi', 'Produksi', ['operator mesin', 'operasi mesin', 'mesin produksi', 'mesin cnc']),
  S('quality-control', 'Pengendalian Kualitas', 'Produksi', ['quality control', 'qc', 'quality check']),
  S('gambar-teknik', 'Membaca Gambar Teknik', 'Produksi', ['gambar teknik', 'technical drawing', 'baca gambar teknik']),
  S('prinsip-5s', 'Prinsip 5S', 'Produksi', ['5s', '5r', 'kaizen 5s']),
  S('lean-manufacturing', 'Lean Manufacturing', 'Produksi', ['lean', 'kaizen']),
  S('pencatatan-produksi', 'Pencatatan Hasil Produksi', 'Produksi', ['laporan produksi', 'pencatatan produksi', 'production report']),
  S('perawatan-mesin', 'Perawatan Mesin Dasar', 'Produksi', ['maintenance', 'perawatan mesin', 'preventive maintenance']),
]

const job = (
  id: string,
  nama: string,
  kodeKbji: string,
  bidang: string,
  deskripsi: string,
  wajib: string[],
  opsional: string[],
): JobRole => ({
  id,
  nama,
  kodeKbji,
  bidang,
  deskripsi,
  skills: [
    ...wajib.map((skillId): JobSkill => ({ skillId, tipe: 'wajib' })),
    ...opsional.map((skillId): JobSkill => ({ skillId, tipe: 'opsional' })),
  ],
})

const TI = 'Teknologi Informasi'
const ADM = 'Administrasi Perkantoran'
const MFG = 'Manufaktur'
const MKT = 'Pemasaran'

export const JOBS: JobRole[] = [
  job('data-analyst', 'Data Analyst', '2511', TI, 'Mengolah dan menganalisis data untuk membantu tim mengambil keputusan.',
    ['sql', 'ms-excel', 'statistik', 'visualisasi-data', 'pembersihan-data'],
    ['python', 'power-bi', 'tableau', 'komunikasi']),
  job('web-developer', 'Web Developer', '2513', TI, 'Membangun dan merawat situs serta aplikasi web.',
    ['html', 'css', 'javascript', 'git', 'rest-api'],
    ['react', 'typescript', 'nodejs', 'php', 'sql']),
  job('ui-ux-designer', 'UI/UX Designer', '2166', TI, 'Merancang tampilan dan alur aplikasi supaya mudah dipakai.',
    ['figma', 'desain-ui', 'wireframing', 'prototyping', 'riset-pengguna'],
    ['html', 'css', 'adobe-illustrator', 'komunikasi']),
  job('it-support', 'IT Support', '3512', TI, 'Membantu pengguna di kantor mengatasi masalah komputer, jaringan, dan perangkat lunak.',
    ['troubleshooting-hardware', 'instalasi-os', 'jaringan-komputer', 'helpdesk'],
    ['mikrotik', 'keamanan-jaringan', 'komunikasi', 'bahasa-inggris', 'pemecahan-masalah']),
  job('staf-administrasi', 'Staf Administrasi', '4110', ADM, 'Mengelola surat, arsip, jadwal, dan data kantor sehari-hari.',
    ['administrasi-perkantoran', 'ms-excel', 'ms-word', 'pengarsipan', 'korespondensi'],
    ['entri-data', 'google-workspace', 'ms-powerpoint', 'komunikasi', 'manajemen-waktu']),
  job('staf-akuntansi', 'Staf Akuntansi', '4311', ADM, 'Mencatat transaksi, menyusun laporan keuangan, dan menyiapkan dokumen pajak.',
    ['akuntansi-dasar', 'ms-excel', 'laporan-keuangan', 'software-akuntansi'],
    ['perpajakan-dasar', 'rekonsiliasi-bank', 'penagihan', 'entri-data']),
  job('customer-service', 'Customer Service', '4222', ADM, 'Melayani pertanyaan dan keluhan pelanggan lewat telepon, chat, atau langsung.',
    ['layanan-pelanggan', 'komunikasi', 'penanganan-keluhan', 'entri-data'],
    ['crm', 'bahasa-inggris', 'ms-excel', 'kerja-tim', 'manajemen-waktu']),
  job('digital-marketing', 'Digital Marketing', '2431', MKT, 'Mempromosikan produk lewat media sosial, mesin pencari, dan iklan digital.',
    ['media-sosial', 'copywriting', 'seo', 'google-analytics', 'iklan-digital'],
    ['desain-konten', 'email-marketing', 'ms-excel', 'komunikasi']),
  job('operator-produksi', 'Operator Produksi', '8189', MFG, 'Menjalankan mesin di lini produksi pabrik sesuai standar kualitas dan keselamatan.',
    ['k3-dasar', 'operasi-forklift', 'mesin-produksi', 'quality-control', 'gambar-teknik', 'prinsip-5s'],
    ['ms-excel', 'kerja-tim', 'komunikasi', 'lean-manufacturing', 'pencatatan-produksi', 'perawatan-mesin']),
]

const inst = (id: string, nama: string, jenis: Institution['jenis'], provinsi: string, kota: string): Institution => ({
  id,
  nama,
  jenis,
  provinsi,
  kota,
  website: `https://www.google.com/search?q=${encodeURIComponent(nama)}`,
})

export const INSTITUTIONS: Institution[] = [
  inst('blk-bekasi', 'BLK Bekasi', 'BLK', 'Jawa Barat', 'Bekasi'),
  inst('blk-bandung', 'BLK Bandung', 'BLK', 'Jawa Barat', 'Bandung'),
  inst('blk-semarang', 'BLK Semarang', 'BLK', 'Jawa Tengah', 'Semarang'),
  inst('blk-surabaya', 'BLK Surabaya', 'BLK', 'Jawa Timur', 'Surabaya'),
  inst('lpk-mandiri', 'LPK Mandiri Karya', 'LPK', 'Jawa Barat', 'Bekasi'),
  inst('lpk-cikarang', 'LPK Teknik Cikarang', 'LPK', 'Jawa Barat', 'Bekasi'),
  inst('lpk-prima', 'LPK Prima Administrasi', 'LPK', 'DKI Jakarta', 'Jakarta Selatan'),
  inst('lpk-tangerang', 'LPK Kreasi Digital', 'LPK', 'Banten', 'Tangerang'),
  inst('lpk-jogja', 'LPK Nusantara Komputer', 'LPK', 'DI Yogyakarta', 'Yogyakarta'),
  inst('kelas-digital', 'Kelas Digital Indonesia', 'Platform', 'DKI Jakarta', 'Jakarta Pusat'),
  inst('akademi-data', 'Akademi Data Terbuka', 'Platform', 'Jawa Barat', 'Bandung'),
  inst('belajar-kantor', 'Belajar Kantor Online', 'Platform', 'Jawa Timur', 'Malang'),
]

let tid = 0
const tr = (
  institutionId: string,
  nama: string,
  biaya: number,
  moda: Training['moda'],
  durasi: string,
  skillIds: string[],
): Training => ({
  id: `tr-${++tid}`,
  institutionId,
  nama,
  biaya,
  moda,
  durasi,
  urlDaftar: `https://www.google.com/search?q=${encodeURIComponent(`pelatihan ${nama}`)}`,
  skillIds,
})

export const TRAININGS: Training[] = [
  // Produksi
  tr('blk-bekasi', 'K3 Dasar', 0, 'luring', '5 hari', ['k3-dasar']),
  tr('lpk-mandiri', 'Operasi Forklift', 850_000, 'luring', '6 hari', ['operasi-forklift', 'k3-dasar']),
  tr('blk-surabaya', 'Operator Forklift Bersertifikat', 0, 'luring', '10 hari', ['operasi-forklift']),
  tr('lpk-cikarang', 'Operator Mesin Produksi', 1_200_000, 'luring', '1 bulan', ['mesin-produksi', 'perawatan-mesin', 'k3-dasar']),
  tr('blk-semarang', 'Quality Control Manufaktur', 0, 'luring', '2 minggu', ['quality-control', 'prinsip-5s', 'pencatatan-produksi']),
  tr('blk-bandung', 'Membaca Gambar Teknik', 0, 'luring', '1 minggu', ['gambar-teknik']),
  tr('kelas-digital', 'Dasar Lean dan 5S', 150_000, 'daring', '8 jam', ['lean-manufacturing', 'prinsip-5s']),
  tr('kelas-digital', 'K3 Umum untuk Pekerja', 0, 'daring', '6 jam', ['k3-dasar']),
  // Perkantoran
  tr('belajar-kantor', 'Microsoft Office untuk Kerja', 0, 'daring', '12 jam', ['ms-excel', 'ms-word', 'ms-powerpoint']),
  tr('lpk-prima', 'Administrasi Perkantoran Modern', 1_500_000, 'luring', '1 bulan', ['administrasi-perkantoran', 'pengarsipan', 'korespondensi', 'ms-word']),
  tr('blk-bekasi', 'Administrasi Perkantoran', 0, 'luring', '3 minggu', ['administrasi-perkantoran', 'pengarsipan', 'entri-data']),
  tr('belajar-kantor', 'Menulis Surat Resmi', 99_000, 'daring', '4 jam', ['korespondensi']),
  tr('lpk-jogja', 'Excel Lanjutan untuk Admin', 450_000, 'luring', '2 minggu', ['ms-excel', 'entri-data']),
  tr('kelas-digital', 'Google Workspace untuk Kantor', 0, 'daring', '5 jam', ['google-workspace']),
  // Keuangan
  tr('lpk-prima', 'Akuntansi Dasar dan Laporan Keuangan', 1_750_000, 'luring', '1 bulan', ['akuntansi-dasar', 'laporan-keuangan', 'rekonsiliasi-bank']),
  tr('belajar-kantor', 'Pembukuan untuk Pemula', 0, 'daring', '10 jam', ['akuntansi-dasar', 'penagihan']),
  tr('lpk-jogja', 'Software Akuntansi (Accurate)', 650_000, 'luring', '2 minggu', ['software-akuntansi', 'laporan-keuangan']),
  tr('kelas-digital', 'Perpajakan Dasar (Brevet A)', 1_100_000, 'daring', '3 minggu', ['perpajakan-dasar']),
  // Layanan pelanggan
  tr('blk-surabaya', 'Customer Service Profesional', 0, 'luring', '2 minggu', ['layanan-pelanggan', 'penanganan-keluhan', 'komunikasi']),
  tr('kelas-digital', 'Komunikasi Efektif di Tempat Kerja', 0, 'daring', '4 jam', ['komunikasi', 'kerja-tim']),
  tr('belajar-kantor', 'Mengelola CRM', 250_000, 'daring', '6 jam', ['crm', 'entri-data']),
  tr('lpk-tangerang', 'Bahasa Inggris untuk Kerja', 900_000, 'luring', '2 bulan', ['bahasa-inggris']),
  // Pemasaran digital
  tr('lpk-tangerang', 'Digital Marketing Intensif', 2_000_000, 'luring', '1 bulan', ['media-sosial', 'copywriting', 'iklan-digital', 'desain-konten']),
  tr('kelas-digital', 'SEO dan Google Analytics', 0, 'daring', '16 jam', ['seo', 'google-analytics']),
  tr('kelas-digital', 'Copywriting untuk Media Sosial', 199_000, 'daring', '6 jam', ['copywriting', 'media-sosial']),
  tr('belajar-kantor', 'Email Marketing Dasar', 0, 'daring', '3 jam', ['email-marketing']),
  // Data
  tr('akademi-data', 'Analisis Data dengan SQL', 0, 'daring', '3 minggu', ['sql', 'pembersihan-data']),
  tr('akademi-data', 'Statistika untuk Analis Data', 0, 'daring', '2 minggu', ['statistik']),
  tr('akademi-data', 'Dashboard dengan Power BI', 350_000, 'daring', '2 minggu', ['power-bi', 'visualisasi-data']),
  tr('lpk-jogja', 'Python untuk Analisis Data', 1_200_000, 'luring', '1 bulan', ['python', 'pembersihan-data', 'visualisasi-data']),
  tr('akademi-data', 'Visualisasi Data dengan Tableau', 0, 'daring', '1 minggu', ['tableau', 'visualisasi-data']),
  // Web dan desain
  tr('lpk-jogja', 'Web Developer Pemula', 1_500_000, 'luring', '2 bulan', ['html', 'css', 'javascript', 'git']),
  tr('kelas-digital', 'Dasar HTML, CSS, dan JavaScript', 0, 'daring', '4 minggu', ['html', 'css', 'javascript']),
  tr('kelas-digital', 'Membangun REST API dengan Node.js', 300_000, 'daring', '3 minggu', ['rest-api', 'nodejs', 'git']),
  tr('lpk-tangerang', 'React untuk Pemula', 1_250_000, 'luring', '1 bulan', ['react', 'typescript']),
  tr('lpk-tangerang', 'UI/UX Design dengan Figma', 1_800_000, 'luring', '1 bulan', ['figma', 'desain-ui', 'wireframing', 'prototyping']),
  tr('kelas-digital', 'Riset Pengguna untuk Pemula', 0, 'daring', '8 jam', ['riset-pengguna']),
  // Infrastruktur TI
  tr('blk-bandung', 'Teknisi Komputer dan Jaringan', 0, 'luring', '1 bulan', ['troubleshooting-hardware', 'instalasi-os', 'jaringan-komputer']),
  tr('blk-semarang', 'MikroTik Dasar (MTCNA)', 0, 'luring', '2 minggu', ['mikrotik', 'jaringan-komputer']),
  tr('kelas-digital', 'IT Helpdesk Fundamental', 0, 'daring', '10 jam', ['helpdesk', 'pemecahan-masalah']),
]

// [job, title, company, location, source, days ago]
const POSTINGS: [string, string, string, string, JobPosting['sumber'], number][] = [
  ['operator-produksi', 'Operator Produksi', 'PT Sinar Logam Abadi', 'Bekasi, Jawa Barat', 'Jooble', 1],
  ['operator-produksi', 'Operator Mesin Injection', 'PT Plastindo Jaya', 'Karawang, Jawa Barat', 'JSearch', 2],
  ['operator-produksi', 'Operator Produksi Shift', 'PT Garmen Sejahtera', 'Semarang, Jawa Tengah', 'Jooble', 4],
  ['operator-produksi', 'Operator Forklift Gudang', 'PT Logistik Prima', 'Cikarang, Jawa Barat', 'Jooble', 6],
  ['staf-administrasi', 'Staf Administrasi Umum', 'PT Cahaya Niaga', 'Jakarta Selatan, DKI Jakarta', 'Jooble', 0],
  ['staf-administrasi', 'Admin Gudang', 'CV Maju Bersama', 'Tangerang, Banten', 'JSearch', 3],
  ['staf-administrasi', 'Staf Administrasi Sekolah', 'Yayasan Pendidikan Harapan', 'Bandung, Jawa Barat', 'Jooble', 5],
  ['staf-akuntansi', 'Staf Akuntansi Junior', 'PT Andalas Distribusi', 'Jakarta Barat, DKI Jakarta', 'JSearch', 1],
  ['staf-akuntansi', 'Admin Keuangan', 'Klinik Sehat Selalu', 'Surabaya, Jawa Timur', 'Jooble', 3],
  ['staf-akuntansi', 'Staf Finance & Accounting', 'PT Kreatif Media', 'Yogyakarta, DI Yogyakarta', 'Jooble', 8],
  ['customer-service', 'Customer Service Online', 'PT Belanja Hemat', 'Jakarta Pusat, DKI Jakarta', 'Jooble', 0],
  ['customer-service', 'Customer Service Bank', 'PT Layanan Prima', 'Medan, Sumatera Utara', 'JSearch', 2],
  ['customer-service', 'Call Center Agent', 'PT Kontak Nusantara', 'Bandung, Jawa Barat', 'Jooble', 7],
  ['digital-marketing', 'Digital Marketing Staff', 'PT Rasa Nusantara', 'Jakarta Selatan, DKI Jakarta', 'Jooble', 1],
  ['digital-marketing', 'Social Media Specialist', 'CV Kopi Pagi', 'Yogyakarta, DI Yogyakarta', 'JSearch', 4],
  ['digital-marketing', 'SEO Specialist', 'PT Toko Daring', 'Tangerang Selatan, Banten', 'Jooble', 9],
  ['data-analyst', 'Data Analyst', 'PT Fintek Mandiri', 'Jakarta Selatan, DKI Jakarta', 'JSearch', 0],
  ['data-analyst', 'Junior Data Analyst', 'PT Ritel Sejahtera', 'Surabaya, Jawa Timur', 'Jooble', 3],
  ['data-analyst', 'Business Intelligence Analyst', 'PT Logistik Cepat', 'Bekasi, Jawa Barat', 'Jooble', 10],
  ['web-developer', 'Frontend Developer', 'PT Aplikasi Kita', 'Bandung, Jawa Barat', 'Jooble', 1],
  ['web-developer', 'Web Developer (PHP)', 'CV Solusi Web', 'Semarang, Jawa Tengah', 'JSearch', 5],
  ['web-developer', 'Fullstack Developer', 'PT Edukasi Digital', 'Jakarta Pusat, DKI Jakarta', 'Jooble', 6],
  ['ui-ux-designer', 'UI/UX Designer', 'PT Kreasi Aplikasi', 'Jakarta Barat, DKI Jakarta', 'Jooble', 2],
  ['ui-ux-designer', 'Product Designer Junior', 'PT Travel Mudah', 'Denpasar, Bali', 'JSearch', 7],
  ['it-support', 'IT Support', 'RS Medika Utama', 'Bekasi, Jawa Barat', 'Jooble', 0],
  ['it-support', 'Teknisi Jaringan', 'PT Net Andalan', 'Makassar, Sulawesi Selatan', 'JSearch', 4],
  ['it-support', 'IT Helpdesk', 'PT Manufaktur Presisi', 'Cikarang, Jawa Barat', 'Jooble', 8],
]

function postingUrl(sumber: JobPosting['sumber'], judul: string, lokasi: string): string {
  const city = lokasi.split(',')[0]
  return sumber === 'Jooble'
    ? `https://id.jooble.org/SearchResult?ukw=${encodeURIComponent(judul)}&rgns=${encodeURIComponent(city)}`
    : `https://www.google.com/search?q=${encodeURIComponent(`lowongan ${judul} ${city}`)}&ibp=htl;jobs`
}

// "demo1234", SHA-256. A real backend must use a slow salted hash (bcrypt/argon2) instead.
const DEMO_HASH = '0ead2060b65992dca4769af601a1b3a35ef38cfad2c2c465bb160ea764157c5d'

/** Sample CV parse result: what the AI step would return for Rina's CV, before dictionary matching. */
export const SAMPLE_CV = {
  pendidikan: ['SMK Negeri 2 Bekasi, Teknik Pemesinan (2019–2022)'],
  pengalaman: [
    { posisi: 'Helper Produksi', tempat: 'PT Mitra Komponen (Bekasi)', periode: '2022–2024' },
    { posisi: 'Operator Mesin Bubut (magang)', tempat: 'CV Presisi Teknik', periode: '2021' },
  ],
  skills: [
    'Ms. Excel',
    'Komunikasi',
    'Administrasi',
    'Operator mesin',
    'QC',
    'Gambar teknik',
    '5S',
    'Teamwork',
    'Kaizen',
    'Laporan produksi',
    'Preventive maintenance',
    'Mengemudi motor',
  ],
}

const localDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export function seed(now = new Date()): Db {
  const day = 86_400_000
  const postings: JobPosting[] = POSTINGS.map(([jobRoleId, judul, perusahaan, lokasi, sumber, ago], i) => ({
    id: `lw-${i + 1}`,
    jobRoleId,
    judul,
    perusahaan,
    lokasi,
    url: postingUrl(sumber, judul, lokasi),
    sumber,
    tanggal: localDate(new Date(now.getTime() - ago * day)),
    hidden: false,
  }))

  const rinaSkills = ['ms-excel', 'komunikasi', 'administrasi-perkantoran', 'mesin-produksi', 'quality-control', 'gambar-teknik', 'prinsip-5s', 'kerja-tim', 'lean-manufacturing', 'pencatatan-produksi', 'perawatan-mesin']
  const users: User[] = [
    {
      id: 'u-demo',
      nama: 'Rina Putri',
      email: 'demo@careerbridge.id',
      passwordHash: DEMO_HASH,
      pendidikan: 'SMK',
      jurusan: 'Teknik Pemesinan',
      provinsi: 'Jawa Barat',
      kota: 'Bekasi',
      role: 'user',
      createdAt: new Date(now.getTime() - 12 * day).toISOString(),
      skills: rinaSkills.map((skillId) => ({ skillId, sumber: 'cv' })),
      targetJobId: 'operator-produksi',
      cv: {
        fileName: 'CV_Rina_Putri.pdf',
        size: 1_980_000,
        uploadedAt: new Date(now.getTime() - 12 * day).toISOString(),
        pendidikan: SAMPLE_CV.pendidikan,
        pengalaman: SAMPLE_CV.pengalaman,
      },
    },
    {
      id: 'u-admin',
      nama: 'Admin CareerBridge',
      email: 'admin@careerbridge.id',
      passwordHash: DEMO_HASH,
      pendidikan: 'S1',
      jurusan: 'Sistem Informasi',
      provinsi: 'DKI Jakarta',
      kota: 'Jakarta Selatan',
      role: 'admin',
      createdAt: new Date(now.getTime() - 30 * day).toISOString(),
      skills: [],
      targetJobId: null,
      cv: null,
    },
  ]

  return {
    users,
    skills: SKILLS,
    jobs: JOBS,
    institutions: INSTITUTIONS,
    trainings: TRAININGS,
    postings,
  }
}

export const PROVINCES = [
  'Aceh', 'Sumatera Utara', 'Sumatera Barat', 'Riau', 'Kepulauan Riau', 'Jambi', 'Sumatera Selatan',
  'Kepulauan Bangka Belitung', 'Bengkulu', 'Lampung', 'DKI Jakarta', 'Jawa Barat', 'Banten', 'Jawa Tengah',
  'DI Yogyakarta', 'Jawa Timur', 'Bali', 'Nusa Tenggara Barat', 'Nusa Tenggara Timur', 'Kalimantan Barat',
  'Kalimantan Tengah', 'Kalimantan Selatan', 'Kalimantan Timur', 'Kalimantan Utara', 'Sulawesi Utara',
  'Gorontalo', 'Sulawesi Tengah', 'Sulawesi Barat', 'Sulawesi Selatan', 'Sulawesi Tenggara', 'Maluku',
  'Maluku Utara', 'Papua', 'Papua Barat', 'Papua Barat Daya', 'Papua Tengah', 'Papua Pegunungan', 'Papua Selatan',
]

export const EDUCATION = ['SMA', 'SMK', 'D3', 'D4', 'S1', 'S2']
