const express = require('express');
const cors = require('cors');
require('dotenv').config();
const db = require('./db');

const app = express();

app.use(cors());
app.use(express.json());

const ROOM_ID = 1;

// ==============================================================================
// 1. ENDPOINT UNTUK ARDUINO (POST /api/sensor/log)
// ==============================================================================
app.post('/api/sensor/log', async (req, res) => {
  const { room_id = ROOM_ID, event_type } = req.body;

  if (!event_type || !['IN', 'OUT'].includes(event_type.toUpperCase())) {
    return res.status(400).json({ 
      success: false, 
      message: "event_type harus 'IN' atau 'OUT'" 
    });
  }

  try {
    const query = `INSERT INTO sensor_logs (room_id, event_type) VALUES (?, ?)`;
    const [result] = await db.execute(query, [room_id, event_type.toUpperCase()]);

    console.log(`[SENSOR] Event ${event_type.toUpperCase()} dicatat pada ${new Date().toLocaleTimeString('id-ID')}`);

    return res.status(201).json({
      success: true,
      message: 'Log sensor berhasil dicatat',
      data: {
        id: result.insertId,
        room_id,
        event_type: event_type.toUpperCase()
      }
    });
  } catch (error) {
    console.error('Gagal mencatat log sensor:', error);
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});

// ==============================================================================
// 2. ENDPOINT UNTUK DASHBOARD NEXT.JS (GET /api/sensor/dashboard)
// ==============================================================================
app.get('/api/sensor/dashboard', async (req, res) => {
  try {
    // A. Kapasitas Maksimum Ruangan
    const [roomRows] = await db.execute(`SELECT max_capacity FROM rooms WHERE id = ?`, [ROOM_ID]);
    const maxCapacity = roomRows[0]?.max_capacity || 30;

    // B. Live Count (Masuk - Keluar Hari Ini)
    const [countRows] = await db.execute(
      `SELECT 
        SUM(CASE WHEN event_type = 'IN' THEN 1 ELSE 0 END) - 
        SUM(CASE WHEN event_type = 'OUT' THEN 1 ELSE 0 END) AS current_count
       FROM sensor_logs
       WHERE room_id = ? AND DATE(created_at) = CURDATE()`,
      [ROOM_ID]
    );
    const currentCount = Math.max(0, parseInt(countRows[0]?.current_count || 0));

    // C. Total Hari Ini
    const [todayRows] = await db.execute(
      `SELECT COUNT(*) AS total_today 
       FROM sensor_logs 
       WHERE room_id = ? AND event_type = 'IN' AND DATE(created_at) = CURDATE()`,
      [ROOM_ID]
    );
    const totalToday = parseInt(todayRows[0]?.total_today || 0);

    // D. Total Bulan Ini
    const [monthRows] = await db.execute(
      `SELECT COALESCE(SUM(total_visitors), 0) AS total_history 
       FROM daily_stats 
       WHERE room_id = ? AND MONTH(date) = MONTH(CURDATE()) AND YEAR(date) = YEAR(CURDATE())`,
      [ROOM_ID]
    );
    const totalMonth = parseInt(monthRows[0]?.total_history || 0) + totalToday;

    // E. Rata-rata Harian
    const [avgRows] = await db.execute(
      `SELECT COALESCE(ROUND(AVG(total_visitors)), 0) AS daily_avg 
       FROM daily_stats 
       WHERE room_id = ?`,
      [ROOM_ID]
    );
    const dailyAverage = parseInt(avgRows[0]?.daily_avg || 0);

    // F. Grafik Pengunjung per Jam (08:00 - 20:00)
    const [hourlyRows] = await db.execute(
      `SELECT 
        DATE_FORMAT(created_at, '%H') AS hour,
        COUNT(*) AS total
       FROM sensor_logs
       WHERE room_id = ? 
         AND event_type = 'IN' 
         AND DATE(created_at) = CURDATE()
         AND HOUR(created_at) BETWEEN 8 AND 20
       GROUP BY hour
       ORDER BY hour`,
      [ROOM_ID]
    );

    const hours = ['08', '09', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20'];
    const hourlyMap = {};
    hourlyRows.forEach(row => {
      hourlyMap[row.hour] = parseInt(row.total);
    });
    const values = hours.map(h => hourlyMap[h] || 0);

    // G. Tentukan Peak Hour
    let peakHour = '-';
    let maxVal = 0;
    hours.forEach((h, i) => {
      if (values[i] > maxVal) {
        maxVal = values[i];
        peakHour = `${h}:00`;
      }
    });

    // H. Riwayat 7 Hari Terakhir
    const [historyRows] = await db.execute(
      `SELECT 
        DATE_FORMAT(date, '%a') AS day,
        total_visitors AS total,
        peak_hour AS peak
       FROM daily_stats
       WHERE room_id = ?
       ORDER BY date ASC
       LIMIT 7`,
      [ROOM_ID]
    );

    const historyData = historyRows.map(row => ({
      day: row.day,
      total: parseInt(row.total),
      peak: row.peak
    }));

    return res.json({
      currentCount,
      maxCapacity,
      totalToday,
      totalMonth,
      peakHour,
      dailyAverage,
      hourlyValues: values,
      history7Days: historyData
    });

  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server Backend berjalan di http://localhost:${PORT}`);
});