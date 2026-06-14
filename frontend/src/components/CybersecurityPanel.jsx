import { AnimatePresence, motion } from 'framer-motion';
import {
  ChevronRight,
  Clock,
  Eye,
  FileJson,
  FileText,
  Fingerprint,
  Gauge,
  KeyRound,
  Lock,
  Route,
  Search,
  Server,
  Shield,
  ShieldCheck,
  Swords,
  Terminal,
  UserCheck,
  UserX,
} from 'lucide-react';
import { useState } from 'react';

const SECTIONS = [
  {
    id: 'recaptcha',
    icon: ShieldCheck,
    title: 'Google reCAPTCHA v2',
    scope: 'POST /auth/login • /auth/register • /rooms/access',
    explanation:
      'reCAPTCHA es un mecanismo de seguridad que permite diferenciar entre usuarios humanos y programas automatizados (bots). Antes de permitir el inicio de sesion, registro o acceso a habitaciones, el sistema solicita una validacion mediante el servicio de Google reCAPTCHA.',
    code: `// backend/src/middleware/recaptcha.js
const result = await verifyRecaptcha(token);
if (!result.success)
  return res.status(403).json(
    { error: 'Verificacion de seguridad fallida' }
  );`,
    benefit:
      'Reduce ataques automatizados, intentos masivos de acceso y abuso de formularios publicos.',
  },
  {
    id: '2fa',
    icon: Fingerprint,
    title: 'Autenticacion de Doble Factor (2FA)',
    scope: 'POST /auth/login',
    explanation:
      'La autenticacion de doble factor agrega una segunda capa de seguridad ademas de la contrasena tradicional. Cuando un administrador inicia sesion, el sistema genera un codigo temporal de 6 digitos que es enviado a su correo electronico y debe ser validado antes de conceder acceso.',
    code: `// backend/src/controllers/authController.js
if (user.twoFactorEnabled) {
  const { plainCode } = await codeStore
    .createCode({ userId: user.id, type: '2fa' });
  await emailService.send2FACode(
    user.email, plainCode
  );
  return res.json({ requires2FA: true });
}`,
    benefit:
      'Protege las cuentas administrativas incluso si un atacante obtiene la contrasena principal.',
  },
  {
    id: 'rate-limit',
    icon: Gauge,
    title: 'Limitacion de Peticiones (Rate Limiting)',
    scope: 'Global • auth • login • PIN • 2FA • recovery',
    explanation:
      'Es una tecnica que restringe la cantidad de solicitudes que un usuario puede realizar en un determinado tiempo. El sistema aplica diferentes limites segun la sensibilidad de cada operacion, como login, recuperacion de contrasena y validacion de codigos.',
    code: `// backend/src/middleware/rateLimiters.js
const loginLimiter = rateLimit({
  windowMs: 120 * 1000, max: 5,
  message: { error: 'Demasiados intentos. Espera 2 minutos.' }
});
const pinRateLimiter = rateLimit({
  windowMs: 60 * 1000, max: 5,
  message: { error: 'Demasiados intentos de PIN.' }
});`,
    benefit:
      'Mitiga ataques de fuerza bruta, automatizacion maliciosa y saturacion de servicios.',
  },
  {
    id: 'headers',
    icon: Shield,
    title: 'Encabezados de Seguridad HTTP (Helmet)',
    scope: 'Todo el sistema',
    explanation:
      'Los Security Headers son configuraciones enviadas por el servidor para indicar al navegador como debe proteger la aplicacion. Se utilizan politicas de seguridad mediante Helmet para restringir scripts, iframes, contenido inseguro y otros comportamientos potencialmente peligrosos.',
    code: `// backend/server.js
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      scriptSrc: ["'self'", 'https://www.google.com'],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  hsts: { maxAge: 31536000, preload: true },
  xssFilter: true,
}));`,
    benefit:
      'Ayuda a prevenir ataques como XSS, Clickjacking y manipulacion de contenido web.',
  },
  {
    id: 'password',
    icon: Lock,
    title: 'Proteccion de Contrasenas con bcrypt',
    scope: 'Sistema de autenticacion',
    explanation:
      'bcrypt es un algoritmo criptografico disenado especificamente para proteger contrasenas. Las contrasenas nunca se almacenan directamente. Antes de guardarlas son transformadas mediante hashing y sal criptografica.',
    code: `// backend/src/data/userStore.js
const passwordHash = await bcrypt
  .hash(password, 12);

const valid = await bcrypt
  .compare(password, user.passwordHash);`,
    benefit:
      'Si la base de datos es comprometida, las contrasenas reales de los usuarios no quedan expuestas.',
  },
  {
    id: 'jwt',
    icon: KeyRound,
    title: 'Autenticacion mediante JWT',
    scope: 'Todas las rutas protegidas',
    explanation:
      'JWT (JSON Web Token) es un estandar utilizado para identificar usuarios autenticados sin almacenar sesiones en el servidor. Despues de iniciar sesion correctamente, el sistema genera un token firmado digitalmente que se valida en cada peticion protegida.',
    code: `// backend/src/middleware/auth.js
function requireAuth(req, res, next) {
  const token = header.slice(7);
  const decoded = jwt.verify(
    token, process.env.JWT_SECRET,
    { algorithms: ['HS256'] }
  );
  req.user = decoded;
  next();
}`,
    benefit:
      'Evita la falsificacion de identidad y garantiza que unicamente usuarios autenticados accedan a recursos privados.',
  },
  {
    id: 'pin-access',
    icon: UserCheck,
    title: 'Control de Acceso por PIN de Habitacion',
    scope: 'POST /rooms/access',
    explanation:
      'Es un mecanismo de autenticacion especifico para huespedes basado en credenciales temporales. Durante el check-in se genera un PIN asociado a la habitacion. Solo quienes posean dicho PIN pueden consultar informacion relacionada con su estancia.',
    code: `// backend/src/utils/pinGenerator.js
function generarPin() {
  const array = new Uint32Array(1);
  crypto.randomFillSync(array);
  return (1000 + (array[0] % 9000)).toString();
}

// backend/src/middleware/roomAccess.js
const roomToken = jwt.sign(
  { roomId, type: 'room' },
  JWT_SECRET, { expiresIn: '2h' }
);`,
    benefit:
      'Protege la informacion de reservas, consumos y servicios frente a accesos no autorizados.',
  },
  {
    id: 'audit',
    icon: FileText,
    title: 'Auditoria y Registro de Eventos',
    scope: 'Login • Check-in • Check-out • Consumos • 2FA',
    explanation:
      'La auditoria consiste en registrar acciones importantes para mantener trazabilidad dentro del sistema. Se almacenan eventos relevantes incluyendo usuario, fecha, direccion IP y accion ejecutada.',
    code: `// backend/src/utils/auditor.js
auditor.login(userId, ip, email);
auditor.failedLogin(ip, identifier);
auditor.checkIn(userId, ip, room, guest);
auditor.roomStatusChanged(userId, ip, num, from, to);
auditor.consumoCreated(userId, ip, num, desc, precio);`,
    benefit:
      'Permite detectar actividades sospechosas, reconstruir incidentes y mejorar el control administrativo.',
  },
  {
    id: 'lockout',
    icon: UserX,
    title: 'Bloqueo por Intentos Fallidos',
    scope: 'POST /auth/login • /2fa • /recovery',
    explanation:
      'Es una medida defensiva contra ataques de fuerza bruta. Cuando se supera una cantidad determinada de intentos incorrectos, la cuenta o proceso queda temporalmente bloqueado.',
    code: `// backend/src/utils/securityTracker.js
const DEFAULTS = {
  login: { maxAttempts: 5, lockoutMs: 900000 },
  '2fa': { maxAttempts: 5, lockoutMs: 900000 },
  recovery: { maxAttempts: 3, lockoutMs: 1800000 },
};

if (entry.count >= actionCfg.maxAttempts)
  entry.lockUntil = now() + actionCfg.lockoutMs;`,
    benefit:
      'Dificulta significativamente la adivinacion de contrasenas y codigos de verificacion.',
  },
  {
    id: 'sanitize',
    icon: Search,
    title: 'Sanitizacion de Entradas (Proteccion XSS)',
    scope: 'Todas las rutas POST • PUT • PATCH',
    explanation:
      'La sanitizacion consiste en limpiar datos ingresados por los usuarios antes de procesarlos o almacenarlos. El sistema filtra caracteres y estructuras potencialmente peligrosas que podrian ejecutar codigo malicioso.',
    code: `// backend/src/middleware/sanitize.js
function sanitizeString(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .trim();
}`,
    benefit:
      'Previene ataques Cross-Site Scripting (XSS), una de las vulnerabilidades web mas comunes.',
  },
  {
    id: 'timeout',
    icon: Clock,
    title: 'Timeout de Solicitudes',
    scope: 'Todo el sistema',
    explanation:
      'Consiste en establecer un tiempo maximo para que una peticion permanezca activa. Las solicitudes excesivamente largas son canceladas automaticamente por el servidor.',
    code: `// backend/src/middleware/requestTimeout.js
function requestTimeout(timeoutMs) {
  return (req, res, next) => {
    const timer = setTimeout(() => {
      res.status(408).json(
        { error: 'Request timeout. La solicitud tardo demasiado.' }
      );
    }, timeoutMs);
    res.on('finish', () => clearTimeout(timer));
    next();
  };
}`,
    benefit:
      'Reduce riesgos de agotamiento de recursos y ataques basados en conexiones lentas.',
  },
  {
    id: 'pathtravel',
    icon: FileJson,
    title: 'Proteccion contra Path Traversal',
    scope: 'Sistema de archivos y almacenamiento',
    explanation:
      'Path Traversal es una vulnerabilidad que intenta acceder a archivos fuera de los directorios permitidos. El sistema bloquea rutas sospechosas y restringe el acceso a archivos sensibles del servidor.',
    code: `// backend/src/data/jsonStore.js
function validatePath(filePath) {
  const resolved = path.resolve(filePath);
  if (!resolved.startsWith(DATA_DIR))
    throw new Error('Path traversal detected');
  return resolved;
}

// backend/src/middleware/blockSensitiveFiles.js
const SENSITIVE_PATTERNS = [
  /.env/, /.git/, /\\.json$/i,
];`,
    benefit:
      'Evita la exposicion de configuraciones internas, credenciales y archivos criticos.',
  },
  {
    id: 'cors',
    icon: Server,
    title: 'Politica de CORS Restringida',
    scope: 'Todo el sistema',
    explanation:
      'CORS controla que sitios web pueden comunicarse con la API. Solo dominios previamente autorizados pueden realizar solicitudes al backend.',
    code: `// backend/server.js
app.use(cors({
  origin: function (origin, callback) {
    if (allowedOrigins.indexOf(origin) !== -1)
      callback(null, true);
    else if (origin.endsWith('.vercel.app'))
      callback(null, true);
    else
      callback(new Error('Not allowed'));
  },
  methods: ['GET', 'POST', 'PATCH', 'PUT'],
  credentials: true,
}));`,
    benefit:
      'Reduce el riesgo de consumo no autorizado de la API desde sitios externos.',
  },
  {
    id: 'redact',
    icon: Eye,
    title: 'Proteccion de Datos Sensibles en Logs',
    scope: 'Sistema de registro y monitoreo',
    explanation:
      'Consiste en evitar que informacion critica aparezca en registros del sistema. Contrasenas, tokens, PINs y credenciales son ocultados automaticamente antes de almacenarse en logs.',
    code: `// backend/src/utils/logger.js
redact: {
  paths: [
    'req.headers.authorization',
    'req.body.password',
    'req.body.token',
    '*.pin',
    '*.password',
  ],
  censor: '**REDACTED**',
}`,
    benefit:
      'Impide la filtracion accidental de informacion sensible durante tareas de monitoreo y soporte.',
  },
  {
    id: 'filelock',
    icon: Terminal,
    title: 'Proteccion contra Condiciones de Carrera',
    scope: 'Persistencia de datos',
    explanation:
      'Las condiciones de carrera ocurren cuando multiples procesos intentan modificar el mismo recurso al mismo tiempo. El sistema serializa operaciones de escritura para evitar conflictos y corruption de datos.',
    code: `// backend/src/data/jsonStore.js
const writeQueues = new Map();

async function enqueueTask(filePath, task) {
  if (!writeQueues.has(filePath))
    writeQueues.set(filePath, Promise.resolve());
  const prev = writeQueues.get(filePath);
  const next = prev.then(task);
  writeQueues.set(filePath, next);
  return next;
}`,
    benefit:
      'Garantiza la integridad de la informacion de reservas, habitaciones y operaciones concurrentes.',
  },
];

export default function CybersecurityPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [expanded, setExpanded] = useState(null);

  const toggle = () => {
    setIsOpen(!isOpen);
    if (isOpen) setExpanded(null);
  };

  return (
    <>
      {/* Page overlay when panel is open */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm cursor-pointer"
            onClick={toggle}
          />
        )}
      </AnimatePresence>

      {/* Toggle button */}
      <motion.button
        onClick={toggle}
        className="fixed right-0 top-1/3 z-50 flex items-center gap-2 px-3 py-3 rounded-l-xl bg-gradient-to-r from-emerald-700 to-emerald-600 border border-emerald-500/30 border-r-0 text-white shadow-lg shadow-emerald-900/50 hover:from-emerald-600 hover:to-emerald-500 transition-all duration-300 cursor-pointer"
        whileHover={{ x: -4 }}
        whileTap={{ scale: 0.97 }}
        title="Panel de Ciberseguridad"
      >
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.3 }}
        >
          <ChevronRight className="w-5 h-5" />
        </motion.div>
        {!isOpen && (
          <motion.span
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 'auto' }}
            className="text-xs font-semibold whitespace-nowrap overflow-hidden"
          >
            Ciberseguridad
          </motion.span>
        )}
      </motion.button>

      {/* Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, x: 400 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 400 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed right-0 top-0 h-full z-40 w-[420px] max-w-[90vw] overflow-hidden"
          >
            <div className="absolute inset-0 bg-emerald-950/95 backdrop-blur-lg border-l border-emerald-500/20 shadow-2xl shadow-emerald-900/40" />

            <div className="relative h-full flex flex-col">
              <div className="shrink-0 p-6 pb-4 border-b border-emerald-500/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                      <Swords className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-white">
                        Ciberseguridad
                      </h2>
                      <p className="text-xs text-emerald-300/70">
                        {SECTIONS.length} medidas implementadas
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={toggle}
                    className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition-all cursor-pointer border-none"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-thin scrollbar-thumb-emerald-500/20 scrollbar-track-transparent">
                {SECTIONS.map((section) => {
                  const Icon = section.icon;
                  const isExpanded = expanded === section.id;

                  return (
                    <motion.div
                      key={section.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-xl border border-emerald-500/10 bg-emerald-950/80 overflow-hidden"
                    >
                      <button
                        onClick={() =>
                          setExpanded(isExpanded ? null : section.id)
                        }
                        className="w-full flex items-center gap-3 p-4 text-left hover:bg-emerald-500/5 transition-colors cursor-pointer border-none"
                      >
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                          <Icon className="w-4 h-4 text-emerald-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="block text-sm font-semibold text-white/90 truncate">
                            {section.title}
                          </span>
                          <span className="inline-flex items-center gap-1 mt-0.5 text-[10px] text-emerald-400/60 font-mono">
                            <Route className="w-2.5 h-2.5" />
                            {section.scope}
                          </span>
                        </div>
                        <motion.div
                          animate={{ rotate: isExpanded ? 90 : 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <ChevronRight className="w-4 h-4 text-white/30 shrink-0" />
                        </motion.div>
                      </button>

                      <AnimatePresence initial={false}>
                        {isExpanded && (
                          <motion.div
                            key="content"
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3, ease: 'easeInOut' }}
                            className="overflow-hidden"
                          >
                            <div className="px-4 pb-4 space-y-3">
                              <p className="text-xs text-emerald-200/80 leading-relaxed">
                                {section.explanation}
                              </p>
                              <div className="relative rounded-lg bg-black/40 p-3">
                                <div className="absolute top-0 left-0 w-px h-full bg-emerald-500/20" />
                                <pre className="text-[11px] leading-relaxed text-emerald-300/90 font-mono whitespace-pre-wrap overflow-x-auto">
                                  {section.code}
                                </pre>
                              </div>
                              <div className="flex items-start gap-2 pt-1">
                                <Shield className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                                <p className="text-[11px] text-emerald-300/60 leading-relaxed">
                                  {section.benefit}
                                </p>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </div>

              <div className="shrink-0 p-4 border-t border-emerald-500/20">
                <p className="text-[10px] text-emerald-400/40 text-center">
                  EcoBosque Hotel System — Sustentacion de Ciberseguridad
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
