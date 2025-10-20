PHASE 2: DATABASE DESIGN & MIGRATION
2.1 Buat Schema & Migrations untuk 10+ Tabel
Tabel 1: users

 id (PK, UUID)
 email (unique)
 password (hashed)
 full_name
 role (enum: 'admin', 'petugas')
 created_at, updated_at

Tabel 2: criteria

 id (PK)
 code (C1, C2, dst)
 name (Tekanan Darah, Berat Badan, dst)
 type (enum: 'benefit', 'cost')
 weight (bobot, default sesuai dokumen)
 created_at, updated_at

Tabel 3: sub_criteria

 id (PK)
 criteria_id (FK ke criteria)
 name (Rendah, Normal, Tinggi, dst)
 value (nilai: 1, 2, 3, dst)
 min_value (untuk range, misal BB >= 50)
 max_value (untuk range, misal BB < 65)
 description
 created_at, updated_at

Tabel 4: events

 id (PK, UUID)
 name
 location
 start_date
 end_date
 status (enum: 'draft', 'active', 'completed')
 description
 created_by (FK ke users)
 created_at, updated_at

Tabel 5: event_officers

 id (PK)
 event_id (FK ke events)
 user_id (FK ke users dengan role petugas)
 assigned_at
 assigned_by (FK ke users admin)

Tabel 6: donors

 id (PK, UUID)
 event_id (FK ke events)
 full_name
 birth_date
 gender (enum: 'male', 'female')
 blood_type (A, B, AB, O)
 phone
 address
 registered_by (FK ke users petugas)
 created_at, updated_at

Tabel 7: donor_examinations

 id (PK, UUID)
 donor_id (FK ke donors)
 blood_pressure_systolic (int)
 blood_pressure_diastolic (int)
 weight (decimal)
 hemoglobin (decimal)
 medication_free_days (int)
 age (int, calculated dari birth_date)
 last_sleep_hours (decimal)
 has_disease_history (boolean)
 examination_date
 examined_by (FK ke users petugas)
 created_at, updated_at

Tabel 8: examination_criteria_values

 id (PK)
 examination_id (FK ke donor_examinations)
 criteria_id (FK ke criteria)
 raw_value (nilai asli input)
 normalized_value (nilai setelah mapping ke sub_criteria)
 created_at

Tabel 9: moora_calculations

 id (PK, UUID)
 examination_id (FK ke donor_examinations)
 normalized_matrix (JSONB, menyimpan hasil normalisasi)
 optimization_value (Yi, hasil benefit - cost)
 rank (peringkat)
 is_eligible (boolean, berdasarkan threshold)
 calculated_at
 created_at

Tabel 10: system_settings

 id (PK)
 key (unique, misal: 'eligibility_threshold')
 value (misal: '0.309')
 description
 updated_by (FK ke users)
 updated_at

Tabel 11: calculation_history (untuk audit)

 id (PK, UUID)
 event_id (FK ke events)
 total_donors (int)
 eligible_count (int)
 calculation_details (JSONB)
 generated_by (FK ke users)
 created_at


PHASE 3: AUTHENTICATION & AUTHORIZATION
3.1 Authentication Middleware

 Buat middleware authenticate (verify JWT token)
 Buat middleware authorize(['admin']) (check role)
 Buat middleware authorize(['admin', 'petugas'])

3.2 Auth Routes & Controllers

 POST /api/auth/register (hanya untuk admin, create user baru)
 POST /api/auth/login (login admin/petugas)
 GET /api/auth/me (get current user profile)


PHASE 4: ADMIN FEATURES
4.1 User Management (CRUD Petugas)

 GET /api/admin/petugas (list all petugas)
 GET /api/admin/petugas/:id (detail petugas)
 POST /api/admin/petugas (create petugas via register)
 PUT /api/admin/petugas/:id (update petugas)
 DELETE /api/admin/petugas/:id (delete petugas)

4.2 Criteria Management (CRUD Criteria)

 GET /api/admin/criteria (list all criteria + sub criteria)
 GET /api/admin/criteria/:id (detail criteria)
 POST /api/admin/criteria (create criteria)
 PUT /api/admin/criteria/:id (update criteria, termasuk weight)
 DELETE /api/admin/criteria/:id (delete criteria)

4.3 Sub Criteria Management (CRUD Sub Criteria)

 GET /api/admin/sub-criteria (list by criteria_id)
 POST /api/admin/sub-criteria (create sub criteria)
 PUT /api/admin/sub-criteria/:id (update sub criteria)
 DELETE /api/admin/sub-criteria/:id (delete sub criteria)

4.4 Event Management (CRUD Event)

 GET /api/admin/events (list all events)
 GET /api/admin/events/:id (detail event)
 POST /api/admin/events (create event)
 PUT /api/admin/events/:id (update event, hanya jika status != 'completed')
 DELETE /api/admin/events/:id (delete event)
 PATCH /api/admin/events/:id/status (ubah status: draft→active→completed)

4.5 Event Officer Assignment

 GET /api/admin/events/:id/officers (list petugas di event)
 POST /api/admin/events/:id/officers (assign petugas ke event)
 DELETE /api/admin/events/:eventId/officers/:officerId (remove petugas dari event)

4.6 System Settings

 GET /api/admin/settings (get all settings, termasuk threshold)
 PUT /api/admin/settings/:key (update setting, misal threshold)

4.7 Reports & Analytics

 GET /api/admin/reports (list all calculation history)
 GET /api/admin/reports/:eventId (detail laporan per event: donors, rankings, eligible)
 GET /api/admin/dashboard/statistics (total events, donors, petugas, dll)


PHASE 5: PETUGAS FEATURES
5.1 Event Access

 GET /api/petugas/my-events (list event yang di-assign ke petugas ini)
 GET /api/petugas/events/:id (detail event, hanya jika assigned)

5.2 Donor Registration & Examination (Input Sekaligus)

 POST /api/petugas/events/:eventId/donors (create donor + examination sekaligus)

Validasi: event status harus 'active'
Validasi: petugas harus ter-assign ke event ini
Validasi: event belum completed
Input: biodata (full_name, birth_date, gender, blood_type, phone, address)
Input: examination (blood_pressure, weight, hemoglobin, medication_free_days, last_sleep_hours, has_disease_history)
Trigger MOORA calculation otomatis setelah insert



5.3 View Donors in Event

 GET /api/petugas/events/:eventId/donors (list all donors + examination + ranking)
 GET /api/petugas/events/:eventId/donors/:donorId (detail donor + examination + moora result)

5.4 Update Donor (jika event masih active)

 PUT /api/petugas/events/:eventId/donors/:donorId (update biodata + examination)

Validasi: event status bukan 'completed'
Re-trigger MOORA calculation setelah update




PHASE 6: MOORA CALCULATION ENGINE
6.1 Utility Functions untuk MOORA

 Function: mapInputToCriteriaValue(criteriaId, rawValue)

Mapping input ke nilai sub_criteria (misal: BB 58kg → nilai 4)


 Function: buildDecisionMatrix(examinationId)

Ambil semua nilai kriteria dari examination
Return matrix X (1 alternatif × 7 kriteria)


 Function: normalizeMatrix(matrix)

Implementasi rumus: X*ij = Xij / √(Σ Xij²)
Return normalized matrix


 Function: calculateOptimization(normalizedMatrix, weights)

Implementasi: Yi = Σ(Wj × Xij) untuk benefit - Σ(Wj × Xij) untuk cost
Return Yi value


 Function: rankDonors(eventId)

Ambil semua donor di event
Hitung Yi untuk semua
Ranking berdasarkan Yi tertinggi
Tentukan eligibility berdasarkan threshold
Update tabel moora_calculations



6.2 MOORA Trigger

 Hook: After Create/Update Examination

Otomatis panggil MOORA calculation
Simpan hasil ke tabel moora_calculations
Update rank untuk semua donor di event yang sama




PHASE 7: DATA SEEDING
7.1 Seed Data Default

 Seed 1 Admin user (email: admin@pmi.com)
 Seed 7 Criteria sesuai dokumen (C1-C7 dengan bobot)
 Seed Sub Criteria untuk setiap criteria sesuai Tabel 2 di dokumen
 Seed System Settings (threshold = 0.309)
 Seed 2-3 Petugas dummy (opsional)
 Seed 1-2 Event dummy (opsional)


PHASE 8: VALIDATION & ERROR HANDLING
8.1 Input Validation

 Validasi email format
 Validasi password strength (min 6 karakter)
 Validasi blood_pressure (format systolic/diastolic)
 Validasi weight (> 0)
 Validasi hemoglobin (> 0)
 Validasi age (dihitung dari birth_date, minimal 17 tahun untuk warning tapi tetap bisa input)
 Validasi phone format
 Validasi event dates (start_date < end_date)

8.2 Business Logic Validation

 Petugas tidak bisa akses event yang bukan assigned kepadanya
 Event status 'completed' tidak bisa diubah
 Donor tidak bisa ditambah ke event dengan status 'completed'
 Criteria weight total harus = 100% (opsional, atau dibiarkan fleksibel)

8.3 Error Handling

 Global error handler middleware
 Custom error classes (ValidationError, AuthenticationError, AuthorizationError, NotFoundError)
 Consistent error response format


PHASE 9: TESTING & VALIDATION
9.1 Manual Testing

 Test auth flow (register, login, token refresh)
 Test admin CRUD operations (petugas, criteria, event)
 Test petugas donor registration flow
 Test MOORA calculation dengan data dari dokumen (5 alternatif)
 CRITICAL: Validasi hasil MOORA cocok dengan hasil di dokumen (A3 = 0.446 rank 1)
 Test ranking update saat ada donor baru di event yang sama
 Test event status change (draft → active → completed)
 Test read-only restriction pada event completed
 Test threshold setting update & impact ke eligibility

9.2 Edge Cases Testing

 Test input data ekstrem (umur 99 tahun, BB 150kg, dll)
 Test delete petugas yang sedang assigned ke event
 Test delete criteria yang sedang dipakai
 Test concurrent donor registration di event yang sama


PHASE 10: DOCUMENTATION & DEPLOYMENT PREPARATION
10.1 Code Documentation

 Comment di setiap function penting
 Dokumentasi MOORA calculation step-by-step di file terpisah

10.2 README.md

 Installation guide
 Environment variables list
 Database migration command
 Seeding command
 API endpoints list (manual, tanpa Swagger)
 Default credentials untuk testing

10.3 Deployment Prep

 Setup production environment variables
 Database backup strategy
 Security checklist (CORS, rate limiting, helmet, dll)


PHASE 11: FUTURE FEATURES (PDF Report - NANTI)
11.1 PDF Generation

 Install pdfkit atau puppeteer
 Buat template PDF report
 GET /api/admin/reports/:eventId/pdf (download PDF)


CATATAN PENTING:

MOORA Calculation harus 100% sesuai dokumen:

Gunakan 5 alternatif dari dokumen sebagai test case
Hasil A3 harus = 0.446 (rank 1)
Hasil A1 = 0.375 (rank 2)
Hasil A5 = 0.309 (rank 3)
Hasil A4 = 0.299 (rank 4)
Hasil A2 = 0.288 (rank 5)


Threshold Global:

Default = 0.309
Bisa diubah Admin via system_settings
Berlaku untuk semua event


Data Kriteria Default (Seeder):

C1: Tekanan Darah (Benefit, 25%)
C2: Berat Badan (Benefit, 15%)
C3: Hemoglobin (Benefit, 25%)
C4: Tidak Konsumsi Obat (Benefit, 15%)
C5: Umur (Cost, 10%)
C6: Lamanya Terakhir Tidur (Benefit, 5%)
C7: Riwayat Penyakit (Benefit, 5%)


Flow Utama:

Admin buat Event → Assign Petugas → Petugas input Donor (biodata + examination sekaligus) → MOORA auto calculate → Ranking tersimpan → Admin lihat laporan


Jika ingin ada yang ditanyakan silahkan, AKU MENGGUNAKAN PRISMA ORM 