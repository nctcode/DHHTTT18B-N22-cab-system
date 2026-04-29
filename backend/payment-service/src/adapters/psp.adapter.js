class PSPAdapter {
  async charge(amount, method, details) {
    throw new Error('Not implemented');
  }

  async refund(amount, transactionId) {
    throw new Error('Not implemented');
  }
}

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

class StripeAdapter extends PSPAdapter {
  async charge(amount, method, details) {
    console.log('[Stripe/CARD] Charging', amount);
    
    if (!details || !details.paymentMethodId) {
       throw new Error('paymentMethodId is required for Stripe charge');
    }

    try {
      // Retrieve the PaymentMethod to get the customer ID
      const pm = await stripe.paymentMethods.retrieve(details.paymentMethodId);
      if (!pm.customer) {
          throw new Error('PaymentMethod is not attached to a Customer. Please re-add your card.');
      }

      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount),
        currency: 'vnd',
        customer: pm.customer,
        payment_method: details.paymentMethodId,
        confirm: true,
        off_session: true // indicates this is a backend-initiated charge
      }, {
        idempotencyKey: details.idempotencyKey,
      });

      return {
        success: true,
        transactionId: paymentIntent.id,
        provider: 'stripe'
      };
    } catch (error) {
       console.error('[Stripe] Charge Error:', error.message);
       throw error;
    }
  }

  async refund(amount, transactionId) {
    console.log('[Stripe] Refunding', amount, transactionId);
    try {
        const refund = await stripe.refunds.create({
            payment_intent: transactionId,
            amount: Math.round(amount)
        });
        return { success: true, refundId: refund.id };
    } catch (error) {
        console.error('[Stripe] Refund Error:', error.message);
        throw error;
    }
  }
}

class MomoAdapter extends PSPAdapter {
  async charge(amount, method, details) {
    console.log('[MoMo] Charging', amount);
    return {
      success: true,
      transactionId: `momo_${Date.now()}`,
      provider: 'momo'
    };
  }
  
  async refund(amount, transactionId) {
    console.log('[MoMo] Refunding', amount);
    return { success: true, refundId: `ref_momo_${Date.now()}` };
  }
}

class VNPayAdapter extends PSPAdapter {
  async charge(amount, method, details) {
    console.log('[VNPay] Charging', amount);
    return {
        success: true,
        transactionId: `vnpay_${Date.now()}`,
        provider: 'vnpay'
    };
  }

  async refund(amount, transactionId) {
    return { success: true, refundId: `ref_vnp${Date.now()}` };
  }
}

class WalletAdapter extends PSPAdapter {
  async charge(amount, method, details) {
    console.log('[Wallet] Charging', amount);
    
    // Simulate internal latency
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 400));
    
    // Simulate ~30% failure rate for testing Retries
    if (Math.random() < 0.3) {
      console.log('[Wallet] Simulated Internal Error');
      throw new Error('Wallet service temporarily unavailable');
    }

    return {
        success: true,
        transactionId: `wallet_${Date.now()}`,
        provider: 'wallet'
    };
  }

  async refund(amount, transactionId) {
    return { success: true, refundId: `ref_wallet${Date.now()}` };
  }
}

class MockAdapter extends PSPAdapter {
    async charge(amount) {
        console.log('[Mock] Charging', amount);
        return { success: true, transactionId: `mock_${Date.now()}`, provider: 'mock' };
    }
    async refund(amount) {
        return { success: true, refundId: `ref_mock_${Date.now()}` };
    }
}

const adapters = {
  CARD: new StripeAdapter(),
  CREDIT_CARD: new StripeAdapter(),
  WALLET: new WalletAdapter(),
  MOMO: new MomoAdapter(),
  VNPAY: new VNPayAdapter(),
  CASH: new MockAdapter()
};

const getAdapter = (method) => {
  return adapters[method] || adapters.CASH;
};

module.exports = { getAdapter };
