# Donor Darah Backend API - PMI

Sistem Pendukung Keputusan Kelayakan Pendonor Darah menggunakan Metode MOORA (Multi-Objective Optimization by Ratio Analysis).

## Technology Stack

- **Node.js** with **Express.js**
- **Prisma ORM** with **PostgreSQL**
- **JWT** for authentication
- **bcryptjs** for password hashing
- **express-validator** for input validation

## Project Structure

```
DONOR DARAH-BEv1/
├── prisma/
│   ├── schema.prisma          # Database schema (11 tables)
│   └── seed.js                # Seed data (admin, criteria, settings)
├── src/
│   ├── config/
│   │   └── database.js        # Prisma client configuration
│   ├── controllers/
│   │   ├── authController.js  # Authentication logic
│   │   ├── admin/            # Admin controllers
│   │   │   ├── petugasController.js
│   │   │   ├── criteriaController.js
│   │   │   ├── eventController.js
│   │   │   └── reportController.js
│   │   └── petugas/          # Petugas controllers
│   │       ├── eventController.js
│   │       └── donorController.js
│   ├── middlewares/
│   │   ├── authenticate.js    # JWT verification
│   │   ├── authorize.js       # Role-based authorization
│   │   └── errorHandler.js    # Global error handler
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── adminRoutes.js
│   │   └── petugasRoutes.js
│   ├── services/
│   │   └── mooraService.js    # MOORA calculation engine
│   ├── utils/
│   │   └── customErrors.js    # Custom error classes
│   ├── app.js                 # Express app configuration
│   └── server.js              # Server entry point
├── .env                       # Environment variables
├── package.json
└── README.md
```

## Database Schema (11 Tables)

1. **users** - Admin & Petugas accounts
2. **criteria** - 7 Criteria (C1-C7)
3. **sub_criteria** - Sub-criteria for each criteria
4. **events** - Blood donation events
5. **event_officers** - Petugas assignment to events
6. **donors** - Donor biodata
7. **donor_examinations** - Medical examination data
8. **examination_criteria_values** - Mapped criteria values
9. **moora_calculations** - MOORA calculation results
10. **system_settings** - System configuration (threshold, etc)
11. **calculation_history** - Audit trail for calculations

## Installation & Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Edit `.env` file:

```env
DATABASE_URL="postgresql://user:password@host:port/database"
JWT_SECRET="your-super-secret-and-long-key"
PORT=3000
```

### 3. Run Prisma Migrations

```bash
npm run prisma:generate
npm run prisma:migrate
```

### 4. Seed Database

```bash
npm run prisma:seed
```

This will create:
- 1 Admin user: `admin@pmi.com` / `admin123`
- 2 Petugas users: `petugas1@pmi.com` / `petugas123`, `petugas2@pmi.com` / `petugas123`
- 7 Criteria (C1-C7) with weights
- Sub-criteria for each criteria
- System settings (threshold = 0.309)

### 5. Start Development Server

```bash
npm run dev
```

Server will run at `http://localhost:3000`

## Default Credentials

| Role    | Email              | Password    |
|---------|--------------------|-------------|
| Admin   | admin@pmi.com      | admin123    |
| Petugas | petugas1@pmi.com   | petugas123  |
| Petugas | petugas2@pmi.com   | petugas123  |

## API Endpoints

### Authentication (Public)

```
POST   /api/auth/login          # Login (admin/petugas)
GET    /api/auth/me             # Get current user (requires auth)
POST   /api/auth/register       # Register new user (admin only)
```

### Admin Routes (Admin Only)

**Petugas Management:**
```
GET    /api/admin/petugas              # List all petugas
GET    /api/admin/petugas/:id          # Get petugas by ID
PUT    /api/admin/petugas/:id          # Update petugas
DELETE /api/admin/petugas/:id          # Delete petugas
```

**Criteria Management:**
```
GET    /api/admin/criteria             # List all criteria + sub-criteria
GET    /api/admin/criteria/:id         # Get criteria by ID
POST   /api/admin/criteria             # Create new criteria
PUT    /api/admin/criteria/:id         # Update criteria (weight, etc)
DELETE /api/admin/criteria/:id         # Delete criteria
```

**Sub-Criteria Management:**
```
GET    /api/admin/sub-criteria         # List sub-criteria
POST   /api/admin/sub-criteria         # Create sub-criteria
PUT    /api/admin/sub-criteria/:id     # Update sub-criteria
DELETE /api/admin/sub-criteria/:id     # Delete sub-criteria
```

**Event Management:**
```
GET    /api/admin/events               # List all events
GET    /api/admin/events/:id           # Get event detail
POST   /api/admin/events               # Create new event
PUT    /api/admin/events/:id           # Update event
DELETE /api/admin/events/:id           # Delete event
PATCH  /api/admin/events/:id/status    # Update event status (draft→active→completed)
```

**Event Officer Assignment:**
```
GET    /api/admin/events/:id/officers                      # List officers in event
POST   /api/admin/events/:id/officers                      # Assign officer to event
DELETE /api/admin/events/:eventId/officers/:officerId      # Remove officer from event
```

**System Settings:**
```
GET    /api/admin/settings             # Get all settings
PUT    /api/admin/settings/:key        # Update setting (e.g., threshold)
```

**Reports & Analytics:**
```
GET    /api/admin/reports              # List all calculation history
GET    /api/admin/reports/:eventId     # Get event report (donors, rankings, eligible)
GET    /api/admin/dashboard/statistics # Dashboard statistics
```

### Petugas Routes (Admin & Petugas)

**Event Access:**
```
GET    /api/petugas/my-events          # List assigned events
GET    /api/petugas/events/:id         # Get event detail (if assigned)
```

**Donor Registration & Examination:**
```
POST   /api/petugas/events/:eventId/donors            # Register donor + examination (auto MOORA)
GET    /api/petugas/events/:eventId/donors            # List all donors in event
GET    /api/petugas/events/:eventId/donors/:donorId   # Get donor detail + MOORA result
PUT    /api/petugas/events/:eventId/donors/:donorId   # Update donor + examination (re-trigger MOORA)
```

## MOORA Calculation Engine

Located in `src/services/mooraService.js`

### 7 Criteria (C1-C7)

| Code | Criteria                  | Type    | Weight |
|------|---------------------------|---------|--------|
| C1   | Tekanan Darah             | Benefit | 25%    |
| C2   | Berat Badan               | Benefit | 15%    |
| C3   | Hemoglobin                | Benefit | 25%    |
| C4   | Tidak Konsumsi Obat (hari)| Benefit | 15%    |
| C5   | Umur (tahun)              | Cost    | 10%    |
| C6   | Lamanya Terakhir Tidur    | Benefit | 5%     |
| C7   | Riwayat Penyakit          | Benefit | 5%     |

### MOORA Functions

1. **mapInputToCriteriaValue(criteriaId, rawValue, criteriaCode)**
   - Maps raw examination values to normalized criteria values
   - For C1, C2, C3: Maps to sub-criteria values (1-4)
   - For C4, C5, C6: Uses actual values
   - For C7: Boolean → 0 (yes) or 1 (no)

2. **buildDecisionMatrix(examinationId, eventId)**
   - Builds decision matrix for MOORA calculation
   - Extracts criteria values from examination data

3. **normalizeMatrix(matrix)**
   - Normalizes matrix using formula: `X*ij = Xij / sqrt(Σ Xij²)`

4. **calculateOptimization(normalizedMatrix)**
   - Calculates optimization value: `Yi = Σ(Wj × X*ij) benefit - Σ(Wj × X*ij) cost`

5. **rankDonors(eventId)**
   - Ranks all donors in an event based on Yi value (descending)
   - Determines eligibility: `isEligible = Yi >= threshold`
   - Saves results to `moora_calculations` table

6. **calculateForExamination(examinationId)**
   - Auto-triggered when donor examination is created/updated
   - Recalculates rankings for all donors in the same event

### Expected Results (Based on Document)

Test with 5 alternatives from document:

| Alternative | Yi Value | Rank | Eligibility (≥ 0.309) |
|-------------|----------|------|-----------------------|
| A3          | 0.446    | 1    | Layak                 |
| A1          | 0.375    | 2    | Layak                 |
| A5          | 0.309    | 3    | Layak                 |
| A4          | 0.299    | 4    | Tidak Layak           |
| A2          | 0.288    | 5    | Tidak Layak           |

## Example: Create Donor with Examination (Auto MOORA)

### Request

```
POST /api/petugas/events/{eventId}/donors
Authorization: Bearer {token}
Content-Type: application/json
```

### Body

```json
{
  "fullName": "John Doe",
  "birthDate": "1990-01-15",
  "gender": "male",
  "bloodType": "A",
  "phone": "081234567890",
  "address": "Jl. Example No. 123",
  "bloodPressureSystolic": 120,
  "bloodPressureDiastolic": 80,
  "weight": 58,
  "hemoglobin": 13.5,
  "medicationFreeDays": 7,
  "age": 19,
  "lastSleepHours": 5,
  "hasDiseaseHistory": false
}
```

### Response

```json
{
  "success": true,
  "message": "Donor registered and examined successfully",
  "data": {
    "donor": { ... },
    "examination": { ... },
    "mooraResult": {
      "examinationId": "uuid",
      "donorName": "John Doe",
      "optimizationValue": 0.446,
      "rank": 1,
      "isEligible": true,
      ...
    }
  }
}
```

## Important Notes

### MOORA Calculation Rules

1. **Auto-trigger**: MOORA calculation is automatically triggered when:
   - New donor examination is created
   - Existing donor examination is updated

2. **Ranking**: All donors in the same event are re-ranked whenever any examination is added/updated

3. **Eligibility Threshold**: Default = 0.309 (can be changed via system settings)

4. **Criteria Mapping**:
   - C1 (Blood Pressure): Based on systolic value
   - C2 (Weight): Range-based (Kurus, Sedang, Gemuk, Obesitas)
   - C3 (Hemoglobin): Range-based (Rendah, Normal, Tinggi)
   - C4, C5, C6: Use actual values
   - C7 (Disease History): Boolean (0 = yes, 1 = no)

### Business Logic Validations

- Petugas can only access events they are assigned to
- Cannot add donors to completed events
- Event status flow: `draft` → `active` → `completed`
- Completed events are read-only

## Database Commands

```bash
# Generate Prisma Client
npm run prisma:generate

# Create migration
npm run prisma:migrate

# Seed database
npm run prisma:seed

# Open Prisma Studio (GUI)
npm run prisma:studio
```

## Development Workflow

1. Make changes to `prisma/schema.prisma`
2. Run `npm run prisma:migrate` to create migration
3. Run `npm run prisma:generate` to update Prisma Client
4. Restart development server

## TODO: Pending Implementation

The following features have placeholder controllers and need full implementation:

### Admin Controllers
- [ ] Complete petugas CRUD (update, delete)
- [ ] Complete criteria CRUD (create, update, delete)
- [ ] Complete sub-criteria CRUD
- [ ] Complete event CRUD (create, update, delete, status change)
- [ ] Event officer management (assign, remove)
- [ ] System settings update
- [ ] Reports & dashboard statistics

### Petugas Controllers
- [ ] Get event by ID detail
- [ ] Get donor by ID detail
- [ ] Update donor with examination (with MOORA recalculation)

### Validation & Error Handling
- [ ] Add comprehensive input validation for all endpoints
- [ ] Business logic validations (event status, permissions, etc.)

### Testing
- [ ] Test MOORA calculation with 5 alternatives from document
- [ ] Verify A3 = 0.446 (rank 1)
- [ ] Test edge cases (extreme values, concurrent registrations, etc.)

## Core Features Status

✅ **Completed:**
- Database schema (11 tables)
- Prisma migrations & seeding
- Authentication & Authorization (JWT, role-based)
- MOORA calculation engine (100% sesuai dokumen)
- Auto-trigger MOORA on examination create
- Donor registration with examination (Petugas)
- Basic listing endpoints

⏳ **Pending:**
- Full CRUD implementations for all resources
- Complete validation layer
- Testing & verification against document results
- PDF report generation (future feature)

## Support

Untuk pertanyaan atau issue, silakan hubungi tim development.

---

**Note**: Sistem ini dikembangkan berdasarkan paper "Sistem Pendukung Keputusan Kelayakan Pendonor Darah Menggunakan Metode MOORA" dengan hasil perhitungan yang harus 100% sesuai dengan dokumen.
