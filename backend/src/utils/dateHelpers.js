const { format, formatDistanceToNow, parseISO, differenceInDays, addDays, startOfDay, endOfDay, isAfter, isBefore, isValid } = require('date-fns');
const { es } = require('date-fns/locale');

function formatDate(date, formatStr = 'PP') {
  const d = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(d)) return '';
  return format(d, formatStr, { locale: es });
}

function formatDateTime(date) {
  return formatDate(date, 'PPp');
}

function formatShortDate(date) {
  return formatDate(date, 'P');
}

function timeAgo(date) {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return formatDistanceToNow(d, { addSuffix: true, locale: es });
}

function nightsBetween(checkIn, checkOut) {
  const start = typeof checkIn === 'string' ? parseISO(checkIn) : checkIn;
  const end = typeof checkOut === 'string' ? parseISO(checkOut) : checkOut;
  return differenceInDays(end, start);
}

function addDaysToDate(date, days) {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return addDays(d, days);
}

function isDateAfter(date1, date2) {
  const d1 = typeof date1 === 'string' ? parseISO(date1) : date1;
  const d2 = typeof date2 === 'string' ? parseISO(date2) : date2;
  return isAfter(d1, d2);
}

function isDateBefore(date1, date2) {
  const d1 = typeof date1 === 'string' ? parseISO(date1) : date1;
  const d2 = typeof date2 === 'string' ? parseISO(date2) : date2;
  return isBefore(d1, d2);
}

function startOfDayFn(date) {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return startOfDay(d);
}

function endOfDayFn(date) {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return endOfDay(d);
}

module.exports = {
  formatDate,
  formatDateTime,
  formatShortDate,
  timeAgo,
  nightsBetween,
  addDaysToDate,
  isDateAfter,
  isDateBefore,
  startOfDayFn,
  endOfDayFn,
  parseISO,
  format,
  differenceInDays,
  addDays,
  isValid
};