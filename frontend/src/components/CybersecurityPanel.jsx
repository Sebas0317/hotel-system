import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, ShieldCheck, Fingerprint, KeyRound, Lock,
  Gauge, Eye, Swords, UserCheck, UserX, AlertTriangle,
  Search, Clock, FileJson, Server, Terminal, FileText,
  ChevronRight, FileCode, ExternalLink, Route,
} from 'lucide-react';

const SECTIONS = [
  {
    id: 'recaptcha',
    icon: ShieldCheck,
    title: 'Google reCAPTCHA v2',
    scope: 'POST /auth/login • /auth/register • /rooms/access',
    explanation: 'Verifica que las solicitudes provengan de humanos reales mediante el widget "No soy un robot" de Google, protegiendo login, registro y acceso a habitaciones.',
    code: `// backend/src/middleware/recaptcha.js
const result = await verifyRecaptcha(token);
if (!result.success)
  return res.status(403).json(
    { error: 'Verificacion de seguridad fallida' }
  );`,
    benefit: 'Bloquea bots y ataques automatizados antes de que lleguen a la logica de autenticacion.',
  },
  {
    id: '2fa',
    icon: Fingerprint,
    title: 'Autenticacion 2FA por Correo',
    scope: 'POST /auth/login (si 2FA habilitado)',
    explanation: 'Segundo factor de autenticacion via codigo de 6 digitos enviado al correo electronico del administrador, con expiracion de 5 minutos.',
    code: `// backend/src/controllers/authController.js
if (user.twoFactorEnabled) {
  const { plainCode } = await codeStore
    .createCode({ userId: user.id, type: '2fa' });
  await emailService.send2FACode(
    user.email, plainCode
  );
  return res.json({ requires2FA: true });
}`,
    benefit: 'Protege cuentas administrativas incluso si la contrasena es comprometida.',
  },
  {
    id: 'rate-limit',
    icon: Gauge,
    title: 'Limitador de Peticiones por Capas',
    scope: 'Global • auth • login • PIN • 2FA • recovery',
    explanation: 'Limita solicitudes por IP con 8 niveles distintos: global (100/min), auth (10/min), login (5/2min), PIN (5/min), codigo 2FA (5/2min) y recuperacion (3/2min).',
    code: `// backend/src/middleware/rateLimiters.js
const loginLimiter = rateLimit({
  windowMs: 120 * 1000, max: 5,
  message: { error: 'Demasiados intentos. Espera 2 minutos.' }
});
const pinRateLimiter = rateLimit({
  windowMs: 60 * 1000, max: 5,
  message: { error: 'Demasiados intentos de PIN.' }
});`,
    benefit: 'Previene fuerza bruta, enumeracion de usuarios y ataques DoS.',
  },
  {
    id: 'headers',
    icon: Shield,
    title: 'Headers de Seguridad (Helmet)',
    scope: 'Todo el sistema',
    explanation: 'Configura estrictos encabezados HTTP: CSP limita origenes de scripts, HSTS forza HTTPS por 1 ano, X-Frame-Options bloquea iframes, y XSS-Protection activa.',
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
    benefit: 'Mitiga XSS, clickjacking, MIME sniffing y asegura comunicacion cifrada.',
  },
  {
    id: 'password',
    icon: Lock,
    title: 'Hash de Contrasenas (bcrypt)',
    scope: 'Sistema de autenticacion',
    explanation: 'Almacena contrasenas con bcrypt a 12 rondas de sal, haciendo que cada hash sea unico y computacionalmente costoso de crackear.',
    code: `// backend/src/data/userStore.js
const passwordHash = await bcrypt
  .hash(password, 12);

const valid = await bcrypt
  .compare(password, user.passwordHash);`,
    benefit: 'Protege las credenciales incluso si la base de datos es comprometida.',
  },
  {
    id: 'jwt',
    icon: KeyRound,
    title: 'Tokens JWT con Algoritmo Seguro',
    scope: 'Todas las rutas protegidas',
    explanation: 'Autenticacion sin estado mediante tokens JWT firmados con HS256, expiracion configurable (8h por defecto) y validacion de estructura en cada peticion protegida.',
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
    benefit: 'Evita falsificacion de sesion y permite verificar identidad sin estado compartido.',
  },
  {
    id: 'pin-access',
    icon: UserCheck,
    title: 'Control de Acceso por PIN',
    scope: 'POST /rooms/access',
    explanation: 'Acceso a habitaciones mediante PIN de 4 digitos generado con crypto.randomFillSync, con token JWT firmado de 2 horas y rate limiting por IP.',
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
    benefit: 'Restringe acceso a datos de habitacion solo a huespedes autorizados con credencial temporal.',
  },
  {
    id: 'audit',
    icon: FileText,
    title: 'Auditoria de Seguridad',
    scope: 'Acciones sensibles (login, check-in, consumos)',
    explanation: 'Todas las acciones sensibles (login, check-in, cambios de estado, 2FA) se registran con metadatos: usuario, IP, accion y timestamp, almacenados en archivo seguro.',
    code: `// backend/src/utils/auditor.js
auditor.login(userId, ip, email);
auditor.failedLogin(ip, identifier);
auditor.checkIn(userId, ip, room, guest);
auditor.roomStatusChanged(userId, ip, num, from, to);
auditor.consumoCreated(userId, ip, num, desc, precio);`,
    benefit: 'Proporciona trazabilidad completa para detectar y responder a incidentes de seguridad.',
  },
  {
    id: 'lockout',
    icon: UserX,
    title: 'Bloqueo por Intentos Fallidos',
    scope: 'POST /auth/login • /2fa • /recovery',
    explanation: 'Implementa bloqueo progresivo: 5 fallos en login/2FA = bloqueo 15 min, 3 fallos en recuperacion = bloqueo 30 min. Ventana deslizante de 10 min.',
    code: `// backend/src/utils/securityTracker.js
const DEFAULTS = {
  login: { maxAttempts: 5, lockoutMs: 900000 },
  '2fa': { maxAttempts: 5, lockoutMs: 900000 },
  recovery: { maxAttempts: 3, lockoutMs: 1800000 },
};

if (entry.count >= actionCfg.maxAttempts)
  entry.lockUntil = now() + actionCfg.lockoutMs;`,
    benefit: 'Previene ataques de fuerza bruta bloqueando temporalmente la cuenta del atacante.',
  },
  {
    id: 'sanitize',
    icon: Search,
    title: 'Sanitizacion de Entradas (XSS)',
    scope: 'Todas las rutas POST / PUT / PATCH',
    explanation: 'Middleware que codifica caracteres HTML peligrosos (& < > " \') en todos los campos del body antes de que cualquier ruta los procese.',
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
    benefit: 'Elimina ataques XSS almacenados y reflejados en formularios y entradas de usuario.',
  },
  {
    id: 'timeout',
    icon: Clock,
    title: 'Timeout de Peticiones',
    scope: 'Todo el sistema',
    explanation: 'Las solicitudes HTTP que excedan 30 segundos son abortadas automaticamente, liberando recursos del servidor y previniendo agotamiento de conexiones.',
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
    benefit: 'Protege contra Slowloris y agotamiento de conexiones por solicitudes lentas.',
  },
  {
    id: 'pathtravel',
    icon: FileJson,
    title: 'Proteccion contra Path Traversal',
    scope: 'Capas de datos + archivos estaticos',
    explanation: 'Bloquea accesos a archivos sensibles (.env, .git, .json, .pem, .key) y previene navegacion de directorios con ../ en URLs y en operaciones de archivo internas.',
    code: `// backend/src/data/jsonStore.js
function validatePath(filePath) {
  const resolved = path.resolve(filePath);
  if (!resolved.startsWith(DATA_DIR))
    throw new Error('Path traversal detected');
  return resolved;
}

// backend/src/middleware/blockSensitiveFiles.js
const SENSITIVE_PATTERNS = [
  /\.env/, /\.git/, /\\.json$/i,
];`,
    benefit: 'Impide la lectura o escritura de archivos fuera del directorio permitido.',
  },
  {
    id: 'cors',
    icon: Server,
    title: 'CORS Restringido',
    scope: 'Todo el sistema',
    explanation: 'Solo origenes explicitamente configurados (localhost:5173, localhost:4173, dominios *.vercel.app) pueden consumir la API, con metodos HTTP limitados.',
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
    benefit: 'Evita que sitios externos no autorizados realicen peticiones a la API.',
  },
  {
    id: 'redact',
    icon: Eye,
    title: 'Redaccion de Datos Sensibles (PII)',
    scope: 'Todo el sistema (logger)',
    explanation: 'Pino logger redacta automaticamente passwords, tokens, PINs, cookies y headers de autorizacion en todos los logs, reemplazandolos con "**REDACTED**".',
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
    benefit: 'Previene la exposicion de informacion sensible en archivos de log.',
  },
  {
    id: 'filelock',
    icon: Terminal,
    title: 'Bloqueo de Archivos (Race Condition)',
    scope: 'Capas de datos (jsonStore)',
    explanation: 'Implementa cola de promesas por archivo que serializa las escrituras, evitando condiciones de carrera en operaciones concurrentes sobre JSON.',
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
    benefit: 'Garantiza integridad de datos en escrituras concurrentes sin necesidad de base de datos.',
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
            {/* Solid background */}
            <div className="absolute inset-0 bg-emerald-950/95 backdrop-blur-lg border-l border-emerald-500/20 shadow-2xl shadow-emerald-900/40" />

            {/* Content */}
            <div className="relative h-full flex flex-col">
              {/* Header */}
              <div className="shrink-0 p-6 pb-4 border-b border-emerald-500/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                      <Swords className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-white">Ciberseguridad</h2>
                      <p className="text-xs text-emerald-300/70">{SECTIONS.length} medidas implementadas</p>
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

              {/* Sections list */}
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
                      {/* Section header (clickable) */}
                      <button
                        onClick={() => setExpanded(isExpanded ? null : section.id)}
                        className="w-full flex items-center gap-3 p-4 text-left hover:bg-emerald-500/5 transition-colors cursor-pointer border-none"
                      >
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                          <Icon className="w-4 h-4 text-emerald-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="block text-sm font-semibold text-white/90 truncate">{section.title}</span>
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

                      {/* Expandable content */}
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
                              <p className="text-xs text-emerald-200/80 leading-relaxed">{section.explanation}</p>
                              <div className="relative rounded-lg bg-black/40 p-3">
                                <div className="absolute top-0 left-0 w-px h-full bg-emerald-500/20" />
                                <pre className="text-[11px] leading-relaxed text-emerald-300/90 font-mono whitespace-pre-wrap overflow-x-auto">
                                  {section.code}
                                </pre>
                              </div>
                              <div className="flex items-start gap-2 pt-1">
                                <Shield className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                                <p className="text-[11px] text-emerald-300/60 leading-relaxed">{section.benefit}</p>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </div>

              {/* Footer */}
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
