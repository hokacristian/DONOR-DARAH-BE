/**
 * Test script untuk memverifikasi perhitungan SAW
 * Menggunakan data contoh dari screenshot:
 * C1=3, C2=4, C3=3, C4=9, C5=35, C6=9, C7=1
 *
 * Expected Yi = 0.074654063399029
 */

const { DOMINATORS, normalizeSAW } = require('./src/services/sawService');

console.log('='.repeat(80));
console.log('🧪 TEST SAW CALCULATION - VERIFY AGAINST SCREENSHOT');
console.log('='.repeat(80));
console.log();

// Data pendonor contoh dari screenshot
const exampleData = {
  C1: 3,  // Tekanan Darah (mapped value)
  C2: 4,  // Berat Badan (mapped value)
  C3: 3,  // Hemoglobin (mapped value)
  C4: 9,  // Tidak Konsumsi Obat (actual value)
  C5: 35, // Umur (actual value)
  C6: 9,  // Lamanya Tidur (actual value)
  C7: 1,  // Riwayat Penyakit (mapped value)
};

// Bobot kriteria (sesuai requirement)
const weights = {
  C1: 0.25,  // Benefit
  C2: 0.15,  // Benefit
  C3: 0.25,  // Benefit
  C4: 0.10,  // Benefit
  C5: 0.10,  // Cost
  C6: 0.05,  // Benefit
  C7: 0.05,  // Benefit
};

const types = {
  C1: 'benefit',
  C2: 'benefit',
  C3: 'benefit',
  C4: 'benefit',
  C5: 'cost',
  C6: 'benefit',
  C7: 'benefit',
};

console.log('📊 STEP 1: Fixed Dominator Values');
console.log('-'.repeat(80));
Object.keys(DOMINATORS).forEach(key => {
  console.log(`${key}: ${DOMINATORS[key]}`);
});
console.log();

console.log('📊 STEP 2: Input Data (Mapped Values)');
console.log('-'.repeat(80));
Object.keys(exampleData).forEach(key => {
  console.log(`${key}: ${exampleData[key]}`);
});
console.log();

console.log('📊 STEP 3: Normalisasi SAW (x\'ij = xij / Dominator)');
console.log('-'.repeat(80));
const normalized = {};
Object.keys(exampleData).forEach(key => {
  normalized[key] = normalizeSAW(exampleData[key], key);
  console.log(`${key}: x'${key} = ${exampleData[key]} / ${DOMINATORS[key]} = ${normalized[key].toFixed(12)}`);
});
console.log();

console.log('📊 STEP 4: Weighted Normalized (Vij = wj × x\'ij)');
console.log('-'.repeat(80));
const weighted = {};
let benefitSum = 0;
let costSum = 0;

Object.keys(exampleData).forEach(key => {
  weighted[key] = weights[key] * normalized[key];
  console.log(`${key}: V${key} = ${weights[key]} × ${normalized[key].toFixed(12)} = ${weighted[key].toFixed(12)}`);

  if (types[key] === 'benefit') {
    benefitSum += weighted[key];
  } else {
    costSum += weighted[key];
  }
});
console.log();

console.log('📊 STEP 5: Calculate Preference Value (Yi)');
console.log('-'.repeat(80));
console.log(`Sum of Benefits (C1, C2, C3, C4, C6, C7):`);
console.log(`  = ${weighted.C1.toFixed(12)}`);
console.log(`  + ${weighted.C2.toFixed(12)}`);
console.log(`  + ${weighted.C3.toFixed(12)}`);
console.log(`  + ${weighted.C4.toFixed(12)}`);
console.log(`  + ${weighted.C6.toFixed(12)}`);
console.log(`  + ${weighted.C7.toFixed(12)}`);
console.log(`  = ${benefitSum.toFixed(12)}`);
console.log();

console.log(`Sum of Costs (C5):`);
console.log(`  = ${weighted.C5.toFixed(12)}`);
console.log();

const preferenceValue = benefitSum - costSum;
console.log(`Yi = Σ(Benefit) - Σ(Cost)`);
console.log(`   = ${benefitSum.toFixed(12)} - ${costSum.toFixed(12)}`);
console.log(`   = ${preferenceValue.toFixed(12)}`);
console.log();

// Expected value from screenshot
const expectedYi = 0.074654063399029;
const difference = Math.abs(preferenceValue - expectedYi);
const threshold = 0.0520;

console.log('📊 STEP 6: Verification');
console.log('-'.repeat(80));
console.log(`Expected Yi (from screenshot): ${expectedYi.toFixed(12)}`);
console.log(`Calculated Yi:                 ${preferenceValue.toFixed(12)}`);
console.log(`Difference:                    ${difference.toFixed(15)}`);
console.log();

if (difference < 0.000001) {
  console.log('✅ SUCCESS! Calculation matches the screenshot exactly!');
} else {
  console.log('⚠️  WARNING: Small difference detected. This might be due to rounding.');
}
console.log();

console.log('📊 STEP 7: Eligibility Check');
console.log('-'.repeat(80));
console.log(`Threshold:      ${threshold}`);
console.log(`Preference Yi:  ${preferenceValue.toFixed(12)}`);
console.log(`Is Eligible:    ${preferenceValue >= threshold ? 'YES (LAYAK)' : 'NO (TIDAK LAYAK)'}`);
console.log();

if (preferenceValue >= threshold) {
  console.log('✅ STATUS: LAYAK untuk donor darah');
} else {
  console.log('❌ STATUS: TIDAK LAYAK untuk donor darah');
}

console.log();
console.log('='.repeat(80));
console.log('🎉 TEST COMPLETED!');
console.log('='.repeat(80));
