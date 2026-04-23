/**
 * Accounting/Accounting reports controller for EcoBosque Hotel System.
 * Generates financial reports and Excel exports.
 */
'use strict';

const XLSX = require('xlsx');
const { getRooms } = require('../data/jsonStore');
const { getHistory } = require('../data/jsonStore');

/**
 * GET /api/accounting/summary
 * Returns financial summary data
 */
async function getAccountingSummary(req, res) {
  try {
    const rooms = await getRooms();
    const history = await getHistory();
    const historyArray = Array.isArray(history) ? history : (history.reservas || []);

    // Current stats
    const totalRooms = rooms.length;
    const occupied = rooms.filter(r => r.estado === 'ocupada');
    const available = rooms.filter(r => r.estado === 'disponible');
    const reserved = rooms.filter(r => r.estado === 'reservada');

    // Current revenue (occupied rooms)
    const currentRevenue = occupied.reduce((sum, r) => sum + (r.tarifa || 0) * (r.noches || 1), 0);

    // Historical revenue from completed stays
    const completedStays = historyArray.filter(h => h.tipo !== 'cambio_estado' && h.checkIn && h.checkOut);
    const historicalRevenue = completedStays.reduce((sum, h) => sum + (h.tarifa || 0) * (h.noches || 1), 0);

    // Revenue by room type
    const revenueByType = {};
    occupied.forEach(r => {
      if (!revenueByType[r.tipo]) revenueByType[r.tipo] = { tipo: r.tipo, revenue: 0, count: 0 };
      revenueByType[r.tipo].revenue += (r.tarifa || 0) * (r.noches || 1);
      revenueByType[r.tipo].count++;
    });

    // Revenue by service type (from consumos in history)
    const revenueByService = {};
    historyArray.filter(h => h.consumos && Array.isArray(h.consumos)).forEach(h => {
      h.consumos.forEach(c => {
        if (!revenueByService[c.categoria]) revenueByService[c.categoria] = { categoria: c.categoria, total: 0, count: 0 };
        revenueByService[c.categoria].total += c.precio || 0;
        revenueByService[c.categoria].count++;
      });
    });

    // Occupancy rate
    const occupancyRate = totalRooms > 0 ? Math.round((occupied.length / totalRooms) * 100) : 0;

    // Average daily rate
    const avgDailyRate = occupied.length > 0 ? Math.round(currentRevenue / occupied.length) : 0;

    res.json({
      summary: {
        totalRooms,
        occupied: occupied.length,
        available: available.length,
        reserved: reserved.length,
        occupancyRate,
        avgDailyRate,
        currentRevenue,
        historicalRevenue,
        totalRevenue: currentRevenue + historicalRevenue,
      },
      revenueByType: Object.values(revenueByType),
      revenueByService: Object.values(revenueByService),
      completedStays: completedStays.length,
    });
  } catch (err) {
    require('../utils/logger').error('Error getting accounting summary', { error: err.message });
    res.status(500).json({ error: 'Error interno al obtener datos contables' });
  }
}

/**
 * GET /api/accounting/export?type=excel
 * Generates and downloads Excel report
 */
async function exportReport(req, res) {
  try {
    const rooms = await getRooms();
    const history = await getHistory();
    const historyArray = Array.isArray(history) ? history : (history.reservas || []);

    const wb = XLSX.utils.book_new();

    // Sheet 1: Resumen Financiero
    const occupied = rooms.filter(r => r.estado === 'ocupada');
    const totalRevenue = occupied.reduce((sum, r) => sum + (r.tarifa || 0) * (r.noches || 1), 0);

    const summaryData = [
      ['ECO BOSQUE HOTEL BOUTIQUE - Resumen Financiero'],
      [`Fecha: ${new Date().toLocaleDateString('es-CO')}`],
      [],
      ['Concepto', 'Valor'],
      ['Total Habitaciones', rooms.length],
      ['Ocupadas', occupied.length],
      ['Disponibles', rooms.filter(r => r.estado === 'disponible').length],
      ['Reservadas', rooms.filter(r => r.estado === 'reservada').length],
      ['En Limpieza', rooms.filter(r => r.estado === 'limpieza').length],
      ['En Mantenimiento', rooms.filter(r => r.estado === 'mantenimiento').length],
      ['Tasa de Ocupación', `${rooms.length > 0 ? Math.round((occupied.length / rooms.length) * 100) : 0}%`],
      ['Revenue Actual (COP)', totalRevenue],
      [],
      ['Revenue por Tipo de Habitación'],
      ['Tipo', 'Habitaciones', 'Revenue (COP)'],
      ...Object.entries(
        occupied.reduce((acc, r) => {
          if (!acc[r.tipo]) acc[r.tipo] = { count: 0, revenue: 0 };
          acc[r.tipo].count++;
          acc[r.tipo].revenue += (r.tarifa || 0) * (r.noches || 1);
          return acc;
        }, {})
      ).map(([tipo, data]) => [tipo, data.count, data.revenue]),
    ];

    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    wsSummary['!cols'] = [{ wch: 30 }, { wch: 15 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumen');

    // Sheet 2: Habitaciones Ocupadas
    const occupiedData = [
      ['Habitaciones Ocupadas - Detalle'],
      [`Generado: ${new Date().toLocaleString('es-CO')}`],
      [],
      ['#', 'Tipo', 'Huésped', 'Documento', 'Check-in', 'Check-out', 'Noches', 'Tarifa/Noche', 'Total'],
      ...occupied.map(r => [
        r.numero,
        r.tipo,
        r.huesped || '',
        r.documento || '',
        r.checkIn ? new Date(r.checkIn).toLocaleDateString('es-CO') : '',
        r.checkOut ? new Date(r.checkOut).toLocaleDateString('es-CO') : '',
        r.noches || 1,
        r.tarifa || 0,
        (r.tarifa || 0) * (r.noches || 1),
      ]),
    ];

    const wsOccupied = XLSX.utils.aoa_to_sheet(occupiedData);
    wsOccupied['!cols'] = [
      { wch: 8 }, { wch: 25 }, { wch: 25 }, { wch: 15 },
      { wch: 15 }, { wch: 15 }, { wch: 10 }, { wch: 15 }, { wch: 15 },
    ];
    XLSX.utils.book_append_sheet(wb, wsOccupied, 'Ocupadas');

    // Sheet 3: Historial de Reservaciones
    const completedStays = historyArray.filter(h => h.tipo !== 'cambio_estado' && h.huesped && h.checkIn);
    const historyData = [
      ['Historial de Reservaciones'],
      [],
      ['Huésped', 'Documento', 'Teléfono', 'Email', 'Habitación', 'Check-in', 'Check-out', 'Noches', 'Tarifa', 'Total'],
      ...completedStays.map(h => [
        h.huesped || '',
        h.documento || '',
        h.telefono || '',
        h.email || '',
        h.numero || '',
        h.checkIn ? new Date(h.checkIn).toLocaleDateString('es-CO') : '',
        h.checkOut ? new Date(h.checkOut).toLocaleDateString('es-CO') : '',
        h.noches || 1,
        h.tarifa || 0,
        (h.tarifa || 0) * (h.noches || 1),
      ]),
    ];

    const wsHistory = XLSX.utils.aoa_to_sheet(historyData);
    wsHistory['!cols'] = [
      { wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 25 },
      { wch: 10 }, { wch: 15 }, { wch: 15 }, { wch: 10 }, { wch: 15 }, { wch: 15 },
    ];
    XLSX.utils.book_append_sheet(wb, wsHistory, 'Historial');

    // Generate Excel file
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="ecobosque_contabilidad_${new Date().toISOString().split('T')[0]}.xlsx"`);
    res.send(buffer);
  } catch (err) {
    require('../utils/logger').error('Error exporting accounting report', { error: err.message });
    res.status(500).json({ error: 'Error interno al generar reporte' });
  }
}

module.exports = {
  getAccountingSummary,
  exportReport,
};
