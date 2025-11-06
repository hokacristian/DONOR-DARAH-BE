const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting comprehensive seed with sample data...\n');

  // Hash password untuk users
  const hashedPassword = await bcrypt.hash('admin123', 10);
  const hashedPasswordPetugas = await bcrypt.hash('petugas123', 10);

  // ========================================================================
  // 1. SEED USERS (Admin & Petugas)
  // ========================================================================
  console.log('👤 Seeding Users...');

  const admin = await prisma.user.upsert({
    where: { email: 'admin@pmi.com' },
    update: {},
    create: {
      email: 'admin@pmi.com',
      password: hashedPassword,
      fullName: 'Administrator PMI',
      role: 'admin',
    },
  });
  console.log('  ✓ Admin user created:', admin.email);

  const petugas1 = await prisma.user.upsert({
    where: { email: 'petugas1@pmi.com' },
    update: {},
    create: {
      email: 'petugas1@pmi.com',
      password: hashedPasswordPetugas,
      fullName: 'Petugas PMI 1 - Surabaya',
      role: 'petugas',
    },
  });
  console.log('  ✓ Petugas 1 created:', petugas1.email);

  const petugas2 = await prisma.user.upsert({
    where: { email: 'petugas2@pmi.com' },
    update: {},
    create: {
      email: 'petugas2@pmi.com',
      password: hashedPasswordPetugas,
      fullName: 'Petugas PMI 2 - Jakarta',
      role: 'petugas',
    },
  });
  console.log('  ✓ Petugas 2 created:', petugas2.email);

  const petugas3 = await prisma.user.upsert({
    where: { email: 'petugas3@pmi.com' },
    update: {},
    create: {
      email: 'petugas3@pmi.com',
      password: hashedPasswordPetugas,
      fullName: 'Petugas PMI 3 - Bandung',
      role: 'petugas',
    },
  });
  console.log('  ✓ Petugas 3 created:', petugas3.email);

  // ========================================================================
  // 2. SEED CRITERIA (7 Kriteria SAW)
  // ========================================================================
  console.log('\n📊 Seeding Criteria...');

  const criteriaData = [
    { code: 'C1', name: 'Tekanan Darah', type: 'benefit', weight: 0.25 },
    { code: 'C2', name: 'Berat Badan', type: 'benefit', weight: 0.15 },
    { code: 'C3', name: 'Hemoglobin', type: 'benefit', weight: 0.25 },
    { code: 'C4', name: 'Tidak Konsumsi Obat', type: 'benefit', weight: 0.10 },
    { code: 'C5', name: 'Umur', type: 'cost', weight: 0.10 },
    { code: 'C6', name: 'Lamanya Terakhir Tidur', type: 'benefit', weight: 0.05 },
    { code: 'C7', name: 'Riwayat Penyakit', type: 'benefit', weight: 0.05 },
  ];

  const criteria = [];
  for (const criteriaItem of criteriaData) {
    const created = await prisma.criteria.upsert({
      where: { code: criteriaItem.code },
      update: { weight: criteriaItem.weight }, // Update weight if exists
      create: criteriaItem,
    });
    criteria.push(created);
    console.log(`  ✓ ${created.code} - ${created.name} (weight: ${created.weight})`);
  }

  // ========================================================================
  // 3. SEED SUB CRITERIA
  // ========================================================================
  console.log('\n📋 Seeding Sub Criteria...');

  const subCriteriaData = [
    // C1: Tekanan Darah
    { criteriaCode: 'C1', name: 'Rendah (< 110/70 mmHg)', value: 1, minValue: 0, maxValue: 109, description: 'Tekanan darah rendah' },
    { criteriaCode: 'C1', name: 'Tinggi (> 155/90 mmHg)', value: 2, minValue: 156, maxValue: 300, description: 'Tekanan darah tinggi' },
    { criteriaCode: 'C1', name: 'Normal (110/70 mmHg – 155/90 mmHg)', value: 3, minValue: 110, maxValue: 155, description: 'Tekanan darah normal' },

    // C2: Berat Badan
    { criteriaCode: 'C2', name: 'Kurus (BB <50 Kg)', value: 1, minValue: 0, maxValue: 49.99, description: 'Berat badan kurang' },
    { criteriaCode: 'C2', name: 'Sedang (BB 50-65 Kg)', value: 4, minValue: 50, maxValue: 65, description: 'Berat badan ideal' },
    { criteriaCode: 'C2', name: 'Gemuk (BB 65-80 Kg)', value: 3, minValue: 65.01, maxValue: 80, description: 'Berat badan lebih' },
    { criteriaCode: 'C2', name: 'Obesitas (BB > 80 Kg)', value: 2, minValue: 80.01, maxValue: 500, description: 'Obesitas' },

    // C3: Hemoglobin
    { criteriaCode: 'C3', name: 'Rendah (< 12.5)', value: 1, minValue: 0, maxValue: 12.49, description: 'Hemoglobin rendah' },
    { criteriaCode: 'C3', name: 'Tinggi (> 17)', value: 2, minValue: 17.01, maxValue: 50, description: 'Hemoglobin tinggi' },
    { criteriaCode: 'C3', name: 'Normal (12.5 – 17)', value: 3, minValue: 12.5, maxValue: 17, description: 'Hemoglobin normal' },

    // C4: Tidak Konsumsi Obat (dalam hari)
    { criteriaCode: 'C4', name: 'Batas minimal 3 hari', value: 0, minValue: 3, maxValue: null, description: 'Nilai sebenarnya digunakan' },

    // C5: Umur (dalam tahun)
    { criteriaCode: 'C5', name: 'Minimal 17 tahun', value: 0, minValue: 17, maxValue: null, description: 'Nilai sebenarnya digunakan' },

    // C6: Lamanya Terakhir Tidur (dalam jam)
    { criteriaCode: 'C6', name: 'Batas minimal 4 jam', value: 0, minValue: 4, maxValue: null, description: 'Nilai sebenarnya digunakan' },

    // C7: Riwayat Penyakit
    { criteriaCode: 'C7', name: 'Ya', value: 0, minValue: null, maxValue: null, description: 'Memiliki riwayat penyakit' },
    { criteriaCode: 'C7', name: 'Tidak', value: 1, minValue: null, maxValue: null, description: 'Tidak memiliki riwayat penyakit' },
  ];

  // Delete existing sub-criteria to avoid duplicates
  await prisma.subCriteria.deleteMany({});

  for (const subCriteria of subCriteriaData) {
    const criteriaItem = criteria.find(c => c.code === subCriteria.criteriaCode);
    if (criteriaItem) {
      await prisma.subCriteria.create({
        data: {
          criteriaId: criteriaItem.id,
          name: subCriteria.name,
          value: subCriteria.value,
          minValue: subCriteria.minValue,
          maxValue: subCriteria.maxValue,
          description: subCriteria.description,
        },
      });
      console.log(`  ✓ Sub-criteria for ${subCriteria.criteriaCode}: ${subCriteria.name}`);
    }
  }

  // ========================================================================
  // 4. SEED SYSTEM SETTINGS
  // ========================================================================
  console.log('\n⚙️  Seeding System Settings...');

  await prisma.systemSetting.upsert({
    where: { key: 'eligibility_threshold' },
    update: { value: '0.0520' },
    create: {
      key: 'eligibility_threshold',
      value: '0.0520',
      description: 'Threshold minimum untuk kelayakan donor darah (berdasarkan nilai Yi SAW)',
      updatedBy: admin.id,
    },
  });
  console.log('  ✓ eligibility_threshold = 0.0520');

  // ========================================================================
  // 5. SEED SAMPLE EVENTS
  // ========================================================================
  console.log('\n🎪 Seeding Sample Events...');

  const event1 = await prisma.event.create({
    data: {
      name: 'Donor Darah PMI Surabaya - Januari 2025',
      location: 'Gedung PMI Surabaya, Jl. Embong Kaliasin No. 20',
      startDate: new Date('2025-01-15T08:00:00'),
      endDate: new Date('2025-01-15T16:00:00'),
      status: 'active',
      description: 'Event donor darah rutin bulanan untuk membantu stok darah PMI Surabaya',
      createdBy: admin.id,
    },
  });
  console.log('  ✓ Event 1 created:', event1.name);

  // Assign petugas to event
  await prisma.eventOfficer.create({
    data: {
      eventId: event1.id,
      userId: petugas1.id,
      assignedBy: admin.id,
    },
  });
  console.log('    → Petugas 1 assigned to Event 1');

  const event2 = await prisma.event.create({
    data: {
      name: 'Donor Darah HUT RI ke-80',
      location: 'GOR Pancasila, Jakarta Pusat',
      startDate: new Date('2025-08-17T07:00:00'),
      endDate: new Date('2025-08-17T15:00:00'),
      status: 'draft',
      description: 'Event donor darah dalam rangka memperingati HUT RI ke-80',
      createdBy: admin.id,
    },
  });
  console.log('  ✓ Event 2 created:', event2.name);

  await prisma.eventOfficer.create({
    data: {
      eventId: event2.id,
      userId: petugas2.id,
      assignedBy: admin.id,
    },
  });
  console.log('    → Petugas 2 assigned to Event 2');

  // ========================================================================
  // 6. SEED SAMPLE DONORS WITH EXAMINATIONS (Event 1)
  // ========================================================================
  console.log('\n💉 Seeding Sample Donors for Event 1...');

  // Sample Donor 1: LAYAK (same as screenshot example)
  const donor1 = await prisma.donor.create({
    data: {
      eventId: event1.id,
      fullName: 'Budi Santoso',
      birthDate: new Date('1990-05-15'),
      gender: 'male',
      bloodType: 'A',
      phone: '081234567890',
      address: 'Jl. Merdeka No. 123, Surabaya',
      registeredBy: petugas1.id,
    },
  });

  const exam1 = await prisma.donorExamination.create({
    data: {
      donorId: donor1.id,
      bloodPressureSystolic: 120,
      bloodPressureDiastolic: 80,
      weight: 65,
      hemoglobin: 14.5,
      medicationFreeDays: 9,
      age: 35,
      lastSleepHours: 9,
      hasDiseaseHistory: false,
      examinedBy: petugas1.id,
    },
  });
  console.log(`  ✓ Donor 1: ${donor1.fullName} (Expected: LAYAK)`);

  // Sample Donor 2: LAYAK (excellent health)
  const donor2 = await prisma.donor.create({
    data: {
      eventId: event1.id,
      fullName: 'Ani Wijaya',
      birthDate: new Date('1992-08-20'),
      gender: 'female',
      bloodType: 'O',
      phone: '082345678901',
      address: 'Jl. Pahlawan No. 45, Surabaya',
      registeredBy: petugas1.id,
    },
  });

  const exam2 = await prisma.donorExamination.create({
    data: {
      donorId: donor2.id,
      bloodPressureSystolic: 125,
      bloodPressureDiastolic: 82,
      weight: 58,
      hemoglobin: 13.5,
      medicationFreeDays: 15,
      age: 33,
      lastSleepHours: 8,
      hasDiseaseHistory: false,
      examinedBy: petugas1.id,
    },
  });
  console.log(`  ✓ Donor 2: ${donor2.fullName} (Expected: LAYAK)`);

  // Sample Donor 3: TIDAK LAYAK (low blood pressure)
  const donor3 = await prisma.donor.create({
    data: {
      eventId: event1.id,
      fullName: 'Siti Nurhaliza',
      birthDate: new Date('1995-03-10'),
      gender: 'female',
      bloodType: 'B',
      phone: '083456789012',
      address: 'Jl. Sudirman No. 78, Surabaya',
      registeredBy: petugas1.id,
    },
  });

  const exam3 = await prisma.donorExamination.create({
    data: {
      donorId: donor3.id,
      bloodPressureSystolic: 95,
      bloodPressureDiastolic: 60,
      weight: 45,
      hemoglobin: 11.5,
      medicationFreeDays: 3,
      age: 30,
      lastSleepHours: 4,
      hasDiseaseHistory: true,
      examinedBy: petugas1.id,
    },
  });
  console.log(`  ✓ Donor 3: ${donor3.fullName} (Expected: TIDAK LAYAK)`);

  // Sample Donor 4: TIDAK LAYAK (has disease history, high age)
  const donor4 = await prisma.donor.create({
    data: {
      eventId: event1.id,
      fullName: 'Ahmad Hidayat',
      birthDate: new Date('1970-12-25'),
      gender: 'male',
      bloodType: 'AB',
      phone: '084567890123',
      address: 'Jl. Gatot Subroto No. 90, Surabaya',
      registeredBy: petugas1.id,
    },
  });

  const exam4 = await prisma.donorExamination.create({
    data: {
      donorId: donor4.id,
      bloodPressureSystolic: 150,
      bloodPressureDiastolic: 95,
      weight: 85,
      hemoglobin: 16.5,
      medicationFreeDays: 5,
      age: 55,
      lastSleepHours: 6,
      hasDiseaseHistory: true,
      examinedBy: petugas1.id,
    },
  });
  console.log(`  ✓ Donor 4: ${donor4.fullName} (Expected: TIDAK LAYAK)`);

  // Sample Donor 5: LAYAK (good health)
  const donor5 = await prisma.donor.create({
    data: {
      eventId: event1.id,
      fullName: 'Rina Susanti',
      birthDate: new Date('1988-07-18'),
      gender: 'female',
      bloodType: 'A',
      phone: '085678901234',
      address: 'Jl. Ahmad Yani No. 56, Surabaya',
      registeredBy: petugas1.id,
    },
  });

  const exam5 = await prisma.donorExamination.create({
    data: {
      donorId: donor5.id,
      bloodPressureSystolic: 118,
      bloodPressureDiastolic: 78,
      weight: 60,
      hemoglobin: 14.0,
      medicationFreeDays: 12,
      age: 37,
      lastSleepHours: 7.5,
      hasDiseaseHistory: false,
      examinedBy: petugas1.id,
    },
  });
  console.log(`  ✓ Donor 5: ${donor5.fullName} (Expected: LAYAK)`);

  console.log('\n✅ Comprehensive seeding completed successfully!\n');
  console.log('═'.repeat(70));
  console.log('📋 DEFAULT CREDENTIALS:');
  console.log('═'.repeat(70));
  console.log('Admin:');
  console.log('  Email:    admin@pmi.com');
  console.log('  Password: admin123');
  console.log('');
  console.log('Petugas:');
  console.log('  Email:    petugas1@pmi.com');
  console.log('  Password: petugas123');
  console.log('');
  console.log('  Email:    petugas2@pmi.com');
  console.log('  Password: petugas123');
  console.log('');
  console.log('  Email:    petugas3@pmi.com');
  console.log('  Password: petugas123');
  console.log('═'.repeat(70));
  console.log('📊 SAMPLE DATA:');
  console.log('═'.repeat(70));
  console.log(`Events created: 2`);
  console.log(`  - ${event1.name}`);
  console.log(`  - ${event2.name}`);
  console.log('');
  console.log(`Donors in Event 1: 5`);
  console.log(`  - Budi Santoso (LAYAK)`);
  console.log(`  - Ani Wijaya (LAYAK)`);
  console.log(`  - Siti Nurhaliza (TIDAK LAYAK)`);
  console.log(`  - Ahmad Hidayat (TIDAK LAYAK)`);
  console.log(`  - Rina Susanti (LAYAK)`);
  console.log('═'.repeat(70));
  console.log('\n🎯 Next Step: Run SAW evaluation for all examinations');
  console.log('   → Use the API endpoint or run evaluation script\n');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
