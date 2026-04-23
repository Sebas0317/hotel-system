/**
 * Accounting controller for EcoBosque Hotel System.
 * Generates comprehensive Excel reports with multiple sheets
 */
'use strict';

const XLSX = require('xlsx');
const { getRooms } = require('../data/jsonStore');
const { getHistory } = require('../data/jsonStore');

function getStatusLabel(status) {
  const labels = {
    disponible: 'Disponible',
    ocupda: 'Ocupada',
    ocupadA: 'Ocupada',
    reservada: 'Reservada',
    limpieza: 'En Limpieza',
    mantenimiento: 'En Mantenimiento',
    fuera_servicio: 'Fuera de Servicio'
  };
  return labels[status] || status;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('es-CO', { 
    year: 'numeric', 
    month: '2-digit', 
    day: '2-digit' 
  });
}

async function getAccountingSummary(req, res) {
  try {
    const rooms = await getRooms();
    const history = await getHistory();
    const historyArray = Array.isArray(history) ? history : (history.reservas || []);

    const totalRooms = rooms.length;
    const occupied = rooms.filter(r => r.estado === 'ocupada');
    const available = rooms.filter(r => r.estado === 'disponible');
    const reserved = rooms.filter(r => r.estado === 'reservada');
    const limpieza = rooms.filter(r => r.estado === 'limpieza');
    const mantenimiento = rooms.filter(r => r.estado === 'mantenimiento');

    const currentRevenue = occupied.reduce((sum, r) => sum + (r.tarifa || 0) * (r.noches || 1), 0);
    const completedStays = historyArray.filter(h => h.tipo !== 'cambio_estado' && h.checkIn && h.checkOut);
    const historicalRevenue = completedStays.reduce((sum, h) => sum + (h.tarifa || 0) * (h.noches || 1), 0);

    const revenueByType = {};
    occupied.forEach(r => {
      if (!revenueByType[r.tipo]) revenueByType[r.tipo] = { tipo: r.tipo, revenue: 0, count: 0 };
      revenueByType[r.tipo].revenue += (r.tarifa || 0) * (r.noches || 1);
      revenueByType[r.tipo].count++;
    });

    const revenueByService = {};
    historyArray.filter(h => h.consumos && Array.isArray(h.consumos)).forEach(h => {
      h.consumos.forEach(c => {
        if (!revenueByService[c.categoria]) revenueByService[c.categoria] = { categoria: c.categoria, total: 0, count: 0 };
        revenueByService[c.categoria].total += c.precio || 0;
        revenueByService[c.categoria].count++;
      });
    });

    const occupancyRate = totalRooms > 0 ? Math.round((occupied.length / totalRooms) * 100) : 0;
    const avgDailyRate = occupied.length > 0 ? Math.round(currentRevenue / occupied.length) : 0;

    res.json({
      summary: {
        totalRooms,
        occupied: occupied.length,
        available: available.length,
        reserved: reserved.length,
        limpieza: limpieza.length,
        mantenimiento: mantenimiento.length,
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

async function exportReport(req, res) {
  try {
    const rooms = await getRooms();
    const history = await getHistory();
    const historyArray = Array.isArray(history) ? history : (history.reservas || []);

    const wb = XLSX.utils.book_new();

    // Helper functions
    const addHeader = (sheet, title, subtitle) => {
      sheet['!rows'] = [{ hpx: 30 }, { hpx: 20 }];
    };

    // Sheet 1: Resumen Ejecutivo
    const occupied = rooms.filter(r => r.estado === 'ocupada');
    const available = rooms.filter(r => r.estado === 'disponible');
    const reserved = rooms.filter(r => r.estado === 'reservada');
    const limpieza = rooms.filter(r => r.estado === 'limpieza');
    const mantenimiento = rooms.filter(r => r.estado === 'mantenimiento');
    const totalRevenue = occupied.reduce((sum, r) => sum + (r.tarifa || 0) * (r.noches || 1), 0);
    const completedStays = historyArray.filter(h => h.tipo !== 'cambio_estado' && h.checkIn && h.checkOut);
    const historicalRevenue = completedStays.reduce((sum, h) => sum + (h.tarifa || 0) * (h.noches || 1), 0);
    const occupancyRate = rooms.length > 0 ? Math.round((occupied.length / rooms.length) * 100) : 0;

    const executiveSummary = [
      ['📊 RESUMEN EJECUTIVO - ECO BOSQUE HOTEL BOUTIQUE'],
      [`Fecha de Generación: ${new Date().toLocaleDateString('es-CO', { 
        year: 'numeric', month: 'long', day: 'numeric', 
        hour: '2-digit', minute: '2-digit' 
      })}`],
      [],
      ['📈 KPIs PRINCIPALES'],
      ['Métrica', 'Valor', 'Descripción'],
      ['🏨 Total Habitaciones', rooms.length, 'Capacidad total del hotel'],
      ['📊 Tasa de Ocupación', `${occupancyRate}%`, `${occupied.length} de ${rooms.length} habitaciones`],
      ['💰 Revenue Actual', `$${totalRevenue.toLocaleString('es-CO')}`, 'Revenue de habitaciones ocupadas'],
      ['📈 Revenue Histórico', `$${historicalRevenue.toLocaleString('es-CO')}`, 'Revenue de estadías completadas'],
      ['💵 Revenue Total', `$${(totalRevenue + historicalRevenue).toLocaleString('es-CO')}`, 'Revenue actual + histórico'],
      ['🏠 Tarifa Promedio/Día', `$${Math.round(totalRevenue / (occupied.length || 1)).toLocaleString('es-CO')}`, 'Promedio por habitación'],
      ['✅ Estadías Completadas', completedStays.length, 'Total de huéspedes que completaron stay'],
      [],
      ['📊 DETALLE POR ESTADO'],
      ['Estado', 'Cantidad', 'Porcentaje'],
      ['Ocupadas', occupied.length, `${rooms.length > 0 ? Math.round((occupied.length / rooms.length) * 100) : 0}%`],
      ['Disponibles', available.length, `${rooms.length > 0 ? Math.round((available.length / rooms.length) * 100) : 0}%`],
      ['Reservadas', reserved.length, `${rooms.length > 0 ? Math.round((reserved.length / rooms.length) * 100) : 0}%`],
      ['En Limpieza', limpieza.length, `${rooms.length > 0 ? Math.round((limpieza.length / rooms.length) * 100) : 0}%`],
      ['En Mantenimiento', mantenimiento.length, `${rooms.length > 0 ? Math.round((mantenimiento.length / rooms.length) * 100) : 0}%`],
    ];

    const wsExec = XLSX.utils.aoa_to_sheet(executiveSummary);
    wsExec['!cols'] = [{ wch: 35 }, { wch: 20 }, { wch: 40 }];
    XLSX.utils.book_append_sheet(wb, wsExec, '📊 Resumen');

    // Sheet 2: Habitaciones Detallado
    const allRoomsDetailed = [
      ['📋 DETALLE COMPLETO DE HABITACIONES'],
      [`Generado: ${new Date().toLocaleDateString('es-CO')}`],
      [],
      ['#', 'Tipo', 'Estado', 'Huésped', 'Documento', 'Check-in', 'Check-out', 'Noches', 'Tarifa/Noche', 'Total'],
      ...rooms.map(r => [
        r.numero,
        r.tipo,
        getStatusLabel(r.estado),
        r.huesped || '-',
        r.documento || '-',
        r.checkIn ? formatDate(r.checkIn) : '-',
        r.checkOut ? formatDate(r.checkOut) : (r.noches ? `Planificado: ${r.noches} días` : '-'),
        r.noches || '-',
        r.tarifa ? `$${r.tarifa.toLocaleString('es-CO')}` : '-',
        r.tarifa && r.noches ? `$${(r.tarifa * r.noches).toLocaleString('es-CO')}` : '-',
      ]),
    ];

    const wsRooms = XLSX.utils.aoa_to_sheet(allRoomsDetailed);
    wsRooms['!cols'] = [
      { wch: 8 }, { wch: 25 }, { wch: 15 }, { wch: 25 }, { wch: 15 },
      { wch: 15 }, { wch: 15 }, { wch: 10 }, { wch: 15 }, { wch: 15 }
    ];
    XLSX.utils.book_append_sheet(wb, wsRooms, '📋 Habitaciones');

    // Sheet 3: Habitaciones Ocupadas
    const occupiedRooms = [
      ['🔴 HABITACIONES OCUPADAS - DETALLE'],
      [`Generado: ${new Date().toLocaleDateString('es-CO')}`],
      [],
      ['#', 'Tipo', 'Huésped', 'Documento', 'Teléfono', 'Email', 'Check-in', 'Check-out', 'Noches', 'Tarifa/Día', 'Total'],
      ...occupied.map(r => [
        r.numero,
        r.tipo,
        r.huesped || '-',
        r.documento || '-',
        r.telefono || '-',
        r.email || '-',
        r.checkIn ? formatDate(r.checkIn) : '-',
        r.checkOut ? formatDate(r.checkOut) : '-',
        r.noches || 1,
        r.tarifa ? `$${r.tarifa.toLocaleString('es-CO')}` : '-',
        (r.tarifa && r.noches) ? `$${(r.tarifa * r.noches).toLocaleString('es-CO')}` : '-',
      ]),
    ];

    const wsOccupied = XLSX.utils.aoa_to_sheet(occupiedRooms);
    wsOccupied['!cols'] = [
      { wch: 8 }, { wch: 25 }, { wch: 25 }, { wch: 15 }, { wch: 15 },
      { wch: 30 }, { wch: 15 }, { wch: 15 }, { wch: 10 }, { wch: 15 }, { wch: 15 }
    ];
    XLSX.utils.book_append_sheet(wb, wsOccupied, '🔴 Ocupadas');

    // Sheet 4: Revenue por Tipo
    const revenueByType = {};
    occupied.forEach(r => {
      if (!revenueByType[r.tipo]) revenueByType[r.tipo] = { tipo: r.tipo, count: 0, revenue: 0 };
      revenueByType[r.tipo].count++;
      revenueByType[r.tipo].revenue += (r.tarifa || 0) * (r.noches || 1);
    });

    const revenueTypeData = [
      ['💰 REVENUE POR TIPO DE HABITACIÓN'],
      [`Generado: ${new Date().toLocaleDateString('es-CO')}`],
      [],
      ['Tipo de Habitación', 'Habitaciones', 'Ingresos', '% del Total'],
      ...Object.values(revenueByType).map(item => [
        item.tipo,
        item.count,
        `$${item.revenue.toLocaleString('es-CO')}`,
        `${totalRevenue > 0 ? Math.round((item.revenue / totalRevenue) * 100) : 0}%`,
      ]),
      [],
      ['TOTAL', Object.values(revenueByType).reduce((sum, i) => sum + i.count, 0), `$${totalRevenue.toLocaleString('es-CO')}`, '100%'],
    ];

    const wsRevenue = XLSX.utils.aoa_to_sheet(revenueTypeData);
    wsRevenue['!cols'] = [{ wch: 30 }, { wch: 15 }, { wch: 20 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, wsRevenue, '💰 Revenue');

    // Sheet 5: Historial de Reservaciones
    const reservationsData = [
      ['📜 HISTORIAL DE RESERVACIONES'],
      [`Generado: ${new Date().toLocaleDateString('es-CO')}`],
      [],
      ['Huésped', 'Documento', 'Teléfono', 'Email', 'Habitación', 'Check-in', 'Check-out', 'Noches', 'Tarifa', 'Total'],
      ...completedStays.map(h => [
        h.huesped || '-',
        h.documento || '-',
        h.telefono || '-',
        h.email || '-',
        h.numero || '-',
        h.checkIn ? formatDate(h.checkIn) : '-',
        h.checkOut ? formatDate(h.checkOut) : '-',
        h.noches || 1,
        h.tarifa ? `$${h.tarifa.toLocaleString('es-CO')}` : '-',
        h.tarifa && h.noches ? `$${(h.tarifa * h.noches).toLocaleString('es-CO')}` : '-',
      ]),
    ];

    const wsHistory = XLSX.utils.aoa_to_sheet(reservationsData);
    wsHistory['!cols'] = [
      { wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 30 },
      { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 10 }, { wch: 15 }, { wch: 15 }
    ];
    XLSX.utils.book_append_sheet(wb, wsHistory, '📜 Historial');

    // Sheet 6: Servicios/Consumos
    const servicesByRoom = {};
    historyArray.filter(h => h.consumos && Array.isArray(h.consumos)).forEach(h => {
      h.consumos.forEach(c => {
        const key = h.numero || 'Unknown';
        if (!servicesByRoom[key]) servicesByRoom[key] = { room: key, huesped: h.huesped, servicios: [] };
        servicesByRoom[key].servicios.push(c);
      });
    });

    const serviciosData = [
      ['🍽️ REGISTRO DE SERVICIOS/CONSUMOS'],
      [`Generado: ${new Date().toLocaleDateString('es-CO')}`],
      [],
      ['Habitación', 'Huésped', 'Categoría', 'Descripción', 'Precio'],
      ...Object.values(servicesByRoom).flatMap(item =>
        item.servicios.map(s => [
          item.room,
          item.huesped || '-',
          s.categoria || '-',
          s.descripcion || '-',
          s.precio ? `$${s.precio.toLocaleString('es-CO')}` : '-',
        ])
      ),
    ];

    const wsServices = XLSX.utils.aoa_to_sheet(serviciosData);
    wsServices['!cols'] = [
      { wch: 12 }, { wch: 25 }, { wch: 15 }, { wch: 35 }, { wch: 15 }
    ];
    XLSX.utils.book_append_sheet(wb, wsServices, '🍽️ Servicios');

    // Generate Excel
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const fileName = `EcoBosque_Reporte_Contable_${new Date().toISOString().split('T')[0]}.xlsx`;
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
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