import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import Input from '../components/Input';
import Button from '../components/Button';

export default function Login() {
    const navigate = useNavigate();
    const { login } = useAuth();
    const [formData, setFormData] = useState({
        email: '',
        password: '',
    });
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            await login(formData.email, formData.password);
            toast.success('Đăng nhập thành công!');
            navigate('/home');
        } catch (error) {
            let errorMessage = 'Đăng nhập thất bại. Vui lòng thử lại.';

            if (error.code === 'ERR_NETWORK' || error.message?.includes('Network Error')) {
                errorMessage = 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng.';
            } else if (error.response?.status === 401) {
                errorMessage = 'Email hoặc mật khẩu không đúng';
            } else if (error.response?.status === 400) {
                errorMessage = error.response?.data?.message || 'Email và mật khẩu là bắt buộc';
            } else if (error.response?.data?.message) {
                errorMessage = error.response.data.message;
            }

            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-full h-full bg-gray-50 flex flex-col justify-center px-6 overflow-y-auto box-border">
            <div className="max-w-md w-full mx-auto">
                <div className="text-center mb-8">
                    <h1 className="text-5xl mb-2">🚕</h1>
                    <h2 className="text-3xl font-bold text-gray-800">Chào Mừng Trở Lại</h2>
                    <p className="text-gray-600 mt-2">Đăng nhập để đặt xe</p>
                </div>

                <form onSubmit={handleSubmit} className="bg-white p-8 rounded-2xl shadow-lg">
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
                        label="Mật khẩu"
                        type="password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        placeholder="••••••••"
                        required
                    />

                    <Button
                        type="submit"
                        variant="primary"
                        loading={loading}
                        className="w-full mt-4"
                    >
                        Đăng nhập
                    </Button>

                    <p className="text-center text-sm text-gray-600 mt-6">
                        Chưa có tài khoản?{' '}
                        <Link to="/register" className="text-primary font-medium hover:underline">
                            Đăng ký
                        </Link>
                    </p>
                </form>
            </div>
        </div>
    );
}
