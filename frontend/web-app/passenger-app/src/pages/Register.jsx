import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import Input from '../components/Input';
import Button from '../components/Button';
import api from '../services/api';

export default function Register() {
    const navigate = useNavigate();
    const { register } = useAuth();
    const [role, setRole] = useState('PASSENGER');
    const [step, setStep] = useState(1); // 1 = account info, 2 = driver vehicle info
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

    // Step 1: Validate & submit account registration
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

        if (role === 'DRIVER') {
            // Move to step 2 for driver vehicle info
            setStep(2);
            return;
        }

        // Passenger: register directly
        await submitRegistration();
    };

    // Step 2: Submit driver vehicle info after account creation
    const handleSubmitStep2 = async (e) => {
        e.preventDefault();

        if (!driverData.vehicle_plate.trim()) {
            toast.error('Biển số xe là bắt buộc');
            return;
        }

        await submitRegistration();
    };

    // Core registration logic
    const submitRegistration = async () => {
        setLoading(true);
        try {
            // Step 1: Create auth account
            const result = await register({
                fullName: formData.fullName,
                email: formData.email,
                phone: formData.phone.replace(/\s/g, ''),
                password: formData.password,
                role,
            });

            // Step 2: If DRIVER, also create driver profile via driver-service
            if (role === 'DRIVER') {
                // Store tokens so the api interceptor attaches Authorization header
                if (result.accessToken) {
                    localStorage.setItem('accessToken', result.accessToken);
                    localStorage.setItem('refreshToken', result.refreshToken);
                }

                try {
                    // Get current location for driver initial position
                    let current_lat = 10.8231;
                    let current_lng = 106.6297;
                    try {
                        const pos = await new Promise((resolve, reject) => {
                            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
                        });
                        current_lat = pos.coords.latitude;
                        current_lng = pos.coords.longitude;
                    } catch {
                        // Use default HCM location
                    }

                    await api.post('/api/drivers', {
                        vehicle_type: driverData.vehicle_type,
                        vehicle_plate: driverData.vehicle_plate.trim(),
                        current_lat,
                        current_lng,
                    });

                    toast.success('Tạo tài khoản tài xế thành công! Vui lòng đăng nhập.');
                } catch (driverErr) {
                    console.error('Driver profile creation failed:', driverErr);
                    const msg = driverErr.response?.data?.message || 'Tạo hồ sơ tài xế thất bại';
                    toast.error(msg);
                    // Account was created but driver profile failed — still redirect to login
                }

                // Clear tokens so user has to login fresh
                localStorage.clear();
            } else {
                toast.success('Đăng ký thành công! Vui lòng đăng nhập.');
            }

            navigate('/login');
        } catch (error) {
            const status = error.response?.status;
            let errorMessage = 'Đăng ký thất bại. Vui lòng thử lại.';

            if (error.code === 'ERR_NETWORK') {
                errorMessage = 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng.';
            } else if (status === 409) {
                errorMessage = error.response?.data?.message || 'Email hoặc số điện thoại đã tồn tại';
            } else if (status === 400) {
                errorMessage = error.response?.data?.message || 'Vui lòng điền đúng và đủ thông tin';
            } else if (status === 503) {
                errorMessage = 'Dịch vụ tạm thời không khả dụng. Vui lòng thử lại sau.';
            } else if (error.response?.data?.message) {
                errorMessage = error.response.data.message;
            }

            toast.error(errorMessage);

            // If driver step 2 failed, go back to step 1
            if (step === 2) {
                setStep(1);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-full h-full bg-gray-50 flex flex-col justify-center px-6 py-12 overflow-y-auto box-border">
            <div className="max-w-md w-full mx-auto">
                <div className="text-center mb-8">
                    <h1 className="text-5xl mb-2">🚕</h1>
                    <h2 className="text-3xl font-bold text-gray-800">
                        {step === 2 ? 'Thông tin xe' : 'Tạo tài khoản'}
                    </h2>
                    <p className="text-gray-600 mt-2">
                        {step === 2 ? 'Thiết lập hồ sơ tài xế' : 'Đăng ký để bắt đầu'}
                    </p>
                </div>

                {/* ── Step 1: Account Info ── */}
                {step === 1 && (
                    <form onSubmit={handleSubmitStep1} className="bg-white p-8 rounded-2xl shadow-lg">
                        {/* Role Toggle */}
                        <div className="mb-5">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Tôi là</label>
                            <div className="flex bg-gray-100 rounded-xl p-1">
                                <button
                                    type="button"
                                    onClick={() => setRole('PASSENGER')}
                                    className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${role === 'PASSENGER'
                                        ? 'bg-primary text-white shadow-md'
                                        : 'text-gray-500 hover:text-gray-700'
                                        }`}
                                >
                                    🧑 Hành khách
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setRole('DRIVER')}
                                    className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${role === 'DRIVER'
                                        ? 'bg-emerald-500 text-white shadow-md'
                                        : 'text-gray-500 hover:text-gray-700'
                                        }`}
                                >
                                    🚗 Tài xế
                                </button>
                            </div>
                        </div>

                        <Input
                            label="Họ và tên"
                            type="text"
                            name="fullName"
                            value={formData.fullName}
                            onChange={handleChange}
                            placeholder="Nguyễn Văn A"
                            required
                        />
                        <Input
                            label="Email"
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            placeholder="your@email.com"
                            required
                        />
                        <Input
                            label="Số điện thoại"
                            type="tel"
                            name="phone"
                            value={formData.phone}
                            onChange={handleChange}
                            placeholder="0901234567"
                            required
                        />
                        <Input
                            label="Mật khẩu"
                            type="password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            placeholder="••••••••"
                            required
                            minLength={6}
                        />
                        <Input
                            label="Xác nhận mật khẩu"
                            type="password"
                            name="confirmPassword"
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            placeholder="••••••••"
                            required
                            minLength={6}
                        />

                        <Button
                            type="submit"
                            variant="primary"
                            loading={loading}
                            className="w-full mt-4"
                        >
                            {role === 'DRIVER' ? 'Tiếp theo: Thông tin xe →' : 'Tạo tài khoản'}
                        </Button>

                        <p className="text-center text-sm text-gray-600 mt-6">
                            Đã có tài khoản?{' '}
                            <Link to="/login" className="text-primary font-medium hover:underline">
                                Đăng nhập
                            </Link>
                        </p>
                    </form>
                )}

                {/* ── Step 2: Driver Vehicle Info ── */}
                {step === 2 && (
                    <form onSubmit={handleSubmitStep2} className="bg-white p-8 rounded-2xl shadow-lg">
                        {/* Step indicator */}
                        <div className="flex items-center gap-3 mb-6">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-emerald-500 text-white rounded-full flex items-center justify-center text-sm font-bold">✓</div>
                                <span className="text-sm text-gray-500">Tài khoản</span>
                            </div>
                            <div className="flex-1 h-0.5 bg-emerald-500 rounded" />
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-emerald-500 text-white rounded-full flex items-center justify-center text-sm font-bold">2</div>
                                <span className="text-sm font-semibold text-emerald-600">Thông tin xe</span>
                            </div>
                        </div>

                        {/* Vehicle Type Toggle */}
                        <div className="mb-5">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Loại xe</label>
                            <div className="flex bg-gray-100 rounded-xl p-1">
                                <button
                                    type="button"
                                    onClick={() => setDriverData({ ...driverData, vehicle_type: 'BIKE' })}
                                    className={`flex-1 py-3 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${driverData.vehicle_type === 'BIKE'
                                        ? 'bg-white text-gray-900 shadow-md'
                                        : 'text-gray-500 hover:text-gray-700'
                                        }`}
                                >
                                    🏍️ Xe máy
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setDriverData({ ...driverData, vehicle_type: 'CAR' })}
                                    className={`flex-1 py-3 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${driverData.vehicle_type === 'CAR'
                                        ? 'bg-white text-gray-900 shadow-md'
                                        : 'text-gray-500 hover:text-gray-700'
                                        }`}
                                >
                                    🚗 Ô tô
                                </button>
                            </div>
                        </div>

                        <Input
                            label="Biển số xe"
                            type="text"
                            name="vehicle_plate"
                            value={driverData.vehicle_plate}
                            onChange={handleDriverChange}
                            placeholder="51G-12345"
                            required
                        />

                        <Input
                            label="Số giấy phép lái xe (tùy chọn)"
                            type="text"
                            name="license_number"
                            value={driverData.license_number}
                            onChange={handleDriverChange}
                            placeholder="GPLX-123456"
                        />

                        <div className="flex gap-3 mt-5">
                            <button
                                type="button"
                                onClick={() => setStep(1)}
                                className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors"
                            >
                                ← Quay lại
                            </button>
                            <Button
                                type="submit"
                                variant="primary"
                                loading={loading}
                                className="flex-[2]"
                            >
                                Tạo tài khoản tài xế
                            </Button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
