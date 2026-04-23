# EcoBosque Hotel - Librerías Recomendadas por Prioridad

## Lista 1: Fundamentales para Hotel (Fechas, Reportes, Backend, UX)

### PRIORIDAD ALTA (Integrar inmediatamente)
| # | Librería | Propósito | Impacto |
|---|----------|-----------|---------|
| 1 | **date-fns** | Fechas check-in/check-out, calcular noches, temporadas | CRÍTICO |
| 2 | **pino** | Logger robusto backend (reemplazar console.log) | CRÍTICO |
| 3 | **SheetJS (xlsx)** | Excel export real (.xlsx) | ALTO |

### PRIORIDAD MEDIA (Próximas 2 semanas)
| # | Librería | Propósito | Impacto |
|---|----------|-----------|---------|
| 4 | **lowdb** | JSON DB más seguro que jsonStore.js | MEDIO |
| 5 | **Lucide React** | Iconos vectoriales profesionales | MEDIO |
| 6 | **react-to-print** | Imprimir facturas/checkout | MEDIO |

### PRIORIDAD BAJA (Futuro)
| # | Librería | Propósito |
|---|----------|-----------|
| 7 | react-day-picker | Calendario disponibilidad visual |
| 8 | re-resizable | Paneles Gantt |
| 9 | Sonner | Toasts más elegantes |
| 10 | Vaul | Drawer para móviles |
| 11 | Playwright | Testing automatizado |
| 12 | Tsup | Empaquetado profesional |

---

## Lista 2: Búsqueda, Impresión, Datos, UI, Docs

### PRIORIDAD ALTA (Integrar inmediatamente)
| # | Librería | Propósito | Impacto |
|---|----------|-----------|---------|
| 1 | **write-file-atomic** | Escritura atómica (evita corrup JSON) | CRÍTICO |
| 2 | **Fuse.js** | Búsqueda difusa ("Rodriguez" → "Rodríguez") | ALTO |
| 3 | **react-to-print** | Imprimir facturas/comprobantes | ALTO |

### PRIORIDAD MEDIA
| # | Librería | Propósito | Impacto |
|---|----------|-----------|---------|
| 4 | Steno | Escrituras seguras en archivos |
| 5 | React Joyride | Tours guiados para empleados |
| 6 | jsPDF | Generar PDFs desde cliente |

### PRIORIDAD BAJA (Futuro)
| # | Librería | Propósito |
|---|----------|-----------|
| 7 | Vis-Timeline | Gantt de ocupación |
| 8 | Swagger-UI-Express | Documentar API |

---

## Consolidado: Orden de Integración

### Fase 1: Fundamentos (Esta semana)
1. date-fns - Fechas hotel
2. pino - Logger backend
3. write-file-atomic - Proteger JSONs
4. SheetJS (ya está)

### Fase 2: Experiencia (Próxima semana)
5. Fuse.js - Búsqueda inteligente
6. react-to-print - Impresión facturas
7. Lucide React - Iconos profesionales

### Fase 3: Estabilidad (Este mes)
8. lowdb - JSON DB mejorado
9. Steno - Escrituras seguras

### Fase 4: Extras (Futuro)
10. react-day-picker - Calendario
11. Sonner - Notificaciones
12. Playwright - Testing
13. Vaul - Drawer móvil
14. Swagger - Docs API
15. Vis-Timeline - Gantt

---

## Notas
- Las librerías ya instaladas: xlsx (SheetJS)
- El sistema actual usa: react-hot-toast, emojis, jsonStore.js básico
- foco actual: corregir bugs del build antes de integrar más cosas