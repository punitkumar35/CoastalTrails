import React, { useState, useEffect } from 'react';
import { Database, Table, Play, RefreshCw, Plus, Key, Check, AlertCircle, Smartphone, Terminal, Layers, ArrowUpRight } from 'lucide-react';
import { api } from '../services/api';
import { DatabaseTableInfo } from '../types';

export const DatabaseStudioPage: React.FC = () => {
  const [tables, setTables] = useState<DatabaseTableInfo[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>('homestays');
  const [tableData, setTableData] = useState<{ columns: any[]; rows: any[] }>({ columns: [], rows: [] });
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [queryInput, setQueryInput] = useState('SELECT id, title, price_per_night, host_name FROM homestays;');
  const [queryResult, setQueryResult] = useState<any>(null);
  const [queryError, setQueryError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'browse' | 'schema' | 'query' | 'flutter'>('browse');
  const [notification, setNotification] = useState<string | null>(null);

  // New Stay Form State
  const [showAddStayModal, setShowAddStayModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newLocation, setNewLocation] = useState('kudle');
  const [newPrice, setNewPrice] = useState(2000);
  const [newHost, setNewHost] = useState('');
  const [newPhone, setNewPhone] = useState('+91');
  const [newTotalRooms, setNewTotalRooms] = useState(3);
  const [newPublishAvailability, setNewPublishAvailability] = useState(true);

  const fetchMetadata = async () => {
    try {
      setLoading(true);
      const [tList, s] = await Promise.all([api.getDbTables(), api.getDbStats()]);
      setTables(tList);
      setStats(s);
      if (tList.length > 0 && !selectedTable) {
        setSelectedTable(tList[0].name);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTableRows = async (tableName: string) => {
    try {
      setLoading(true);
      const data = await api.getTableRows(tableName);
      setTableData({ columns: data.columns, rows: data.rows });
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetadata();
  }, []);

  useEffect(() => {
    if (selectedTable) {
      fetchTableRows(selectedTable);
    }
  }, [selectedTable]);

  const handleRunQuery = async () => {
    try {
      setQueryError(null);
      setQueryResult(null);
      const res = await api.runCustomQuery(queryInput);
      setQueryResult(res);
      fetchMetadata();
    } catch (err: any) {
      setQueryError(err.message || 'Query execution failed');
    }
  };

  const handleResetDatabase = async () => {
    if (window.confirm('Reset SQLite database to default Coastal Trails seed records?')) {
      try {
        await api.resetDatabase();
        setNotification('Database reseeded successfully with authentic Gokarna records!');
        fetchMetadata();
        if (selectedTable) fetchTableRows(selectedTable);
        setTimeout(() => setNotification(null), 4000);
      } catch (err: any) {
        alert(err.message);
      }
    }
  };

  const handleAddStaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createHomestay({
        id: `gokarna-${Date.now()}`,
        title: newTitle,
        subtitle: 'Handpicked coastal cottage in Gokarna',
        location: newLocation as any,
        location_display: newLocation === 'kudle' ? 'Kudle Beach' : newLocation === 'om' ? 'Om Beach' : 'Gokarna Town',
        price_per_night: Number(newPrice),
        rating: 5.0,
        reviews_count: 1,
        host_name: newHost,
        host_whatsapp: newPhone,
        is_host_verified: 1,
        walking_minutes_to_beach: 2,
        total_rooms: Math.max(1, Math.round(newTotalRooms)),
        availability_listed: newPublishAvailability ? 1 : 0,
        description: 'Authentic coastal retreat steps from the Arabian sea.',
        imageUrls: ['https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?auto=format&fit=crop&w=1200&q=80'],
        amenities: ['High-Speed WiFi', 'Attached Bathroom', 'Fresh Spring Water'],
        verifiedBadges: ['Beachfront', 'Direct Host']
      });

      setShowAddStayModal(false);
      setNotification(`"${newTitle}" successfully added! Live in both Web and Mobile APK.`);
      fetchMetadata();
      if (selectedTable === 'homestays') fetchTableRows('homestays');
      setTimeout(() => setNotification(null), 4000);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const currentTableMeta = tables.find(t => t.name === selectedTable);

  return (
    <div className="space-y-6 pb-24 w-full">
      {/* Studio Header (Sleek Dark Console) */}
      <div className="bg-coastal-navy text-white p-6 sm:p-8 rounded-3xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 border border-coastal-navyLight">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-xs font-semibold text-amber-200 mb-2 border border-white/10">
            <Terminal className="w-3.5 h-3.5 text-coastal-terracotta" />
            <span>Coastal Trails • Shared Database Architecture</span>
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold">Database Studio</h1>
          <p className="text-xs sm:text-sm text-coastal-stone/80 mt-1 max-w-xl font-light">
            Visual inspection and schema studio for the shared SQLite database powering both the <span className="font-bold text-white">Coastal Trails Web Platform</span> and the <span className="font-bold text-amber-200">Mobile APK</span>.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowAddStayModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-coastal-terracotta hover:bg-coastal-terracottaHover text-white rounded-xl text-xs font-bold shadow-md transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Add Property</span>
          </button>
          <button
            onClick={handleResetDatabase}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white/10 hover:bg-white/20 text-coastal-stone rounded-xl text-xs font-semibold transition-all"
            title="Reseed database"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Reseed</span>
          </button>
        </div>
      </div>

      {notification && (
        <div className="p-4 bg-coastal-tealLight border border-coastal-teal/30 text-coastal-teal rounded-2xl text-xs font-bold flex items-center gap-2 shadow-sm animate-fade-in">
          <Check className="w-4 h-4 text-coastal-teal shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Database Metric Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-coastal-stone/80 shadow-sm">
            <span className="text-[10px] font-bold text-coastal-slate uppercase tracking-wider">Sanctuaries</span>
            <div className="font-serif text-3xl font-bold text-coastal-navy mt-1">{stats.homestays}</div>
            <span className="text-[10px] text-coastal-slate">Active in database</span>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-coastal-stone/80 shadow-sm">
            <span className="text-[10px] font-bold text-coastal-slate uppercase tracking-wider">Live Reservations</span>
            <div className="font-serif text-3xl font-bold text-coastal-terracotta mt-1">{stats.bookings}</div>
            <span className="text-[10px] text-coastal-slate">20% Hold Recorded</span>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-coastal-stone/80 shadow-sm">
            <span className="text-[10px] font-bold text-coastal-slate uppercase tracking-wider">Blocked Dates</span>
            <div className="font-serif text-3xl font-bold text-amber-700 mt-1">{stats.blockedDates}</div>
            <span className="text-[10px] text-coastal-slate">Dates locked</span>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-coastal-stone/80 shadow-sm">
            <span className="text-[10px] font-bold text-coastal-slate uppercase tracking-wider">Registered Accounts</span>
            <div className="font-serif text-3xl font-bold text-coastal-navy mt-1">{stats.users}</div>
            <span className="text-[10px] text-coastal-slate">Travelers & Hosts</span>
          </div>
        </div>
      )}

      {/* Studio Bar */}
      <div className="bg-white rounded-2xl p-2.5 border border-coastal-stone/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Table Selector Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          <span className="text-xs font-bold text-coastal-slate px-2 shrink-0">TABLES:</span>
          {tables.map((t) => (
            <button
              key={t.name}
              onClick={() => setSelectedTable(t.name)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                selectedTable === t.name
                  ? 'bg-coastal-navy text-white shadow-sm'
                  : 'bg-coastal-sand text-coastal-slate hover:text-coastal-navy hover:bg-coastal-sandDark'
              }`}
            >
              <Table className="w-3.5 h-3.5" />
              <span>{t.name}</span>
              <span className={`text-[10px] px-1.5 rounded-full font-mono ${
                selectedTable === t.name ? 'bg-white/20' : 'bg-coastal-stone'
              }`}>
                {t.count}
              </span>
            </button>
          ))}
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center gap-1 bg-coastal-sand p-1 rounded-xl self-start md:self-auto border border-coastal-stone/60">
          <button
            onClick={() => setActiveTab('browse')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'browse' ? 'bg-white text-coastal-navy shadow-sm' : 'text-coastal-slate hover:text-coastal-navy'
            }`}
          >
            Records
          </button>
          <button
            onClick={() => setActiveTab('schema')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'schema' ? 'bg-white text-coastal-navy shadow-sm' : 'text-coastal-slate hover:text-coastal-navy'
            }`}
          >
            Schema
          </button>
          <button
            onClick={() => setActiveTab('query')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'query' ? 'bg-white text-coastal-navy shadow-sm' : 'text-coastal-slate hover:text-coastal-navy'
            }`}
          >
            SQL Console
          </button>
          <button
            onClick={() => setActiveTab('flutter')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
              activeTab === 'flutter' ? 'bg-white text-coastal-terracotta shadow-sm' : 'text-coastal-slate hover:text-coastal-navy'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>APK Link</span>
          </button>
        </div>
      </div>

      {/* VIEWPORT CONTAINER */}
      <div className="bg-white rounded-3xl border border-coastal-stone/80 shadow-sm overflow-hidden min-h-[420px]">
        {/* 1. DATA RECORDS VIEW */}
        {activeTab === 'browse' && (
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-coastal-navy flex items-center gap-2">
                  <span>Table:</span>
                  <span className="font-mono text-xs text-coastal-navy bg-coastal-sand px-2 py-0.5 rounded border border-coastal-stone">
                    {selectedTable}
                  </span>
                </h3>
                <p className="text-xs text-coastal-slate mt-0.5">Displaying {tableData.rows.length} rows</p>
              </div>

              <button
                onClick={() => fetchTableRows(selectedTable)}
                className="text-xs font-semibold text-coastal-slate hover:text-coastal-navy flex items-center gap-1"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>Reload</span>
              </button>
            </div>

            {loading ? (
              <div className="text-center py-16 text-coastal-slate text-xs">Fetching records from SQLite...</div>
            ) : tableData.rows.length === 0 ? (
              <div className="text-center py-16 text-coastal-slate text-xs">No records in this table yet.</div>
            ) : (
              <div className="overflow-x-auto border border-coastal-stone rounded-2xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-coastal-sand border-b border-coastal-stone text-coastal-navy font-bold uppercase tracking-wider">
                    <tr>
                      {tableData.columns.map((col) => (
                        <th key={col.name} className="px-4 py-3 whitespace-nowrap">
                          <span className="flex items-center gap-1">
                            {col.pk === 1 && <Key className="w-3 h-3 text-amber-600" />}
                            <span>{col.name}</span>
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-coastal-stone/60 font-mono text-[11px]">
                    {tableData.rows.map((row, rIdx) => (
                      <tr key={rIdx} className="hover:bg-coastal-sand/50 transition-colors">
                        {tableData.columns.map((col) => {
                          const val = row[col.name];
                          return (
                            <td key={col.name} className="px-4 py-3 whitespace-nowrap text-coastal-navy max-w-xs truncate">
                              {val === null || val === undefined ? (
                                <span className="text-slate-300 italic">NULL</span>
                              ) : typeof val === 'boolean' ? (
                                val ? 'TRUE' : 'FALSE'
                              ) : (
                                String(val)
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* 2. SCHEMA INSPECTOR */}
        {activeTab === 'schema' && (
          <div className="p-6 space-y-4">
            <h3 className="font-serif text-lg font-bold text-coastal-navy">
              Schema Definition: <span className="font-mono text-sm font-sans font-bold text-coastal-terracotta">{selectedTable}</span>
            </h3>
            {currentTableMeta ? (
              <div className="border border-coastal-stone rounded-2xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-coastal-sand border-b border-coastal-stone text-coastal-navy font-bold">
                    <tr>
                      <th className="px-4 py-3">CID</th>
                      <th className="px-4 py-3">Column</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">PK</th>
                      <th className="px-4 py-3">Not Null</th>
                      <th className="px-4 py-3">Default</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-coastal-stone/60 font-mono text-xs">
                    {currentTableMeta.columns.map((c) => (
                      <tr key={c.cid} className="hover:bg-coastal-sand/50">
                        <td className="px-4 py-2.5 text-coastal-slate">{c.cid}</td>
                        <td className="px-4 py-2.5 font-bold text-coastal-navy flex items-center gap-1.5">
                          {c.pk && <Key className="w-3 h-3 text-amber-600" />}
                          <span>{c.name}</span>
                        </td>
                        <td className="px-4 py-2.5 text-coastal-teal font-semibold">{c.type}</td>
                        <td className="px-4 py-2.5">{c.pk ? 'YES' : 'NO'}</td>
                        <td className="px-4 py-2.5">{c.notnull ? 'YES' : 'NO'}</td>
                        <td className="px-4 py-2.5 text-coastal-slate">{c.dflt_value || 'None'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>
        )}

        {/* 3. SQL TERMINAL */}
        {activeTab === 'query' && (
          <div className="p-6 space-y-4">
            <div>
              <h3 className="font-serif text-lg font-bold text-coastal-navy">SQL Console</h3>
              <p className="text-xs text-coastal-slate">Execute raw queries on the shared SQLite database file.</p>
            </div>

            {/* Quick Templates */}
            <div className="flex flex-wrap gap-2 text-[11px]">
              <span className="text-coastal-slate font-bold self-center">Quick Snippets:</span>
              <button
                onClick={() => setQueryInput('SELECT id, title, price_per_night, host_name FROM homestays;')}
                className="px-2.5 py-1 bg-coastal-sand hover:bg-coastal-sandDark border border-coastal-stone rounded-lg text-coastal-navy font-mono"
              >
                All Stays
              </button>
              <button
                onClick={() => setQueryInput('SELECT reference_code, user_name, total_amount, advance_paid, status FROM bookings;')}
                className="px-2.5 py-1 bg-coastal-sand hover:bg-coastal-sandDark border border-coastal-stone rounded-lg text-coastal-navy font-mono"
              >
                Reservations
              </button>
              <button
                onClick={() => setQueryInput('SELECT * FROM room_unavailability;')}
                className="px-2.5 py-1 bg-coastal-sand hover:bg-coastal-sandDark border border-coastal-stone rounded-lg text-coastal-navy font-mono"
              >
                Blocked Dates
              </button>
            </div>

            {/* Terminal input */}
            <div className="relative">
              <textarea
                value={queryInput}
                onChange={(e) => setQueryInput(e.target.value)}
                rows={4}
                className="w-full font-mono text-xs p-4 bg-coastal-navy text-amber-200 rounded-2xl border border-coastal-navyLight focus:outline-none focus:ring-2 focus:ring-coastal-terracotta"
              />
              <button
                onClick={handleRunQuery}
                className="absolute right-3 bottom-4 px-4 py-2 bg-coastal-terracotta hover:bg-coastal-terracottaHover text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>Execute</span>
              </button>
            </div>

            {queryError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-mono flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{queryError}</span>
              </div>
            )}

            {queryResult && (
              <div className="space-y-2">
                <div className="text-xs font-bold text-coastal-slate">Output:</div>
                <div className="p-4 bg-coastal-sand rounded-2xl border border-coastal-stone max-h-72 overflow-auto">
                  <pre className="font-mono text-xs text-coastal-navy whitespace-pre-wrap">
                    {JSON.stringify(queryResult, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 4. FLUTTER INTEGRATION VIEW */}
        {activeTab === 'flutter' && (
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-coastal-terracotta" />
              <h3 className="font-serif text-lg font-bold text-coastal-navy">Flutter Mobile APK Connection</h3>
            </div>
            <p className="text-xs text-coastal-slate leading-relaxed">
              Your Flutter APK codebase in <span className="font-mono bg-coastal-sand px-1.5 py-0.5 rounded border border-coastal-stone">lib/services/api_service.dart</span> is already wired to this exact REST API. Any updates, bookings, or newly added homestays made on the website reflect on the mobile APK instantly:
            </p>

            <div className="bg-coastal-navy text-coastal-stone p-5 rounded-2xl font-mono text-xs overflow-x-auto border border-coastal-navyLight">
              <pre>{`// lib/services/api_service.dart
// Both Web and Mobile APK read from this exact SQLite Database!
class ApiService {
  static const String baseUrl = 'http://10.0.2.2:5000/api'; // Android Emulator
  // Or physical device local network: 'http://192.168.1.22:5000/api'

  static Future<List<Homestay>> fetchHomestays({String? beach}) async {
    final response = await http.get(Uri.parse('\$baseUrl/homestays'));
    return (jsonDecode(response.body) as List)
        .map((j) => Homestay.fromJson(j))
        .toList();
  }
}`}</pre>
            </div>
          </div>
        )}
      </div>

      {/* Add Homestay Modal */}
      {showAddStayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-4 border border-coastal-stone shadow-2xl">
            <h3 className="font-serif text-xl font-bold text-coastal-navy">Add Coastal Sanctuary</h3>
            <p className="text-xs text-coastal-slate">New properties are added to the shared SQLite database and will immediately show on Web & Mobile APK.</p>

            <form onSubmit={handleAddStaySubmit} className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-bold text-coastal-navy mb-1">Property Name</label>
                <input
                  type="text"
                  placeholder="e.g. Om Beach Nirvana Palm Shack"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-coastal-stone focus:outline-none focus:border-coastal-navy"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-coastal-navy mb-1">Beach Enclave</label>
                  <select
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-coastal-stone focus:outline-none focus:border-coastal-navy"
                  >
                    <option value="kudle">Kudle Beach</option>
                    <option value="om">Om Beach</option>
                    <option value="halfMoon">Half Moon Cove</option>
                    <option value="paradise">Paradise Beach</option>
                    <option value="mainBeach">Main Beach</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-coastal-navy mb-1">Tariff (₹/night)</label>
                  <input
                    type="number"
                    value={newPrice}
                    onChange={(e) => setNewPrice(Number(e.target.value))}
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-coastal-stone focus:outline-none focus:border-coastal-navy"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-coastal-navy mb-1">Host Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Manjunath Hegde"
                    value={newHost}
                    onChange={(e) => setNewHost(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-coastal-stone focus:outline-none focus:border-coastal-navy"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-coastal-navy mb-1">Host WhatsApp</label>
                  <input
                    type="tel"
                    placeholder="+91 98451 23091"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-coastal-stone focus:outline-none focus:border-coastal-navy"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-coastal-navy mb-1">Rooms available</label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={newTotalRooms}
                    onChange={(e) => setNewTotalRooms(Number(e.target.value))}
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-coastal-stone focus:outline-none focus:border-coastal-navy"
                    required
                  />
                  <p className="mt-1 text-[10px] text-coastal-slate">Guests share these rooms per night — when all are booked, the dates show as sold out.</p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-coastal-navy mb-1">Publish availability</label>
                  <label className="flex h-[42px] items-center gap-2 rounded-xl border border-coastal-stone px-3.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newPublishAvailability}
                      onChange={(e) => setNewPublishAvailability(e.target.checked)}
                      className="h-4 w-4 accent-coastal-terracotta"
                    />
                    <span className="text-xs font-semibold text-coastal-navy">
                      {newPublishAvailability ? 'Visible & bookable' : 'Hidden until published'}
                    </span>
                  </label>
                  <p className="mt-1 text-[10px] text-coastal-slate">If off, guests see "availability not published" instead of dates.</p>
                </div>
              </div>

              <div className="flex gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddStayModal(false)}
                  className="flex-1 py-3 text-xs font-bold text-coastal-slate bg-coastal-sand hover:bg-coastal-sandDark rounded-xl border border-coastal-stone"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-coastal-terracotta hover:bg-coastal-terracottaHover text-white text-xs font-bold rounded-xl shadow-md transition-all"
                >
                  Save to Database
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
