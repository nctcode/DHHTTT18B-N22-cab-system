import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import api from '../services/api';

export default function Register() {
    const navigate = useNavigate();
    const { register } = useAuth();
    const [step, setStep] = useState(1); // 1 = thông tin tài khoản, 2 = thông tin xe
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: '',
    });
    const [driverData, setDriverData] = useState({
        vehicle_type: 'CAR',
        vehicle_plate: '',
        license_number: '',
    });
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleDriverChange = (e) => {
        setDriverData({ ...driverData, [e.target.name]: e.target.value });
    };

    // Step 1: Validate thông tin tài khoản
    const handleSubmitStep1 = async (e) => {
        e.preventDefault();

        if (formData.password !== formData.confirmPassword) {
            toast.error('Mật khẩu không khớp');
            return;
        }
        if (formData.password.length < 6) {
            toast.error('Mật khẩu phải có ít nhất 6 ký tự');
            return;
        }
        const phoneRegex = /^(0|\+84)[0-9]{9,10}$/;
        if (!phoneRegex.test(formData.phone.replace(/\s/g, ''))) {
            toast.error('Định dạng số điện thoại không hợp lệ');
            return;
        }

        // Chuyển sang bước 2: thông tin xe
        setStep(2);
    };

    // Step 2: Submit đăng ký tài xế
    const handleSubmitStep2 = async (e) => {
        e.preventDefault();

        if (!driverData.vehicle_plate.trim()) {
            toast.error('Biển số xe là bắt buộc');
            return;
        }

        setLoading(true);
        try {
            // Bước 1: Tạo tài khoản auth (role = DRIVER)
            const result = await register({
                fullName: formData.fullName,
                email: formData.email,
                phone: formData.phone.replace(/\s/g, ''),
                password: formData.password,
                role: 'DRIVER',
            });

            // Bước 2: Tạo hồ sơ tài xế qua driver-service
            if (result.accessToken) {
                localStorage.setItem('accessToken', result.accessToken);
                localStorage.setItem('refreshToken', result.refreshToken);
            }

            try {
                // Lấy vị trí hiện tại
                let current_lat = 10.8231;
                let current_lng = 106.6297;
                try {
                    const pos = await new Promise((resolve, reject) => {
                        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
                    });
                    current_lat = pos.coords.latitude;
                    current_lng = pos.coords.longitude;
                } catch {
                    // Dùng vị trí HCM mặc định
                }

                await api.post('/api/drivers', {
                    vehicle_type: driverData.vehicle_type,
                    vehicle_plate: driverData.vehicle_plate.trim(),
                    current_lat,
                    current_lng,
                });

                toast.success('🎉 Đăng ký tài xế thành công!');
            } catch (driverErr) {
                console.error('Driver profile creation failed:', driverErr);
                toast.error(driverErr.response?.data?.message || 'Tạo hồ sơ tài xế thất bại');
            }

            // Xóa tokens → bắt buộc đăng nhập lại
            localStorage.clear();
            navigate('/login');

        } catch (error) {
            const status = error.response?.status;
            let errorMessage = 'Đăng ký thất bại. Vui lòng thử lại.';

            if (error.code === 'ERR_NETWORK') {
                errorMessage = 'Không thể kết nối đến máy chủ.';
            } else if (status === 409) {
                errorMessage = error.response?.data?.message || 'Email hoặc số điện thoại đã tồn tại';
            } else if (status === 400) {
                errorMessage = error.response?.data?.message || 'Vui lòng điền đúng và đủ thông tin';
            } else if (error.response?.data?.message) {
                errorMessage = error.response.data.message;
            }

            toast.error(errorMessage);
            setStep(1);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-full h-full bg-gradient-to-br from-emerald-900 via-green-800 to-teal-900 flex flex-col items-center justify-center px-6 overflow-y-auto box-border">
            {/* Background decoration */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-emerald-500/20 rounded-full blur-3xl"></div>
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-teal-500/20 rounded-full blur-3xl"></div>
            </div>

            {/* Logo & Title */}
            <div className="relative z-10 text-center mb-8">
                <div className="w-20 h-20 bg-white/10 backdrop-blur-xl rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/20">
                    <span className="text-4xl">🚗</span>
                </div>
                <h1 className="text-3xl font-extrabold text-white mb-1">
                    {step === 1 ? 'Đăng ký tài xế' : 'Thông tin xe'}
                </h1>
                <p className="text-emerald-200/70 text-sm">
                    {step === 1 ? 'Tạo tài khoản để bắt đầu nhận chuyến' : 'Thiết lập hồ sơ phương tiện'}
                </p>
            </div>

            {/* ── Step 1: Thông tin tài khoản ── */}
            {step === 1 && (
                <form onSubmit={handleSubmitStep1} className="relative z-10 w-full max-w-sm space-y-3">
                    <div>
                        <label className="block text-emerald-200/80 text-xs font-medium mb-1.5 ml-1">Họ và tên</label>
                        <input
                            type="text"
                            name="fullName"
                            value={formData.fullName}
                            onChange={handleChange}
                            placeholder="Nguyễn Văn A"
                            required
                            className="w-full px-4 py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-400/50 transition-all"
                        />
                    </div>
                    <div>
                        <label className="block text-emerald-200/80 text-xs font-medium mb-1.5 ml-1">Email</label>
                        <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            placeholder="driver@cabgo.com"
                            required
                            className="w-full px-4 py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-400/50 transition-all"
                        />
                    </div>
                    <div>
                        <label className="block text-emerald-200/80 text-xs font-medium mb-1.5 ml-1">Số điện thoại</label>
                        <input
                            type="tel"
                            name="phone"
                            value={formData.phone}
                            onChange={handleChange}
                            placeholder="0901234567"
                            required
                            className="w-full px-4 py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-400/50 transition-all"
                        />
                    </div>
                    <div>
                        <label className="block text-emerald-200/80 text-xs font-medium mb-1.5 ml-1">Mật khẩu</label>
                        <input
                            type="password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            placeholder="••••••••"
                            required
                            minLength={6}
                            className="w-full px-4 py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-400/50 transition-all"
                        />
                    </div>
                    <div>
                        <label className="block text-emerald-200/80 text-xs font-medium mb-1.5 ml-1">Xác nhận mật khẩu</label>
                        <input
                            type="password"
                            name="confirmPassword"
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            placeholder="••••••••"
                            required
                            minLength={6}
                            className="w-full px-4 py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-400/50 transition-all"
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl transition-all duration-200 shadow-lg shadow-emerald-500/30 mt-2"
                    >
                        Tiếp theo: Thông tin xe →
                    </button>

                    <p className="text-center text-sm text-emerald-200/50 mt-4">
                        Đã có tài khoản?{' '}
                        <Link to="/login" className="text-emerald-300 font-medium hover:underline">
                            Đăng nhập
                        </Link>
                    </p>
                </form>
            )}

            {/* ── Step 2: Thông tin xe ── */}
            {step === 2 && (
                <form onSubmit={handleSubmitStep2} className="relative z-10 w-full max-w-sm space-y-4">
                    {/* Step indicator */}
                    <div className="flex items-center gap-3 mb-2">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-emerald-400 text-white rounded-full flex items-center justify-center text-sm font-bold">✓</div>
                            <span className="text-sm text-emerald-300/60">Tài khoản</span>
                        </div>
                        <div className="flex-1 h-0.5 bg-emerald-400 rounded" />
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-emerald-400 text-white rounded-full flex items-center justify-center text-sm font-bold">2</div>
                            <span className="text-sm font-semibold text-emerald-200">Phương tiện</span>
                        </div>
                    </div>

                    {/* Vehicle Type Toggle */}
                    <div>
                        <label className="block text-emerald-200/80 text-xs font-medium mb-2 ml-1">Loại xe</label>
                        <div className="flex bg-white/10 rounded-xl p-1 gap-1">
                            <button
                                type="button"
                                onClick={() => setDriverData({ ...driverData, vehicle_type: 'BIKE' })}
                                className={`flex-1 py-3 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
                                    driverData.vehicle_type === 'BIKE'
                                        ? 'bg-white text-gray-900 shadow-md'
                                        : 'text-white/60 hover:text-white/80'
                                }`}
                            >
                                🏍️ Xe máy
                            </button>
                            <button
                                type="button"
                                onClick={() => setDriverData({ ...driverData, vehicle_type: 'CAR' })}
                                className={`flex-1 py-3 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
                                    driverData.vehicle_type === 'CAR'
                                        ? 'bg-white text-gray-900 shadow-md'
                                        : 'text-white/60 hover:text-white/80'
                                }`}
                            >
                                🚗 Ô tô
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-emerald-200/80 text-xs font-medium mb-1.5 ml-1">Biển số xe</label>
                        <input
                            type="text"
                            name="vehicle_plate"
                            value={driverData.vehicle_plate}
                            onChange={handleDriverChange}
                            placeholder="51G-12345"
                            required
                            className="w-full px-4 py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-400/50 transition-all"
                        />
                    </div>

                    <div>
                        <label className="block text-emerald-200/80 text-xs font-medium mb-1.5 ml-1">Số giấy phép lái xe (tùy chọn)</label>
                        <input
                            type="text"
                            name="license_number"
                            value={driverData.license_number}
                            onChange={handleDriverChange}
                            placeholder="GPLX-123456"
                            className="w-full px-4 py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-400/50 transition-all"
                        />
                    </div>

                    <div className="flex gap-3 mt-4">
                        <button
                            type="button"
                            onClick={() => setStep(1)}
                            className="flex-1 py-3.5 bg-white/10 hover:bg-white/20 text-white rounded-xl font-medium transition-colors border border-white/20"
                        >
                            ← Quay lại
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-[2] py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl transition-all duration-200 shadow-lg shadow-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" opacity="0.3" />
                                        <path d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z" fill="currentColor" />
                                    </svg>
                                    Đang tạo...
                                </span>
                            ) : 'Đăng ký tài xế'}
                        </button>
                    </div>
                </form>
            )}

            {/* Footer */}
            <p className="relative z-10 text-emerald-200/40 text-xs mt-6">
                CabGo Driver App © 2026
            </p>
        </div>
    );
}
