const prisma = require('../config/database');

/**
 * MOORA Calculation Service
 * Implements Multi-Objective Optimization by Ratio Analysis
 * Based on the document specification for blood donor eligibility assessment
 */

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
 * Build decision matrix for a single examination or multiple examinations in an event
 * @param {string} examinationId - Single examination ID (optional)
 * @param {string} eventId - Event ID to get all examinations (optional)
 * @returns {Promise<Array>} - Array of examination data with mapped criteria values
 */
async function buildDecisionMatrix(examinationId = null, eventId = null) {
  let examinations = [];

  if (examinationId) {
    // Get single examination
    const exam = await prisma.donorExamination.findUnique({
      where: { id: examinationId },
      include: {
        donor: true,
      },
    });
    if (exam) examinations = [exam];
  } else if (eventId) {
    // Get all examinations for an event
    examinations = await prisma.donorExamination.findMany({
      where: {
        donor: {
          eventId: eventId,
        },
      },
      include: {
        donor: true,
      },
    });
  }

  // Get all criteria with their codes
  const criteria = await prisma.criteria.findMany({
    orderBy: { code: 'asc' },
  });

  const matrix = [];

  for (const exam of examinations) {
    const row = {
      examinationId: exam.id,
      donorId: exam.donorId,
      donorName: exam.donor.fullName,
      values: [],
    };

    // Map examination data to criteria values (C1-C7)
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

      const normalizedValue = await mapInputToCriteriaValue(
        criterion.id,
        rawValue,
        criterion.code
      );

      criteriaValues.push({
        criteriaId: criterion.id,
        code: criterion.code,
        rawValue,
        normalizedValue,
      });

      row.values.push(normalizedValue);
    }

    row.criteriaDetails = criteriaValues;
    matrix.push(row);
  }

  return matrix;
}

/**
 * Normalize matrix using MOORA normalization formula
 * X*ij = Xij / sqrt(sum(Xij^2))
 * @param {Array} matrix - Decision matrix from buildDecisionMatrix
 * @returns {Array} - Normalized matrix
 */
function normalizeMatrix(matrix) {
  if (matrix.length === 0) return [];

  const numCriteria = matrix[0].values.length;
  const normalized = [];

  // Calculate sqrt of sum of squares for each criterion
  const sqrtSums = [];
  for (let j = 0; j < numCriteria; j++) {
    let sumOfSquares = 0;
    for (let i = 0; i < matrix.length; i++) {
      sumOfSquares += Math.pow(matrix[i].values[j], 2);
    }
    sqrtSums.push(Math.sqrt(sumOfSquares));
  }

  // Normalize each value
  for (const row of matrix) {
    const normalizedRow = {
      ...row,
      normalizedValues: [],
    };

    for (let j = 0; j < row.values.length; j++) {
      const normalizedValue = sqrtSums[j] !== 0
        ? row.values[j] / sqrtSums[j]
        : 0;
      normalizedRow.normalizedValues.push(normalizedValue);
    }

    normalized.push(normalizedRow);
  }

  return normalized;
}

/**
 * Calculate optimization value (Yi) for each alternative
 * Yi = sum(Wj * X*ij) for benefit - sum(Wj * X*ij) for cost
 * @param {Array} normalizedMatrix - Normalized matrix from normalizeMatrix
 * @returns {Promise<Array>} - Array with optimization values
 */
async function calculateOptimization(normalizedMatrix) {
  if (normalizedMatrix.length === 0) return [];

  // Get criteria with weights and types
  const criteria = await prisma.criteria.findMany({
    orderBy: { code: 'asc' },
  });

  const results = [];

  for (const row of normalizedMatrix) {
    let benefitSum = 0;
    let costSum = 0;

    for (let j = 0; j < criteria.length; j++) {
      const criterion = criteria[j];
      const normalizedValue = row.normalizedValues[j];
      const weightedValue = criterion.weight * normalizedValue;

      if (criterion.type === 'benefit') {
        benefitSum += weightedValue;
      } else if (criterion.type === 'cost') {
        costSum += weightedValue;
      }
    }

    const optimizationValue = benefitSum - costSum;

    results.push({
      ...row,
      benefitSum,
      costSum,
      optimizationValue,
    });
  }

  return results;
}

/**
 * Rank donors based on optimization values and determine eligibility
 * @param {string} eventId - Event ID to rank all donors
 * @returns {Promise<Array>} - Ranked donors with eligibility status
 */
async function rankDonors(eventId) {
  // Build decision matrix for all donors in the event
  const matrix = await buildDecisionMatrix(null, eventId);

  if (matrix.length === 0) {
    return [];
  }

  // Normalize matrix
  const normalized = normalizeMatrix(matrix);

  // Calculate optimization values
  const optimized = await calculateOptimization(normalized);

  // Sort by optimization value (descending - highest is best)
  optimized.sort((a, b) => b.optimizationValue - a.optimizationValue);

  // Get eligibility threshold from system settings
  const thresholdSetting = await prisma.systemSetting.findUnique({
    where: { key: 'eligibility_threshold' },
  });
  const threshold = thresholdSetting ? parseFloat(thresholdSetting.value) : 0.309;

  // Assign ranks and determine eligibility
  const ranked = optimized.map((item, index) => ({
    ...item,
    rank: index + 1,
    isEligible: item.optimizationValue >= threshold,
  }));

  // Save or update MOORA calculations in database
  for (const item of ranked) {
    await prisma.mooraCalculation.upsert({
      where: { examinationId: item.examinationId },
      update: {
        normalizedMatrix: item.normalizedValues,
        optimizationValue: item.optimizationValue,
        rank: item.rank,
        isEligible: item.isEligible,
        calculatedAt: new Date(),
      },
      create: {
        examinationId: item.examinationId,
        normalizedMatrix: item.normalizedValues,
        optimizationValue: item.optimizationValue,
        rank: item.rank,
        isEligible: item.isEligible,
      },
    });

    // Save examination criteria values
    for (const criteriaDetail of item.criteriaDetails) {
      // Check if criteria value already exists
      const existingValue = await prisma.examinationCriteriaValue.findFirst({
        where: {
          examinationId: item.examinationId,
          criteriaId: criteriaDetail.criteriaId,
        },
      });

      // Convert boolean rawValue to number for database storage
      const rawValueFloat = typeof criteriaDetail.rawValue === 'boolean'
        ? (criteriaDetail.rawValue ? 1 : 0)
        : parseFloat(criteriaDetail.rawValue);

      if (existingValue) {
        // Update existing record
        await prisma.examinationCriteriaValue.update({
          where: { id: existingValue.id },
          data: {
            rawValue: rawValueFloat,
            normalizedValue: criteriaDetail.normalizedValue,
          },
        });
      } else {
        // Create new record
        await prisma.examinationCriteriaValue.create({
          data: {
            examinationId: item.examinationId,
            criteriaId: criteriaDetail.criteriaId,
            rawValue: rawValueFloat,
            normalizedValue: criteriaDetail.normalizedValue,
          },
        });
      }
    }
  }

  return ranked;
}

/**
 * Calculate MOORA for a single examination
 * This is used when a new examination is created or updated
 * @param {string} examinationId - Examination ID
 * @returns {Promise<Object>} - Calculation result
 */
async function calculateForExamination(examinationId) {
  // Get the examination with donor info
  const examination = await prisma.donorExamination.findUnique({
    where: { id: examinationId },
    include: {
      donor: true,
    },
  });

  if (!examination) {
    throw new Error('Examination not found');
  }

  // Recalculate all donors in the same event to update rankings
  const results = await rankDonors(examination.donor.eventId);

  // Find and return the result for this specific examination
  const thisResult = results.find(r => r.examinationId === examinationId);

  return thisResult;
}

module.exports = {
  mapInputToCriteriaValue,
  buildDecisionMatrix,
  normalizeMatrix,
  calculateOptimization,
  rankDonors,
  calculateForExamination,
};
