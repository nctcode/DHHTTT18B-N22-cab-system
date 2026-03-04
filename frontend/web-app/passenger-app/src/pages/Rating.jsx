import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { reviewService, rideService } from '../services';
import api from '../services/api';
import toast from 'react-hot-toast';
import Button from '../components/Button';

export default function Rating() {
    const { rideId } = useParams();
    const navigate = useNavigate();
    const [ride, setRide] = useState(null);
    const [driverProfile, setDriverProfile] = useState(null);
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');
    const [selectedChips, setSelectedChips] = useState([]);
    const [loading, setLoading] = useState(false);

    // Fetch ride details
    useEffect(() => {
        const fetchRide = async () => {
            try {
                const res = await rideService.getRide(rideId);
                const rideData = res.data?.data || res.data;
                setRide(rideData);
            } catch (error) {
                console.error('Failed to fetch ride:', error);
            }
        };
        if (rideId) fetchRide();
    }, [rideId]);

    const handleRatingChange = (newVal) => {
        setRating(newVal);
        setSelectedChips([]); // Reset chips when rating changes
    };

    const toggleChip = (chip) => {
        setSelectedChips(prev =>
            prev.includes(chip) ? prev.filter(c => c !== chip) : [...prev, chip]
        );
    };

    const goodChips = ["Thân thiện", "Lái xe an toàn", "Xe sạch", "Đúng giờ"];
    const badChips = ["Đi đường vòng", "Thái độ không tốt", "Xe không sạch", "Đến trễ"];

    const activeChips = rating >= 4 ? goodChips : (rating > 0 && rating <= 3 ? badChips : []);

    const handleSubmit = async () => {
        if (rating === 0) return;
        if (!ride?.driverId) {
            toast.error('Không tìm thấy thông tin tài xế');
            return;
        }

        const finalComment = selectedChips.length > 0
            ? `Phản hồi: ${selectedChips.join(', ')}${comment ? ' - ' + comment : ''}`
            : comment;

        try {
            setLoading(true);
            await reviewService.submitReview(rideId, ride.driverId, rating, finalComment);
            toast.success('Cảm ơn bạn đã đánh giá!');
            navigate('/home');
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Gửi đánh giá thất bại');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-full h-full bg-[#f3f4f6] flex flex-col items-center py-8 px-4 overflow-y-auto box-border pb-10">
            <div className="bg-white rounded-[16px] shadow-sm max-w-md w-full p-6 flex flex-col">

                {/* 1. Header */}
                <div className="flex flex-col items-center mb-6">
                    <div className="w-16 h-16 bg-green-100 text-green-500 rounded-full flex items-center justify-center mb-3">
                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h2 className="text-xl font-bold text-gray-800 mb-1">Chuyến đi hoàn thành</h2>

                    {ride?.finalFare && (
                        <p className="text-3xl font-extrabold text-gray-900 mt-2">
                            {Number(ride.finalFare).toLocaleString('vi-VN')}đ
                        </p>
                    )}
                    {ride?.paymentMethod && (
                        <p className="text-sm font-medium text-gray-500 mt-1 uppercase bg-gray-100 px-3 py-1 rounded-full">
                            Thanh toán: {ride.paymentMethod}
                        </p>
                    )}
                </div>

                <div className="w-full h-px bg-gray-100 mb-6 border-dashed border-b border-gray-300"></div>

                {/* 2. Driver Info Card */}
                {ride && (
                    <div className="bg-gray-50 rounded-[12px] p-4 flex items-center gap-4 mb-6 border border-gray-100 relative">
                        <div className="w-14 h-14 bg-indigo-100 rounded-full flex items-center justify-center text-xl shrink-0 overflow-hidden">
                            👨‍✈️
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-gray-800 truncate">
                                {ride.driverName || 'Tài xế CabGo'}
                            </h3>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="bg-gray-200 text-gray-700 text-xs font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                                    {ride.licensePlate || 'N/A'}
                                </span>
                                <span className="text-xs text-gray-500 truncate">
                                    • {ride.vehicleType || 'Xe'}
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                {/* 3. Star Rating */}
                <div className="text-center mb-6">
                    <p className="text-gray-800 font-bold mb-3">Trải nghiệm của bạn như thế nào?</p>
                    <div className="flex justify-center gap-3">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <button
                                key={star}
                                onClick={() => handleRatingChange(star)}
                                className={`text-4xl transition-all duration-200 transform hover:scale-110 active:scale-95 ${star <= rating ? 'text-yellow-400 drop-shadow-sm' : 'text-gray-200'}`}
                            >
                                ★
                            </button>
                        ))}
                    </div>
                </div>

                {/* 4. Feedback Chips */}
                {rating > 0 && activeChips.length > 0 && (
                    <div className="flex flex-wrap gap-2 justify-center mb-6">
                        {activeChips.map(chip => {
                            const isSelected = selectedChips.includes(chip);
                            return (
                                <button
                                    key={chip}
                                    onClick={() => toggleChip(chip)}
                                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors border ${isSelected
                                        ? 'bg-primary/10 border-primary text-primary'
                                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                                        }`}
                                >
                                    {chip}
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* 5. Textarea Optional */}
                {rating > 0 && (
                    <div className="mb-6 animate-fade-in">
                        <textarea
                            placeholder="Chia sẻ thêm về trải nghiệm của bạn (không bắt buộc)"
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all text-sm resize-none"
                            rows={3}
                        />
                    </div>
                )}

                {/* 6. Actions */}
                <div className="mt-auto">
                    <Button
                        variant="primary"
                        loading={loading}
                        onClick={handleSubmit}
                        className="w-full h-12 rounded-xl text-base font-bold shadow-md shadow-primary/20 mb-3"
                        disabled={rating === 0}
                    >
                        Gửi đánh giá
                    </Button>
                    <button
                        onClick={() => navigate('/home')}
                        className="w-full py-3 text-gray-500 font-medium hover:text-gray-700 transition-colors"
                        disabled={loading}
                    >
                        Bỏ qua
                    </button>
                </div>

            </div>
        </div>
    );
}
