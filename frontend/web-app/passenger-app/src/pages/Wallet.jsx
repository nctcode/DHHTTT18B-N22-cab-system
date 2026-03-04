import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { stripeService } from '../services';
import LoadingSpinner from '../components/LoadingSpinner';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import toast from 'react-hot-toast';

// Use the environment variable for Stripe Publishable Key, fallback to 'placeholder' to avoid crash if not set yet.
const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_51MockPublishableKey';
const stripePromise = loadStripe(stripePublishableKey);

const AddCardForm = ({ onCardAdded }) => {
    const stripe = useStripe();
    const elements = useElements();
    const [isProcessing, setIsProcessing] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!stripe || !elements) return;
        setIsProcessing(true);
        try {
            // 1. Get SetupIntent clientSecret from backend
            const { clientSecret } = await stripeService.createSetupIntent();

            // 2. Confirm SetupIntent with Stripe
            const { setupIntent, error } = await stripe.confirmCardSetup(clientSecret, {
                payment_method: {
                    card: elements.getElement(CardElement),
                },
            });

            if (error) {
                toast.error(error.message);
            } else if (setupIntent && setupIntent.status === 'succeeded') {
                // 3. Save the payment method to DB
                await stripeService.saveCard(setupIntent.payment_method);
                toast.success('Thêm thẻ thành công!');
                elements.getElement(CardElement).clear();
                onCardAdded();
            }
        } catch (error) {
            console.error('Add card error:', error);
            toast.error('Không thể thêm thẻ. Vui lòng thử lại.');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 flex flex-col gap-4">
            <h3 className="font-bold text-gray-800 text-lg">Thêm Thẻ Mới</h3>
            <div className="p-4 border rounded-xl bg-gray-50 focus-within:ring-2 focus-within:ring-primary focus-within:border-transparent transition-all duration-300">
                <CardElement options={{
                    style: {
                        base: {
                            fontSize: '16px',
                            color: '#424770',
                            fontFamily: 'system-ui, -apple-system, sans-serif',
                            '::placeholder': { color: '#aab7c4' }
                        },
                        invalid: { color: '#ef4444' },
                    },
                }} />
            </div>
            <button
                type="submit"
                disabled={!stripe || isProcessing}
                className="w-full bg-gradient-to-r from-primary to-blue-600 hover:from-primary hover:to-primary-dark text-white font-semibold py-3.5 rounded-xl shadow-md hover:shadow-lg hover:-translate-y-0.5 disabled:bg-gray-400 disabled:from-gray-400 disabled:to-gray-400 disabled:transform-none disabled:shadow-none transition-all duration-300 flex items-center justify-center gap-2"
            >
                {isProcessing ? (
                    <>
                        <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                        <span>Đang xử lý...</span>
                    </>
                ) : 'Liên Kết Thẻ'}
            </button>
        </form>
    );
};

export default function Wallet() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [savedCards, setSavedCards] = useState([]);
    const [loading, setLoading] = useState(true);
    const [deletingId, setDeletingId] = useState(null);

    const fetchCards = async () => {
        try {
            setLoading(true);
            const data = await stripeService.getSavedCards();
            setSavedCards(data || []);
        } catch (error) {
            console.error('Failed to fetch cards:', error);
            toast.error('Không thể tải danh sách thẻ');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteCard = async (id) => {
        if (!window.confirm("Bạn có chắc chắn muốn hủy liên kết thẻ này không?")) return;

        try {
            setDeletingId(id);
            await stripeService.deleteCard(id);
            toast.success('Hủy liên kết thẻ thành công!');
            setSavedCards(prev => prev.filter(card => card.id !== id));
        } catch (error) {
            console.error('Delete card error:', error);
            toast.error('Không thể hủy liên kết thẻ. Vui lòng thử lại.');
        } finally {
            setDeletingId(null);
        }
    };

    useEffect(() => {
        fetchCards();
    }, []);

    return (
        <div className="min-h-full h-full bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col overflow-y-auto box-border">
            {/* Header */}
            <div className="backdrop-blur-md bg-white/80 shadow-sm p-4 flex items-center sticky top-0 z-20 border-b border-gray-100">
                <button
                    onClick={() => navigate(-1)}
                    className="mr-4 p-2 rounded-full hover:bg-gray-100 transition-colors"
                >
                    <svg className="w-6 h-6 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                </button>
                <h1 className="text-xl font-bold tracking-tight text-gray-800">Phương Thức Thanh Toán</h1>
            </div>

            {/* Content */}
            <div className="p-6 max-w-lg mx-auto w-full flex-1">
                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <LoadingSpinner />
                    </div>
                ) : (
                    <div className="space-y-8 animate-[fadeIn_0.5s_ease-out]">
                        {/* Saved Cards */}
                        <div>
                            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-4 px-1">Danh Sách Thẻ</h2>
                            {savedCards.length === 0 ? (
                                <div className="text-center p-8 bg-white/50 rounded-2xl border border-gray-200 border-dashed backdrop-blur-sm shadow-sm">
                                    <div className="text-4xl mb-3 opacity-80">💳</div>
                                    <p className="text-gray-600 font-medium">Bạn chưa liên kết thẻ nào</p>
                                    <p className="text-gray-400 text-sm mt-1">Thêm thẻ bên dưới để thanh toán tiện lợi hơn</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {savedCards.map(card => (
                                        <div
                                            key={card.id}
                                            className="relative overflow-hidden group p-5 bg-gradient-to-r from-gray-900 to-gray-800 rounded-2xl shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-gray-700"
                                        >
                                            {/* Decorative circles */}
                                            <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-white opacity-5 rounded-full pointer-events-none"></div>
                                            <div className="absolute bottom-0 right-10 -mb-8 w-16 h-16 bg-white opacity-5 rounded-full pointer-events-none"></div>

                                            <div className="flex items-center justify-between relative z-10">
                                                <div className="flex items-center gap-4">
                                                    <div className="bg-white/10 p-3 rounded-xl backdrop-blur-sm text-2xl border border-white/5">
                                                        {card.brand === 'visa' ? '💳' : card.brand === 'mastercard' ? '💳' : '💳'}
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-white/90 uppercase tracking-widest text-sm mb-1">
                                                            {card.brand}
                                                        </p>
                                                        <div className="flex items-center text-white/90 font-medium tracking-[0.2em]">
                                                            <span className="text-white/40 mr-2">•••• •••• ••••</span>
                                                            <span className="tracking-widest">{card.last4}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex flex-col items-end gap-2">
                                                    {card.is_default && (
                                                        <span className="text-xs bg-emerald-500/20 text-emerald-300 px-3 py-1.5 rounded-full font-medium backdrop-blur-md border border-emerald-500/20">
                                                            Mặc định
                                                        </span>
                                                    )}

                                                    <button
                                                        onClick={() => handleDeleteCard(card.id)}
                                                        disabled={deletingId === card.id}
                                                        className="text-white/60 hover:text-red-400 transition-colors bg-white/5 hover:bg-white/10 p-2 rounded-lg"
                                                        title="Hủy liên kết"
                                                    >
                                                        {deletingId === card.id ? (
                                                            <div className="animate-spin h-5 w-5 border-2 border-white/60 border-t-transparent rounded-full"></div>
                                                        ) : (
                                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                            </svg>
                                                        )}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Add Card Form */}
                        <div>
                            {savedCards.length > 0 ? (
                                <div className="text-center p-6 bg-white/50 rounded-2xl border border-blue-100 backdrop-blur-sm shadow-sm">
                                    <div className="text-2xl mb-2">ℹ️</div>
                                    <p className="text-gray-700 font-medium">Bạn đã liên kết thẻ</p>
                                    <p className="text-gray-500 text-sm mt-1">Hệ thống hiện chỉ hỗ trợ lưu 1 thẻ tại một thời điểm. Vui lòng hủy thẻ hiện tại để thêm thẻ mới.</p>
                                </div>
                            ) : (
                                <Elements stripe={stripePromise}>
                                    <AddCardForm onCardAdded={fetchCards} />
                                </Elements>
                            )}
                        </div>

                        {/* Security Badge */}
                        <div className="text-center pt-2 pb-6">
                            <p className="text-xs text-gray-400 flex items-center justify-center gap-1.5">
                                <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                                Thông tin thẻ của bạn được bảo mật an toàn qua Stripe
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}