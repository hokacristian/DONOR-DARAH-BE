/**
 * Script to recalculate all MOORA evaluations with new threshold
 * Run this after changing the threshold setting
 */

const { PrismaClient } = require('@prisma/client');
const { evaluateSingleDonor } = require('../src/services/mooraService');

const prisma = new PrismaClient();

async function recalculateAllEvaluations() {
  console.log('🔄 Starting recalculation of all MOORA evaluations...\n');

  try {
    // Get current threshold
    const thresholdSetting = await prisma.systemSetting.findUnique({
      where: { key: 'eligibility_threshold' },
    });
    const threshold = thresholdSetting ? parseFloat(thresholdSetting.value) : 0.0520;
    console.log(`📊 Current threshold: ${threshold}\n`);

    // Get all examinations
    const examinations = await prisma.donorExamination.findMany({
      include: {
        donor: true,
        mooraCalculations: true,
      },
    });

    console.log(`📋 Found ${examinations.length} examinations to recalculate\n`);

    let updatedCount = 0;
    let statusChanges = 0;

    for (const exam of examinations) {
      const oldEvaluation = exam.mooraCalculations[0];

      console.log(`Processing: ${exam.donor.fullName} (Exam ID: ${exam.id})`);

      if (oldEvaluation) {
        const oldStatus = oldEvaluation.isEligible ? 'LAYAK' : 'TIDAK LAYAK';
        console.log(`  Old: Yi=${oldEvaluation.preferenceValue.toFixed(6)}, Status=${oldStatus}`);
      }

      // Recalculate
      const newEvaluation = await evaluateSingleDonor(exam.id);

      const newStatus = newEvaluation.isEligible ? 'LAYAK' : 'TIDAK LAYAK';
      console.log(`  New: Yi=${newEvaluation.preferenceValue.toFixed(6)}, Status=${newStatus}`);

      if (oldEvaluation && oldEvaluation.isEligible !== newEvaluation.isEligible) {
        console.log(`  ⚠️  STATUS CHANGED: ${oldStatus} → ${newStatus}`);
        statusChanges++;
      }

      updatedCount++;
      console.log('');
    }

    console.log('═'.repeat(70));
    console.log('✅ Recalculation completed successfully!');
    console.log('═'.repeat(70));
    console.log(`Total examinations processed: ${updatedCount}`);
    console.log(`Status changes detected: ${statusChanges}`);
    console.log(`Current threshold: ${threshold}`);
    console.log('═'.repeat(70));

  } catch (error) {
    console.error('❌ Error during recalculation:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

recalculateAllEvaluations()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
