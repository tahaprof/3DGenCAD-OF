import React, { useState, useMemo, useEffect } from 'react';
import { Search, Plus, Filter, X, ChevronDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useAssetStore } from '../store/assetStore';
import { AnimatePresence, motion } from 'framer-motion';

const mockAssets = [
  { id: 'AST-1045', tag: 'V-201', desc: '3-Phase Production Separator', site: 'Hassi Messaoud', system: 'Gas Treatment', crit: 'High', stage: 'Operational', health: 78 },
  { id: 'AST-1046', tag: 'P-105A', desc: 'Main Export Pump', site: 'Hassi Messaoud', system: 'Oil Export', crit: 'Critical', stage: 'Maintenance', health: 45 },
  { id: 'AST-1047', tag: 'HE-302', desc: 'Gas Cooler Unit', site: 'Rhourde El Baguel', system: 'Cooling', crit: 'Medium', stage: 'Procurement', health: 100 },
  { id: 'AST-1048', tag: 'C-401', desc: 'Sales Gas Compressor', site: 'Hassi R\'Mel', system: 'Compression', crit: 'Critical', stage: 'Commissioning', health: 95 },
  { id: 'AST-1049', tag: 'T-501', desc: 'Crude Storage Tank', site: 'Arzew Terminal', system: 'Storage', crit: 'High', stage: 'Operational', health: 88 },
];

const FILTER_OPTIONS = {
  site: Array.from(new Set(mockAssets.map(a => a.site))),
  system: Array.from(new Set(mockAssets.map(a => a.system))),
  crit: ['Critical', 'High', 'Medium', 'Low'],
  stage: ['Design', 'Procurement', 'Commissioning', 'Operational', 'Maintenance', 'Decommissioned']
};

export default function Assets() {
  const { user } = useAuthStore();
  const assets = useAssetStore(s => s.assets);
  const fetchAssets = useAssetStore(s => s.fetchAssets);
  const removeAsset = useAssetStore(s => s.removeAsset);
  const [searchTerm, setSearchTerm] = useState('');
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, assetId: string } | null>(null);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  // Filter States
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState({
    site: [] as string[],
    system: [] as string[],
    crit: [] as string[],
    stage: [] as string[],
    health: [0, 100] // [min, max]
  });

  const canManageAssets = user?.role === 'Admin' || user?.role === 'Manager';

  const toggleFilter = (category: keyof typeof FILTER_OPTIONS, value: string) => {
    setFilters(prev => {
      const current = prev[category];
      return {
        ...prev,
        [category]: current.includes(value)
          ? current.filter(v => v !== value)
          : [...current, value]
      };
    });
  };

  const handleHealthChange = (index: 0 | 1, value: string) => {
    const val = parseInt(value) || 0;
    setFilters(prev => {
      const newHealth = [...prev.health] as [number, number];
      newHealth[index] = Math.max(0, Math.min(100, val));

      // Ensure min <= max
      if (index === 0 && newHealth[0] > newHealth[1]) newHealth[0] = newHealth[1];
      if (index === 1 && newHealth[1] < newHealth[0]) newHealth[1] = newHealth[0];

      return { ...prev, health: newHealth };
    });
  };

  const clearAllFilters = () => {
    setFilters({
      site: [],
      system: [],
      crit: [],
      stage: [],
      health: [0, 100]
    });
  };

  const activeFilterCount =
    filters.site.length +
    filters.system.length +
    filters.crit.length +
    filters.stage.length +
    (filters.health[0] > 0 || filters.health[1] < 100 ? 1 : 0);

  const filteredAssets = useMemo(() => {
    return assets.filter(asset => {
      // Search
      const matchesSearch = asset.desc.toLowerCase().includes(searchTerm.toLowerCase()) ||
        asset.tag.toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchesSearch) return false;

      // Checkbox filters (AND logic between categories, OR logic within category)
      if (filters.site.length > 0 && !filters.site.includes(asset.site)) return false;
      if (filters.system.length > 0 && !filters.system.includes(asset.system)) return false;
      if (filters.crit.length > 0 && !filters.crit.includes(asset.crit)) return false;
      if (filters.stage.length > 0 && !filters.stage.includes(asset.stage)) return false;

      // Health Range
      if (asset.health < filters.health[0] || asset.health > filters.health[1]) return false;

      return true;
    });
  }, [assets, searchTerm, filters]);

  // Render Tags
  const renderFilterTags = () => {
    if (activeFilterCount === 0) return null;

    const tags = [];
    (Object.keys(FILTER_OPTIONS) as Array<keyof typeof FILTER_OPTIONS>).forEach(category => {
      filters[category].forEach(val => {
        tags.push(
          <span key={`${category}-${val}`} className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            {val}
            <button onClick={() => toggleFilter(category, val)} className="ml-1.5 hover:text-slate-900 dark:text-white dark:text-slate-100">
              <X className="w-3 h-3" />
            </button>
          </span>
        );
      });
    });

    if (filters.health[0] > 0 || filters.health[1] < 100) {
      tags.push(
        <span key="health" className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
          Health: {filters.health[0]}% - {filters.health[1]}%
          <button onClick={() => setFilters(prev => ({ ...prev, health: [0, 100] }))} className="ml-1.5 hover:text-slate-900 dark:text-white dark:text-slate-100">
            <X className="w-3 h-3" />
          </button>
        </span>
      );
    }

    return (
      <div className="flex flex-wrap gap-2 items-center pb-4">
        <span className="text-sm text-slate-500 dark:text-slate-400 font-medium mr-2">Active Filters:</span>
        {tags}
        <button onClick={clearAllFilters} className="text-xs text-blue-600 hover:text-blue-800 font-medium ml-2 underline">
          Clear All
        </button>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Asset Registry</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage your complete inventory of industrial equipment.</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search TAG or desc..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/20 focus:border-slate-900 w-full sm:w-64 shadow-sm"
            />
          </div>

          <div className="relative">
            <button
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className={`flex items-center p-2 rounded-xl text-sm font-medium transition-colors shadow-sm border
                ${isFilterOpen || activeFilterCount > 0
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
            >
              <Filter className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Filters</span>
              {activeFilterCount > 0 && (
                <span className={`ml-2 px-1.5 py-0.5 rounded-md text-[10px] font-bold
                  ${isFilterOpen || activeFilterCount > 0 ? 'bg-white dark:bg-slate-900 text-slate-900' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>
                  {activeFilterCount}
                </span>
              )}
            </button>

            {/* Filter Dropdown Panel */}
            <AnimatePresence>
              {isFilterOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 z-50 overflow-hidden"
                >
                  <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900">
                    <h3 className="font-semibold text-slate-900 dark:text-white">Filter Assets</h3>
                    <button onClick={clearAllFilters} className="text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">Reset</button>
                  </div>

                  <div className="p-4 max-h-[60vh] overflow-y-auto space-y-6">
                    {/* Stage */}
                    <div>
                      <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">Stage</h4>
                      <div className="flex flex-wrap gap-2">
                        {FILTER_OPTIONS.stage.map(s => (
                          <button
                            key={s}
                            onClick={() => toggleFilter('stage', s)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors
                              ${filters.stage.includes(s) ? 'bg-slate-800 text-white border-slate-800' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Criticality */}
                    <div>
                      <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">Criticality</h4>
                      <div className="flex flex-wrap gap-2">
                        {FILTER_OPTIONS.crit.map(c => (
                          <button
                            key={c}
                            onClick={() => toggleFilter('crit', c)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors
                              ${filters.crit.includes(c) ? 'bg-slate-800 text-white border-slate-800' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                          >
                            {c}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Site & System using checkboxes */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">Site</h4>
                        <div className="space-y-2">
                          {FILTER_OPTIONS.site.map(site => (
                            <label key={site} className="flex items-center gap-2 cursor-pointer group" onClick={(e) => { e.preventDefault(); toggleFilter('site', site); }}>
                              <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors
                                ${filters.site.includes(site) ? 'bg-blue-600 border-blue-600' : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 group-hover:border-slate-400'}`}>
                                {filters.site.includes(site) && <X className="w-3 h-3 text-white" />}
                              </div>
                              <span className="text-sm text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white">{site}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">System</h4>
                        <div className="space-y-2">
                          {FILTER_OPTIONS.system.map(sys => (
                            <label key={sys} className="flex items-center gap-2 cursor-pointer group" onClick={(e) => { e.preventDefault(); toggleFilter('system', sys); }}>
                              <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors
                                ${filters.system.includes(sys) ? 'bg-blue-600 border-blue-600' : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 group-hover:border-slate-400'}`}>
                                {filters.system.includes(sys) && <X className="w-3 h-3 text-white" />}
                              </div>
                              <span className="text-sm text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white">{sys}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Health Range Slider */}
                    <div>
                      <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3 flex justify-between">
                        <span>Health %</span>
                        <span className="text-slate-700 dark:text-slate-300 font-mono">{filters.health[0]} - {filters.health[1]}</span>
                      </h4>
                      <div className="flex items-center gap-4">
                        <div className="flex-1 flex flex-col">
                          <label className="text-[10px] text-slate-500 dark:text-slate-400 mb-1">Min</label>
                          <input
                            type="range" min="0" max="100"
                            value={filters.health[0]}
                            onChange={(e) => handleHealthChange(0, e.target.value)}
                            className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-slate-800"
                          />
                        </div>
                        <div className="flex-1 flex flex-col">
                          <label className="text-[10px] text-slate-500 dark:text-slate-400 mb-1">Max</label>
                          <input
                            type="range" min="0" max="100"
                            value={filters.health[1]}
                            onChange={(e) => handleHealthChange(1, e.target.value)}
                            className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-slate-800"
                          />
                        </div>
                      </div>
                    </div>

                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {canManageAssets && (
            <Link
              to="/assets/new"
              className="flex items-center bg-slate-900 hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">New Asset</span>
            </Link>
          )}
        </div>
      </div>

      {renderFilterTags()}

      <div className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-0">
        <div className="overflow-auto flex-1 relative">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50 dark:bg-slate-900/50 sticky top-0 z-10 backdrop-blur-sm">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">TAG</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider hidden md:table-cell">Description</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider hidden lg:table-cell">Site / System</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Crit</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Stage</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Health</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-100">
              {filteredAssets.map((asset) => (
                <tr 
                  key={asset.id} 
                  className="interactive-element hover-premium-blue transition-colors group cursor-pointer"
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setContextMenu({ x: e.clientX, y: e.clientY, assetId: asset.id });
                  }}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Link to={`/assets/${asset.id}`} className="text-sm font-bold text-slate-900 dark:text-white hover:text-blue-600 transition-colors">
                      {asset.tag}
                    </Link>
                    <div className="md:hidden text-xs text-slate-500 dark:text-slate-400 mt-1">{asset.desc}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400 font-medium hidden md:table-cell">
                    {asset.desc}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap hidden lg:table-cell">
                    <div className="text-sm text-slate-800 dark:text-slate-200">{asset.site}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{asset.system}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border
                      ${asset.crit === 'Critical' ? 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800' :
                        asset.crit === 'High' ? 'bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800' :
                          asset.crit === 'Medium' ? 'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800' :
                            'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'}`}
                    >
                      {asset.crit}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400">
                    <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-full text-xs font-medium text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                      {asset.stage}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${asset.health > 80 ? 'bg-green-500' :
                              asset.health > 50 ? 'bg-yellow-500' : 'bg-red-500'
                            }`}
                          style={{ width: `${asset.health}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-slate-600 dark:text-slate-400 w-8">{asset.health}%</span>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredAssets.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 mb-4">
                      <Filter className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                    </div>
                    <h3 className="text-sm font-medium text-slate-900 dark:text-white mb-1">No assets found</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Try adjusting your filters or search term.</p>
                    <button onClick={clearAllFilters} className="mt-4 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium">
                      Clear all filters
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {contextMenu && (
        <div 
          className="fixed bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg z-50 py-1 w-40"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <button 
            onClick={async () => {
              if (window.confirm('Are you sure you want to remove this asset?')) {
                await removeAsset(contextMenu.assetId);
              }
              setContextMenu(null);
            }}
            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2"
          >
            <X className="w-4 h-4" />
            Remove Asset
          </button>
        </div>
      )}
    </div>
  );
}
