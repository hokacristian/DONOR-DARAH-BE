# 📚 Blood Donor SAW API Documentation

## 📝 Overview

API untuk Sistem Pendukung Keputusan Kelayakan Pendonor Darah menggunakan metode **SAW (Simple Additive Weighting)**.

**Base URL:** `http://localhost:3000/api`

---

## 🔐 Authentication

Semua endpoint (kecuali login) memerlukan JWT token dalam header:

```http
Authorization: Bearer <your_jwt_token>
```

---

## 👤 Auth Endpoints

### 1. Login

**POST** `/auth/login`

**Request Body:**
```json
{
  "email": "admin@pmi.com",
  "password": "admin123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "uuid",
      "email": "admin@pmi.com",
      "fullName": "Administrator PMI",
      "role": "admin"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### 2. Get Current User

**GET** `/auth/me`

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "admin@pmi.com",
    "fullName": "Administrator PMI",
    "role": "admin"
  }
}
```

---

## 👨‍💼 Admin - Event Management

### 1. Get All Events

**GET** `/admin/events`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Donor Darah PMI Surabaya - Januari 2025",
      "location": "Gedung PMI Surabaya",
      "startDate": "2025-01-15T08:00:00.000Z",
      "endDate": "2025-01-15T16:00:00.000Z",
      "status": "active",
      "description": "...",
      "_count": {
        "donors": 5,
        "eventOfficers": 1
      }
    }
  ]
}
```

### 2. Create Event

**POST** `/admin/events`

**Request Body:**
```json
{
  "name": "Donor Darah PMI Surabaya 2025",
  "location": "Gedung PMI Surabaya, Jl. Embong Kaliasin No. 20",
  "startDate": "2025-12-01T08:00:00.000Z",
  "endDate": "2025-12-01T16:00:00.000Z",
  "description": "Event donor darah rutin bulanan",
  "status": "active"
}
```

### 3. Get Event by ID

**GET** `/admin/events/:id`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "...",
    "donors": [
      {
        "id": "uuid",
        "fullName": "Budi Santoso",
        "examinations": [
          {
            "id": "uuid",
            "sawEvaluations": [
              {
                "preferenceValue": 0.074654,
                "isEligible": true
              }
            ]
          }
        ]
      }
    ]
  }
}
```

### 4. Update Event

**PUT** `/admin/events/:id`

**Request Body:**
```json
{
  "name": "Updated Event Name",
  "status": "completed"
}
```

### 5. Delete Event

**DELETE** `/admin/events/:id`

### 6. Assign Petugas to Event

**POST** `/admin/events/:eventId/officers`

**Request Body:**
```json
{
  "userId": "petugas-uuid"
}
```

---

## 📊 Admin - Reports & Settings

### 1. Get Dashboard Statistics

**GET** `/admin/dashboard/statistics`

**Response:**
```json
{
  "success": true,
  "data": {
    "statistics": {
      "totalEvents": 2,
      "activeEvents": 1,
      "totalPetugas": 3,
      "totalDonors": 5,
      "totalExaminations": 5,
      "eligibleDonors": 3,
      "notEligibleDonors": 2
    },
    "recentEvents": [...]
  }
}
```

### 2. Get Event Report (SAW Evaluations)

**GET** `/admin/reports/:eventId`

**Response:**
```json
{
  "success": true,
  "data": {
    "event": {
      "id": "uuid",
      "name": "Donor Darah PMI Surabaya - Januari 2025",
      "location": "...",
      "startDate": "...",
      "endDate": "...",
      "status": "active"
    },
    "statistics": {
      "totalDonors": 5,
      "totalExamined": 5,
      "eligibleCount": 3,
      "notEligibleCount": 2,
      "threshold": 0.052
    },
    "evaluations": [
      {
        "donor": {
          "id": "uuid",
          "fullName": "Budi Santoso",
          "birthDate": "1990-05-15",
          "gender": "male",
          "bloodType": "A"
        },
        "examination": {
          "bloodPressureSystolic": 120,
          "bloodPressureDiastolic": 80,
          "weight": 65,
          "hemoglobin": 14.5,
          "medicationFreeDays": 9,
          "age": 35,
          "lastSleepHours": 9,
          "hasDiseaseHistory": false
        },
        "evaluation": {
          "preferenceValue": 0.074654063399029,
          "isEligible": true,
          "status": "LAYAK",
          "calculatedAt": "2025-01-10T10:30:00.000Z"
        },
        "criteriaValues": [...]
      }
    ]
  }
}
```

**Key Points:**
- ✅ **NO RANKING** - Hanya ada status LAYAK/TIDAK LAYAK
- ✅ `preferenceValue` adalah nilai Yi dari SAW
- ✅ `isEligible` = true jika Yi >= 0.0520
- ✅ `status` = "LAYAK" atau "TIDAK LAYAK"

### 3. Get All Settings

**GET** `/admin/settings`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "key": "eligibility_threshold",
      "value": "0.0520",
      "description": "Threshold minimum untuk kelayakan donor darah (berdasarkan nilai Yi SAW)",
      "updatedBy": "admin-uuid",
      "updater": {
        "id": "uuid",
        "fullName": "Administrator PMI",
        "email": "admin@pmi.com"
      }
    }
  ]
}
```

### 4. Update Threshold Setting

**PUT** `/admin/settings/eligibility_threshold`

**Request Body:**
```json
{
  "value": "0.0520"
}
```

**Validation:**
- Value must be numeric
- Range: 0 to 1

---

## 👨‍⚕️ Petugas - Event Management

### 1. Get Assigned Events

**GET** `/petugas/events`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Donor Darah PMI Surabaya - Januari 2025",
      "location": "...",
      "startDate": "...",
      "endDate": "...",
      "status": "active"
    }
  ]
}
```

### 2. Get Event by ID

**GET** `/petugas/events/:id`

---

## 💉 Petugas - Donor Registration & SAW Evaluation

### 1. Register Donor + Examination

**POST** `/petugas/events/:eventId/donors`

**Request Body:**
```json
{
  "fullName": "Budi Santoso",
  "birthDate": "1990-05-15",
  "gender": "male",
  "bloodType": "A",
  "phone": "081234567890",
  "address": "Jl. Merdeka No. 123, Surabaya",
  "bloodPressureSystolic": 120,
  "bloodPressureDiastolic": 80,
  "weight": 65,
  "hemoglobin": 14.5,
  "medicationFreeDays": 9,
  "age": 35,
  "lastSleepHours": 9,
  "hasDiseaseHistory": false
}
```

**Response:**
```json
{
  "success": true,
  "message": "Donor registered and examined successfully",
  "data": {
    "donor": {
      "id": "uuid",
      "eventId": "event-uuid",
      "fullName": "Budi Santoso",
      "birthDate": "1990-05-15T00:00:00.000Z",
      "gender": "male",
      "bloodType": "A",
      "phone": "081234567890",
      "address": "Jl. Merdeka No. 123, Surabaya"
    },
    "examination": {
      "id": "uuid",
      "donorId": "donor-uuid",
      "bloodPressureSystolic": 120,
      "bloodPressureDiastolic": 80,
      "weight": 65,
      "hemoglobin": 14.5,
      "medicationFreeDays": 9,
      "age": 35,
      "lastSleepHours": 9,
      "hasDiseaseHistory": false
    },
    "evaluation": {
      "examinationId": "exam-uuid",
      "donorId": "donor-uuid",
      "preferenceValue": 0.074654063399029,
      "benefitSum": 0.081754068361,
      "costSum": 0.007100004961,
      "isEligible": true,
      "status": "LAYAK",
      "threshold": 0.052,
      "criteriaValues": [
        {
          "criteriaId": 1,
          "code": "C1",
          "rawValue": 120,
          "mappedValue": 3
        },
        {
          "criteriaId": 2,
          "code": "C2",
          "rawValue": 65,
          "mappedValue": 4
        }
      ],
      "normalizedValues": [
        0.100111297066,
        0.104613155068,
        0.082199494062,
        0.107340805088,
        0.071000049615,
        0.101347752821,
        0.093658583369
      ],
      "weightedValues": [
        0.025027824266,
        0.015691973260,
        0.020549873516,
        0.010734080509,
        0.007100004961,
        0.005067387641,
        0.004682929168
      ]
    }
  }
}
```

**🎯 SAW Calculation Details:**

1. **Normalisasi:** `x'ij = xij / Dominator`
2. **Weighted Normalized:** `Vij = wj × x'ij`
3. **Preference Value:** `Yi = Σ(Benefit) - Σ(Cost)`
4. **Decision:** `Yi >= 0.0520 ? LAYAK : TIDAK LAYAK`

**Fixed Dominator Values:**
- C1: 29.966648
- C2: 38.236109
- C3: 36.496575
- C4: 83.845095
- C5: 492.957402
- C6: 88.803153
- C7: 10.677078

**Criteria Weights:**
- C1 (Tekanan Darah): 0.25 (benefit)
- C2 (Berat Badan): 0.15 (benefit)
- C3 (Hemoglobin): 0.25 (benefit)
- C4 (Tidak Konsumsi Obat): 0.10 (benefit)
- C5 (Umur): 0.10 (cost)
- C6 (Lamanya Tidur): 0.05 (benefit)
- C7 (Riwayat Penyakit): 0.05 (benefit)

### 2. Get All Donors in Event

**GET** `/petugas/events/:eventId/donors`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "fullName": "Budi Santoso",
      "examinations": [
        {
          "id": "uuid",
          "sawEvaluations": [
            {
              "preferenceValue": 0.074654,
              "isEligible": true
            }
          ]
        }
      ]
    }
  ]
}
```

---

## 📋 Criteria Values Mapping

### C1 - Tekanan Darah (Blood Pressure - Systolic)
- `< 110`: Mapped to **1** (Rendah)
- `> 155`: Mapped to **2** (Tinggi)
- `110 - 155`: Mapped to **3** (Normal)

### C2 - Berat Badan (Weight in kg)
- `< 50`: Mapped to **1** (Kurus)
- `50 - 65`: Mapped to **4** (Sedang/Ideal)
- `65 - 80`: Mapped to **3** (Gemuk)
- `> 80`: Mapped to **2** (Obesitas)

### C3 - Hemoglobin (in g/dL)
- `< 12.5`: Mapped to **1** (Rendah)
- `> 17`: Mapped to **2** (Tinggi)
- `12.5 - 17`: Mapped to **3** (Normal)

### C4 - Tidak Konsumsi Obat (Medication Free Days)
- **Actual value** digunakan (minimum 3 hari)

### C5 - Umur (Age in years)
- **Actual value** digunakan (minimum 17 tahun)
- **COST criteria** - semakin tua, semakin berkurang nilai

### C6 - Lamanya Tidur (Sleep Hours)
- **Actual value** digunakan (minimum 4 jam)

### C7 - Riwayat Penyakit (Disease History)
- `true` (Ada riwayat): Mapped to **0**
- `false` (Tidak ada riwayat): Mapped to **1**

---

## 🧪 Example Test Cases

### Test Case 1: LAYAK (High Quality Donor)
```json
{
  "bloodPressureSystolic": 120,
  "weight": 65,
  "hemoglobin": 14.5,
  "medicationFreeDays": 9,
  "age": 35,
  "lastSleepHours": 9,
  "hasDiseaseHistory": false
}
```
**Expected Result:**
- Yi = 0.0746 (approx)
- Status: **LAYAK** ✅

### Test Case 2: TIDAK LAYAK (Poor Health)
```json
{
  "bloodPressureSystolic": 95,
  "weight": 45,
  "hemoglobin": 11.5,
  "medicationFreeDays": 3,
  "age": 30,
  "lastSleepHours": 4,
  "hasDiseaseHistory": true
}
```
**Expected Result:**
- Yi < 0.0520
- Status: **TIDAK LAYAK** ❌

---

## 🔒 Authorization & Roles

### Admin Role
✅ Can access:
- All `/admin/*` endpoints
- Can create/update/delete events
- Can assign petugas to events
- Can view all reports and statistics
- Can update system settings

### Petugas Role
✅ Can access:
- `/petugas/*` endpoints
- Can only view assigned events
- Can register donors and conduct examinations
- Cannot modify events or settings

---

## 🚨 Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "message": "Validation Error",
  "errors": [
    {
      "field": "email",
      "message": "Email is required"
    }
  ]
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "message": "No token provided"
}
```

### 403 Forbidden
```json
{
  "success": false,
  "message": "Access denied. Admin role required."
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "Event not found"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Internal server error",
  "error": "Error details..."
}
```

---

## 📦 Default Credentials

### Admin
```
Email: admin@pmi.com
Password: admin123
```

### Petugas
```
Email: petugas1@pmi.com
Password: petugas123

Email: petugas2@pmi.com
Password: petugas123

Email: petugas3@pmi.com
Password: petugas123
```

---

## 🔄 Testing Workflow

1. **Login as Admin**
   - POST `/auth/login` with admin credentials
   - Save the token

2. **Create Event**
   - POST `/admin/events`
   - Save the event ID

3. **Assign Petugas to Event**
   - POST `/admin/events/:eventId/officers`

4. **Login as Petugas**
   - POST `/auth/login` with petugas credentials
   - Save the token

5. **Register Donors**
   - POST `/petugas/events/:eventId/donors`
   - SAW evaluation happens automatically
   - Check the `evaluation.status` field

6. **View Report as Admin**
   - GET `/admin/reports/:eventId`
   - See all evaluations with LAYAK/TIDAK LAYAK status

---

## 📊 Key Differences from MOORA

| Aspect | Old (MOORA) | New (SAW) |
|--------|------------|-----------|
| **Algorithm** | MOORA | SAW |
| **Normalization** | Dynamic (sqrt) | Fixed Dominator |
| **Ranking** | ✅ Yes (1,2,3...) | ❌ No ranking |
| **Output** | Rank + isEligible | LAYAK/TIDAK LAYAK |
| **Threshold** | 0.309 | **0.0520** |
| **Response Field** | `mooraResult` | `evaluation` |
| **Status Field** | `isEligible` boolean | `status` string |

---

## 📝 Notes

- All dates are in ISO 8601 format
- JWT tokens expire after configured time (check .env)
- Donor biodata (fullName, birthDate, bloodType, phone, address) are encrypted at application level
- Each examination automatically triggers SAW evaluation
- Threshold can be adjusted via admin settings endpoint
- No batch ranking - each donor is evaluated independently

---

**🎉 Happy Testing!**
