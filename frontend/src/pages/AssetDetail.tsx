import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  MapPin, 
  Settings, 
  Calendar, 
  History, 
  AlertTriangle, 
  Wrench,
  FileText,
  Pencil,
  Trash2,
  Save,
  X,
  Plus,
  GitMerge,
  Cuboid,
  Layers,
  UploadCloud,
  Sparkles
} from 'lucide-react';
import { useAssetStore } from '../store/assetStore';
import { useAuthStore } from '../store/authStore';
import { useAnomalyStore } from '../store/anomalyStore';
import apiClient from '../api/client';
import ThreeViewer from '../components/ThreeViewer';
import CustomSelect from '../components/CustomSelect';

const SITES = ['Hassi Messaoud', 'Rhourde El Baguel', "Hassi R'Mel", 'Arzew Terminal'];
const SYSTEMS = ['Gas Treatment', 'Oil Export', 'Cooling', 'Compression', 'Storage', 'Pumping', 'Water Treatment', 'Power Generation'];
const CRITICALITIES = ['Critical', 'High', 'Medium', 'Low'];
const STAGES = ['Design', 'Procurement', 'Commissioning', 'Operational', 'Maintenance', 'Decommissioned'];

export default function AssetDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('details');
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [docCount, setDocCount] = useState<number>(0);

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [uploadedPlans, setUploadedPlans] = useState<{name: string, size: number, file?: File}[]>([]);
  const [plansLoaded, setPlansLoaded] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [planToDeleteIndex, setPlanToDeleteIndex] = useState<number | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [conversionResult, setConversionResult] = useState<any>(null);

  React.useEffect(() => {
    if (id) {
      const saved = localStorage.getItem(`plans_${id}`);
      setUploadedPlans(saved ? JSON.parse(saved) : []);
      setPlansLoaded(true);
    }
  }, [id]);

  React.useEffect(() => {
    if (id && plansLoaded) {
      const storable = uploadedPlans.map(p => ({ name: p.name, size: p.size }));
      localStorage.setItem(`plans_${id}`, JSON.stringify(storable));
    }
  }, [uploadedPlans, id, plansLoaded]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setIsUploading(true);
      setTimeout(() => {
        const newPlans = Array.from(files).map(f => ({ name: f.name, size: f.size, file: f }));
        setUploadedPlans(prev => [...prev, ...newPlans]);
        setIsUploading(false);
      }, 1500);
    }
  };

  const handleConvert = async (plan: {name: string, size: number, file?: File}) => {
    if (!plan.file) {
      alert("Please upload the file again to convert it. LocalStorage cached files cannot be converted directly.");
      return;
    }
    setIsConverting(true);
    setConversionResult(null);
    setActiveTab('3d-model');
    const formData = new FormData();
    formData.append('file', plan.file);
    try {
      const response = await apiClient.post('conversions/convert_plan/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setConversionResult(response.data);
    } catch (e: any) {
      alert("Conversion failed: " + (e.response?.data?.error || e.message));
    } finally {
      setIsConverting(false);
    }
  };

  const { user } = useAuthStore();
  const { anomalies, fetchAnomalies } = useAnomalyStore();

  const storeAsset = useAssetStore(s => s.assets.find(a => a.id === id));
  const updateAsset = useAssetStore(s => s.updateAsset);
  const removeAsset = useAssetStore(s => s.removeAsset);
  const canManage = user?.role === 'Admin' || user?.role === 'Manager';

  // Editable fields from the store
  const [editForm, setEditForm] = useState({
    tag: storeAsset?.tag || '',
    desc: storeAsset?.desc || '',
    site: storeAsset?.site || '',
    system: storeAsset?.system || '',
    crit: storeAsset?.crit || '',
    stage: storeAsset?.stage || '',
    health: storeAsset?.health || 0,
    equipmentType: storeAsset?.equipmentType || '',
    manufacturer: storeAsset?.manufacturer || '',
    model: storeAsset?.model || '',
    serialNumber: storeAsset?.serialNumber || '',
    material: storeAsset?.material || '',
    code: storeAsset?.code || '',
    weight: storeAsset?.weight || '',
    commissioned: storeAsset?.commissioned || '',
  });

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditForm(prev => ({ ...prev, [name]: name === 'health' ? Number(value) : value }));
  };

  const handleEditSelectChange = (name: string, value: string) => {
    setEditForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveEdit = () => {
    if (id) {
      updateAsset(id, editForm);
      setIsEditing(false);
    }
  };

  React.useEffect(() => {
    fetchAnomalies();
    if (id) {
      apiClient.get(`documents/?asset=${id}`).then(res => {
        const count = res.data.count ?? res.data.results?.length ?? res.data.length ?? 0;
        setDocCount(count);
      }).catch(console.error);
    }
  }, [id, fetchAnomalies]);

  const assetAnomaliesCount = anomalies.filter(a => a.asset === id || a.assetTag === id || a.assetTag === storeAsset?.tag).length;

  const handleDelete = () => {
    if (id) {
      removeAsset(id);
      navigate('/assets');
    }
  };

  // Full asset database – every asset has unique details
  const assetDB: Record<string, {
    tag: string; name: string; site: string; system: string;
    commissioned: string; stageIndex: number;
    condition: number; conditionPct: number;
    corrosionRate: string; corrosionPct: number;
    vibration: string; vibrationPct: number;
    utilization: string; utilizationPct: number;
    rbiInterval: string; lastInspection: string; nextInspection: string; runHours: string;
    specs: { label: string; value: string }[];
  }> = {
    'AST-1045': {
      tag: 'V-201', name: '3-Phase Production Separator',
      site: 'Hassi Messaoud', system: 'Gas Treatment',
      commissioned: '2018-03-12', stageIndex: 4,
      condition: 78, conditionPct: 78,
      corrosionRate: '0.08 mm/yr', corrosionPct: 70,
      vibration: '2.4 mm/s', vibrationPct: 92,
      utilization: '94%', utilizationPct: 60,
      rbiInterval: '12 mo', lastInspection: '2025-09-04', nextInspection: '2026-09-04', runHours: '61,320 h',
      specs: [
        { label: 'TAG NUMBER', value: 'V-201' },
        { label: 'EQUIPMENT TYPE', value: 'Vessel' },
        { label: 'MANUFACTURER', value: 'TechnipFMC' },
        { label: 'MODEL', value: '3PS-DN1800' },
        { label: 'SERIAL NUMBER', value: 'TFM-2017-V0421' },
        { label: 'DESIGN PRESSURE (MAWP)', value: '42 barg' },
        { label: 'DESIGN TEMPERATURE', value: '85°C' },
        { label: 'MATERIAL', value: 'CS + Inconel 625 clad' },
        { label: 'CORROSION ALLOWANCE', value: '3.0 mm' },
        { label: 'NACE MR0175', value: 'COMPLIANT' },
        { label: 'PWHT', value: 'YES' },
        { label: 'CODE', value: 'ASME VIII Div 1' },
        { label: 'DIAMETER x LENGTH', value: '1800 mm x 6500 mm T/T' },
        { label: 'DRY WEIGHT', value: '12,400 kg' },
        { label: 'INSULATION', value: 'Mineral wool 80 mm' },
        { label: 'SIL RATING', value: 'SIL 2 (LCV loop)' },
      ],
    },
    'AST-1046': {
      tag: 'P-105A', name: 'Main Export Pump',
      site: 'Hassi Messaoud', system: 'Oil Export',
      commissioned: '2016-07-20', stageIndex: 5,
      condition: 45, conditionPct: 45,
      corrosionRate: '0.02 mm/yr', corrosionPct: 15,
      vibration: '4.8 mm/s', vibrationPct: 38,
      utilization: '30%', utilizationPct: 30,
      rbiInterval: '6 mo', lastInspection: '2026-01-15', nextInspection: '2026-07-15', runHours: '78,920 h',
      specs: [
        { label: 'TAG NUMBER', value: 'P-105A' },
        { label: 'EQUIPMENT TYPE', value: 'Centrifugal Pump' },
        { label: 'MANUFACTURER', value: 'Sulzer' },
        { label: 'MODEL', value: 'MSD-D 6x8x14' },
        { label: 'SERIAL NUMBER', value: 'SLZ-2016-P1054' },
        { label: 'RATED FLOW', value: '850 m³/h' },
        { label: 'RATED HEAD', value: '320 m' },
        { label: 'DRIVER POWER', value: '1,200 kW' },
        { label: 'SPEED', value: '3,560 RPM' },
        { label: 'CASING MATERIAL', value: 'Duplex SS 2205' },
        { label: 'IMPELLER TYPE', value: 'Closed, 5-vane' },
        { label: 'SEAL TYPE', value: 'Dual mechanical (Plan 53B)' },
        { label: 'API STANDARD', value: 'API 610 12th Ed' },
        { label: 'DRY WEIGHT', value: '4,800 kg' },
        { label: 'NPSH REQUIRED', value: '4.2 m' },
        { label: 'SIL RATING', value: 'SIL 1' },
      ],
    },
    'AST-1047': {
      tag: 'HE-302', name: 'Gas Cooler Unit',
      site: 'Rhourde El Baguel', system: 'Cooling',
      commissioned: '—', stageIndex: 2,
      condition: 100, conditionPct: 100,
      corrosionRate: 'N/A', corrosionPct: 0,
      vibration: 'N/A', vibrationPct: 0,
      utilization: '0%', utilizationPct: 0,
      rbiInterval: '—', lastInspection: '—', nextInspection: '—', runHours: '0 h',
      specs: [
        { label: 'TAG NUMBER', value: 'HE-302' },
        { label: 'EQUIPMENT TYPE', value: 'Shell & Tube Heat Exchanger' },
        { label: 'MANUFACTURER', value: 'Alfa Laval' },
        { label: 'MODEL', value: 'Compabloc CB76-M' },
        { label: 'SERIAL NUMBER', value: 'AL-2025-HE302' },
        { label: 'DUTY', value: '18 MW' },
        { label: 'SHELL SIDE FLUID', value: 'Lean gas' },
        { label: 'TUBE SIDE FLUID', value: 'Cooling water' },
        { label: 'DESIGN PRESSURE (SHELL)', value: '65 barg' },
        { label: 'DESIGN PRESSURE (TUBE)', value: '10 barg' },
        { label: 'TUBE MATERIAL', value: 'Titanium Gr 2' },
        { label: 'TEMA TYPE', value: 'BEM' },
        { label: 'CODE', value: 'ASME VIII Div 1' },
        { label: 'DRY WEIGHT', value: '8,200 kg' },
        { label: 'SURFACE AREA', value: '420 m²' },
        { label: 'PROCUREMENT STATUS', value: 'Awaiting delivery' },
      ],
    },
    'AST-1048': {
      tag: 'C-401', name: 'Sales Gas Compressor',
      site: "Hassi R'Mel", system: 'Compression',
      commissioned: '2026-02-01', stageIndex: 3,
      condition: 95, conditionPct: 95,
      corrosionRate: '0.01 mm/yr', corrosionPct: 5,
      vibration: '1.1 mm/s', vibrationPct: 96,
      utilization: '12%', utilizationPct: 12,
      rbiInterval: '24 mo', lastInspection: '2026-02-01', nextInspection: '2028-02-01', runHours: '720 h',
      specs: [
        { label: 'TAG NUMBER', value: 'C-401' },
        { label: 'EQUIPMENT TYPE', value: 'Centrifugal Compressor' },
        { label: 'MANUFACTURER', value: 'Baker Hughes (Nuovo Pignone)' },
        { label: 'MODEL', value: 'BCL 406/B' },
        { label: 'SERIAL NUMBER', value: 'BH-2025-C4011' },
        { label: 'RATED FLOW', value: '6.2 MMSCFD' },
        { label: 'SUCTION PRESSURE', value: '28 barg' },
        { label: 'DISCHARGE PRESSURE', value: '72 barg' },
        { label: 'DRIVER', value: 'Gas turbine 12 MW' },
        { label: 'SPEED', value: '9,800 RPM' },
        { label: 'CASING MATERIAL', value: 'Forged CS (ASTM A350 LF2)' },
        { label: 'SEAL TYPE', value: 'Dry gas seal (tandem)' },
        { label: 'API STANDARD', value: 'API 617 8th Ed' },
        { label: 'DRY WEIGHT', value: '22,500 kg' },
        { label: 'LUBE OIL SYSTEM', value: 'API 614' },
        { label: 'SIL RATING', value: 'SIL 3 (ESD)' },
      ],
    },
    'AST-1049': {
      tag: 'T-501', name: 'Crude Storage Tank',
      site: 'Arzew Terminal', system: 'Storage',
      commissioned: '2012-11-05', stageIndex: 4,
      condition: 88, conditionPct: 88,
      corrosionRate: '0.12 mm/yr', corrosionPct: 82,
      vibration: 'N/A', vibrationPct: 0,
      utilization: '72%', utilizationPct: 72,
      rbiInterval: '18 mo', lastInspection: '2025-06-10', nextInspection: '2026-12-10', runHours: '113,400 h',
      specs: [
        { label: 'TAG NUMBER', value: 'T-501' },
        { label: 'EQUIPMENT TYPE', value: 'Floating Roof Tank' },
        { label: 'MANUFACTURER', value: 'CB&I (McDermott)' },
        { label: 'CAPACITY', value: '50,000 bbl' },
        { label: 'SERIAL NUMBER', value: 'CBI-2012-T5010' },
        { label: 'DIAMETER', value: '36 m' },
        { label: 'HEIGHT', value: '14.6 m' },
        { label: 'SHELL MATERIAL', value: 'ASTM A516 Gr 70' },
        { label: 'BOTTOM MATERIAL', value: 'ASTM A283 Gr C' },
        { label: 'ROOF TYPE', value: 'External floating (pontoon)' },
        { label: 'FOUNDATION', value: 'Ringwall concrete' },
        { label: 'HEATING COIL', value: 'YES — Steam 8 barg' },
        { label: 'CODE', value: 'API 650 12th Ed' },
        { label: 'DRY WEIGHT', value: '285,000 kg' },
        { label: 'CATHODIC PROTECTION', value: 'Impressed current' },
        { label: 'DYKE CAPACITY', value: '110% net volume' },
      ],
    },
    'AST-1050': {
      tag: 'CV-301', name: 'Level Control Valve',
      site: 'Hassi Messaoud', system: 'Gas Treatment',
      commissioned: '2020-05-20', stageIndex: 4,
      condition: 92, conditionPct: 92,
      corrosionRate: '0.05 mm/yr', corrosionPct: 40,
      vibration: '1.5 mm/s', vibrationPct: 85,
      utilization: '65%', utilizationPct: 65,
      rbiInterval: '24 mo', lastInspection: '2025-11-10', nextInspection: '2027-11-10', runHours: '25,000 h',
      specs: [
        { label: 'TAG NUMBER', value: 'CV-301' },
        { label: 'EQUIPMENT TYPE', value: 'Control Valve' },
        { label: 'MANUFACTURER', value: 'Fisher' },
        { label: 'MODEL', value: 'Easy-e ET' },
        { label: 'SERIAL NUMBER', value: 'FSH-2020-V0891' },
        { label: 'DESIGN PRESSURE', value: '50 barg' },
        { label: 'DESIGN TEMPERATURE', value: '120°C' },
        { label: 'MATERIAL', value: 'Cast Steel WCB' },
        { label: 'CODE', value: 'ASME B16.34' },
        { label: 'DRY WEIGHT', value: '450 kg' },
      ],
    },
  };

  const stages = ['FEED', 'DESIGN', 'PROCUREMENT', 'COMMISSIONING', 'OPERATIONAL', 'MAINTENANCE', 'DECOMMISSIONED'];

  // Resolve asset data from route param or fallback to matching tag from store
  let asset = id && assetDB[id] ? assetDB[id] : null;
  if (!asset && storeAsset) {
    asset = Object.values(assetDB).find(a => a.tag === storeAsset.tag) || null;
  }
  
  // If still no asset but we have storeAsset, construct a minimal asset object from store
  if (!asset && storeAsset) {
    asset = {
      tag: storeAsset.tag,
      name: storeAsset.desc,
      site: storeAsset.site,
      system: storeAsset.system,
      commissioned: storeAsset.commissioned,
      stageIndex: storeAsset.stage === 'Operational' ? 4 : storeAsset.stage === 'Maintenance' ? 5 : 3,
      condition: storeAsset.health,
      conditionPct: storeAsset.health,
      corrosionRate: 'N/A', corrosionPct: 0,
      vibration: 'N/A', vibrationPct: 0,
      utilization: 'N/A', utilizationPct: 0,
      rbiInterval: 'N/A', lastInspection: 'N/A', nextInspection: 'N/A', runHours: 'N/A',
      specs: [
        { label: 'TAG NUMBER', value: storeAsset.tag },
        { label: 'EQUIPMENT TYPE', value: storeAsset.equipmentType || '—' },
        { label: 'MANUFACTURER', value: storeAsset.manufacturer || '—' },
        { label: 'MODEL', value: storeAsset.model || '—' },
        { label: 'SERIAL NUMBER', value: storeAsset.serialNumber || '—' },
        { label: 'MATERIAL', value: storeAsset.material || '—' },
        { label: 'CODE', value: storeAsset.code || '—' },
        { label: 'DRY WEIGHT', value: storeAsset.weight || '—' },
      ]
    };
  }
  const fallbackName = storeAsset?.desc || id || 'Unknown Asset';

  return (
    <div className="h-full flex flex-col font-sans max-w-5xl mx-auto">
      {/* Back Button */}
      <div className="mb-4">
        <Link to="/assets" className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-blue-600 transition-colors">
          <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Asset Registry
        </Link>
      </div>

      {!asset ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-slate-500 dark:text-slate-400">
            <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-slate-300" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">Asset not found</h2>
            <p className="text-sm">No asset with ID <span className="font-mono">{fallbackName}</span> exists in the registry.</p>
          </div>
        </div>
      ) : (
      <>
      {/* Header Info */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-8 pt-2 shrink-0">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-200 tracking-tight">{storeAsset?.desc || asset.name}</h1>
          <div className="flex flex-wrap items-center gap-6 mt-4 text-sm font-medium text-slate-500 dark:text-slate-400">
            <div className="flex items-center">
              <MapPin className="w-4 h-4 mr-2 text-slate-400 dark:text-slate-500" />
              <span>{storeAsset?.site || asset.site}</span>
            </div>
            <div className="flex items-center">
              <Settings className="w-4 h-4 mr-2 text-slate-400 dark:text-slate-500" />
              <span>{storeAsset?.system || asset.system}</span>
            </div>
            <div className="flex items-center">
              <Calendar className="w-4 h-4 mr-2 text-slate-400 dark:text-slate-500" />
              <div className="flex flex-col uppercase">
                <span>COMMISSIONED</span>
                <span>{storeAsset?.commissioned || asset.commissioned}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Edit / Delete Buttons */}
        {canManage && (
          <div className="flex items-center gap-2 shrink-0">
            {isEditing ? (
              <>
                <button onClick={handleSaveEdit} className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors shadow-sm">
                  <Save className="w-4 h-4 mr-1.5" /> Save
                </button>
                <button onClick={() => setIsEditing(false)} className="inline-flex items-center px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-medium transition-colors">
                  <X className="w-4 h-4 mr-1.5" /> Cancel
                </button>
              </>
            ) : (
              <>
                <button onClick={() => setIsEditing(true)} className="inline-flex items-center px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-medium transition-colors">
                  <Pencil className="w-4 h-4 mr-1.5" /> Edit
                </button>
                <button onClick={() => setShowDeleteConfirm(true)} className="inline-flex items-center px-4 py-2 bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 rounded-xl text-sm font-medium transition-colors border border-red-200 dark:border-red-800">
                  <Trash2 className="w-4 h-4 mr-1.5" /> Delete
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center justify-between">
          <p className="text-sm text-red-700 dark:text-red-400 font-medium">Are you sure you want to permanently delete this asset?</p>
          <div className="flex gap-2 ml-4">
            <button onClick={handleDelete} className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors">Yes, Delete</button>
            <button onClick={() => setShowDeleteConfirm(false)} className="px-4 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium transition-colors border border-slate-200 dark:border-slate-700">Cancel</button>
          </div>
        </div>
      )}

      {/* Edit Form (shown when editing) */}
      {isEditing && (
        <div className="mb-6 space-y-6">
          {/* General Info */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-blue-200 dark:border-blue-800 shadow-sm p-6 relative z-20">
            <h2 className="text-sm font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-5">Edit General Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Tag Number *</label>
                <input name="tag" value={editForm.tag} onChange={handleEditChange} required className="w-full px-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Description *</label>
                <input name="desc" value={editForm.desc} onChange={handleEditChange} required className="w-full px-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Site *</label>
                <CustomSelect value={editForm.site} onChange={(val) => handleEditSelectChange('site', val)} options={SITES.map(s => ({ label: s, value: s }))} className="bg-white dark:bg-slate-800 h-[42px]" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">System *</label>
                <CustomSelect value={editForm.system} onChange={(val) => handleEditSelectChange('system', val)} options={SYSTEMS.map(s => ({ label: s, value: s }))} className="bg-white dark:bg-slate-800 h-[42px]" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Criticality</label>
                <CustomSelect value={editForm.crit} onChange={(val) => handleEditSelectChange('crit', val)} options={CRITICALITIES.map(c => ({ label: c, value: c }))} className="bg-white dark:bg-slate-800 h-[42px]" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Stage</label>
                <CustomSelect value={editForm.stage} onChange={(val) => handleEditSelectChange('stage', val)} options={STAGES.map(s => ({ label: s, value: s }))} className="bg-white dark:bg-slate-800 h-[42px]" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Health (%)</label>
                <input name="health" type="number" min={0} max={100} value={editForm.health} onChange={handleEditChange} className="w-full px-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Commissioned Date</label>
                <input name="commissioned" type="text" value={editForm.commissioned} onChange={handleEditChange} placeholder="e.g. 2012-05" className="w-full px-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none" />
              </div>
            </div>
          </div>

          {/* Technical Specs */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-blue-200 dark:border-blue-800 shadow-sm p-6 relative z-10">
            <h2 className="text-sm font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-5">Edit Technical Specifications</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {[
                { name: 'equipmentType', label: 'Equipment Type' },
                { name: 'manufacturer', label: 'Manufacturer' },
                { name: 'model', label: 'Model' },
                { name: 'serialNumber', label: 'Serial Number' },
                { name: 'material', label: 'Material' },
                { name: 'code', label: 'Design Code' },
                { name: 'weight', label: 'Weight' },
              ].map(field => (
                <div key={field.name}>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">{field.label}</label>
                  <input
                    name={field.name}
                    value={(editForm as any)[field.name]}
                    onChange={handleEditChange}
                    className="w-full px-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}


      {/* Tabs */}
      {!isEditing && (
        <>
          <div className="flex border-b border-slate-200 dark:border-slate-700 mb-6 overflow-x-auto scrollbar-hide shrink-0">
        <button 
          onClick={() => setActiveTab('details')}
          className={`flex items-center px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap
            ${activeTab === 'details' ? 'border-slate-800 text-slate-900 dark:text-white dark:text-slate-100' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
        >
          <MapPin className="w-4 h-4 mr-2" />
          Overview
        </button>
        <button 
          onClick={() => setActiveTab('documents')}
          className={`flex items-center px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap
            ${activeTab === 'documents' ? 'border-slate-800 text-slate-900 dark:text-white dark:text-slate-100' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
        >
          <FileText className="w-4 h-4 mr-2" />
          Documents
          {docCount > 0 && (
            <span className="ml-2 bg-slate-800 text-white dark:text-slate-100 text-[10px] px-1.5 py-0.5 rounded-sm">{docCount}</span>
          )}
        </button>
        <button 
          onClick={() => setActiveTab('plans')}
          className={`flex items-center px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap
            ${activeTab === 'plans' ? 'border-slate-800 text-slate-900 dark:text-white dark:text-slate-100' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
        >
          <Layers className="w-4 h-4 mr-2" />
          Plans
        </button>
        <button 
          onClick={() => setActiveTab('3d-model')}
          className={`flex items-center px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap
            ${activeTab === '3d-model' ? 'border-slate-800 text-slate-900 dark:text-white dark:text-slate-100' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
        >
          <Cuboid className="w-4 h-4 mr-2" />
          3D Model
        </button>
        <button 
          onClick={() => setActiveTab('history')}
          className={`flex items-center px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap
            ${activeTab === 'history' ? 'border-slate-800 text-slate-900 dark:text-white dark:text-slate-100' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
        >
          <History className="w-4 h-4 mr-2" />
          History
        </button>
        <button 
          onClick={() => setActiveTab('anomalies')}
          className={`flex items-center px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap
            ${activeTab === 'anomalies' ? 'border-slate-800 text-slate-900 dark:text-white dark:text-slate-100' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
        >
          <AlertTriangle className="w-4 h-4 mr-2" />
          Anomalies
          {assetAnomaliesCount > 0 && (
            <span className="ml-2 bg-slate-800 text-white dark:text-slate-100 text-[10px] px-1.5 py-0.5 rounded-sm">{assetAnomaliesCount}</span>
          )}
        </button>
        <button 
          onClick={() => setActiveTab('maintenance')}
          className={`flex items-center px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap
            ${activeTab === 'maintenance' ? 'border-slate-800 text-slate-900 dark:text-white dark:text-slate-100' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
        >
          <Wrench className="w-4 h-4 mr-2" />
          Maintenance
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pb-8">
        {activeTab === 'details' && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          >
            {/* Left Column - Main Specs */}
            <div className="lg:col-span-2 flex flex-col gap-6">
              <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                <div className="flex justify-end p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
                  <span className="text-xs font-mono font-medium text-slate-500 dark:text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 tracking-widest uppercase">REV 4 - IFC</span>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-0 p-6">
                  {asset.specs.map((spec, i) => (
                    <div key={i} className="flex flex-col sm:flex-row sm:justify-between py-4 border-b border-slate-100 dark:border-slate-800 last:border-0 sm:even:border-b sm:[&:nth-last-child(-n+2)]:border-0">
                      <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 tracking-wider w-full sm:w-1/2 mb-1 sm:mb-0 uppercase">{spec.label}</span>
                      <span className="text-xs font-medium text-slate-700 dark:text-slate-300 w-full sm:w-1/2 sm:text-right">{spec.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
                <h3 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 tracking-wider uppercase mb-6">FEED - DECOMMISSION</h3>
                <div className="relative">
                  {/* Line */}
                  <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-200 dark:bg-slate-700 -translate-y-1/2" />
                  <div 
                    className="absolute top-1/2 left-0 h-0.5 bg-blue-600 -translate-y-1/2 transition-all duration-1000" 
                    style={{ width: `${(asset.stageIndex / (stages.length - 1)) * 100}%` }}
                  />
                  
                  {/* Nodes */}
                  <div className="relative flex justify-between">
                    {stages.map((stage, index) => (
                      <div key={stage} className="flex flex-col items-center">
                        <div className={`w-3 h-3 rounded-full border-2 bg-white dark:bg-slate-900 z-10 transition-colors
                          ${index < asset.stageIndex ? 'border-blue-600' : 
                            index === asset.stageIndex ? 'border-blue-600 ring-4 ring-blue-100 scale-125' : 
                            'border-slate-300 dark:border-slate-600'}`} 
                        />
                        <span className={`absolute top-6 text-[8px] font-bold tracking-widest whitespace-nowrap -rotate-45 sm:rotate-0 mt-2 sm:mt-0
                          ${index <= asset.stageIndex ? 'text-slate-800 dark:text-slate-200' : 'text-slate-400 dark:text-slate-500'}`}>
                          {stage}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="h-12 sm:h-8" /> {/* Spacer for labels */}
              </div>
            </div>

            {/* Right Column - Health & Metrics */}
            <div className="flex flex-col gap-6">
              <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
                <div className="space-y-6">
                  {/* Overall Condition */}
                  <div>
                    <div className="flex justify-between items-baseline mb-2">
                      <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 tracking-wider uppercase">OVERALL CONDITION</span>
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{asset.condition}/100</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div className={`h-full ${asset.conditionPct >= 70 ? 'bg-green-500' : asset.conditionPct >= 50 ? 'bg-orange-400' : 'bg-red-500'}`} style={{ width: `${asset.conditionPct}%` }} />
                    </div>
                    <div className="flex justify-end mt-1">
                      <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500">{asset.conditionPct}%</span>
                    </div>
                  </div>

                  {/* Corrosion Rate */}
                  <div>
                    <div className="flex justify-between items-baseline mb-2">
                      <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 tracking-wider uppercase">CORROSION RATE</span>
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{asset.corrosionRate}</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-orange-400 h-full" style={{ width: `${asset.corrosionPct}%` }} />
                    </div>
                    <div className="flex justify-end mt-1">
                      <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500">{asset.corrosionPct}%</span>
                    </div>
                  </div>

                  {/* Vibration */}
                  <div>
                    <div className="flex justify-between items-baseline mb-2">
                      <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 tracking-wider uppercase">VIBRATION (RMS)</span>
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{asset.vibration}</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div className={`h-full ${asset.vibrationPct >= 70 ? 'bg-green-500' : asset.vibrationPct >= 50 ? 'bg-orange-400' : 'bg-red-500'}`} style={{ width: `${asset.vibrationPct}%` }} />
                    </div>
                    <div className="flex justify-end mt-1">
                      <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500">{asset.vibrationPct}%</span>
                    </div>
                  </div>

                  {/* Utilization */}
                  <div>
                    <div className="flex justify-between items-baseline mb-2">
                      <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 tracking-wider uppercase">UTILIZATION</span>
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{asset.utilization}</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-orange-400 h-full" style={{ width: `${asset.utilizationPct}%` }} />
                    </div>
                    <div className="flex justify-end mt-1">
                      <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500">{asset.utilizationPct}%</span>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 tracking-wider uppercase">RBI INTERVAL</span>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{asset.rbiInterval}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Last inspection</span>
                    <span className="text-[11px] font-mono text-slate-700 dark:text-slate-300">{asset.lastInspection}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Next inspection</span>
                    <span className="text-[11px] font-mono text-slate-700 dark:text-slate-300">{asset.nextInspection}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Run hours</span>
                    <span className="text-[11px] font-mono text-slate-700 dark:text-slate-300">{asset.runHours}</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'documents' && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm p-8 flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 h-64"
          >
            <FileText className="w-10 h-10 mb-4 text-slate-300" />
            <h2 className="text-lg font-medium text-slate-900 dark:text-white dark:text-slate-100 mb-2">Asset Documents</h2>
            <p className="text-sm">Manage manuals, datasheets, and certificates for this asset.</p>
          </motion.div>
        )}

        {activeTab === 'plans' && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm p-8"
          >
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-lg font-medium text-slate-900 dark:text-white dark:text-slate-100">Engineering Plans</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Upload P&IDs, isometric drawings, or 2D layouts</p>
              </div>
            </div>
            
            <div 
              onClick={() => !isUploading && fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-10 flex flex-col items-center justify-center text-center hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group relative"
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                className="hidden" 
                accept=".jpg,.jpeg,.png,.pdf" 
                multiple
              />
              <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                {isUploading ? (
                  <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
                ) : (
                  <UploadCloud className="w-8 h-8" />
                )}
              </div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white dark:text-slate-100 mb-1">
                {isUploading ? 'Uploading...' : 'Click to upload or drag and drop'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">JPG, PNG or PDF (max. 50MB)</p>
              <button 
                type="button"
                disabled={isUploading}
                className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm disabled:opacity-50"
              >
                Select Files
              </button>
            </div>

            {uploadedPlans.length > 0 && (
              <div className="mt-6 space-y-3">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white dark:text-slate-100">Uploaded Plans</h3>
                {uploadedPlans.map((plan, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                    <div className="flex items-center">
                      <FileText className="w-5 h-5 text-blue-500 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-slate-900 dark:text-white dark:text-slate-100">{plan.name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{(plan.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                    </div>
                    {planToDeleteIndex === idx ? (
                      <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-800">
                        <span className="text-xs font-medium text-red-600 dark:text-red-400 mr-2">Delete this plan?</span>
                        <button 
                          onClick={() => {
                            setUploadedPlans(prev => prev.filter((_, i) => i !== idx));
                            setPlanToDeleteIndex(null);
                          }}
                          className="px-2.5 py-1 bg-red-600 text-white rounded text-xs font-semibold hover:bg-red-700 transition-colors"
                        >
                          Yes
                        </button>
                        <button 
                          onClick={() => setPlanToDeleteIndex(null)}
                          className="px-2.5 py-1 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => handleConvert(plan)}
                          className="px-2 py-1.5 text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 transition-colors rounded-md flex items-center shadow-sm border border-blue-200 dark:border-blue-800"
                          title="Convert to 3D Model"
                        >
                          <Sparkles className="w-4 h-4 mr-1.5" />
                          <span className="text-xs font-semibold">Convert to 3D</span>
                        </button>
                        <button 
                          onClick={() => setPlanToDeleteIndex(idx)}
                          className="p-1.5 text-slate-400 hover:text-red-500 transition-colors rounded-md hover:bg-red-50 dark:hover:bg-red-900/20"
                          title="Delete Plan"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {activeTab === '3d-model' && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm p-4 h-[500px] flex flex-col"
          >
            {isConverting ? (
              <div className="flex-1 flex flex-col items-center justify-center">
                <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4" />
                <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">Converting to 3D...</h3>
                <p className="text-sm text-slate-500">Gemini is analyzing the plan and generating CadQuery code.</p>
              </div>
            ) : conversionResult ? (
              <div className="flex-1 flex flex-col">
                <div className="mb-4 flex justify-between items-center bg-slate-50 dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                  <div>
                    <span className="text-xs font-bold text-slate-500 uppercase">Shape Type</span>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">{conversionResult.shape_type}</p>
                  </div>
                  <div className="flex gap-2">
                    {conversionResult.urls?.step && (
                      <a href={conversionResult.urls.step} download className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 transition-colors">Download STEP</a>
                    )}
                    {conversionResult.urls?.stl && (
                      <a href={conversionResult.urls.stl} download className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded text-sm font-medium hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors">Download STL</a>
                    )}
                  </div>
                </div>
                <div className="flex-1 min-h-0 relative">
                  <ThreeViewer url={conversionResult.urls?.stl} />
                </div>
              </div>
            ) : (
              <ThreeViewer />
            )}
          </motion.div>
        )}

        {activeTab === 'history' && (
          <HistoryTab reference={storeAsset?.reference || ''} tag={storeAsset?.tag || ''} />
        )}

        {activeTab === 'anomalies' && (
          <AnomaliesTab assetId={id || ''} />
        )}

        {activeTab === 'maintenance' && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm p-8 flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 h-64"
          >
            <Wrench className="w-10 h-10 mb-4 text-slate-300" />
            <h2 className="text-lg font-medium text-slate-900 dark:text-white dark:text-slate-100 mb-2">Maintenance Schedule</h2>
            <p className="text-sm">Upcoming work orders and maintenance tasks will be displayed here.</p>
          </motion.div>
        )}
      </div>
      </>
      )}
      </>
      )}
    </div>
  );
}

function AnomaliesTab({ assetId }: { assetId: string }) {
  const { anomalies, addAnomaly } = useAnomalyStore();
  const { user } = useAuthStore();
  const [showAddForm, setShowAddForm] = React.useState(false);
  const [issue, setIssue] = React.useState('');
  const [anomalyType, setAnomalyType] = React.useState('Corrosion');
  const [anomalyPriority, setAnomalyPriority] = React.useState('Medium');
  
  const anomalyTypes = ['Corrosion', 'Vibration', 'Leak', 'Electrical', 'Structural', 'Other'];
  const anomalyPriorities = ['Low', 'Medium', 'High', 'Critical'];

  const assetAnomalies = anomalies.filter(a => a.asset === assetId || a.assetTag === assetId);
  const canManage = user?.role === 'Admin' || user?.role === 'Manager' || user?.role === 'Technician';

  const handleAddAnomaly = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!issue) return;
    const formattedIssue = `[${anomalyType}] ${issue}`;
    await addAnomaly({ asset: assetId, issue: formattedIssue, priority: anomalyPriority });
    setShowAddForm(false);
    setIssue('');
    setAnomalyType('Corrosion');
    setAnomalyPriority('Medium');
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm p-6"
    >
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-medium text-slate-900 dark:text-white dark:text-slate-100">Open Anomalies ({assetAnomalies.length})</h2>
        {canManage && (
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm shadow-blue-500/20"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Report Anomaly
          </button>
        )}
      </div>

      {showAddForm && (
        <form onSubmit={handleAddAnomaly} className="mb-6 relative z-30 p-4 border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/10 rounded-xl">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 mb-3">
            <div className="sm:col-span-3 z-20">
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Type</label>
              <CustomSelect
                value={anomalyType}
                onChange={(val) => setAnomalyType(val)}
                options={anomalyTypes.map(t => ({ label: t, value: t }))}
                className="bg-white dark:bg-slate-800"
              />
            </div>
            <div className="sm:col-span-3 z-10">
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Priority</label>
              <CustomSelect
                value={anomalyPriority}
                onChange={(val) => setAnomalyPriority(val)}
                options={anomalyPriorities.map(p => ({ label: p, value: p }))}
                className="bg-white dark:bg-slate-800"
              />
            </div>
            <div className="sm:col-span-6">
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Issue Description</label>
              <input
                required
                type="text"
                value={issue}
                onChange={(e) => setIssue(e.target.value)}
                placeholder="Describe the issue..."
                className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-bold bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors shadow-sm shadow-blue-500/20"
            >
              Submit Report
            </button>
          </div>
        </form>
      )}
      <div className="space-y-4">
        {assetAnomalies.length === 0 ? (
          <p className="text-sm text-slate-500">No anomalies reported for this asset.</p>
        ) : (
          assetAnomalies.map(anomaly => (
            <div key={anomaly.id} className={`p-4 border rounded-xl flex items-start ${
              anomaly.state === 'reported' ? 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/30' : 
              anomaly.state === 'awaiting review' ? 'border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/30' : 
              'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/30'
            }`}>
              <AlertTriangle className={`w-5 h-5 mr-3 mt-0.5 ${
                anomaly.state === 'reported' ? 'text-red-600' : 
                anomaly.state === 'awaiting review' ? 'text-orange-600' : 
                'text-green-600'
              }`} />
              <div>
                <h3 className={`text-sm font-bold ${
                  anomaly.state === 'reported' ? 'text-red-900 dark:text-red-100' : 
                  anomaly.state === 'awaiting review' ? 'text-orange-900 dark:text-orange-100' : 
                  'text-green-900 dark:text-green-100'
                }`}>{anomaly.issue}</h3>
                <p className={`text-xs mt-2 font-mono ${
                  anomaly.state === 'reported' ? 'text-red-500' : 
                  anomaly.state === 'awaiting review' ? 'text-orange-500' : 
                  'text-green-500'
                }`}>Status: {anomaly.state} • Priority: {anomaly.priority || 'Medium'} • Reported: {anomaly.date}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </motion.div>
  );
}

function HistoryTab({ reference, tag }: { reference: string, tag: string }) {
  const [logs, setLogs] = React.useState<any[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    setIsLoading(true);
    // Search for logs mentioning this asset's reference or tag
    const searchTerms = [reference, tag].filter(Boolean).join(' ');
    if (!searchTerms) {
      setIsLoading(false);
      return;
    }
    
    apiClient.get(`audit/?search=${encodeURIComponent(searchTerms)}`)
      .then(response => {
        const results = response.data.results || response.data;
        const mappedLogs = results.map((log: any) => {
          const date = new Date(log.created_at);
          const formattedDate = date.toLocaleString([], { 
            year: 'numeric', 
            month: '2-digit', 
            day: '2-digit',
            hour: '2-digit', 
            minute: '2-digit' 
          });
          
          return {
            id: log.id,
            user: log.user__email || log.employee_id || 'System',
            action: log.action,
            entity: log.entity_id || log.entity_type || 'N/A',
            date: formattedDate
          };
        });
        setLogs(mappedLogs);
      })
      .catch(err => {
        console.error('Failed to fetch asset history:', err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [reference, tag]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm p-6"
    >
      <h2 className="text-lg font-medium text-slate-900 dark:text-white dark:text-slate-100 mb-6">Asset History</h2>
      
      {isLoading ? (
        <div className="flex justify-center items-center h-32">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : logs.length > 0 ? (
        <div className="relative border-l-2 border-slate-100 dark:border-slate-800 ml-4 space-y-8 pb-4">
          {logs.map((log) => (
            <div key={log.id} className="relative pl-8">
              <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-blue-100 border-2 border-white dark:border-slate-900 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-100 dark:border-slate-700/50">
                <div className="flex justify-between items-start mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-600">
                      {log.user}
                    </span>
                    <span className="text-sm text-slate-700 dark:text-slate-300">{log.action}</span>
                  </div>
                  <span className="text-xs text-slate-400 font-mono">{log.date}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center text-slate-500 dark:text-slate-400 py-8">No historical data found.</div>
      )}
    </motion.div>
  );
}
