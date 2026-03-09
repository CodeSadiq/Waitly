import { useState, useEffect } from "react";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    LineChart, Line, AreaChart, Area, PieChart, Pie, Cell
} from "recharts";
import {
    TrendingUp, Users, Clock, Zap, MapPin,
    Filter, Download, Calendar, ArrowRight, Activity
} from "lucide-react";
import { adminFetch } from "../utils/adminFetch";
import * as XLSX from "xlsx";
import html2pdf from "html2pdf.js";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#6366f1", "#ec4899", "#8b5cf6"];

export default function ReportsInsights() {
    const [metrics, setMetrics] = useState(null);
    const [charts, setCharts] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // Report Generation State
    const [reportFilters, setReportFilters] = useState({
        startDate: "",
        endDate: "",
        placeId: "",
        counterName: "",
        staffId: ""
    });
    const [generatedReport, setGeneratedReport] = useState(null);
    const [generating, setGenerating] = useState(false);

    // Filter Data
    const [places, setPlaces] = useState([]);
    const [staff, setStaff] = useState([]);

    useEffect(() => {
        fetchMainData();
        fetchFilters();
    }, []);

    const fetchMainData = async () => {
        setLoading(true);
        try {
            const [resMetrics, resCharts] = await Promise.all([
                adminFetch("/api/admin/reports/overview"),
                adminFetch("/api/admin/reports/analytics")
            ]);

            const dataMetrics = await resMetrics.json();
            const dataCharts = await resCharts.json();

            if (dataMetrics.success) setMetrics(dataMetrics.metrics);
            if (dataCharts.success) setCharts(dataCharts.charts);
        } catch (err) {
            setError("Failed to fetch analytics data");
        } finally {
            setLoading(false);
        }
    };

    const fetchFilters = async () => {
        try {
            const [resPlaces, resUsers] = await Promise.all([
                adminFetch("/api/admin/places"),
                adminFetch("/api/admin/users")
            ]);
            const dataPlaces = await resPlaces.json();
            const dataUsers = await resUsers.json();

            setPlaces(dataPlaces);
            setStaff(dataUsers.filter(u => u.role === "staff"));
        } catch (err) {
            console.error("Filter load error", err);
        }
    };

    const handleGenerateReport = async () => {
        setGenerating(true);
        try {
            const res = await adminFetch("/api/admin/reports/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(reportFilters)
            });
            const data = await res.json();
            if (data.success) {
                setGeneratedReport(data.report);
            }
        } catch (err) {
            console.error("Report gen error", err);
        } finally {
            setGenerating(false);
        }
    };

    const handleExport = async (format) => {
        try {
            const res = await adminFetch("/api/admin/reports/export", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    format,
                    startDate: reportFilters.startDate,
                    endDate: reportFilters.endDate,
                    placeId: reportFilters.placeId
                })
            });
            const result = await res.json();
            if (!result.success) return alert("Export failed");

            if (format === "csv" || format === "excel") {
                const ws = XLSX.utils.json_to_sheet(result.data);
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, "Waitly Report");
                XLSX.writeFile(wb, `WaitlyReport_${Date.now()}.${format === 'excel' ? 'xlsx' : 'csv'}`);
            } else if (format === "pdf") {
                // PDF is complex for raw data, usually we export the report view
                const element = document.getElementById("report-results-view");
                if (!element) return alert("Generate a report first to export as PDF");

                const opt = {
                    margin: 1,
                    filename: `WaitlyReport_${Date.now()}.pdf`,
                    image: { type: 'jpeg', quality: 0.98 },
                    html2canvas: { scale: 2 },
                    jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
                };
                html2pdf().set(opt).from(element).save();
            }
        } catch (err) {
            console.error("Export error", err);
        }
    };

    if (loading) return <div className="loading-analytics">Loading Analytics Engine...</div>;
    if (error) return <div className="error-analytics">{error}</div>;

    return (
        <div className="reports-page">
            {/* 🚀 DASHBOARD OVERVIEW */}
            <section className="analytics-section">
                <div className="section-header">
                    <h2>Dashboard Overview</h2>
                    <p>Key metrics across the ecosystem</p>
                </div>

                <div className="insights-grid">
                    <div className="insight-card">
                        <div className="insight-icon blue"><Users /></div>
                        <div className="insight-data">
                            <span className="insight-value">{metrics?.servedToday || 0}</span>
                            <span className="insight-label">Users Served Today</span>
                        </div>
                    </div>
                    <div className="insight-card">
                        <div className="insight-icon green"><Zap /></div>
                        <div className="insight-data">
                            <span className="insight-value">{metrics?.totalGeneratedToday || 0}</span>
                            <span className="insight-label">Tokens Today</span>
                        </div>
                    </div>
                    <div className="insight-card">
                        <div className="insight-icon orange"><Clock /></div>
                        <div className="insight-data">
                            <span className="insight-value">{metrics?.avgWaitTime || 0}m</span>
                            <span className="insight-label">Avg. Waiting Time</span>
                        </div>
                    </div>
                    <div className="insight-card">
                        <div className="insight-icon indigo"><Activity /></div>
                        <div className="insight-data">
                            <span className="insight-value">{metrics?.avgServiceTime || 0}m</span>
                            <span className="insight-label">Avg. Service Time</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* 📊 ANALYTICS CHARTS */}
            <section className="analytics-section charts-container">
                <div className="charts-grid-analytics">
                    {/* Daily Traffic */}
                    <div className="chart-card">
                        <h3>Daily Queue Traffic (Tokens)</h3>
                        <div className="chart-wrapper">
                            <ResponsiveContainer width="100%" height={300}>
                                <AreaChart data={charts?.dailyTraffic || []}>
                                    <defs>
                                        <linearGradient id="colorTraffic" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="date" />
                                    <YAxis tickFormatter={(val) => `${val}`} />
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <Tooltip formatter={(value) => [`${value} tokens`, 'Traffic']} />
                                    <Area type="monotone" dataKey="value" stroke="#3b82f6" fillOpacity={1} fill="url(#colorTraffic)" name="Traffic" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Peak Hours */}
                    <div className="chart-card">
                        <h3>Peak Service Hours (Tokens)</h3>
                        <div className="chart-wrapper">
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={charts?.peakHours || []}>
                                    <XAxis dataKey="hour" label={{ value: 'Hour of Day (24h)', position: 'insideBottom', offset: -5 }} />
                                    <YAxis tickFormatter={(val) => `${val}`} />
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <Tooltip formatter={(value) => [`${value} tokens`, 'Volume']} />
                                    <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} name="Volume" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Wait Time Trends */}
                    <div className="chart-card">
                        <h3>Waiting Time Trends (min)</h3>
                        <div className="chart-wrapper">
                            <ResponsiveContainer width="100%" height={300}>
                                <LineChart data={charts?.waitTrends || []}>
                                    <XAxis dataKey="date" />
                                    <YAxis tickFormatter={(val) => `${val}m`} />
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <Tooltip formatter={(value) => [`${value} min`, 'Average Wait']} />
                                    <Line type="monotone" dataKey="value" stroke="#f59e0b" strokeWidth={3} dot={{ r: 6 }} name="Average Wait" />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Token Distribution */}
                    <div className="chart-card">
                        <h3>Booking Type Distribution</h3>
                        <div className="chart-wrapper">
                            <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                    <Pie
                                        data={charts?.tokenTypeDist || []}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={100}
                                        fill="#8884d8"
                                        paddingAngle={5}
                                        dataKey="value"
                                        nameKey="name"
                                    >
                                        {charts?.tokenTypeDist?.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(value) => [`${value} tokens`, 'Count']} />
                                    <Legend verticalAlign="bottom" height={36} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </section>

            {/* 📁 REPORTS GENERATION */}
            <section className="analytics-section reports-gen">
                <div className="section-header">
                    <h2>Reports Generator</h2>
                    <p>Generate detailed performance reports with filters</p>
                </div>

                <div className="report-controls">
                    <div className="filter-group-grid">
                        <div className="filter-item">
                            <label><Calendar size={14} /> Start Date</label>
                            <input
                                type="date"
                                value={reportFilters.startDate}
                                onChange={e => setReportFilters({ ...reportFilters, startDate: e.target.value })}
                            />
                        </div>
                        <div className="filter-item">
                            <label><Calendar size={14} /> End Date</label>
                            <input
                                type="date"
                                value={reportFilters.endDate}
                                onChange={e => setReportFilters({ ...reportFilters, endDate: e.target.value })}
                            />
                        </div>
                        <div className="filter-item">
                            <label><MapPin size={14} /> Location</label>
                            <select
                                value={reportFilters.placeId}
                                onChange={e => setReportFilters({ ...reportFilters, placeId: e.target.value })}
                            >
                                <option value="">All Locations</option>
                                {places.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                            </select>
                        </div>
                        <div className="filter-item">
                            <label><Users size={14} /> Staff Member</label>
                            <select
                                value={reportFilters.staffId}
                                onChange={e => setReportFilters({ ...reportFilters, staffId: e.target.value })}
                            >
                                <option value="">Any Staff</option>
                                {staff.map(s => <option key={s._id} value={s._id}>{s.username}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="control-actions">
                        <button
                            className="btn-generate"
                            onClick={handleGenerateReport}
                            disabled={generating}
                        >
                            {generating ? "Calculating..." : "Generate Report"}
                            <ArrowRight size={18} />
                        </button>

                        <div className="export-dropdown">
                            <button className="btn-export">
                                <Download size={18} />
                                Export
                            </button>
                            <div className="dropdown-menu">
                                <button onClick={() => handleExport('pdf')}>PDF Document</button>
                                <button onClick={() => handleExport('csv')}>CSV File</button>
                                <button onClick={() => handleExport('excel')}>Excel Sheets</button>
                            </div>
                        </div>
                    </div>
                </div>

                {generatedReport && (
                    <div className="report-results-pane" id="report-results-view">
                        <div className="r-summary-grid">
                            <div className="r-metric">
                                <span className="r-val">{generatedReport.totalTokens}</span>
                                <span className="r-lab">Total Tokens</span>
                            </div>
                            <div className="r-metric">
                                <span className="r-val">{generatedReport.avgWaitTime}m</span>
                                <span className="r-lab">Avg Wait Time</span>
                            </div>
                            <div className="r-metric">
                                <span className="r-val">{generatedReport.avgServiceTime}m</span>
                                <span className="r-lab">Avg Service Time</span>
                            </div>
                            <div className="r-metric">
                                <span className="r-val">{generatedReport.noShowCount}</span>
                                <span className="r-lab">No Shows</span>
                            </div>
                            <div className="r-metric highlight">
                                <span className="r-val">{generatedReport.efficiency}%</span>
                                <span className="r-lab">Queue Efficiency</span>
                            </div>
                        </div>

                        <div className="status-breakdown">
                            <h3>Status Distribution</h3>
                            <div className="breakdown-bars">
                                {generatedReport.statusBreakdown.map((item, idx) => (
                                    <div key={idx} className="b-row">
                                        <span className="b-label">{item.status}</span>
                                        <div className="b-progress">
                                            <div
                                                className={`b-fill ${item.status.toLowerCase()}`}
                                                style={{ width: `${(item.count / generatedReport.totalTokens) * 100}%` }}
                                            ></div>
                                        </div>
                                        <span className="b-count">{item.count}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </section>
        </div>
    );
}
