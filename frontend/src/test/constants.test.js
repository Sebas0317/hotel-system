import { describe, expect, it } from 'vitest';
import {
  CATEGORIAS_CONSUMO,
  ESTADO_CFG,
  METODOS_PAGO,
  PRODUCTOS,
} from '../constants/index';

describe('PRODUCTOS', () => {
  it('has three categories', () => {
    expect(Object.keys(PRODUCTOS)).toEqual(['restaurante', 'bar', 'servicios']);
  });

  it('all restaurant products have nombre and precio', () => {
    PRODUCTOS.restaurante.forEach((p) => {
      expect(p).toHaveProperty('nombre');
      expect(p).toHaveProperty('precio');
      expect(typeof p.precio).toBe('number');
      expect(p.precio).toBeGreaterThan(0);
    });
  });

  it('all bar products have positive prices', () => {
    PRODUCTOS.bar.forEach((p) => {
      expect(p.precio).toBeGreaterThan(0);
    });
  });

  it('all servicios products have positive prices', () => {
    PRODUCTOS.servicios.forEach((p) => {
      expect(p.precio).toBeGreaterThan(0);
    });
  });
});

describe('ESTADO_CFG', () => {
  it('has all required states', () => {
    const states = [
      'disponible',
      'reservada',
      'ocupada',
      'limpieza',
      'mantenimiento',
      'fuera_servicio',
    ];
    states.forEach((s) => {
      expect(ESTADO_CFG[s]).toBeDefined();
      expect(ESTADO_CFG[s]).toHaveProperty('label');
      expect(ESTADO_CFG[s]).toHaveProperty('color');
      expect(ESTADO_CFG[s]).toHaveProperty('bg');
      expect(ESTADO_CFG[s]).toHaveProperty('dot');
    });
  });
});

describe('METODOS_PAGO', () => {
  it('has three payment methods', () => {
    expect(METODOS_PAGO).toHaveLength(3);
    const keys = METODOS_PAGO.map((m) => m.key);
    expect(keys).toContain('efectivo');
    expect(keys).toContain('tarjeta');
    expect(keys).toContain('transferencia');
  });
});

describe('CATEGORIAS_CONSUMO', () => {
  it('has three categories', () => {
    expect(CATEGORIAS_CONSUMO).toHaveLength(3);
    const keys = CATEGORIAS_CONSUMO.map((c) => c.key);
    expect(keys).toContain('restaurante');
    expect(keys).toContain('bar');
    expect(keys).toContain('servicios');
  });
});
