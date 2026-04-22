import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

export default function Login() {
    const navigate = useNavigate();
    const { login } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        if (!email || !password) {
            toast.error('Vui lòng nhập email và mật khẩu');
            return;
        }

        try {
            setLoading(true);
            await login(email, password);
            toast.success('Đăng nhập thành công!');
            navigate('/dashboard');
        } catch (err) {
            console.error('Login error:', err);
            toast.error(err.response?.data?.message || 'Đăng nhập thất bại');
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
            <div className="relative z-10 text-center mb-10">
                <div className="w-20 h-20 bg-white/10 backdrop-blur-xl rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/20">
                    <span className="text-4xl">🚗</span>
                </div>
                <h1 className="text-3xl font-extrabold text-white mb-1">CabGo Driver</h1>
                <p className="text-emerald-200/70 text-sm">Đăng nhập để bắt đầu nhận chuyến</p>
            </div>

            {/* Login Form */}
            <form onSubmit={handleLogin} className="relative z-10 w-full max-w-sm space-y-4">
                <div>
                    <label className="block text-emerald-200/80 text-xs font-medium mb-1.5 ml-1">Email</label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="driver@cabgo.com"
                        className="w-full px-4 py-3.5 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-400/50 focus:border-emerald-400/50 transition-all"
                    />
                </div>

                <div>
                    <label className="block text-emerald-200/80 text-xs font-medium mb-1.5 ml-1">Mật khẩu</label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-4 py-3.5 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-400/50 focus:border-emerald-400/50 transition-all"
                    />
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl transition-all duration-200 shadow-lg shadow-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                >
                    {loading ? (
                        <span className="flex items-center justify-center gap-2">
                            <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" opacity="0.3" />
                                <path d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z" fill="currentColor" />
                            </svg>
                            Đang đăng nhập...
                        </span>
                    ) : 'Đăng nhập'}
                </button>
            </form>

            {/* Register link */}
            <p className="relative z-10 text-emerald-200/60 text-sm mt-6">
                Chưa có tài khoản?{' '}
                <a href="/register" className="text-emerald-300 font-medium hover:underline">
                    Đăng ký tài xế
                </a>
            </p>

            {/* Footer */}
            <p className="relative z-10 text-emerald-200/40 text-xs mt-4">
                CabGo Driver App © 2026
            </p>
        </div>
    );
}
