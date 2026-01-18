import React, { useMemo } from 'react';
import { WordLog } from '../types';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell
} from 'recharts';

interface ReportViewProps {
    logs: WordLog[];
    onClose: () => void;
}

const COLORS = ['#2563eb', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899'];

const ReportView: React.FC<ReportViewProps> = ({ logs, onClose }) => {

    // Aggregate data by Category
    const categoryData = useMemo(() => {
        const counts: Record<string, number> = {};
        logs.forEach(log => {
            const w = log.weight;
            counts[log.category] = (counts[log.category] || 0) + w;
        });
        return Object.keys(counts).map(cat => ({
            name: cat,
            value: parseFloat(counts[cat].toFixed(2)) // Round to 2 decimals
        })).sort((a, b) => b.value - a.value);
    }, [logs]);

    // Aggregate data for detailed table
    const detailedLogs = useMemo(() => {
        return [...logs].sort((a, b) => b.timestamp - a.timestamp);
    }, [logs]);

    return (
        <div id="report-printable" className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 print:p-0 print:bg-white print:fixed print:inset-0 print:z-[9999]">
            <style type="text/css" media="print">
                {`
                  @page { size: auto; margin: 15mm; }
                  body { visibility: hidden; }
                  #report-printable { visibility: visible; position: absolute; left: 0; top: 0; width: 100%; height: auto !important; overflow: visible !important; display: block !important; }
                  #report-printable * { visibility: visible; }
                  /* Hide scrollbars in print */
                  ::-webkit-scrollbar { display: none; }
                `}
            </style>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden print:block print:h-auto print:max-h-none print:rounded-none print:shadow-none print:overflow-visible">

                {/* Header */}
                <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50 print:bg-white print:border-b-2 print:p-4">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800">Therapy Session Report</h2>
                        <p className="text-slate-500 text-sm">Patient Word Retrieval Analytics</p>
                    </div>
                    <div className="flex gap-3 print:hidden">
                        <button
                            onClick={() => window.print()}
                            className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition font-medium"
                        >
                            Print Report
                        </button>
                        <button
                            onClick={onClose}
                            className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition font-medium"
                        >
                            Close
                        </button>
                    </div>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8 print:block print:h-auto print:overflow-visible print:space-y-4 print:p-0 print:mt-4">

                    {/* Top Metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 print:grid-cols-3 print:gap-4">
                        <div className="bg-blue-50 p-6 rounded-xl border border-blue-100 print:p-3 print:border-2 print:rounded-lg">
                            <h3 className="text-blue-600 font-semibold mb-1 print:text-xs print:text-black">Total Words Logged</h3>
                            <p className="text-4xl font-bold text-slate-800 print:text-xl">{logs.length}</p>
                        </div>
                        <div className="bg-amber-50 p-6 rounded-xl border border-amber-100 print:p-3 print:border-2 print:rounded-lg">
                            <h3 className="text-amber-600 font-semibold mb-1 print:text-xs print:text-black">Active Categories</h3>
                            <p className="text-4xl font-bold text-slate-800 print:text-xl">{categoryData.length}</p>
                        </div>
                        <div className="bg-emerald-50 p-6 rounded-xl border border-emerald-100 print:p-3 print:border-2 print:rounded-lg">
                            <h3 className="text-emerald-600 font-semibold mb-1 print:text-xs print:text-black">Voice Success Rate</h3>
                            <p className="text-4xl font-bold text-slate-800 print:text-xl">
                                {logs.length > 0
                                    ? Math.round((logs.filter(l => l.selectionMethod === 'voice_confirmed').length / logs.length) * 100)
                                    : 0}%
                            </p>
                        </div>
                    </div>

                    {/* Charts Section */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 print:block print:mt-4">
                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm print:border-2 print:shadow-none print:p-4 print:break-inside-avoid print:mb-6">
                            <h3 className="text-lg font-bold text-slate-800 mb-6 print:mb-2 print:text-base">Category Breakdown (Weighted)</h3>
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={categoryData} layout="vertical" margin={{ left: 20 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                        <XAxis type="number" />
                                        <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
                                        <Tooltip cursor={{ fill: '#f1f5f9' }} />
                                        <Bar dataKey="value" fill="#2563eb" radius={[0, 4, 4, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm print:border-2 print:shadow-none print:p-4 print:break-inside-avoid print:mb-6">
                            <h3 className="text-lg font-bold text-slate-800 mb-6 print:mb-2 print:text-base">Selection Method Distribution</h3>
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={[
                                                { name: 'Manual Click', value: logs.filter(l => l.selectionMethod === 'manual_click').length },
                                                { name: 'Voice Confirmed', value: logs.filter(l => l.selectionMethod === 'voice_confirmed').length },
                                                { name: 'Implicit Split', value: logs.filter(l => l.selectionMethod === 'implicit_split').length },
                                            ]}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={80}
                                            fill="#8884d8"
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {categoryData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* Logs Table */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-slate-200">
                            <h3 className="text-lg font-bold text-slate-800">Session Log Details</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-slate-600">
                                <thead className="bg-slate-50 text-slate-800 font-semibold border-b border-slate-200">
                                    <tr>
                                        <th className="px-6 py-4">Time</th>
                                        <th className="px-6 py-4">Word</th>
                                        <th className="px-6 py-4">Category</th>
                                        <th className="px-6 py-4">Weight</th>
                                        <th className="px-6 py-4">Method</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {detailedLogs.map((log) => (
                                        <tr key={log.id} className="hover:bg-slate-50 transition">
                                            <td className="px-6 py-3 whitespace-nowrap">
                                                {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                            </td>
                                            <td className="px-6 py-3 font-medium text-slate-900">{log.word}</td>
                                            <td className="px-6 py-3">
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                    {log.category}
                                                </span>
                                            </td>
                                            <td className="px-6 py-3">{log.weight.toFixed(1)}</td>
                                            <td className="px-6 py-3 capitalize">{log.selectionMethod.replace('_', ' ')}</td>
                                        </tr>
                                    ))}
                                    {detailedLogs.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                                                No words logged in this session yet.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default ReportView;