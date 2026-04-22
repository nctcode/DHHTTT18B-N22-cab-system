import { useEffect, useState } from 'react';
import { pricingAPI } from '../services/api';
import { Save, Zap } from 'lucide-react';
import toast from 'react-hot-toast';

export default function PricingPage() {
  const [rules, setRules] = useState([]);
  const [surges, setSurges] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [rRes, sRes] = await Promise.allSettled([pricingAPI.getRules(), pricingAPI.getSurge()]);
      if (rRes.status === 'fulfilled') setRules(rRes.value.data.data || rRes.value.data || []);
      if (sRes.status === 'fulfilled') setSurges(sRes.value.data.data || sRes.value.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const updateRule = (idx, field, value) => {
    setRules(prev => prev.map((r, i) => i === idx ? { ...r, [field]: Number(value) } : r));
  };

  const saveRule = async (rule) => {
    try {
      await pricingAPI.updateRule(rule.id, { base_fare: rule.base_fare, price_per_km: rule.price_per_km, price_per_min: rule.price_per_min });
      toast.success('Đã lưu cấu hình giá');
    } catch (e) { toast.error('Lưu thất bại'); }
  };

  const toggleSurge = async (surge) => {
    try {
      await pricingAPI.updateSurge(surge.id, { active: !surge.active });
      setSurges(prev => prev.map(s => s.id === surge.id ? { ...s, active: !s.active } : s));
      toast.success(`${!surge.active ? 'Bật' : 'Tắt'} surge "${surge.area_name}"`);
    } catch (e) { toast.error('Thao tác thất bại'); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-500" /></div>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Giá & Surge</h1>
        <p className="text-sm text-gray-500 mt-1">Cấu hình giá cước và hệ số tăng giá</p>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-4">💰 Bảng giá cước</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {rules.map((rule, idx) => (
            <div key={rule.id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{rule.vehicle_type === 'BIKE' ? '🛵' : '🚗'}</span>
                  <h3 className="font-semibold text-gray-800">{rule.vehicle_type === 'BIKE' ? 'Xe máy' : rule.vehicle_type === 'CAR' ? 'Xe ô tô' : rule.vehicle_type}</h3>
                </div>
                <button onClick={() => saveRule(rule)} className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-500 text-white rounded-lg text-xs font-medium hover:bg-primary-600 transition">
                  <Save size={14} /> Lưu
                </button>
              </div>
              <div className="space-y-3">
                {[['Giá mở cửa (₫)', 'base_fare'], ['Giá/km (₫)', 'price_per_km'], ['Giá/phút (₫)', 'price_per_min']].map(([label, field]) => (
                  <div key={field}>
                    <label className="text-xs text-gray-500 mb-1 block">{label}</label>
                    <input type="number" value={rule[field]} onChange={e => updateRule(idx, field, e.target.value)}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400" />
                  </div>
                ))}
              </div>
              <div className="mt-4 p-3 bg-blue-50 rounded-xl">
                <p className="text-xs text-blue-600 font-medium">Ước tính: 5km, 15 phút = <span className="font-bold">{(rule.base_fare + rule.price_per_km * 5 + rule.price_per_min * 15).toLocaleString('vi-VN')}₫</span></p>
              </div>
            </div>
          ))}
          {rules.length === 0 && <p className="text-gray-400 col-span-2 text-center py-8">Chưa có bảng giá. Hãy seed database pricing_rules.</p>}
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-4">⚡ Khu vực Surge</h2>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 text-left">
              <th className="px-5 py-3.5 font-semibold text-gray-600">Khu vực</th>
              <th className="px-5 py-3.5 font-semibold text-gray-600">Hệ số</th>
              <th className="px-5 py-3.5 font-semibold text-gray-600">Trạng thái</th>
              <th className="px-5 py-3.5 font-semibold text-gray-600">Thao tác</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {surges.map(s => (
                <tr key={s.id} className="hover:bg-gray-50/50 transition">
                  <td className="px-5 py-3.5 font-medium text-gray-800">{s.area_name}</td>
                  <td className="px-5 py-3.5"><span className="px-3 py-1 bg-orange-50 text-orange-600 rounded-lg font-bold text-sm">x{s.multiplier}</span></td>
                  <td className="px-5 py-3.5"><span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${s.active ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'}`}>{s.active ? 'Đang bật' : 'Đã tắt'}</span></td>
                  <td className="px-5 py-3.5">
                    <button onClick={() => toggleSurge(s)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${s.active ? 'bg-red-50 text-red-500 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}>
                      <Zap size={14} /> {s.active ? 'Tắt' : 'Bật'}
                    </button>
                  </td>
                </tr>
              ))}
              {surges.length === 0 && <tr><td colSpan={4} className="text-center py-8 text-gray-400">Chưa có khu vực surge. Hãy seed database surge_zones.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
