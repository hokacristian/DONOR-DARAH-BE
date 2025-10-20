const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');

  // Hash password untuk admin
  const hashedPassword = await bcrypt.hash('admin123', 10);

  // 1. Seed Admin User
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
  console.log('✓ Admin user created:', admin.email);

  // 2. Seed 7 Criteria sesuai dokumen
  const criteriaData = [
    { code: 'C1', name: 'Tekanan Darah', type: 'benefit', weight: 0.25 },
    { code: 'C2', name: 'Berat Badan', type: 'benefit', weight: 0.15 },
    { code: 'C3', name: 'Hemoglobin', type: 'benefit', weight: 0.25 },
    { code: 'C4', name: 'Tidak Konsumsi Obat', type: 'benefit', weight: 0.15 },
    { code: 'C5', name: 'Umur', type: 'cost', weight: 0.10 },
    { code: 'C6', name: 'Lamanya Terakhir Tidur', type: 'benefit', weight: 0.05 },
    { code: 'C7', name: 'Riwayat Penyakit', type: 'benefit', weight: 0.05 },
  ];

  const criteria = [];
  for (const criteriaItem of criteriaData) {
    const created = await prisma.criteria.upsert({
      where: { code: criteriaItem.code },
      update: {},
      create: criteriaItem,
    });
    criteria.push(created);
    console.log(`✓ Criteria created: ${created.code} - ${created.name}`);
  }

  // 3. Seed Sub Criteria sesuai Tabel 2 di dokumen
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
      console.log(`  ✓ Sub-criteria created for ${subCriteria.criteriaCode}: ${subCriteria.name}`);
    }
  }

  // 4. Seed System Settings
  await prisma.systemSetting.upsert({
    where: { key: 'eligibility_threshold' },
    update: {},
    create: {
      key: 'eligibility_threshold',
      value: '0.309',
      description: 'Threshold minimum untuk kelayakan donor darah (berdasarkan nilai Yi MOORA)',
      updatedBy: admin.id,
    },
  });
  console.log('✓ System settings created: eligibility_threshold = 0.309');

  // 5. Seed beberapa Petugas dummy (opsional)
  const petugas1 = await prisma.user.upsert({
    where: { email: 'petugas1@pmi.com' },
    update: {},
    create: {
      email: 'petugas1@pmi.com',
      password: await bcrypt.hash('petugas123', 10),
      fullName: 'Petugas PMI 1',
      role: 'petugas',
    },
  });
  console.log('✓ Petugas user created:', petugas1.email);

  const petugas2 = await prisma.user.upsert({
    where: { email: 'petugas2@pmi.com' },
    update: {},
    create: {
      email: 'petugas2@pmi.com',
      password: await bcrypt.hash('petugas123', 10),
      fullName: 'Petugas PMI 2',
      role: 'petugas',
    },
  });
  console.log('✓ Petugas user created:', petugas2.email);

  console.log('\n✅ Seeding completed successfully!');
  console.log('\nDefault credentials:');
  console.log('Admin: admin@pmi.com / admin123');
  console.log('Petugas 1: petugas1@pmi.com / petugas123');
  console.log('Petugas 2: petugas2@pmi.com / petugas123');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
