import Token from "../models/Token.js";
import Place from "../models/Place.js";
import Staff from "../models/Staff.js";
import mongoose from "mongoose";

/**
 * @desc Get summary metrics for the Admin Dashboard
 * @route GET /admin/reports/overview
 */
export const getOverviewStats = async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const [
            servedToday,
            totalGeneratedToday,
            avgWaitMetrics,
            avgServiceMetrics,
            activeQueues,
            typeDistribution
        ] = await Promise.all([
            // Total users served today
            Token.countDocuments({
                status: "Completed",
                completedAt: { $gte: today }
            }),
            // Total tokens generated today
            Token.countDocuments({
                createdAt: { $gte: today }
            }),
            // Average Waiting Time (Global)
            Token.aggregate([
                {
                    $match: {
                        servingStartedAt: { $exists: true },
                        createdAt: { $exists: true }
                    }
                },
                {
                    $group: {
                        _id: null,
                        avgWait: { $avg: { $subtract: ["$servingStartedAt", "$createdAt"] } }
                    }
                }
            ]),
            // Average Service Time (Global)
            Token.aggregate([
                {
                    $match: {
                        completedAt: { $exists: true },
                        servingStartedAt: { $exists: true }
                    }
                },
                {
                    $group: {
                        _id: null,
                        avgService: { $avg: { $subtract: ["$completedAt", "$servingStartedAt"] } }
                    }
                }
            ]),
            // Active Queues (Places with waiting tokens)
            Token.distinct("place", { status: "Waiting" }),
            // Walk-in vs Slotted
            Token.aggregate([
                { $match: { createdAt: { $gte: today } } },
                { $group: { _id: "$type", count: { $sum: 1 } } }
            ])
        ]);

        const formattedTypeDist = { "Walk-in": 0, "Slot": 0 };
        typeDistribution.forEach(item => {
            formattedTypeDist[item._id] = item.count;
        });

        res.json({
            success: true,
            metrics: {
                servedToday,
                totalGeneratedToday,
                avgWaitTime: avgWaitMetrics[0]?.avgWait ? Math.round(avgWaitMetrics[0].avgWait / 60000) : 0, // In minutes
                avgServiceTime: avgServiceMetrics[0]?.avgService ? Math.round(avgServiceMetrics[0].avgService / 60000) : 0, // In minutes
                activeQueues: activeQueues.length,
                tokenDistribution: formattedTypeDist
            }
        });
    } catch (err) {
        console.error("OVERVIEW STATS ERROR:", err);
        res.status(500).json({ success: false, error: "Failed to fetch overview metrics" });
    }
};

/**
 * @desc Get analytics charts data
 * @route GET /admin/reports/analytics
 */
export const getAnalyticsData = async (req, res) => {
    try {
        const last7Days = new Date();
        last7Days.setDate(last7Days.getDate() - 7);
        last7Days.setHours(0, 0, 0, 0);

        const [dailyTraffic, peakHours, waitTrends, tokenTypeDist] = await Promise.all([
            // Daily Queue Traffic (last 7 days)
            Token.aggregate([
                { $match: { createdAt: { $gte: last7Days } } },
                {
                    $group: {
                        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                        count: { $sum: 1 }
                    }
                },
                { $sort: { "_id": 1 } }
            ]),
            // Peak Service Hours (last 30 days)
            Token.aggregate([
                {
                    $match: {
                        servingStartedAt: { $exists: true },
                        servingStartedAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
                    }
                },
                {
                    $group: {
                        _id: { $hour: "$servingStartedAt" },
                        count: { $sum: 1 }
                    }
                },
                { $sort: { "_id": 1 } }
            ]),
            // Avg Waiting Time Trends (last 7 days)
            Token.aggregate([
                {
                    $match: {
                        servingStartedAt: { $exists: true },
                        createdAt: { $gte: last7Days }
                    }
                },
                {
                    $group: {
                        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                        avgWait: { $avg: { $subtract: ["$servingStartedAt", "$createdAt"] } }
                    }
                },
                { $sort: { "_id": 1 } }
            ]),
            // Global Token Distribution
            Token.aggregate([
                { $group: { _id: "$type", count: { $sum: 1 } } }
            ])
        ]);

        res.json({
            success: true,
            charts: {
                dailyTraffic: dailyTraffic.map(d => ({ date: d._id, value: d.count })),
                peakHours: peakHours.map(p => ({ hour: p._id, value: p.count })),
                waitTrends: waitTrends.map(w => ({ date: w._id, value: Math.round(w.avgWait / 60000) })),
                tokenTypeDist: tokenTypeDist.map(t => ({ name: t._id, value: t.count }))
            }
        });
    } catch (err) {
        console.error("ANALYTICS ERROR:", err);
        res.status(500).json({ success: false, error: "Failed to fetch analytics data" });
    }
};

/**
 * @desc Generate performance report with filters
 * @route POST /admin/reports/generate
 */
export const generateReport = async (req, res) => {
    try {
        const { startDate, endDate, placeId, counterName, staffId } = req.body;

        const query = {};

        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) query.createdAt.$gte = new Date(startDate);
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                query.createdAt.$lte = end;
            }
        }

        if (placeId) query.place = new mongoose.Types.ObjectId(placeId);
        if (counterName) query.counterName = counterName;
        if (staffId) query.servedBy = new mongoose.Types.ObjectId(staffId);

        const [performance, statusBreakdown] = await Promise.all([
            // Basic Performance Metrics
            Token.aggregate([
                { $match: query },
                {
                    $group: {
                        _id: null,
                        totalTokens: { $sum: 1 },
                        avgWait: {
                            $avg: {
                                $cond: [
                                    { $and: [{ $exists: ["$servingStartedAt", true] }, { $exists: ["$createdAt", true] }] },
                                    { $subtract: ["$servingStartedAt", "$createdAt"] },
                                    null
                                ]
                            }
                        },
                        avgService: {
                            $avg: {
                                $cond: [
                                    { $and: [{ $exists: ["$completedAt", true] }, { $exists: ["$servingStartedAt", true] }] },
                                    { $subtract: ["$completedAt", "$servingStartedAt"] },
                                    null
                                ]
                            }
                        },
                        completedCount: {
                            $sum: { $cond: [{ $eq: ["$status", "Completed"] }, 1, 0] }
                        },
                        skippedCount: {
                            $sum: { $cond: [{ $in: ["$status", ["Skipped", "Expired"]] }, 1, 0] }
                        }
                    }
                }
            ]),
            // Status Distribution
            Token.aggregate([
                { $match: query },
                { $group: { _id: "$status", count: { $sum: 1 } } }
            ])
        ]);

        const stats = performance[0] || {
            totalTokens: 0,
            avgWait: 0,
            avgService: 0,
            completedCount: 0,
            skippedCount: 0
        };

        // Calculate Efficiency (Completed / Total)
        const efficiency = stats.totalTokens > 0
            ? Math.round((stats.completedCount / stats.totalTokens) * 100)
            : 0;

        res.json({
            success: true,
            report: {
                totalTokens: stats.totalTokens,
                avgWaitTime: Math.round((stats.avgWait || 0) / 60000),
                avgServiceTime: Math.round((stats.avgService || 0) / 60000),
                noShowCount: stats.skippedCount,
                efficiency,
                statusBreakdown: statusBreakdown.map(s => ({ status: s._id, count: s.count }))
            }
        });

    } catch (err) {
        console.error("REPORT GENERATION ERROR:", err);
        res.status(500).json({ success: false, error: "Failed to generate report" });
    }
};

/**
 * @desc Export report to CSV/Excel
 * @route POST /admin/reports/export
 */
export const exportReport = async (req, res) => {
    try {
        const { format, startDate, endDate, placeId } = req.body;

        // In a real scenario, you'd use libraries like json2csv or exceljs
        // For now, let's fetch the data and return it as JSON for frontend to export
        // or provide a simple logic.

        // Actually, let's just return the raw tokens for the range so frontend can handle it if needed,
        // or generate a CSV string if simple.

        const query = {};
        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) query.createdAt.$gte = new Date(startDate);
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                query.createdAt.$lte = end;
            }
        }
        if (placeId) query.place = new mongoose.Types.ObjectId(placeId);

        const tokens = await Token.find(query)
            .populate("place", "name")
            .populate("servedBy", "username email")
            .lean();

        // Mapping for export
        const exportData = tokens.map(t => ({
            TokenID: t.tokenCode,
            Place: t.place?.name || "N/A",
            Counter: t.counterName,
            Type: t.type,
            User: t.userName,
            Status: t.status,
            CreatedAt: t.createdAt,
            ServingStarted: t.servingStartedAt || "N/A",
            CompletedAt: t.completedAt || "N/A",
            WaitTime: t.servingStartedAt && t.createdAt ? Math.round((t.servingStartedAt - t.createdAt) / 60000) : 0,
            ServiceTime: t.completedAt && t.servingStartedAt ? Math.round((t.completedAt - t.servingStartedAt) / 60000) : 0
        }));

        res.json({ success: true, data: exportData });

    } catch (err) {
        console.error("EXPORT ERROR:", err);
        res.status(500).json({ success: false, error: "Failed to export report" });
    }
};
