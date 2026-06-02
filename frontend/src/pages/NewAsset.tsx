import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAssetStore } from '../store/assetStore';
import { useAuthStore } from '../store/authStore';
import { ArrowLeft, Save } from 'lucide-react';
import CustomSelect from '../components/CustomSelect';

const SITES = ['Hassi Messaoud', 'Rhourde El Baguel', "Hassi R'Mel", 'Arzew Terminal'];
const SYSTEMS = ['Gas Treatment', 'Oil Export', 'Cooling', 'Compression', 'Storage', 'Pumping', 'Water Treatment', 'Power Generation'];
const CRITICALITIES = ['Critical', 'High', 'Medium', 'Low'];
const STAGES = ['Design', 'Procurement', 'Commissioning', 'Operational', 'Maintenance', 'Decommissioned'];

export default function NewAsset() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const addAsset = useAssetStore(s => s.addAsset);

  const canManage = user?.role === 'Admin' || user?.role === 'Manager';
  if (!canManage) {
    navigate('/assets');
    return null;
  }

  const [form, setForm] = useState({
    tag: '',
    desc: '',
    site: SITES[0],
    system: SYSTEMS[0],
    crit: CRITICALITIES[1],
    stage: STAGES[0],
    health: 100,
    equipmentType: '',
    manufacturer: '',
    model: '',
    serialNumber: '',
    material: '',
    code: '',
    weight: '',
    commissioned: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: name === 'health' ? Number(value) : value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addAsset(form);
      navigate('/assets');
    } catch (error) {
      console.error('Submit error:', error);
      alert('Failed to create asset. Please check if the Tag Number is unique or if required fields are filled.');
    }
  };

  const inputClass = "w-full px-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all";
  const labelClass = "block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5";

  return (
    <div className="h-full flex flex-col font-sans max-w-4xl mx-auto w-full">
      {/* Back */}
      <div className="mb-4">
        <Link to="/assets" className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-blue-600 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Asset Registry
        </Link>
      </div>

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Register New Asset</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Fill in the details below to add a new asset to the registry.</p>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto pb-8 space-y-6">
        {/* General Info */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-5">General Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className={labelClass}>Tag Number *</label>
              <input name="tag" value={form.tag} onChange={handleChange} required placeholder="e.g. V-301" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Description *</label>
              <input name="desc" value={form.desc} onChange={handleChange} required placeholder="e.g. 3-Phase Separator" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Site *</label>
              <CustomSelect 
                value={form.site} 
                onChange={(val) => handleSelectChange('site', val)} 
                options={SITES.map(s => ({ label: s, value: s }))} 
                className="bg-white dark:bg-slate-800 h-[42px]"
              />
            </div>
            <div>
              <label className={labelClass}>System *</label>
              <CustomSelect 
                value={form.system} 
                onChange={(val) => handleSelectChange('system', val)} 
                options={SYSTEMS.map(s => ({ label: s, value: s }))} 
                className="bg-white dark:bg-slate-800 h-[42px]"
              />
            </div>
            <div>
              <label className={labelClass}>Criticality</label>
              <CustomSelect 
                value={form.crit} 
                onChange={(val) => handleSelectChange('crit', val)} 
                options={CRITICALITIES.map(c => ({ label: c, value: c }))} 
                className="bg-white dark:bg-slate-800 h-[42px]"
              />
            </div>
            <div>
              <label className={labelClass}>Stage</label>
              <CustomSelect 
                value={form.stage} 
                onChange={(val) => handleSelectChange('stage', val)} 
                options={STAGES.map(s => ({ label: s, value: s }))} 
                className="bg-white dark:bg-slate-800 h-[42px]"
              />
            </div>
            <div>
              <label className={labelClass}>Health (%)</label>
              <input name="health" type="number" min={0} max={100} value={form.health} onChange={handleChange} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Commissioned Date</label>
              <input name="commissioned" type="date" value={form.commissioned} onChange={handleChange} className={inputClass} />
            </div>
          </div>
        </div>

        {/* Technical Specs */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-5">Technical Specifications</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className={labelClass}>Equipment Type</label>
              <input name="equipmentType" value={form.equipmentType} onChange={handleChange} placeholder="e.g. Vessel" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Manufacturer</label>
              <input name="manufacturer" value={form.manufacturer} onChange={handleChange} placeholder="e.g. TechnipFMC" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Model</label>
              <input name="model" value={form.model} onChange={handleChange} placeholder="e.g. 3PS-DN1800" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Serial Number</label>
              <input name="serialNumber" value={form.serialNumber} onChange={handleChange} placeholder="e.g. TFM-2017-V0421" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Material</label>
              <input name="material" value={form.material} onChange={handleChange} placeholder="e.g. CS + Inconel 625 clad" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Design Code</label>
              <input name="code" value={form.code} onChange={handleChange} placeholder="e.g. ASME VIII Div 1" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Weight</label>
              <input name="weight" value={form.weight} onChange={handleChange} placeholder="e.g. 12,400 kg" className={inputClass} />
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-3 pt-2">
          <Link to="/assets" className="px-5 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
            Cancel
          </Link>
          <button type="submit" className="inline-flex items-center px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm shadow-blue-500/20">
            <Save className="w-4 h-4 mr-2" />
            Create Asset
          </button>
        </div>
      </form>
    </div>
  );
}
