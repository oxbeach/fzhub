// dummyStripe.js

/**
 * Simulates a Stripe payment processing workflow.
 * @param {Object} orderPayload - Object containing { passType, amount, email }
 * @param {boolean} shouldSucceed - Toggle to test success (true) vs failure (false)
 */
export const processDummyPayment = async (orderPayload, shouldSucceed = true) => {
    // 1. Simulate network delay (1.5 seconds)
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // 2. Simulate Failure Scenario
    if (!shouldSucceed) {
        return {
            success: false,
            errorCode: 'ERR_ACCOUNT_PAYMENT',
        };
    }

    // Extract order details from payload
    const { passType, amount, email } = orderPayload || {};

    // 3. Simulate Success Scenario
    // Generate a mock Stripe transaction ID
    const mockTransactionId = `ch_dummy_${Math.random().toString(36).substring(2, 11)}`;

    return {
        success: true,
        transactionId: mockTransactionId,
        amount,
        email,
        passType,
        provider: 'stripeDummy'
    };
};