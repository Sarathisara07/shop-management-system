const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');
const CashEntry = require('../models/CashEntry');
const Dispatch = require('../models/Dispatch');
const Product = require('../models/Product');

exports.getRealtimeStock = async (req, res) => {
  try {
    const products = await Product.find({ user: req.shopOwnerId }, '_id name');

    const inwardStock = await Transaction.aggregate([
      { $match: { user: new mongoose.Types.ObjectId(req.shopOwnerId) } },
      { $unwind: '$items' },
      { $group: { 
          _id: { $toString: '$items.product' }, 
          totalIn: { $sum: '$items.weight' } 
      }}
    ]);
    const outwardStock = await Dispatch.aggregate([
      { $match: { user: new mongoose.Types.ObjectId(req.shopOwnerId) } },
      { $unwind: '$items' },
      { $group: { 
          _id: { $toString: '$items.product' }, 
          totalOut: { $sum: '$items.weight' } 
      }}
    ]);

    const inMap = {};
    inwardStock.forEach(i => { if(i._id) inMap[i._id] = i.totalIn });

    const outMap = {};
    outwardStock.forEach(o => { if(o._id) outMap[o._id] = o.totalOut });

    const finalStock = products.map(p => {
      const pid = p._id.toString();
      const inward = inMap[pid] || 0;
      const outward = outMap[pid] || 0;
      return {
        productId: pid,
        productName: p.name,
        inward,
        outward,
        currentStock: inward - outward
      };
    });

    res.json(finalStock);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getDailyAnalytics = async (req, res) => {
  try {
    // Get date boundaries for today
    let { date } = req.query;
    
    let startOfDay, endOfDay;
    if (date) {
      const selectedDate = new Date(date);
      startOfDay = new Date(selectedDate.setHours(0,0,0,0));
      endOfDay = new Date(selectedDate.setHours(23,59,59,999));
    } else {
      const now = new Date();
      startOfDay = new Date(now.setHours(0, 0, 0, 0));
      endOfDay = new Date(now.setHours(23, 59, 59, 999));
    }

    // 1. Total Money Spent Today
    const dailyTotalAggregation = await Transaction.aggregate([
      {
        $match: {
          user: new mongoose.Types.ObjectId(req.shopOwnerId),
          date: { $gte: startOfDay, $lte: endOfDay }
        }
      },
      {
        $group: {
          _id: null,
          totalMoneySpent: { $sum: '$totalAmount' },
          totalTransactions: { $sum: 1 }
        }
      }
    ]);

    // 2. Total Weight and Money per Product
    const productAnalyticsAggregation = await Transaction.aggregate([
      {
        $match: {
          user: new mongoose.Types.ObjectId(req.shopOwnerId),
          date: { $gte: startOfDay, $lte: endOfDay }
        }
      },
      {
        $unwind: '$items'
      },
      {
        $group: {
          _id: { $toString: '$items.product' },
          productName: { $first: '$items.productName' },
          totalWeight: { $sum: '$items.weight' },
          totalSpent: { $sum: '$items.amount' }
        }
      },
      {
        $sort: { totalWeight: -1 }
      }
    ]);

    // 3. Total Cash Added
    const cashAggregation = await CashEntry.aggregate([
      {
        $match: {
          user: new mongoose.Types.ObjectId(req.shopOwnerId),
          date: { $gte: startOfDay, $lte: endOfDay }
        }
      },
      {
        $group: {
          _id: null,
          totalCashAdded: { $sum: '$amount' }
        }
      }
    ]);
    // 4. Total Profit (from Transactions)
    const profitAggregation = await Transaction.aggregate([
      {
        $match: {
          user: new mongoose.Types.ObjectId(req.shopOwnerId),
          date: { $gte: startOfDay, $lte: endOfDay }
        }
      },
      { $unwind: '$items' },
      {
        $group: {
          _id: null,
          totalProfit: { $sum: '$items.calculatedProfit' }
        }
      }
    ]);

    // Cumulative Cash for Remaining Balance (Up to End of Day)
    const cumulativeCashAgg = await CashEntry.aggregate([
      {
        $match: {
          user: new mongoose.Types.ObjectId(req.shopOwnerId),
          date: { $lte: endOfDay }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' }
        }
      }
    ]);

    const cumulativeSpentAgg = await Transaction.aggregate([
      {
        $match: {
          user: new mongoose.Types.ObjectId(req.shopOwnerId),
          date: { $lte: endOfDay }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$totalAmount' }
        }
      }
    ]);

    const allTimeCash = cumulativeCashAgg.length > 0 ? cumulativeCashAgg[0].total : 0;
    const allTimeSpent = cumulativeSpentAgg.length > 0 ? cumulativeSpentAgg[0].total : 0;
    const remainingBalance = allTimeCash - allTimeSpent;

    const totalCashAdded = cashAggregation.length > 0 ? cashAggregation[0].totalCashAdded : 0;
    const totalMoneySpent = dailyTotalAggregation.length > 0 ? dailyTotalAggregation[0].totalMoneySpent : 0;
    const totalTransactions = dailyTotalAggregation.length > 0 ? dailyTotalAggregation[0].totalTransactions : 0;
    const totalProfit = profitAggregation.length > 0 ? profitAggregation[0].totalProfit : 0;

    res.json({
      summary: {
        totalMoneySpent,
        totalTransactions,
        totalCashAdded,
        totalProfit,
        remainingBalance
      },
      products: productAnalyticsAggregation.map(p => ({
        _id: p.productName, // Map back for frontend compat
        totalWeight: p.totalWeight,
        totalSpent: p.totalSpent
      }))
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Weekly Chart Data (last 7 days)
exports.getWeeklyChartData = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    // 1. Daily Revenue Trend (last 7 days)
    const dailyRevenue = await Transaction.aggregate([
      {
        $match: {
          user: new mongoose.Types.ObjectId(req.shopOwnerId),
          date: { $gte: sevenDaysAgo, $lte: today }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$date', timezone: 'Asia/Kolkata' } },
          revenue: { $sum: '$totalAmount' },
          transactions: { $sum: 1 },
          totalWeight: { $sum: '$totalWeight' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // 2. Daily Profit Trend
    const dailyProfit = await Transaction.aggregate([
      {
        $match: {
          user: new mongoose.Types.ObjectId(req.shopOwnerId),
          date: { $gte: sevenDaysAgo, $lte: today }
        }
      },
      { $unwind: '$items' },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$date', timezone: 'Asia/Kolkata' } },
          profit: { $sum: '$items.calculatedProfit' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Build profit map
    const profitMap = {};
    dailyProfit.forEach(d => { profitMap[d._id] = d.profit; });

    // Fill in missing days with 0
    const revenueTrend = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(sevenDaysAgo);
      d.setDate(d.getDate() + i);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
      const found = dailyRevenue.find(r => r._id === dateStr);
      revenueTrend.push({
        date: dateStr,
        day: dayName,
        revenue: found ? found.revenue : 0,
        transactions: found ? found.transactions : 0,
        weight: found ? found.totalWeight : 0,
        profit: profitMap[dateStr] || 0
      });
    }

    // 3. Material Distribution (last 7 days)
    const materialDist = await Transaction.aggregate([
      {
        $match: {
          user: new mongoose.Types.ObjectId(req.shopOwnerId),
          date: { $gte: sevenDaysAgo, $lte: today }
        }
      },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.productName',
          totalWeight: { $sum: '$items.weight' },
          totalAmount: { $sum: '$items.amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { totalAmount: -1 } }
    ]);

    // 4. Top Customers (last 7 days)
    const topCustomers = await Transaction.aggregate([
      {
        $match: {
          user: new mongoose.Types.ObjectId(req.shopOwnerId),
          date: { $gte: sevenDaysAgo, $lte: today },
          customerName: { $ne: 'Guest' }
        }
      },
      {
        $group: {
          _id: '$customerName',
          totalAmount: { $sum: '$totalAmount' },
          visits: { $sum: 1 }
        }
      },
      { $sort: { totalAmount: -1 } },
      { $limit: 5 }
    ]);

    // 5. Weekly Summary
    const weekTotal = revenueTrend.reduce((sum, d) => sum + d.revenue, 0);
    const weekTransactions = revenueTrend.reduce((sum, d) => sum + d.transactions, 0);
    const weekWeight = revenueTrend.reduce((sum, d) => sum + d.weight, 0);
    const weekProfit = revenueTrend.reduce((sum, d) => sum + d.profit, 0);

    res.json({
      revenueTrend,
      materialDistribution: materialDist,
      topCustomers,
      weeklySummary: {
        totalRevenue: weekTotal,
        totalTransactions: weekTransactions,
        totalWeight: weekWeight,
        totalProfit: weekProfit,
        avgDailyRevenue: Math.round(weekTotal / 7)
      }
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
