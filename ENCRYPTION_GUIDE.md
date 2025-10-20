# Panduan Enkripsi Data Donor

## Overview
Project ini telah dilengkapi dengan enkripsi otomatis untuk data sensitif donor menggunakan algoritma **AES-256-GCM**. Data yang dienkripsi meliputi:

- `fullName` - Nama lengkap donor
- `birthDate` - Tanggal lahir
- `bloodType` - Golongan darah
- `phone` - Nomor telepon
- `address` - Alamat

## Cara Kerja

### 1. Enkripsi Otomatis
Enkripsi dilakukan secara otomatis melalui Prisma middleware di `src/config/database.js`. Ketika data donor dibuat atau diupdate, data sensitif akan dienkripsi sebelum disimpan ke database.

### 2. Dekripsi Otomatis
Data akan didekripsi secara otomatis ketika dibaca dari database. Aplikasi akan menerima data dalam bentuk plaintext tanpa perlu melakukan dekripsi manual.

## File-File Penting

### 1. `src/utils/encryption.js`
Berisi fungsi-fungsi enkripsi/dekripsi:
- `encrypt(text)` - Enkripsi string
- `decrypt(encryptedHex)` - Dekripsi string
- `encryptDonorData(donor)` - Enkripsi data donor
- `decryptDonorData(donor)` - Dekripsi data donor

### 2. `src/config/database.js`
Berisi Prisma middleware yang menangani enkripsi/dekripsi otomatis untuk semua operasi database pada model Donor.

### 3. `.env`
Berisi `ENCRYPTION_KEY` yang digunakan untuk enkripsi. **PENTING: Jangan commit file ini ke git!**

## Setup

### 1. Environment Variables
Pastikan `.env` file memiliki `ENCRYPTION_KEY`:

```env
ENCRYPTION_KEY=your-encryption-key-here
```

**CATATAN PENTING:**
- Key harus minimum 32 karakter
- Gunakan string yang random dan kuat
- **JANGAN pernah** commit encryption key ke repository
- Gunakan encryption key yang berbeda untuk production dan development
- Simpan backup encryption key di tempat yang aman

### 2. Generate Prisma Client
Setelah mengubah schema, jalankan:

```bash
npm run prisma:generate
```

### 3. Migrate Database
Untuk membuat tabel dengan field yang sudah disesuaikan:

```bash
npm run prisma:migrate
```

**PENTING untuk Database yang Sudah Ada:**
Jika Anda sudah memiliki data donor di database, data lama tersebut akan tetap dalam format plaintext. Anda perlu melakukan migrasi data manual atau membuat script untuk mengenkripsi data yang sudah ada.

## Contoh Penggunaan

### Membuat Donor Baru
```javascript
// Controller code (tidak perlu perubahan)
const donor = await prisma.donor.create({
  data: {
    eventId,
    fullName, // Will be encrypted automatically
    birthDate: new Date(birthDate), // Will be encrypted automatically
    gender,
    bloodType, // Will be encrypted automatically
    phone, // Will be encrypted automatically
    address, // Will be encrypted automatically
    registeredBy: req.user.id,
  },
});

// Response akan berisi data yang sudah didekripsi
console.log(donor.fullName); // Plaintext
```

### Membaca Data Donor
```javascript
// Data otomatis didekripsi
const donors = await prisma.donor.findMany({
  where: { eventId },
});

// donors akan berisi data yang sudah didekripsi
console.log(donors[0].fullName); // Plaintext
console.log(donors[0].phone); // Plaintext
```

## Keamanan

### Di Database
Data sensitif disimpan dalam format encrypted hex string. Contoh:
```
fullName: "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6..."
```

### Di Aplikasi
Data yang diterima/dikirim dalam bentuk plaintext normal, enkripsi/dekripsi terjadi di middleware layer.

### Best Practices
1. **Jangan** log data sensitif yang terenkripsi atau terdekripsi
2. **Pastikan** ENCRYPTION_KEY tidak ter-commit ke repository
3. **Gunakan** HTTPS untuk semua komunikasi API
4. **Backup** encryption key dengan aman
5. **Rotate** encryption key secara berkala (memerlukan re-enkripsi data)

## Troubleshooting

### Error: "ENCRYPTION_KEY is not set"
Pastikan file `.env` memiliki `ENCRYPTION_KEY` yang valid.

### Error: "Failed to decrypt data"
Kemungkinan penyebab:
1. Data di database corrupted
2. Encryption key berbeda dari yang digunakan saat enkripsi
3. Data di database masih dalam format plaintext (belum di-migrate)

### Data Tidak Terdekripsi dengan Benar
1. Cek apakah `ENCRYPTION_KEY` sama dengan yang digunakan saat enkripsi
2. Pastikan Prisma middleware sudah di-load di `src/config/database.js`
3. Restart aplikasi setelah mengubah environment variables

## Migrasi Data Existing (Jika Diperlukan)

Jika Anda sudah memiliki data donor dalam format plaintext di database, buat script untuk mengenkripsi data tersebut:

```javascript
// scripts/encrypt-existing-data.js
const prisma = require('./src/config/database');
const { encryptDonorData } = require('./src/utils/encryption');

async function encryptExistingDonors() {
  const donors = await prisma.donor.findMany();

  for (const donor of donors) {
    const encrypted = encryptDonorData({
      fullName: donor.fullName,
      birthDate: donor.birthDate,
      bloodType: donor.bloodType,
      phone: donor.phone,
      address: donor.address,
    });

    // Update directly bypassing middleware
    await prisma.$executeRaw`
      UPDATE donors
      SET
        full_name = ${encrypted.fullName},
        birth_date = ${encrypted.birthDate},
        blood_type = ${encrypted.bloodType},
        phone = ${encrypted.phone},
        address = ${encrypted.address}
      WHERE id = ${donor.id}
    `;
  }

  console.log(`Encrypted ${donors.length} donors`);
}

encryptExistingDonors()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

## Catatan Tambahan

### Performance
- Enkripsi/dekripsi memiliki overhead minimal
- Untuk query besar, pertimbangkan pagination
- Index tidak bisa digunakan pada field yang terenkripsi

### Searchability
Data yang terenkripsi tidak bisa di-search langsung di database level. Jika perlu searching, pertimbangkan:
1. Dekripsi di application level lalu filter
2. Gunakan hashing untuk field yang perlu di-search (dengan tradeoff keamanan)
3. Implementasi searchable encryption jika diperlukan

### Compliance
Enkripsi ini membantu memenuhi standar:
- GDPR (General Data Protection Regulation)
- HIPAA (Health Insurance Portability and Accountability Act)
- UU Perlindungan Data Pribadi Indonesia

---

**Dibuat:** $(date)
**Versi:** 1.0.0
