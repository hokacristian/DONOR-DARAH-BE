# 🚀 Postman Quick Start Guide

## 📥 Import Collection & Environment

### Step 1: Import Postman Collection

1. Open Postman
2. Click **Import** button (top left)
3. Select file: `postman/Blood_Donor_SAW_API.postman_collection.json`
4. Click **Import**

### Step 2: Import Environment

1. Click **Environments** (left sidebar)
2. Click **Import**
3. Select file: `postman/Blood_Donor_SAW.postman_environment.json`
4. Click **Import**

### Step 3: Select Environment

1. In the top-right corner, select **Blood Donor SAW - Development** from the environment dropdown

---

## 🎯 Testing Flow (Step-by-Step)

### FASE 1: Setup Initial Data

#### 1. Login as Admin
```
Collection: Auth > Login Admin
Method: POST
URL: {{base_url}}/api/auth/login
```

**Expected Result:**
- Status: 200 OK
- Token automatically saved to `admin_token` variable
- Admin ID automatically saved to `admin_id` variable

---

#### 2. Create Event
```
Collection: Admin - Events > Create Event
Method: POST
URL: {{base_url}}/api/admin/events
```

**Expected Result:**
- Status: 201 Created
- Event ID automatically saved to `event_id` variable

---

#### 3. Login as Petugas
```
Collection: Auth > Login Petugas
Method: POST
URL: {{base_url}}/api/auth/login
```

**Expected Result:**
- Status: 200 OK
- Token automatically saved to `petugas_token` variable
- Petugas ID automatically saved to `petugas_id` variable

---

#### 4. Assign Petugas to Event (as Admin)
```
Collection: Admin - Events > Assign Petugas to Event
Method: POST
URL: {{base_url}}/api/admin/events/{{event_id}}/officers
Authorization: Bearer {{admin_token}}
```

**Body:**
```json
{
  "userId": "{{petugas_id}}"
}
```

**Expected Result:**
- Status: 201 Created
- Petugas successfully assigned to event

---

### FASE 2: Register Donors & SAW Evaluation

#### 5. Register Donor (LAYAK) - as Petugas
```
Collection: Petugas - Donors > Register Donor + Examination (LAYAK)
Method: POST
URL: {{base_url}}/api/petugas/events/{{event_id}}/donors
Authorization: Bearer {{petugas_token}}
```

**Expected Result:**
- Status: 201 Created
- Response contains `evaluation` object:
  ```json
  {
    "evaluation": {
      "preferenceValue": 0.074654063399029,
      "isEligible": true,
      "status": "LAYAK",
      "threshold": 0.052
    }
  }
  ```

---

#### 6. Register Donor (TIDAK LAYAK) - as Petugas
```
Collection: Petugas - Donors > Register Donor + Examination (TIDAK LAYAK)
Method: POST
URL: {{base_url}}/api/petugas/events/{{event_id}}/donors
Authorization: Bearer {{petugas_token}}
```

**Expected Result:**
- Status: 201 Created
- Response contains `evaluation` object:
  ```json
  {
    "evaluation": {
      "preferenceValue": 0.03xxx,
      "isEligible": false,
      "status": "TIDAK LAYAK",
      "threshold": 0.052
    }
  }
  ```

---

### FASE 3: View Reports

#### 7. Get Event Report (as Admin)
```
Collection: Admin - Reports & Settings > Get Event Report (SAW Evaluations)
Method: GET
URL: {{base_url}}/api/admin/reports/{{event_id}}
Authorization: Bearer {{admin_token}}
```

**Expected Result:**
- Status: 200 OK
- Response contains:
  ```json
  {
    "data": {
      "event": {...},
      "statistics": {
        "totalDonors": 2,
        "eligibleCount": 1,
        "notEligibleCount": 1,
        "threshold": 0.052
      },
      "evaluations": [
        {
          "donor": {...},
          "examination": {...},
          "evaluation": {
            "preferenceValue": 0.074654,
            "isEligible": true,
            "status": "LAYAK"
          }
        }
      ]
    }
  }
  ```

---

#### 8. Get Dashboard Statistics (as Admin)
```
Collection: Admin - Reports & Settings > Get Dashboard Statistics
Method: GET
URL: {{base_url}}/api/admin/dashboard/statistics
Authorization: Bearer {{admin_token}}
```

**Expected Result:**
- Status: 200 OK
- Statistics for all events, donors, and evaluations

---

## 🧪 Using Sample Data (Recommended)

### Option 1: Use Seed with Samples

1. **Reset database & run enhanced seed:**
   ```bash
   npx prisma migrate reset
   ```
   When asked "Do you want to continue?", type **yes**

2. **Then run the enhanced seed:**
   ```bash
   node prisma/seed-with-samples.js
   ```

3. **What you get:**
   - 1 Admin account
   - 3 Petugas accounts
   - 2 Sample events
   - 5 Sample donors in Event 1 (3 LAYAK, 2 TIDAK LAYAK)

4. **But wait!** The sample donors don't have SAW evaluations yet. You need to:
   - Use the API to trigger evaluation for each examination, OR
   - Register new donors via Postman (which auto-triggers evaluation)

---

### Option 2: Manual Testing (Clean Database)

1. **Reset database:**
   ```bash
   npx prisma migrate reset
   ```

2. **Follow the testing flow above** (FASE 1 → FASE 2 → FASE 3)

---

## 📋 Pre-configured Requests

The Postman collection includes these **auto-scripted** requests:

### ✅ Login Admin
- **Auto-saves:** `admin_token`, `admin_id`

### ✅ Login Petugas
- **Auto-saves:** `petugas_token`, `petugas_id`

### ✅ Create Event
- **Auto-saves:** `event_id`

### ✅ Register Donor
- **Auto-saves:** `donor_id`, `examination_id`

---

## 🎨 Environment Variables Reference

| Variable | Description | Set By |
|----------|-------------|--------|
| `base_url` | API base URL | Pre-configured |
| `admin_token` | Admin JWT token | Login Admin request |
| `petugas_token` | Petugas JWT token | Login Petugas request |
| `admin_id` | Admin user ID | Login Admin request |
| `petugas_id` | Petugas user ID | Login Petugas request |
| `event_id` | Current event ID | Create Event request |
| `donor_id` | Current donor ID | Register Donor request |
| `examination_id` | Current examination ID | Register Donor request |

---

## 🔍 Troubleshooting

### ❌ "No token provided"
**Solution:** Make sure you've run the Login request first and the token is saved to the environment.

### ❌ "Event not found"
**Solution:** Make sure you've created an event and the `event_id` variable is set.

### ❌ "You are not assigned to this event"
**Solution:**
1. Login as Admin
2. Run "Assign Petugas to Event"
3. Then try again as Petugas

### ❌ "Cannot read property 'id' of undefined"
**Solution:** The previous request might have failed. Check the response and ensure all prerequisite requests have been executed successfully.

---

## 📊 SAW Calculation Verification

To verify SAW calculation is correct, check the response from **Register Donor** request:

```json
{
  "evaluation": {
    "preferenceValue": 0.074654063399029,
    "benefitSum": 0.081754068361,
    "costSum": 0.007100004961,
    "normalizedValues": [...],
    "weightedValues": [...]
  }
}
```

**Formula Check:**
- `preferenceValue` = `benefitSum` - `costSum`
- Should match the screenshot calculation for the same input values

---

## 🎯 Quick Test Scenarios

### Scenario 1: Perfect Health Donor (LAYAK)
```json
{
  "bloodPressureSystolic": 120,
  "bloodPressureDiastolic": 80,
  "weight": 60,
  "hemoglobin": 14.5,
  "medicationFreeDays": 10,
  "age": 30,
  "lastSleepHours": 8,
  "hasDiseaseHistory": false
}
```
**Expected:** Yi ≈ 0.075, Status: **LAYAK** ✅

### Scenario 2: Poor Health Donor (TIDAK LAYAK)
```json
{
  "bloodPressureSystolic": 95,
  "bloodPressureDiastolic": 60,
  "weight": 45,
  "hemoglobin": 11.0,
  "medicationFreeDays": 3,
  "age": 50,
  "lastSleepHours": 4,
  "hasDiseaseHistory": true
}
```
**Expected:** Yi < 0.052, Status: **TIDAK LAYAK** ❌

### Scenario 3: Border Case
```json
{
  "bloodPressureSystolic": 115,
  "bloodPressureDiastolic": 75,
  "weight": 52,
  "hemoglobin": 13.0,
  "medicationFreeDays": 5,
  "age": 40,
  "lastSleepHours": 6,
  "hasDiseaseHistory": false
}
```
**Expected:** Yi ≈ 0.050-0.055, Check if LAYAK or TIDAK LAYAK

---

## 💡 Tips

1. **Always login first** before testing other endpoints
2. **Use the collection folder structure** to organize your tests
3. **Check the Console tab** in Postman to see auto-script logs
4. **Save your environment** after making changes
5. **Use the Collection Runner** to run multiple requests in sequence
6. **Check response times** - all requests should complete in < 500ms

---

## 📝 Default Credentials

### Admin
```
Email: admin@pmi.com
Password: admin123
```

### Petugas
```
Email: petugas1@pmi.com
Password: petugas123
```

---

**🎉 Happy Testing!**

Need help? Check the [API Documentation](./API_DOCUMENTATION.md) for detailed endpoint information.
