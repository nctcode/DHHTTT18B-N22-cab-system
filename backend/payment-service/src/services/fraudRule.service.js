const DEFAULT_FRAUD_THRESHOLD = 0.8;

const getFraudThreshold = () => {
  const parsed = Number.parseFloat(process.env.FRAUD_SCORE_THRESHOLD ?? '');
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 1) {
    return DEFAULT_FRAUD_THRESHOLD;
  }
  return parsed;
};

const normalizeFraudScore = (input) => {
  if (input === undefined || input === null || input === '') {
    return 0;
  }

  const parsed = Number.parseFloat(input);
  if (!Number.isFinite(parsed)) {
    const error = new Error('Invalid fraud_score: must be a number between 0 and 1');
    error.statusCode = 400;
    throw error;
  }

  if (parsed < 0 || parsed > 1) {
    const error = new Error('Invalid fraud_score: must be between 0 and 1');
    error.statusCode = 400;
    throw error;
  }

  return parsed;
};

const evaluateFraudAssessment = (fraudScoreInput, thresholdInput) => {
  const fraudScore = normalizeFraudScore(fraudScoreInput);
  const threshold =
    thresholdInput !== undefined
      ? Number.parseFloat(thresholdInput)
      : getFraudThreshold();

  const normalizedThreshold = Number.isFinite(threshold) ? threshold : DEFAULT_FRAUD_THRESHOLD;
  const flagged = fraudScore > normalizedThreshold;

  return {
    fraudScore,
    flagged,
    threshold: normalizedThreshold,
  };
};

module.exports = {
  DEFAULT_FRAUD_THRESHOLD,
  getFraudThreshold,
  normalizeFraudScore,
  evaluateFraudAssessment,
};
