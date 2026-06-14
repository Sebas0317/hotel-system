import { describe, expect, it } from 'vitest';
import {
  agruparPorPiso,
  COP,
  calcularTotal,
  FECHA,
  filtrarRooms,
} from '../utils/helpers';

describe('COP', () => {
  it('formats zero', () => {
    expect(COP(0)).toMatch(/0/);
  });

  it('formats positive integer', () => {
    expect(COP(350000)).toContain('350');
  });

  it('handles string input', () => {
    expect(COP('50000')).toContain('50');
  });
});

describe('FECHA', () => {
  it('returns em-dash for falsy input', () => {
    expect(FECHA(null)).toBe('—');
    expect(FECHA(undefined)).toBe('—');
    expect(FECHA('')).toBe('—');
  });

  it('formats a valid ISO date', () => {
    const result = FECHA('2026-06-01T10:00:00Z');
    expect(result).not.toBe('—');
    expect(typeof result).toBe('string');
  });
});

describe('calcularTotal', () => {
  it('sums item prices', () => {
    const items = [{ precio: 10000 }, { precio: 20000 }, { precio: 30000 }];
    expect(calcularTotal(items)).toBe(60000);
  });

  it('returns 0 for empty array', () => {
    expect(calcularTotal([])).toBe(0);
  });

  it('handles items missing precio', () => {
    const items = [{ precio: 5000 }, {}, { precio: 3000 }];
    expect(calcularTotal(items)).toBe(8000);
  });

  it('handles non-array input', () => {
    expect(calcularTotal(null)).toBe(0);
    expect(calcularTotal(undefined)).toBe(0);
  });
});

describe('agruparPorPiso', () => {
  const rooms = [
    { id: '1', numero: '101', piso: 1, tipo: 'Suite' },
    { id: '2', numero: '102', piso: 1, tipo: 'Suite' },
    { id: '3', numero: '201', piso: 2, tipo: 'Doble' },
    { id: '4', numero: 'C1', piso: 0, tipo: 'Cabana' },
  ];

  it('groups rooms by floor', () => {
    const grouped = agruparPorPiso(rooms);
    expect(grouped['1']).toHaveLength(2);
    expect(grouped['2']).toHaveLength(1);
    expect(grouped['0']).toHaveLength(1);
  });

  it('returns empty object for non-array', () => {
    expect(agruparPorPiso(null)).toEqual({});
  });
});

describe('filtrarRooms', () => {
  const rooms = [
    {
      id: '1',
      numero: '101',
      tipo: 'Suite',
      estado: 'disponible',
      huesped: '',
    },
    {
      id: '2',
      numero: '102',
      tipo: 'Suite',
      estado: 'ocupada',
      huesped: 'Juan',
    },
    {
      id: '3',
      numero: '201',
      tipo: 'Doble',
      estado: 'disponible',
      huesped: '',
    },
  ];

  it('returns all when filtro is todos', () => {
    expect(filtrarRooms(rooms, 'todos', '', 'todos')).toHaveLength(3);
  });

  it('filters by status', () => {
    expect(filtrarRooms(rooms, 'ocupada', '', 'todos')).toHaveLength(1);
  });

  it('filters by search term', () => {
    expect(filtrarRooms(rooms, 'todos', 'Juan', 'todos')).toHaveLength(1);
  });

  it('filters by room number', () => {
    expect(filtrarRooms(rooms, 'todos', '101', 'todos')).toHaveLength(1);
  });

  it('filters by type', () => {
    expect(filtrarRooms(rooms, 'todos', '', 'Doble')).toHaveLength(1);
  });

  it('returns empty for no matches', () => {
    expect(filtrarRooms(rooms, 'reservada', '', 'todos')).toHaveLength(0);
  });
});
