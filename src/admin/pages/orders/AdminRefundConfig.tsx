// ============================================================================
// 管理后台 - 退款规则设置
// 功能：配置培训班固定手续费比例、班级单独比例、课程阶梯退款规则
// 数据来源：refundConfig 集合（_id: 'refundConfig'），由 api-order 读写
// ============================================================================
import { useState, useEffect } from 'react';
import { useConfirm } from '@/admin/hooks/useConfirm';
import { Save, RefreshCw, Plus, Trash2, Percent, Layers, GraduationCap } from 'lucide-react';
import { refundConfigService } from '@/services/refundConfigService';

interface Tier {
  maxDays: number;
  maxProgress: number;
  refundRate: number;
}

interface OverrideRow {
  classId: string;
  rate: number;
}

export default function AdminRefundConfig() {
  const { confirm } = useConfirm();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // 培训班默认手续费比例（1 = 100%）
  const [classFeeRate, setClassFeeRate] = useState(0.1);
  // 班级单独比例（编辑态用数组，保存时转对象）
  const [classOverrides, setClassOverrides] = useState<OverrideRow[]>([]);
  // 课程阶梯退款规则
  const [courseTiers, setCourseTiers] = useState<Tier[]>([
    { maxDays: 3, maxProgress: 0, refundRate: 1.0 },
    { maxDays: 7, maxProgress: 50, refundRate: 0.8 },
    { maxDays: 30, maxProgress: 100, refundRate: 0.5 },
    { maxDays: 9999, maxProgress: 100, refundRate: 0.0 },
  ]);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const res: any = await refundConfigService.getConfig();
      if (res.code === 0 && res.data) {
        const cfg = res.data;
        setClassFeeRate(Number(cfg.classFeeRate ?? 0.1));
        const overridesObj: Record<string, number> = cfg.classOverrides || {};
        setClassOverrides(
          Object.entries(overridesObj).map(([classId, rate]) => ({
            classId,
            rate: Number(rate),
          }))
        );
        if (Array.isArray(cfg.courseTiers) && cfg.courseTiers.length) {
          setCourseTiers(
            cfg.courseTiers.map((t: any) => ({
              maxDays: Number(t.maxDays ?? 9999),
              maxProgress: Number(t.maxProgress ?? 100),
              refundRate: Number(t.refundRate ?? 0),
            }))
          );
        }
      }
    } catch (error: any) {
      await confirm({ title: '提示', message: '加载退款配置失败：' + error.message, variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  // ----- 班级单独比例编辑 -----
  const addOverride = () => setClassOverrides([...classOverrides, { classId: '', rate: 0.1 }]);
  const removeOverride = (idx: number) =>
    setClassOverrides(classOverrides.filter((_, i) => i !== idx));
  const updateOverride = (idx: number, key: keyof OverrideRow, value: string | number) =>
    setClassOverrides(
      classOverrides.map((row, i) => (i === idx ? { ...row, [key]: value } : row))
    );

  // ----- 课程阶梯规则编辑 -----
  const addTier = () =>
    setCourseTiers([...courseTiers, { maxDays: 90, maxProgress: 100, refundRate: 0.3 }]);
  const removeTier = (idx: number) =>
    setCourseTiers(courseTiers.filter((_, i) => i !== idx));
  const updateTier = (idx: number, key: keyof Tier, value: number) =>
    setCourseTiers(courseTiers.map((t, i) => (i === idx ? { ...t, [key]: value } : t)));

  const handleSave = async () => {
    // 校验
    if (classFeeRate < 0 || classFeeRate > 1) {
      await confirm({ title: '提示', message: '培训班手续费比例需在 0% ~ 100% 之间', variant: 'info' });
      return;
    }
    for (const o of classOverrides) {
      if (!o.classId.trim()) {
        await confirm({ title: '提示', message: '班级 ID 不能为空', variant: 'info' });
        return;
      }
      if (o.rate < 0 || o.rate > 1) {
        await confirm({ title: '提示', message: `班级 ${o.classId} 的比例需在 0% ~ 100% 之间`, variant: 'info' });
        return;
      }
    }
    for (const t of courseTiers) {
      if (t.maxDays <= 0 || t.maxProgress < 0 || t.maxProgress > 100 || t.refundRate < 0 || t.refundRate > 1) {
        await confirm({ title: '提示', message: '阶梯规则数值不合法（进度 0~100，比例 0~1）', variant: 'info' });
        return;
      }
    }

    const overridesObj: Record<string, number> = {};
    classOverrides.forEach((o) => {
      if (o.classId.trim()) overridesObj[o.classId.trim()] = Number(o.rate);
    });

    setSaving(true);
    try {
      const res: any = await refundConfigService.saveConfig({
        classFeeRate: Number(classFeeRate),
        classOverrides: overridesObj,
        courseTiers: courseTiers.map((t) => ({
          maxDays: Number(t.maxDays),
          maxProgress: Number(t.maxProgress),
          refundRate: Number(t.refundRate),
        })),
      });
      if (res.code === 0) {
        await confirm({ title: '保存成功', message: '退款规则已更新', variant: 'success' });
        loadConfig();
      } else {
        await confirm({ title: '保存失败', message: res.message || '保存退款规则失败', variant: 'error' });
      }
    } catch (error: any) {
      await confirm({ title: '保存失败', message: error.message, variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const pct = (v: number) => (Number(v) * 100).toFixed(0) + '%';

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">退款规则设置</h1>
          <p className="text-sm text-gray-500 mt-1">
            配置培训班固定手续费、班级单独比例与课程阶梯退款规则
          </p>
        </div>
        <button
          onClick={loadConfig}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={16} /> 刷新
        </button>
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-400">加载中...</div>
      ) : (
        <div className="space-y-6">
          {/* 培训班固定手续费比例 */}
          <section className="bg-white rounded-2xl shadow-sm border p-6">
            <div className="flex items-center gap-2 mb-4">
              <Percent size={18} className="text-blue-500" />
              <h2 className="text-lg font-semibold text-gray-800">培训班手续费比例</h2>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              培训班订单退款时，按固定比例扣除手续费（退款金额 = 订单金额 × (1 - 手续费比例)）。
              如需对个别班级设置不同比例，请在下方"班级单独比例"中覆盖。
            </p>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min={0}
                max={100}
                step="1"
                value={Number(classFeeRate * 100)}
                onChange={(e) => setClassFeeRate(Number(e.target.value) / 100)}
                className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <span className="text-gray-600">%（当前：{pct(classFeeRate)} 手续费）</span>
            </div>
          </section>

          {/* 班级单独比例 */}
          <section className="bg-white rounded-2xl shadow-sm border p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Layers size={18} className="text-purple-500" />
                <h2 className="text-lg font-semibold text-gray-800">班级单独比例</h2>
              </div>
              <button
                onClick={addOverride}
                className="flex items-center gap-1 px-3 py-1.5 bg-purple-500 hover:bg-purple-600 text-white rounded-lg text-sm transition-colors"
              >
                <Plus size={14} /> 添加
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              留空班级 ID 的行不会保存。设置后该班级的手续费比例将覆盖上面的固定比例。
            </p>
            {classOverrides.length === 0 ? (
              <p className="text-sm text-gray-400">暂无单独设置，全部班级使用固定比例。</p>
            ) : (
              <div className="space-y-2">
                {classOverrides.map((row, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <input
                      type="text"
                      placeholder="班级 ID（classId）"
                      value={row.classId}
                      onChange={(e) => updateOverride(idx, 'classId', e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                    />
                    <div className="flex items-center gap-2 w-40">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step="1"
                        value={Number(row.rate * 100)}
                        onChange={(e) => updateOverride(idx, 'rate', Number(e.target.value) / 100)}
                        className="w-20 px-2 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                      />
                      <span className="text-gray-600">%</span>
                    </div>
                    <button
                      onClick={() => removeOverride(idx)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* 课程阶梯退款规则 */}
          <section className="bg-white rounded-2xl shadow-sm border p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <GraduationCap size={18} className="text-green-500" />
                <h2 className="text-lg font-semibold text-gray-800">课程阶梯退款规则</h2>
              </div>
              <button
                onClick={addTier}
                className="flex items-center gap-1 px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm transition-colors"
              >
                <Plus size={14} /> 添加阶梯
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              课程订单按"购买天数"与"学习进度"匹配阶梯（从上到下取第一个命中的规则）。
              例如：购买 3 天内且进度 0% → 退款 100%；超过 30 天 → 退款 0%。
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b">
                    <th className="px-3 py-2 font-medium">购买 ≤ 天数</th>
                    <th className="px-3 py-2 font-medium">学习进度 ≤ %</th>
                    <th className="px-3 py-2 font-medium">退款比例</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {courseTiers.map((t, idx) => (
                    <tr key={idx} className="border-b last:border-0">
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min={1}
                          value={t.maxDays}
                          onChange={(e) => updateTier(idx, 'maxDays', Number(e.target.value))}
                          className="w-24 px-2 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={t.maxProgress}
                          onChange={(e) => updateTier(idx, 'maxProgress', Number(e.target.value))}
                          className="w-24 px-2 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min={0}
                            max={100}
                            value={Number(t.refundRate * 100)}
                            onChange={(e) => updateTier(idx, 'refundRate', Number(e.target.value) / 100)}
                            className="w-20 px-2 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                          />
                          <span className="text-gray-600">%</span>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button
                          onClick={() => removeTier(idx)}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              <Save size={16} /> {saving ? '保存中...' : '保存规则'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
