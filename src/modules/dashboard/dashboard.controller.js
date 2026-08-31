const db = require('../../config/db');

async function getSubmissions(req, res) {
  try {
    const userId = req.user.userId;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    // Strict tenant isolation: ALWAYS join through widgets
    const totalCountQuery = await db('submissions as s')
      .join('widgets as w', 's.widget_id', 'w.id')
      .where('w.user_id', userId)
      .count('s.id as count')
      .first();

    const total = totalCountQuery ? Number(totalCountQuery.count) : 0;

    const rows = await db('submissions as s')
      .join('widgets as w', 's.widget_id', 'w.id')
      .where('w.user_id', userId)
      .select(
        's.id',
        's.widget_id',
        'w.title as widget_title',
        's.data',
        's.ip_address',
        's.country',
        's.city',
        's.region',
        's.honeypot_triggered',
        's.created_at'
      )
      .orderBy('s.created_at', 'desc')
      .limit(limit)
      .offset(offset);

    const submissions = rows.map((row) => {
      let data = row.data;
      if (typeof data === 'string') {
        try {
          data = JSON.parse(data);
        } catch {}
      }
      return { ...row, data };
    });

    return res.status(200).json({
      submissions,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

async function getStats(req, res) {
  try {
    const userId = req.user.userId;

    // 1. Total submissions count for user's widgets
    const totalQuery = await db('submissions as s')
      .join('widgets as w', 's.widget_id', 'w.id')
      .where('w.user_id', userId)
      .count('s.id as count')
      .first();
    const totalSubmissions = totalQuery ? Number(totalQuery.count) : 0;

    // 2. Submissions per widget (widget title + count)
    const perWidgetRows = await db('widgets as w')
      .leftJoin('submissions as s', 'w.id', 's.widget_id')
      .where('w.user_id', userId)
      .groupBy('w.id', 'w.title')
      .select('w.id as widget_id', 'w.title', db.raw('count(s.id) as count'));

    const perWidget = perWidgetRows.map((r) => ({
      widget_id: r.widget_id,
      title: r.title,
      count: Number(r.count)
    }));

    // 3. Submissions by country (geo breakdown)
    const byCountryRows = await db('submissions as s')
      .join('widgets as w', 's.widget_id', 'w.id')
      .where('w.user_id', userId)
      .whereNotNull('s.country')
      .where('s.country', '!=', '')
      .groupBy('s.country')
      .select('s.country', db.raw('count(s.id) as count'))
      .orderBy('count', 'desc');

    const byCountry = byCountryRows.map((r) => ({
      country: r.country,
      count: Number(r.count)
    }));

    // 4. Submissions in last 7 days grouped by date
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoIso = sevenDaysAgo.toISOString();

    const byDateRows = await db('submissions as s')
      .join('widgets as w', 's.widget_id', 'w.id')
      .where('w.user_id', userId)
      .where('s.created_at', '>=', sevenDaysAgoIso)
      .select(db.raw("date(s.created_at) as date, count(s.id) as count"))
      .groupByRaw("date(s.created_at)")
      .orderBy('date', 'asc');

    const last7Days = byDateRows.map((r) => ({
      date: r.date,
      count: Number(r.count)
    }));

    return res.status(200).json({
      total_submissions: totalSubmissions,
      total: totalSubmissions,
      submissions_per_widget: perWidget,
      per_widget: perWidget,
      submissions_by_country: byCountry,
      by_country: byCountry,
      submissions_last_7_days: last7Days,
      last_7_days: last7Days
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

module.exports = {
  getSubmissions,
  getStats
};
