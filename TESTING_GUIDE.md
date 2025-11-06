# 🧪 Testing Guide - Blood Donor SAW System

## 📁 Files Created for Testing

```
project-root/
├── postman/
│   ├── Blood_Donor_SAW_API.postman_collection.json  ← Import this to Postman
│   └── Blood_Donor_SAW.postman_environment.json     ← Import this to Postman
├── prisma/
│   ├── seed.js                                       ← Basic seed (Admin, Petugas, Criteria only)
│   └── seed-with-samples.js                          ← Enhanced seed (includes sample events & donors)
├── test-saw-calculation.js                           ← SAW calculation verification script
├── API_DOCUMENTATION.md                              ← Complete API documentation
├── POSTMAN_QUICK_START.md                            ← Postman usage guide
└── TESTING_GUIDE.md                                  ← This file
```

---

## 🚀 Quick Start (3 Steps)

### Step 1: Setup Database with Sample Data

```bash
# Reset database and run migration
npx prisma migrate reset

# When asked "Do you want to continue?", type: yes

# Run enhanced seed with sample data
node prisma/seed-with-samples.js
```

**What you get:**
- ✅ 1 Admin account: `admin@pmi.com` / `admin123`
- ✅ 3 Petugas accounts: `petugas1@pmi.com` / `petugas123` (and 2, 3)
- ✅ 7 Criteria (C1-C7) with correct weights
- ✅ Sub-criteria for mapping
- ✅ System setting: threshold = 0.0520
- ✅ 2 Sample events
- ✅ 5 Sample donors in Event 1

**⚠️ Note:** Sample donors are created but **SAW evaluations are not yet calculated**. You need to trigger evaluation via API (see Step 3).

---

### Step 2: Import Postman Collection

1. Open Postman
2. Click **Import** → Select `postman/Blood_Donor_SAW_API.postman_collection.json`
3. Click **Import** → Select `postman/Blood_Donor_SAW.postman_environment.json`
4. In top-right corner, select **Blood Donor SAW - Development** environment

---

### Step 3: Start Server & Test

```bash
# Start the server
npm start

# Or in development mode
npm run dev
```

**Test in Postman:**
1. **Login as Admin** → Saves `admin_token`
2. **Get All Events** → Should show 2 events
3. **Login as Petugas** → Saves `petugas_token`
4. **Register New Donor** → This triggers SAW evaluation automatically
5. **Get Event Report** → See all evaluations with LAYAK/TIDAK LAYAK status

---

## 🔬 Testing Options

### Option A: Use Sample Data (Fastest)

**Pros:**
- Quick setup
- Pre-populated database
- Ready to test reports

**Cons:**
- Sample donors don't have SAW evaluations yet
- You need to manually trigger evaluation OR register new donors

**Steps:**
```bash
# 1. Run enhanced seed
node prisma/seed-with-samples.js

# 2. Option 2a: Register new donors via API (recommended)
#    Use Postman: "Register Donor + Examination"
#    This auto-triggers SAW evaluation

# OR

# 2. Option 2b: Manually trigger evaluation for existing donors
#    (You need to create an API endpoint for this, or use console script)
```

---

### Option B: Fresh Start (Most Control)

**Pros:**
- Clean database
- Full control over test data
- Can verify each step

**Cons:**
- More manual work
- Need to create event first

**Steps:**
```bash
# 1. Run basic seed
npx prisma migrate reset

# 2. Use Postman to:
#    - Login as Admin
#    - Create Event
#    - Assign Petugas
#    - Login as Petugas
#    - Register Donors (triggers SAW auto)
#    - View Reports
```

---

## 📊 SAW Calculation Verification

### Test the Calculation (Standalone)

```bash
# Run the test script
node test-saw-calculation.js
```

**Expected Output:**
```
🧪 TEST SAW CALCULATION - VERIFY AGAINST SCREENSHOT
...
✅ SUCCESS! Calculation matches the screenshot exactly!

Yi = Σ(Benefit) - Σ(Cost)
   = 0.081754068361 - 0.007100004961
   = 0.074654063399

Threshold:      0.052
Preference Yi:  0.074654063399
Is Eligible:    YES (LAYAK)

✅ STATUS: LAYAK untuk donor darah
```

---

## 🎯 Test Scenarios

### Scenario 1: Register LAYAK Donor

**Input (Postman request body):**
```json
{
  "fullName": "Test LAYAK Donor",
  "birthDate": "1990-05-15",
  "gender": "male",
  "bloodType": "A",
  "phone": "081234567890",
  "address": "Jl. Test No. 123",
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

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "evaluation": {
      "preferenceValue": 0.074654063399029,
      "isEligible": true,
      "status": "LAYAK",
      "threshold": 0.052
    }
  }
}
```

---

### Scenario 2: Register TIDAK LAYAK Donor

**Input:**
```json
{
  "fullName": "Test TIDAK LAYAK Donor",
  "birthDate": "1995-08-20",
  "gender": "female",
  "bloodType": "O",
  "phone": "082345678901",
  "address": "Jl. Test No. 456",
  "bloodPressureSystolic": 95,
  "bloodPressureDiastolic": 60,
  "weight": 45,
  "hemoglobin": 11.5,
  "medicationFreeDays": 3,
  "age": 30,
  "lastSleepHours": 4,
  "hasDiseaseHistory": true
}
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "evaluation": {
      "preferenceValue": 0.03xxx,
      "isEligible": false,
      "status": "TIDAK LAYAK",
      "threshold": 0.052
    }
  }
}
```

---

## 🔍 Verification Checklist

After running tests, verify:

### ✅ Database Check
```bash
# Open Prisma Studio
npx prisma studio
```

**Check Tables:**
1. `saw_evaluations` → Should have records with `preferenceValue` and `isEligible`
2. `examination_criteria_values` → Should have mapped values for each criteria
3. `donor_examinations` → Should have raw examination data
4. `system_settings` → Should have `eligibility_threshold` = 0.0520

---

### ✅ API Response Check

**For each donor registration, verify response has:**
```json
{
  "evaluation": {
    "preferenceValue": <number>,      ← Yi value
    "benefitSum": <number>,           ← Sum of benefit criteria
    "costSum": <number>,              ← Sum of cost criteria (C5 only)
    "isEligible": <boolean>,          ← true if Yi >= 0.0520
    "status": "LAYAK" | "TIDAK LAYAK",← String status
    "threshold": 0.052,               ← Current threshold
    "criteriaValues": [...],          ← Raw and mapped values
    "normalizedValues": [...],        ← x'ij values
    "weightedValues": [...]           ← Vij values
  }
}
```

---

### ✅ Calculation Accuracy Check

**Manual verification:**
1. Take the `normalizedValues` array
2. Multiply each by corresponding weight:
   - V1 = normalized[0] × 0.25
   - V2 = normalized[1] × 0.15
   - V3 = normalized[2] × 0.25
   - V4 = normalized[3] × 0.10
   - V5 = normalized[4] × 0.10 (cost)
   - V6 = normalized[5] × 0.05
   - V7 = normalized[6] × 0.05

3. Calculate:
   - benefitSum = V1 + V2 + V3 + V4 + V6 + V7
   - costSum = V5
   - Yi = benefitSum - costSum

4. Compare with response `preferenceValue`

---

## 📋 Default Test Accounts

### Admin Account
```
Email: admin@pmi.com
Password: admin123
Role: admin
```

**Can access:**
- All admin endpoints
- Create/edit events
- View all reports
- Manage settings

---

### Petugas Accounts
```
Email: petugas1@pmi.com
Password: petugas123
Role: petugas

Email: petugas2@pmi.com
Password: petugas123
Role: petugas

Email: petugas3@pmi.com
Password: petugas123
Role: petugas
```

**Can access:**
- Assigned events only
- Register donors
- View donor list

---

## 🐛 Common Issues & Solutions

### Issue 1: "Table 'saw_evaluations' does not exist"

**Solution:**
```bash
# Run migration
npx prisma migrate dev
```

---

### Issue 2: Sample donors have no SAW evaluations

**Reason:** Enhanced seed only creates donors, not evaluations.

**Solution:**
Register new donors via API:
```
POST /api/petugas/events/:eventId/donors
```
This triggers SAW evaluation automatically.

---

### Issue 3: "You are not assigned to this event"

**Solution:**
1. Login as Admin
2. POST `/api/admin/events/:eventId/officers` with petugas userId
3. Try again as Petugas

---

### Issue 4: Threshold is still 0.309

**Solution:**
```bash
# Check seed.js has the correct value
# Should be: value: '0.0520'

# Re-run seed
node prisma/seed-with-samples.js
```

---

## 📚 Additional Resources

- **API Documentation:** [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)
- **Postman Guide:** [POSTMAN_QUICK_START.md](./POSTMAN_QUICK_START.md)
- **SAW Algorithm Test:** Run `node test-saw-calculation.js`

---

## 🎯 Success Criteria

You've successfully tested the system if:

✅ Can login as Admin and Petugas
✅ Can create events and assign petugas
✅ Can register donors and see SAW evaluation instantly
✅ Evaluation returns correct `preferenceValue` (Yi)
✅ Status is correctly set to LAYAK or TIDAK LAYAK based on threshold
✅ Event report shows all evaluations without ranking
✅ Dashboard statistics are accurate
✅ Test script `node test-saw-calculation.js` passes

---

## 🚨 Critical Points to Verify

1. **NO RANKING** - Reports should NOT have rank field
2. **Threshold = 0.0520** - Not 0.309
3. **C4 Weight = 0.10** - Not 0.15
4. **Fixed Dominators** - Not calculated dynamically
5. **Status Field** - Should be "LAYAK" or "TIDAK LAYAK" string
6. **Response Field** - Should be `evaluation`, not `mooraResult`

---

**🎉 Happy Testing!**

If you encounter any issues, check the logs and verify:
1. Database migration is up to date
2. Seed data loaded correctly
3. Server is running
4. Postman environment is selected
5. Tokens are valid (re-login if needed)
