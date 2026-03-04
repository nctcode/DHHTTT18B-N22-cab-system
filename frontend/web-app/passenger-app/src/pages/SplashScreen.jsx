import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const slides = [
    {
        icon: '📍',
        title: 'Đặt Xe Ngay',
        description: 'Chọn điểm đón và điểm đến. Tìm tài xế trong vài giây.',
        gradient: 'from-blue-500 to-blue-700',
        accent: '#3B82F6',
    },
    {
        icon: '🗺️',
        title: 'Theo Dõi Trực Tiếp',
        description: 'Xem tài xế di chuyển trên bản đồ. Biết chính xác khi nào họ đến.',
        gradient: 'from-emerald-500 to-emerald-700',
        accent: '#10B981',
    },
    {
        icon: '💳',
        title: 'Thanh Toán Dễ Dàng',
        description: 'Thanh toán liền mạch với nhiều lựa chọn. Đánh giá trải nghiệm sau mỗi chuyến đi.',
        gradient: 'from-violet-500 to-violet-700',
        accent: '#8B5CF6',
    },
];

export default function SplashScreen() {
    const navigate = useNavigate();
    const { isAuthenticated, loading } = useAuth();
    const [currentSlide, setCurrentSlide] = useState(0);
    const [phase, setPhase] = useState('splash'); // 'splash' | 'onboarding'
    const [slideDirection, setSlideDirection] = useState('right');
    const [isAnimating, setIsAnimating] = useState(false);

    // Auto-redirect if already authenticated
    useEffect(() => {
        if (!loading && isAuthenticated()) {
            navigate('/home', { replace: true });
        }
    }, [loading, isAuthenticated, navigate]);

    // Splash → Onboarding transition after 2.5s
    useEffect(() => {
        const timer = setTimeout(() => {
            setPhase('onboarding');
        }, 2500);
        return () => clearTimeout(timer);
    }, []);

    // Auto-advance carousel
    useEffect(() => {
        if (phase !== 'onboarding') return;
        const interval = setInterval(() => {
            goToSlide((currentSlide + 1) % slides.length, 'right');
        }, 4000);
        return () => clearInterval(interval);
    }, [phase, currentSlide]);

    const goToSlide = useCallback((index, direction = 'right') => {
        if (isAnimating || index === currentSlide) return;
        setIsAnimating(true);
        setSlideDirection(direction);
        setCurrentSlide(index);
        setTimeout(() => setIsAnimating(false), 500);
    }, [isAnimating, currentSlide]);

    const handleGetStarted = () => {
        navigate('/login');
    };

    // ─── Splash Phase ───
    if (phase === 'splash') {
        return (
            <div className="min-h-full h-full bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-900 flex flex-col items-center justify-center text-white overflow-hidden relative box-border">
                {/* Background decorations */}
                <div className="absolute inset-0 overflow-hidden">
                    <div className="absolute -top-20 -left-20 w-72 h-72 bg-white/5 rounded-full blur-3xl animate-pulse" />
                    <div className="absolute -bottom-32 -right-20 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
                    <div className="absolute top-1/3 right-10 w-48 h-48 bg-indigo-400/10 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '0.5s' }} />
                </div>

                {/* Logo */}
                <div className="relative z-10 text-center">
                    <div className="w-28 h-28 bg-white/15 backdrop-blur-sm rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl border border-white/20 animate-bounce" style={{ animationDuration: '2s' }}>
                        <span className="text-6xl">🚕</span>
                    </div>
                    <h1 className="text-5xl font-extrabold tracking-tight mb-2">
                        CAB
                    </h1>
                    <p className="text-lg text-blue-200 tracking-widest uppercase font-medium">
                        Chuyến đi của bạn, Dịch vụ của chúng tôi
                    </p>
                </div>

                {/* Loading indicator */}
                <div className="relative z-10 mt-16">
                    <div className="flex gap-2">
                        {[0, 1, 2].map((i) => (
                            <div
                                key={i}
                                className="w-2.5 h-2.5 bg-white/60 rounded-full animate-pulse"
                                style={{ animationDelay: `${i * 0.3}s` }}
                            />
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    // ─── Onboarding Phase ───
    const slide = slides[currentSlide];

    return (
        <div className={`min-h-full h-full bg-gradient-to-br ${slide.gradient} flex flex-col transition-all duration-700 ease-in-out relative overflow-hidden box-border`}>
            {/* Background decorations */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-24 -right-24 w-80 h-80 bg-white/5 rounded-full blur-3xl" />
                <div className="absolute -bottom-32 -left-16 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-white/3 rounded-full blur-3xl" />
            </div>

            {/* Skip button */}
            <div className="relative z-20 flex justify-end p-6 pt-8">
                <button
                    onClick={handleGetStarted}
                    className="text-white/70 hover:text-white text-sm font-medium px-4 py-2 rounded-full hover:bg-white/10 transition-all duration-200"
                >
                    Bỏ qua →
                </button>
            </div>

            {/* Slide content */}
            <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-8 -mt-8">
                {/* Icon with animated ring */}
                <div className="relative mb-10">
                    <div className="w-36 h-36 bg-white/15 backdrop-blur-sm rounded-full flex items-center justify-center shadow-2xl border border-white/20">
                        <span
                            className="text-7xl transition-all duration-500"
                            key={currentSlide}
                            style={{ animation: 'fadeInUp 0.5s ease-out' }}
                        >
                            {slide.icon}
                        </span>
                    </div>
                    {/* Animated ring */}
                    <div className="absolute inset-0 rounded-full border-2 border-white/20 animate-ping" style={{ animationDuration: '2s' }} />
                </div>

                {/* Text */}
                <div
                    className="text-center max-w-sm transition-all duration-500"
                    key={`text-${currentSlide}`}
                    style={{ animation: 'fadeInUp 0.5s ease-out 0.1s both' }}
                >
                    <h2 className="text-4xl font-extrabold text-white mb-4 tracking-tight">
                        {slide.title}
                    </h2>
                    <p className="text-lg text-white/80 leading-relaxed">
                        {slide.description}
                    </p>
                </div>
            </div>

            {/* Bottom section */}
            <div className="relative z-20 px-8 pb-12">
                {/* Carousel dots */}
                <div className="flex justify-center gap-3 mb-8">
                    {slides.map((_, index) => (
                        <button
                            key={index}
                            onClick={() => goToSlide(index, index > currentSlide ? 'right' : 'left')}
                            className={`h-2.5 rounded-full transition-all duration-300 ${index === currentSlide
                                ? 'w-8 bg-white'
                                : 'w-2.5 bg-white/40 hover:bg-white/60'
                                }`}
                            aria-label={`Go to slide ${index + 1}`}
                        />
                    ))}
                </div>

                {/* CTA Button */}
                <button
                    onClick={handleGetStarted}
                    className="w-full py-4 bg-white text-gray-900 rounded-2xl font-bold text-lg shadow-xl hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2"
                >
                    Bắt đầu
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                    </svg>
                </button>

                {/* Login link */}
                <p className="text-center text-white/60 text-sm mt-4">
                    Đã có tài khoản?{' '}
                    <button
                        onClick={() => navigate('/login')}
                        className="text-white font-semibold underline underline-offset-2 hover:text-white/90"
                    >
                        Đăng nhập
                    </button>
                </p>
            </div>

            {/* CSS Animations */}
            <style>{`
                @keyframes fadeInUp {
                    from {
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
            `}</style>
        </div>
    );
}
