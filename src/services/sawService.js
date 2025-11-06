const prisma = require('../config/database');

/**
 * SAW (Simple Additive Weighting) Calculation Service
 * Implements SAW algorithm for blood donor eligibility assessment
 * Based on fixed dominator values and weighted normalization
 */

/**
 * Fixed Dominator Values for each criteria
 * These values are constants used for SAW normalization
 */
const DOMINATORS = {
  C1: 29.966648,
  C2: 38.236109,
  C3: 36.496575,
  C4: 83.845095,
  C5: 492.957402,
  C6: 88.803153,
  C7: 10.677078,
};

/**
 * Map raw examination values to criteria normalized values based on sub-criteria ranges
 * @param {number} criteriaId - The criteria ID
 * @param {any} rawValue - The raw input value
 * @param {string} criteriaCode - The criteria code (C1-C7)
 * @returns {Promise<number>} - The normalized value from sub_criteria
 */
async function mapInputToCriteriaValue(criteriaId, rawValue, criteriaCode) {
  // For C4, C5, C6: use actual value (nilai sebenarnya)
  if (['C4', 'C5', 'C6'].includes(criteriaCode)) {
    return parseFloat(rawValue);
  }

  // For C7: boolean to value mapping
  if (criteriaCode === 'C7') {
    return rawValue === true || rawValue === 1 || rawValue === '1' ? 0 : 1;
  }

  // For C1: Blood Pressure (systolic)
  if (criteriaCode === 'C1') {
    const systolic = parseFloat(rawValue);
    if (systolic < 110) return 1;  // Rendah
    if (systolic > 155) return 2;  // Tinggi
    return 3;  // Normal
  }

  // For C2: Weight
  if (criteriaCode === 'C2') {
    const weight = parseFloat(rawValue);
    if (weight < 50) return 1;  // Kurus
    if (weight >= 50 && weight <= 65) return 4;  // Sedang (ideal)
    if (weight > 65 && weight <= 80) return 3;  // Gemuk
    return 2;  // Obesitas (> 80)
  }

  // For C3: Hemoglobin
  if (criteriaCode === 'C3') {
    const hb = parseFloat(rawValue);
    if (hb < 12.5) return 1;  // Rendah
    if (hb > 17) return 2;  // Tinggi
    return 3;  // Normal
  }

  return parseFloat(rawValue);
}

/**
 * Extract criteria values from a single examination
 * @param {Object} exam - Examination object from database
 * @param {Array} criteria - All criteria from database
 * @returns {Array} - Array of criteria values with raw and mapped values
 */
async function extractCriteriaValues(exam, criteria) {
  const criteriaValues = [];

  for (const criterion of criteria) {
    let rawValue;

    switch (criterion.code) {
      case 'C1': // Tekanan Darah
        rawValue = exam.bloodPressureSystolic;
        break;
      case 'C2': // Berat Badan
        rawValue = exam.weight;
        break;
      case 'C3': // Hemoglobin
        rawValue = exam.hemoglobin;
        break;
      case 'C4': // Tidak Konsumsi Obat (hari)
        rawValue = exam.medicationFreeDays;
        break;
      case 'C5': // Umur
        rawValue = exam.age;
        break;
      case 'C6': // Lamanya Terakhir Tidur
        rawValue = exam.lastSleepHours;
        break;
      case 'C7': // Riwayat Penyakit
        rawValue = exam.hasDiseaseHistory;
        break;
      default:
        rawValue = 0;
    }

    const mappedValue = await mapInputToCriteriaValue(
      criterion.id,
      rawValue,
      criterion.code
    );

    criteriaValues.push({
      criteriaId: criterion.id,
      code: criterion.code,
      rawValue,
      mappedValue, // nilai yang sudah di-mapping (C1,C2,C3,C7) atau nilai asli (C4,C5,C6)
    });
  }

  return criteriaValues;
}

/**
 * Normalize value using SAW normalization with fixed dominator
 * Formula: x'ij = xij / Dominator_j
 * @param {number} value - The mapped criteria value
 * @param {string} criteriaCode - The criteria code (C1-C7)
 * @returns {number} - Normalized value
 */
function normalizeSAW(value, criteriaCode) {
  const dominator = DOMINATORS[criteriaCode];
  if (!dominator || dominator === 0) {
    return 0;
  }
  return value / dominator;
}

/**
 * Calculate SAW preference value (Yi) for a single donor
 * Formula:
 * 1. Normalisasi: x'ij = xij / Dominator_j
 * 2. Weighted Normalized: Vij = wj × x'ij
 * 3. Preference: Yi = Σ(Vij benefit) - Σ(Vij cost)
 *
 * @param {string} examinationId - Examination ID
 * @returns {Promise<Object>} - Evaluation result with preference value and eligibility
 */
async function evaluateSingleDonor(examinationId) {
  // Get examination with donor info
  const examination = await prisma.donorExamination.findUnique({
    where: { id: examinationId },
    include: {
      donor: true,
    },
  });

  if (!examination) {
    throw new Error('Examination not found');
  }

  // Get all criteria with weights and types
  const criteria = await prisma.criteria.findMany({
    orderBy: { code: 'asc' },
  });

  // Extract criteria values from examination
  const criteriaValues = await extractCriteriaValues(examination, criteria);

  // Calculate SAW
  let benefitSum = 0;
  let costSum = 0;
  const normalizedValues = [];
  const weightedValues = [];

  for (let i = 0; i < criteria.length; i++) {
    const criterion = criteria[i];
    const criteriaValue = criteriaValues[i];

    // Step 1: Normalisasi SAW (x'ij = xij / Dominator)
    const normalized = normalizeSAW(criteriaValue.mappedValue, criterion.code);
    normalizedValues.push(normalized);

    // Step 2: Weighted Normalized (Vij = wj × x'ij)
    const weightedValue = criterion.weight * normalized;
    weightedValues.push(weightedValue);

    // Step 3: Sum benefit and cost
    if (criterion.type === 'benefit') {
      benefitSum += weightedValue;
    } else if (criterion.type === 'cost') {
      costSum += weightedValue;
    }
  }

  // Step 4: Calculate preference value (Yi = benefit - cost)
  const preferenceValue = benefitSum - costSum;

  // Get eligibility threshold from system settings
  const thresholdSetting = await prisma.systemSetting.findUnique({
    where: { key: 'eligibility_threshold' },
  });
  const threshold = thresholdSetting ? parseFloat(thresholdSetting.value) : 0.0520;

  // Determine eligibility
  const isEligible = preferenceValue >= threshold;

  // Save or update SAW evaluation in database
  const savedEvaluation = await prisma.sawEvaluation.upsert({
    where: { examinationId: examinationId },
    update: {
      preferenceValue: preferenceValue,
      isEligible: isEligible,
      calculatedAt: new Date(),
    },
    create: {
      examinationId: examinationId,
      preferenceValue: preferenceValue,
      isEligible: isEligible,
    },
  });

  // Save examination criteria values
  for (const criteriaValue of criteriaValues) {
    // Check if criteria value already exists
    const existingValue = await prisma.examinationCriteriaValue.findFirst({
      where: {
        examinationId: examinationId,
        criteriaId: criteriaValue.criteriaId,
      },
    });

    // Convert boolean rawValue to number for database storage
    const rawValueFloat = typeof criteriaValue.rawValue === 'boolean'
      ? (criteriaValue.rawValue ? 1 : 0)
      : parseFloat(criteriaValue.rawValue);

    if (existingValue) {
      // Update existing record
      await prisma.examinationCriteriaValue.update({
        where: { id: existingValue.id },
        data: {
          rawValue: rawValueFloat,
          normalizedValue: criteriaValue.mappedValue,
        },
      });
    } else {
      // Create new record
      await prisma.examinationCriteriaValue.create({
        data: {
          examinationId: examinationId,
          criteriaId: criteriaValue.criteriaId,
          rawValue: rawValueFloat,
          normalizedValue: criteriaValue.mappedValue,
        },
      });
    }
  }

  // Return comprehensive evaluation result
  return {
    examinationId: examination.id,
    donorId: examination.donorId,
    preferenceValue: preferenceValue,
    benefitSum: benefitSum,
    costSum: costSum,
    isEligible: isEligible,
    status: isEligible ? 'LAYAK' : 'TIDAK LAYAK',
    threshold: threshold,
    criteriaValues: criteriaValues,
    normalizedValues: normalizedValues,
    weightedValues: weightedValues,
    calculatedAt: savedEvaluation.calculatedAt,
  };
}

/**
 * Get evaluation result for a specific examination
 * @param {string} examinationId - Examination ID
 * @returns {Promise<Object|null>} - Saved evaluation result from database
 */
async function getEvaluationResult(examinationId) {
  const evaluation = await prisma.sawEvaluation.findUnique({
    where: { examinationId: examinationId },
    include: {
      examination: {
        include: {
          donor: true,
        },
      },
    },
  });

  if (!evaluation) {
    return null;
  }

  // Get threshold for status determination
  const thresholdSetting = await prisma.systemSetting.findUnique({
    where: { key: 'eligibility_threshold' },
  });
  const threshold = thresholdSetting ? parseFloat(thresholdSetting.value) : 0.0520;

  return {
    ...evaluation,
    status: evaluation.isEligible ? 'LAYAK' : 'TIDAK LAYAK',
    threshold: threshold,
  };
}

/**
 * Get all evaluations for an event
 * @param {string} eventId - Event ID
 * @returns {Promise<Array>} - Array of evaluation results
 */
async function getEventEvaluations(eventId) {
  const examinations = await prisma.donorExamination.findMany({
    where: {
      donor: {
        eventId: eventId,
      },
    },
    include: {
      donor: true,
      sawEvaluations: true,
    },
  });

  // Get threshold
  const thresholdSetting = await prisma.systemSetting.findUnique({
    where: { key: 'eligibility_threshold' },
  });
  const threshold = thresholdSetting ? parseFloat(thresholdSetting.value) : 0.0520;

  return examinations.map(exam => {
    const evaluation = exam.sawEvaluations[0]; // Only one evaluation per examination
    if (!evaluation) {
      return null;
    }

    return {
      examinationId: exam.id,
      donorId: exam.donorId,
      donorName: exam.donor.fullName,
      preferenceValue: evaluation.preferenceValue,
      isEligible: evaluation.isEligible,
      status: evaluation.isEligible ? 'LAYAK' : 'TIDAK LAYAK',
      threshold: threshold,
      calculatedAt: evaluation.calculatedAt,
    };
  }).filter(e => e !== null);
}

module.exports = {
  evaluateSingleDonor,
  getEvaluationResult,
  getEventEvaluations,
  mapInputToCriteriaValue,
  extractCriteriaValues,
  normalizeSAW,
  DOMINATORS,
};
