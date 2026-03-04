const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.createSetupIntent = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'PASSENGER') {
        return res.status(403).json({ message: 'Only passengers can setup cards' });
    }

    // Check if the user already has a saved card
    const existingCards = await prisma.savedPaymentMethod.count({
        where: { passenger_id: req.user.id }
    });

    if (existingCards > 0) {
        return res.status(400).json({ message: 'Bạn chỉ được liên kết tối đa 1 thẻ. Vui lòng hủy liên kết thẻ hiện tại trước.' });
    }

    // Stripe SetupIntent
    const setupIntent = await stripe.setupIntents.create({
      payment_method_types: ['card'],
      metadata: { passenger_id: req.user.id }
    });

    res.json({
      clientSecret: setupIntent.client_secret
    });
  } catch (error) {
    console.error('Stripe SetupIntent Error:', error);
    res.status(500).json({ message: 'Failed to create SetupIntent', error: error.message });
  }
};

exports.saveCard = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'PASSENGER') {
        return res.status(403).json({ message: 'Forbidden' });
    }

    const { paymentMethodId } = req.body;
    if (!paymentMethodId) {
        return res.status(400).json({ message: 'Missing paymentMethodId' });
    }

    // Retrieve payment method from Stripe to get brand and last4
    let paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);

    // Stripe requires off_session charges to have the PaymentMethod attached to a Customer
    if (!paymentMethod.customer) {
        const customer = await stripe.customers.create({
            metadata: { passenger_id: req.user.id }
        });
        paymentMethod = await stripe.paymentMethods.attach(paymentMethodId, { customer: customer.id });
    }

    // Save to database
    const savedCard = await prisma.savedPaymentMethod.create({
        data: {
            passenger_id: req.user.id,
            payment_method_id: paymentMethod.id,
            brand: paymentMethod.card?.brand,
            last4: paymentMethod.card?.last4,
            is_default: true // Simple assumption for demo
        }
    });

    res.json(savedCard);
  } catch (error) {
    console.error('Stripe Save Card Error:', error);
    res.status(500).json({ message: 'Failed to save card', error: error.message });
  }
};

exports.getSavedCards = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'PASSENGER') {
        return res.status(403).json({ message: 'Forbidden' });
    }

    const cards = await prisma.savedPaymentMethod.findMany({
        where: { passenger_id: req.user.id },
        orderBy: { created_at: 'desc' }
    });

    res.json(cards);
  } catch (error) {
    console.error('Get Saved Cards Error:', error);
    res.status(500).json({ message: 'Failed to retrieve saved cards', error: error.message });
  }
};

exports.deleteSavedCard = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'PASSENGER') {
        return res.status(403).json({ message: 'Forbidden' });
    }

    const { id } = req.params;
    console.log(`[Stripe] Deleting card ID: ${id} for user: ${req.user.id}`);

    // First find the card in our database to ensure it belongs to the user
    const savedCard = await prisma.savedPaymentMethod.findFirst({
        where: { 
            id: id,
            passenger_id: req.user.id
        }
    });

    if (!savedCard) {
        console.log(`[Stripe] Card ${id} not found for user ${req.user.id}`);
        return res.status(404).json({ message: 'Saved card not found' });
    }

    // Try to detach from Stripe API if it's not our mock pm_mock_ id
    if (savedCard.payment_method_id && !savedCard.payment_method_id.startsWith('pm_mock_')) {
        try {
            console.log(`[Stripe] Detaching Stripe payment method: ${savedCard.payment_method_id}`);
            await stripe.paymentMethods.detach(savedCard.payment_method_id);
        } catch (stripeError) {
            console.error('Stripe Detach Error (ignoring):', stripeError.message);
            // We ignore the error and proceed to delete from DB anyway
        }
    }

    // Delete from local DB
    await prisma.savedPaymentMethod.delete({
        where: { id: id }
    });
    
    console.log(`[Stripe] Successfully deleted card ${id} from DB`);

    res.json({ message: 'Card unlinked successfully' });
  } catch (error) {
    console.error('Delete Saved Card Error:', error);
    res.status(500).json({ message: 'Failed to delete saved card', error: error.message });
  }
};
