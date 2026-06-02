import { create } from 'zustand';
import apiClient from '../api/client';

export interface Asset {
  id: string;
  tag: string;
  desc: string;
  site: string;
  system: string;
  crit: string;
  stage: string;
  health: number;
  // Detail fields
  equipmentType: string;
  manufacturer: string;
  model: string;
  serialNumber: string;
  material: string;
  code: string;
  weight: string;
  commissioned: string;
}

interface AssetStore {
  assets: Asset[];
  fetchAssets: () => Promise<void>;
  addAsset: (asset: Omit<Asset, 'id'>) => Promise<void>;
  updateAsset: (id: string, data: Partial<Asset>) => Promise<void>;
  removeAsset: (id: string) => Promise<void>;
}

const mapBackendAssetToFrontend = (b: any): Asset => ({
  id: b.id.toString(),
  tag: b.tag,
  desc: b.description,
  site: b.site,
  system: b.system,
  crit: b.criticality,
  stage: b.stage,
  health: b.health,
  equipmentType: b.equipment_type || '',
  manufacturer: b.manufacturer || '',
  model: b.model || '',
  serialNumber: b.serial_number || '',
  material: b.material || '',
  code: b.design_code || '',
  weight: b.weight || '',
  commissioned: b.commissioned_date || '—',
});

export const useAssetStore = create<AssetStore>((set) => ({
  assets: [],
  fetchAssets: async () => {
    try {
      const response = await apiClient.get('assets/');
      const backendAssets = response.data.results || response.data;
      const mappedAssets = backendAssets.map(mapBackendAssetToFrontend);
      set({ assets: mappedAssets });
    } catch (error) {
      console.error('Failed to fetch assets:', error);
    }
  },
  addAsset: async (asset) => {
    try {
      const backendData = {
        reference: `AST-${Date.now()}`, // Generate a unique reference
        tag: asset.tag,
        description: asset.desc,
        site: asset.site,
        system: asset.system,
        criticality: asset.crit,
        stage: asset.stage,
        health: asset.health,
        equipment_type: asset.equipmentType,
        manufacturer: asset.manufacturer,
        model: asset.model,
        serial_number: asset.serialNumber,
        material: asset.material,
        design_code: asset.code,
        weight: asset.weight,
        commissioned_date: asset.commissioned || null,
      };
      const response = await apiClient.post('assets/', backendData);
      const newAsset = mapBackendAssetToFrontend(response.data);
      set((state) => ({ assets: [newAsset, ...state.assets] }));
    } catch (error) {
      console.error('Failed to add asset:', error);
      throw error;
    }
  },
  updateAsset: async (id, data) => {
    try {
      const backendData: any = {};
      if (data.desc) backendData.description = data.desc;
      if (data.crit) backendData.criticality = data.crit;
      if (data.stage) backendData.stage = data.stage;
      if (data.health !== undefined) backendData.health = data.health;
      
      const response = await apiClient.patch(`assets/${id}/`, backendData);
      const updatedAsset = mapBackendAssetToFrontend(response.data);
      set((state) => ({
        assets: state.assets.map(a => a.id === id ? updatedAsset : a),
      }));
    } catch (error) {
      console.error('Failed to update asset:', error);
    }
  },
  removeAsset: async (id) => {
    try {
      await apiClient.delete(`assets/${id}/`);
      set((state) => ({
        assets: state.assets.filter(a => a.id !== id),
      }));
    } catch (error) {
      console.error('Failed to remove asset:', error);
    }
  },
}));
