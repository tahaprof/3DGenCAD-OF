import { create } from 'zustand';
import apiClient from '../api/client';

export type AnomalyState = 'reported' | 'awaiting review' | 'fixed';

export interface Anomaly {
  id: string;
  asset: string;
  assetTag: string;
  issue: string;
  state: AnomalyState;
  date: string;
  priority: string;
}

interface AnomalyStore {
  anomalies: Anomaly[];
  fetchAnomalies: () => Promise<void>;
  addAnomaly: (anomaly: { asset: string; issue: string; state?: AnomalyState; priority?: string }) => Promise<void>;
  updateAnomalyState: (id: string, state: AnomalyState) => Promise<void>;
  removeAnomaly: (id: string) => Promise<void>;
}

const mapBackendToFrontend = (b: any): Anomaly => {
  const statusMap: Record<string, AnomalyState> = {
    'Reported': 'reported',
    'Investigating': 'awaiting review',
    'Resolved': 'fixed'
  };
  return {
    id: b.id.toString(),
    asset: b.asset?.toString() || '',
    assetTag: b.asset_tag || 'Unknown',
    issue: b.title,
    state: statusMap[b.status] || 'reported',
    date: new Date(b.reported_at).toISOString().split('T')[0],
    priority: b.severity || 'Medium'
  };
};

const mapFrontendToBackendStatus = (f: AnomalyState): string => {
  const statusMap: Record<AnomalyState, string> = {
    'reported': 'Reported',
    'awaiting review': 'Investigating',
    'fixed': 'Resolved'
  };
  return statusMap[f];
};

export const useAnomalyStore = create<AnomalyStore>((set) => ({
  anomalies: [],
  fetchAnomalies: async () => {
    try {
      const response = await apiClient.get('assets/anomalies/');
      const backendAnomalies = response.data.results || response.data;
      set({ anomalies: backendAnomalies.map(mapBackendToFrontend) });
    } catch (error) {
      console.error('Failed to fetch anomalies:', error);
    }
  },
  addAnomaly: async (anomaly) => {
    try {
      const backendData = {
        asset: anomaly.asset,
        title: anomaly.issue,
        description: anomaly.issue,
        status: mapFrontendToBackendStatus(anomaly.state || 'reported'),
        severity: anomaly.priority || 'Medium'
      };
      const response = await apiClient.post('assets/anomalies/', backendData);
      const newAnomaly = mapBackendToFrontend(response.data);
      set((state) => ({ anomalies: [newAnomaly, ...state.anomalies] }));
    } catch (error) {
      console.error('Failed to add anomaly:', error);
      throw error;
    }
  },
  updateAnomalyState: async (id, newState) => {
    try {
      const response = await apiClient.patch(`assets/anomalies/${id}/`, {
        status: mapFrontendToBackendStatus(newState)
      });
      const updatedAnomaly = mapBackendToFrontend(response.data);
      set((state) => ({
        anomalies: state.anomalies.map(a => a.id === id ? updatedAnomaly : a)
      }));
    } catch (error) {
      console.error('Failed to update anomaly state:', error);
    }
  },
  removeAnomaly: async (id) => {
    try {
      await apiClient.delete(`assets/anomalies/${id}/`);
      set((state) => ({
        anomalies: state.anomalies.filter(a => a.id !== id)
      }));
    } catch (error) {
      console.error('Failed to remove anomaly:', error);
    }
  }
}));
