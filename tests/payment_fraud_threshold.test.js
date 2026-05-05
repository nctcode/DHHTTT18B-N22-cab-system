const { evaluateFraudAssessment } = require('../backend/payment-service/src/services/fraudRule.service');

describe('Fraud threshold rule', () => {
  const THRESHOLD = 0.8;

  beforeEach(() => {
    process.env.FRAUD_SCORE_THRESHOLD = String(THRESHOLD);
  });

  afterAll(() => {
    delete process.env.FRAUD_SCORE_THRESHOLD;
  });

  test('fraud_score < threshold => flagged = false', () => {
    const result = evaluateFraudAssessment(0.79);
    expect(result.fraudScore).toBeCloseTo(0.79, 5);
    expect(result.flagged).toBe(false);
  });

  test('fraud_score = threshold => flagged = false (strict > rule)', () => {
    const result = evaluateFraudAssessment(0.8);
    expect(result.fraudScore).toBeCloseTo(0.8, 5);
    expect(result.flagged).toBe(false);
  });

  test('fraud_score > threshold => flagged = true', () => {
    const result = evaluateFraudAssessment(0.81);
    expect(result.fraudScore).toBeCloseTo(0.81, 5);
    expect(result.flagged).toBe(true);
  });
});
