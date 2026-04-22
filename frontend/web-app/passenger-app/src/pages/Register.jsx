import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import Input from '../components/Input';
import Button from '../components/Button';

export default function Register() {
    const navigate = useNavigate();
    const { register } = useAuth();
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: '',
    });
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    // Submit form đăng ký hành khách
    const handleSubmit = async (e) => {
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

        setLoading(true);
        try {
            await register({
                fullName: formData.fullName,
                email: formData.email,
                phone: formData.phone.replace(/\s/g, ''),
                password: formData.password,
                role: 'PASSENGER',
            });

            toast.success('Đăng ký thành công! Vui lòng đăng nhập.');
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
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-full h-full bg-gray-50 flex flex-col justify-center px-6 py-12 overflow-y-auto box-border">
            <div className="max-w-md w-full mx-auto">
                <div className="text-center mb-8">
                    <h1 className="text-5xl mb-2">🚕</h1>
                    <h2 className="text-3xl font-bold text-gray-800">Tạo tài khoản</h2>
                    <p className="text-gray-600 mt-2">Đăng ký để bắt đầu đặt xe</p>
                </div>

                <form onSubmit={handleSubmit} className="bg-white p-8 rounded-2xl shadow-lg">

                    {/* ── Step 1: Account Info ── */}

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
                        Tạo tài khoản
                    </Button>

                    <p className="text-center text-sm text-gray-600 mt-6">
                        Đã có tài khoản?{' '}
                        <Link to="/login" className="text-primary font-medium hover:underline">
                            Đăng nhập
                        </Link>
                    </p>
                </form>
            </div>
        </div>
    );
}

