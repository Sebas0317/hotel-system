import { describe, it, expect } from 'vitest';
import { generateId, generateReservationId } from '../src/utils/idGenerator.js';
import { generarPin } from '../src/utils/pinGenerator.js';
import { calcularCheckout } from '../src/utils/checkoutCalc.js';

describe('generateId', () => {
  it('returns a string', () => {
    expect(typeof generateId()).toBe('string');
  });

  it('returns IDs with timestamp-random format', () => {
    const id = generateId();
    expect(id).toMatch(/^\d+-[0-9a-f]{6}$/);
  });

  it('returns unique IDs on successive calls', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateId()));
    expect(ids.size).toBe(100);
  });
});

describe('generateReservationId', () => {
  it('returns a string in RES-YYYYMM-XXXXXX format', () => {
    const id = generateReservationId();
    expect(id).toMatch(/^RES-\d{6}-[0-9A-F]{6}$/);
  });

  it('uses current year and month', () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const id = generateReservationId();
    expect(id).toContain(`RES-${year}${month}-`);
  });
});

describe('generarPin', () => {
  it('returns a 6-digit string', () => {
    const pin = generarPin();
    expect(pin).toMatch(/^\d{6}$/);
  });

  it('returns different values on successive calls', () => {
    const pins = new Set(Array.from({ length: 50 }, () => generarPin()));
    expect(pins.size).toBe(50);
  });
});

describe('calcularCheckout', () => {
  const tarifas = {
    'Suite Bosque': { precio: 350000, incluyeDesayuno: true },
    'Habitacion Doble': { precio: 200000, incluyeDesayuno: false },
  };

  it('calculates 1 night with 19% IVA', () => {
    const result = calcularCheckout({ roomTipo: 'Suite Bosque', tarifas });
    expect(result.tarifaNoche).toBe(350000);
    expect(result.noches).toBe(1);
    expect(result.cargoHabitacion).toBe(350000);
    expect(result.totalConsumos).toBe(0);
    expect(result.subtotal).toBe(350000);
    expect(result.iva).toBe(0);
    expect(result.total).toBe(350000);
    expect(result.incluyeDesayuno).toBe(true);
  });

  it('includes consumos in total', () => {
    const consumos = [{ precio: 50000 }, { precio: 15000 }];
    const result = calcularCheckout({
      roomTipo: 'Habitacion Doble',
      tarifas,
      consumos,
    });
    expect(result.tarifaNoche).toBe(200000);
    expect(result.cargoHabitacion).toBe(200000);
    expect(result.totalConsumos).toBe(65000);
    expect(result.subtotal).toBe(265000);
    expect(result.iva).toBe(12350);
    expect(result.total).toBe(277350);
    expect(result.incluyeDesayuno).toBe(false);
  });
});
