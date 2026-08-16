📡 Ecosystem Due Diligence

SLP Command
Auditoría técnica completa — 3 repos

Executive summary
Mapa del sistema
Estado actual del producto
Auditoría iOS
Auditoría backend
Auditoría Supabase
Reading
Listening
Writing
Speaking Coach
Autenticación
Subscription
Admin
Cloud vs local state
Reuse matrix
Web feasibility
Arquitectura web propuesta
Estructura SLPCommand.com
Estrategia UX/UI
Security audit
Análisis de costes
Estrategia Claude Code
Local vs cloud
Estimación de desarrollo
Top 20 riesgos
Decisiones requeridas
Roadmap
Recomendación final
Scorecard final
Decisión final
SLP Command — Full Ecosystem Audit

¿Aguanta el sistema una web?
Auditoría técnica de los tres repositorios de SLP Command (iOS, backend, web) y estudio de viabilidad de SLPCommand.com, basada en evidencia de código citada — no en suposiciones.

Repos SLPCommand · english-learning-backend · slpcommand-website
Método 6 auditorías paralelas con lectura directa de código + DB en vivo
Fecha 2026-08-15
Cambios de código ninguno
01Executive summary
El backend y la base de datos de SLP Command ya estaban diseñados, sin saberlo explícitamente, para servir a más de un cliente. El CORS del backend ya incluye slpcommand.com como origen permitido. Los modelos de entitlements y progreso en iOS llevan comentarios literales de "este archivo no calcula nada" — la autoridad vive siempre en el backend. El motor de proficiencia tiene un patrón formal LEGACY/SHADOW/COMPARE/V2 para migrar lógica sin romper consumidores. Row Level Security está activado en las 58 tablas de Supabase. Esto no es un sistema que haya que reconstruir para exponerlo a la web: es uno que ya asumía que algún día habría un segundo cliente.

Dicho esto, la auditoría encontró problemas reales, no cosméticos: dos vistas de Supabase con SECURITY DEFINER exponen estado editorial interno a cualquiera con la clave anónima pública (severidad HIGH, arreglo barato con el mismo patrón que ya se usó para un problema idéntico anterior); el prompt de evaluación de Writing mezcla instrucciones y texto del alumno sin separación, abriendo la puerta a manipulación de nota; y la pieza estrella del producto — el Speaking Coach — depende de un SDK oficial de ElevenLabs para iOS cuya paridad de funciones con el SDK de navegador no se puede verificar desde este código, lo cual es el mayor riesgo real del proyecto web.

Conclusión en una frase
El sistema está considerablemente mejor preparado de lo que cabría esperar para un producto de este tamaño construido a este ritmo — pero "mejor preparado" no significa "listo para vender en 3 semanas": ver Decisión final.
02Mapa del sistema
Arquitectura observada, de cliente a infraestructura:

Capa	Qué hace	Tecnología confirmada
iOS	Cliente nativo, MVVM + servicios singleton, todo el estado de negocio se relee del backend	SwiftUI, Swift Concurrency, RevenueCat SDK, ElevenLabs Swift SDK (WebRTC/LiveKit)
Backend	API REST monolítica, autoridad única de negocio/entitlements/proficiencia	Node 18+ / Express, ESM, un único server.js de 16 088 líneas + routes/learningApi.js
Supabase	Postgres 17 con RLS, Auth, Storage; acceso siempre vía service-role desde el backend	58 tablas, 66 migraciones, 7 vistas de integridad, 2 buckets de Storage
Storage	Audio de Listening (público) y de Speaking (privado, URLs firmadas)	Supabase Storage: slp-listening-audios (público), speaking-audios (privado)
AI	Evaluación de Writing/Speaking, generación de contenido offline	OpenAI (gpt-4o-mini + Whisper), server-side únicamente
TTS/STT conversacional	Voz del Speaking Coach en tiempo real	ElevenLabs Conversational AI vía WebRTC (token de conversación, nunca clave cruda)
Billing	Compra nativa iOS → autoridad de plan en backend	StoreKit → RevenueCat → webhook firmado → tabla user_plans
Hosting	Backend en producción	Render (confirmado por RENDER_GIT_COMMIT)
Observabilidad	Errores y trazas	Sentry, con scrubbing de cabeceras/datos sensibles
Los tres repositorios ya se comportan como tres despliegues independientes de un mismo ecosistema, no como un monolito acoplado: iOS y (un futuro) web serían dos clientes intercambiables del mismo backend/DB, exactamente el patrón que hace viable un port web sin reescribir el núcleo.

03Estado actual del producto
Feature	iOS	Backend	DB	Web	Status	Gap principal
Login	✅	✅	✅	—	implemented-functional	Ninguno detectado; sin reset de contraseña visible en iOS
Signup	✅	✅	✅	—	implemented-functional	—
Profile	✅ (fusionado en Settings)	✅	✅	—	implemented-functional	No es pantalla propia en iOS, es un patrón a decidir en web
Home / Dashboard	⚠️ v2 activa, v3 tras feature flag	✅	✅	—	implemented-not-connected (v3)	Home v3 apagada por defecto (fail-closed)
Reading	✅	✅	✅	—	implemented-functional	Ninguno relevante
Listening	✅	✅	✅	—	implemented-functional	Coste de TTS sin instrumentar; un endpoint legacy muerto
Writing	✅	✅	✅ (tablas base no rastreadas en migraciones)	—	implemented-functional	Prompt sin aislamiento instrucción/usuario (ver Security)
Speaking	✅	✅	✅	—	implemented-functional	—
Speaking Coach	✅ (condicionado a SDK)	✅	✅	—	implemented-functional	Capa de audio no portable sin reconstruir en JS
Practice/Exam	✅	✅	✅	—	implemented-functional	—
Academy	✅	✅	✅	—	implemented-functional	—
Intelligence	✅	✅	✅	—	implemented-functional	—
Progress	✅	✅	✅	—	implemented-functional	—
Subscription	✅ (RevenueCat/StoreKit)	✅	✅	—	implemented-functional	Sin equivalente de compra para web
Entitlements	✅ (solo lectura)	✅ (autoridad)	✅	—	implemented-functional	Ninguno; diseño ya plataforma-agnóstico
Admin	—	✅ (4 módulos)	✅	—	implemented-functional (sin UI)	No existe interfaz — hoy es API pura
Analytics	no determinado	no determinado	no determinado	—	no determinado	Ningún agente encontró un sistema de producto-analytics dedicado
Settings	✅	parcial	✅	—	implemented-functional	—
Legal / Privacy	—	—	—	✅	implemented-functional	Sitio estático real, no un esqueleto
04Auditoría iOS
/workspace/slpcommand · branch main · 304 archivos

Arquitectura
MVVM con servicios singleton (Service/*.swift, 46 archivos, todos static let shared). Sin coordinator formal; navegación por NavigationStack más tres routers puros y testeables (LaunchRouter, DeepLinkRouter, HomeRouter). Estado con ObservableObject/@Published + async/await; Combine aparece en solo 3 archivos. Inyección de dependencias real solo en un puñado de ViewModels vía un seam de tests (AnalyticsTracking), no universal.

Auth & sesión
Tokens en Keychain (KeychainStore.swift, entradas userId/email/accessToken/refreshToken bajo el servicio slp.auth) — nunca en UserDefaults. Refresh automático en 401 vía APIClient.refreshHandler; logout hace reset agresivo de todo el estado local (Entitlements, Progress, streaks, widgets) y cierra sesión en RevenueCat. Sin biometría (FaceID/TouchID) en ningún sitio del repo. Flujo de "olvidé mi contraseña": no encontrado — no determinado desde el código disponible.

Networking
Un único APIClient.swift (701 líneas) para toda la app: dos configuraciones de sesión (30s/60s por defecto, 120s/180s para llamadas IA largas), reintento único en GETs idempotentes ante 429/502/503/504, APIError tipado (incluye commercial para 402/403 de entitlements), soporte de X-Idempotency-Key.

Modelos, caché, errores
Mayoría de modelos son DTOs limpios; EntitlementsModels/ProgressModels llevan comentarios explícitos de "esto no calcula nada" — la autoridad es siempre el backend. Ejemplo confirmado de fragilidad de decode: WritingPromptGuidance.init(from:) prueba 4 formas distintas con try? silencioso. Sin CoreData/SwiftData; persistencia local vía Keychain + UserDefaults/@AppStorage (24 archivos). Loading/error/empty es ad hoc por pantalla (14 @Published isLoading: Bool, sin una máquina de estados común), aunque sí hay componentes compartidos por familia de módulo (p. ej. IntelligenceComponents.swift reutilizado en 3 dashboards). Accesibilidad presente pero desigual: accessibilityLabel en 49 de 114 vistas.

Hallazgo — tests no conectados
SLPCommandTests/SLPCommandUITests contienen aserciones reales y no triviales, pero los targets no existen en project.pbxproj — el paso de xcodebuild test está comentado en CI (SETUP.md lo confirma). Ese código nunca se compila ni se ejecuta hoy. CI corre en su lugar un harness propio, SmokeTests.swift (2 507 líneas), no XCTest.
Estado por módulo
Módulo	Status	Evidencia
Home	funcional (v2) / no conectado (v3)	v3 tras home_v3_enabled, fail-closed por defecto
Reading / Listening / Writing / Speaking	funcional	*CloudService.swift con superficie CRUD completa
Speaking Coach	funcional, condicionado a SDK	#if canImport(ElevenLabs); degrada a motor "no configurado" si falta
Academy / Intelligence / Progress	funcional	APIs simétricas por skill, componentes compartidos
Subscription/Entitlements	funcional	RevenueCat solo vende; EntitlementsService es la única fuente de verdad
CI/CD
GitHub Actions: build Debug + smoke tests, build Release sin tests. Xcode Cloud aparte solo para subir dSYMs a Sentry. Sin paso de lint en ningún pipeline.

05Auditoría backend
/workspace/english-learning-backend · Node 18+/Express ESM · server.js: 16 088 líneas, 149 rutas + routes/learningApi.js (10 rutas)

Middleware y auth
Orden: Sentry → CORS (allowlist explícita: dominio Render + slpcommand.com/www.slpcommand.com, métodos solo GET/POST/PATCH) → captura raw-body solo para el webhook del Coach → express.json 20 MB → rate limiter del webhook de RevenueCat → rate limiter general (30 req/60s por IP) → correlation-id.

Tres mecanismos de autorización conviven: requireAuth (verificación real de JWT contra Supabase, con fallback de debug fail-closed que exige dos condiciones no-default), requireAdmin (secreto compartido legacy, comparación !== no constante en tiempo, usado solo en rutas de generación de contenido) y requireAdminUser (JWT real + columna is_admin, usado en ~25 rutas de /api/admin/*). Dos clientes Supabase, ambos con service-role — no existe cliente con clave anónima en ningún punto del backend.

Dominio	Rutas aprox.
Writing	~38
Reading	~24
Listening	~23
Admin	~26
Speaking / Coach	~13
Progress / cross-skill	~10
Learning router (/api/learning)	10
Auth / cuenta	~8
Entitlements / billing	3
Misc	~5
Endpoints clave
Método	Path	Auth	Efecto
POST	/api/speaking/coach/session	user	autoriza sesión, emite token de conversación ElevenLabs
POST	/api/speaking/coach/webhook	HMAC sobre raw body	liquida sesión, evalúa, sin retry garantizado por ElevenLabs
POST	/api/billing/revenuecat/webhook	secreto constant-time	RPC atómica de transición de plan
GET	/api/entitlements	user	única fuente de verdad de plan/quota para el cliente
POST	/api/writing/submit	user + quota	evaluación OpenAI, auto-refund de quota si falla
GET	/api/reading/exam/start y /start-v2	user + quota	dos implementaciones paralelas, comparten contador de quota
Duplicación gestionada, no accidental
El patrón LEGACY/SHADOW/COMPARE/PROFICIENCY_V2 para reading/listening/writing/speaking está bien administrado: falla siempre hacia LEGACY ante configuración desconocida, registra el modo resuelto al arrancar, y garantiza salida byte-idéntica en LEGACY/SHADOW. /api/reading/exam/start-v2 es el reemplazo STANAG-consistente de start, pero a diferencia de otros endpoints deprecados, v1 no lleva ninguna marca de aviso — inconsistencia menor a resolver.
Legacy confirmado: /api/writing/drill-feedback está marcado deprecado y avisa por log; 5 endpoints de writing-intelligence llevan comentario DEPRECATED explícito pero se mantienen vivos a propósito. /api/listening/recommendation es código muerto según el comentario de su propio reemplazo ("nada en la app lo llamaba").

06Auditoría Supabase
Proyecto rlqkxxtfrjcinonbiaee (eu-west-2, Postgres 17.6) — confirmado como la base de datos real de producción por cruce de nombres de migraciones y tablas, y por una URL de Storage hardcodeada en una migración. 58 tablas en public, agrupadas por dominio: Reading, Listening, Writing, Speaking/Coach, Progress/Proficiencia, Entitlements/Billing, Admin/Content-ops.

RLS
Row Level Security activado en las 58 tablas, sin excepción. 14 tablas de datos de usuario confirmadas con política correcta auth.uid() = user_id. 4 tablas de contenido/configuración (feature_flags, listenings, reading_texts, writing_prompts) tienen lectura pública deliberada y documentada — inofensivo. El resto (~40 tablas) tiene RLS activado sin política — denegación por defecto para anon/authenticated, accesible solo vía service-role. Es seguro por construcción porque el backend nunca usa una clave anónima — pero es frágil: depende de que nadie exponga jamás esas tablas por otra vía.

Hallazgo HIGH — vistas SECURITY DEFINER con permisos públicos
listening_publication_state y content_lifecycle_current no tienen security_invoker=true y actualmente conceden SELECT/INSERT/UPDATE/DELETE a anon y authenticated — esto sortea RLS por completo y expone estado editorial interno (calidad, QA, moderación de contenido) a cualquiera con la clave pública anónima. get_advisors lo marca en nivel ERROR. Es exactamente la misma clase de vulnerabilidad que SECURITY-P0-001 ya corrigió para otras dos vistas — pero estas dos no quedaron cubiertas. El patrón de arreglo ya existe en el propio repo.
Medium: las 6 vistas proficiency_integrity_* tienen permisos por defecto excesivos (INSERT/UPDATE/DELETE a anon/authenticated); no explotables hoy porque sus tablas base no tienen política, pero es un riesgo latente si alguna migración futura añade una política permisiva sin revisar estos grants.

Storage
slp-listening-audios: público, URLs sin firmar — elección deliberada y de bajo riesgo para audio pedagógico no sensible. speaking-audios: privado, URLs firmadas de 1 hora — correctamente protegido tratándose de voz de usuarios reales.

Preparación multi-dispositivo
Ninguna tabla tiene columna device_id/push_token; el estado de proficiencia es una fila por (user_id, skill) actualizada transaccionalmente junto a su log de eventos append-only. Un segundo cliente (web) puede leer/escribir las mismas tablas a través de la misma API sin cambios de esquema. No verificado en esta pasada: manejo de escrituras concurrentes desde dos clientes a nivel de ruta (requeriría revisión aparte).

07Reading
Selección de contenido filtrada por nivel objetivo (readingPracticeSelection.js) con fallback explícito si un texto no tiene ítems del nivel correcto. Rotación tipo SRS, una pregunta por encuentro (readingRotation.js). Barajado de opciones determinista con semilla SHA-256 — corrige un sesgo real ya documentado (~96% de respuestas correctas en la opción A). Motor de examen referenciado a STANAG, construcción balanceada por passage. readingTimingSpec.js distingue explícitamente qué es "decisión de producto" y qué es estructura base de STANAG — exactamente la separación que esta auditoría pidió no confundir. validationEngine/reading/ está realmente conectado a la selección en producción, no es solo documentación.

Status: Practice, Exam, Academy e Intelligence — implemented-functional en los cuatro casos, con evidencia de tabla/endpoint/test para cada uno.

08Listening
Generación de audio estrictamente offline/batch vía ElevenLabs TTS (no OpenAI), scripts CLI que requieren ffmpeg local, subida a Supabase Storage con URL pública (confirmado de forma independiente por el equipo de auditoría de Supabase — dos fuentes coinciden). Motor de examen declarativo (listeningExamPolicy.js) documenta un bug real ya corregido: exámenes que exigían 80 min de audio dentro de un límite de 65 min derivado de BILC. listeningOrchestrator.js confirma por su propio comentario que /api/listening/recommendation es código muerto ("nada en la app lo llamaba").

Gap de costes
No existe ningún tracking de coste/uso de ElevenLabs en el backend — aiPricing.js cubre solo OpenAI. Es el mayor punto ciego de coste del proyecto (ver Análisis de costes).
Status: Practice, Exam, Academy e Intelligence — implemented-functional. /api/listening/recommendation — legacy / obsolete.

09Writing
Evaluación con gpt-4o-mini (degradado desde gpt-4.1-mini por coste, decisión registrada explícitamente en logs), un único prompt consolidado que evalúa ensayo y frase a la vez (generateWritingCorrection()) — optimización de coste deliberada. Toda la lógica de calificación vive en el servidor; ningún endpoint expone el criterio de evaluación al cliente.

Nota sobre EMID: aparece únicamente como texto decorativo dentro de los prompts ("STANAG 6001/EMID English Writing exams") — no existe ninguna lógica de código, tabla ni rama condicional basada en EMID. Es lenguaje de prompt, no un requisito normativo implementado; no debe confundirse con una exigencia oficial de STANAG/BILC.

Las tablas base writing_prompts/writing_attempts son referenciadas por varias migraciones pero su CREATE TABLE no está en el conjunto de 66 migraciones rastreadas — probablemente preceden al historial versionado; no verificable solo desde este repo.

Status: Practice, Exam/submission, Academy, Intelligence e History — implemented-functional en los cinco.

10Speaking Coach — sección prioritaria
Cliente iOS
La captura de audio, el turn-taking y la reproducción están completamente delegados al SDK oficial de ElevenLabs para Swift (v3.2.2), respaldado por LiveKit/WebRTC — no hay AVAudioEngine/WebSocket manual en la app. La conexión usa un token de conversación minteado en el servidor, nunca una URL firmada (las URLs firmadas son solo para texto según el propio SDK — corrección documentada como "PHASE-4"). El turno lo decide el SDK; la app solo reacciona a agentState (listening/thinking/speaking). La app sí posee lógica propia relevante: un reloj de fases de 1s que envía contextual_update al agente según el plan de sesión del backend, y un contador de rotación de escenario que analiza la transcripción en vivo del SDK. La pantalla de debrief premium (commit más reciente de main) añade campos opcionales sin romper compatibilidad con sesiones antiguas. La latencia de turno se mide localmente pero aún no se envía al backend.

Clave de seguridad confirmada dos veces, de forma independiente: la clave de ElevenLabs nunca está en el cliente — solo el token de conversación de corta duración.

Backend
Máquina de estados explícita para el ciclo de vida de la sesión con transiciones seguras ante condiciones de carrera. Ledger de minutos de dos pools (suscripción que expira por ciclo per Apple 3.1.2(a); top-up que no expira per Apple 3.1.1), siempre derivado replay de eventos, nunca un total mutable. La evaluación posterior reutiliza el motor de evaluación de Speaking ya certificado — una sola conversación nunca puede mover de nivel por sí sola. Existe un job de reconciliación explícitamente porque los webhooks de ElevenLabs no garantizan reintento ni idempotencia — falla sin cobrar en caso de duda, nunca al revés.

Discrepancia de documentación
Los "browser runbooks" del backend (ELEVENLABS-BROWSER-RUNBOOK.md, P1-BROWSER-RUNBOOK.md) hablan del navegador del operador configurando el dashboard de ElevenLabs — no de un cliente web para usuarios finales. Ningún documento del repo trata de un cliente Coach en navegador. Además, MASTER-ARCHITECTURE.md describe una arquitectura de WebSocket con URL firmada que quedó obsoleta tras la corrección PHASE-4 — vale la pena señalarlo al equipo como deuda de documentación.
Viabilidad web
ElevenLabs publica un SDK JS/React equivalente que envuelve el mismo protocolo (token de conversación + WebRTC) — esto es conocimiento general del producto de ElevenLabs, no algo verificable desde estos dos repos, y su paridad exacta de funciones (contextual_update, stream de transcripción en vivo) no pudo confirmarse. El backend no necesita cambios — es transporte-agnóstico por diseño. El protocolo (WebRTC) es nativamente compatible con los 5 navegadores objetivo, así que no hace falta un relay de audio. El riesgo real está en Safari iOS: re-solicitud de permiso de micrófono por contexto de navegación, suspensión agresiva de AudioContext en segundo plano, y el hecho de que este producto tiene un público explícitamente militar/STANAG (redes corporativas que a veces bloquean WebRTC) — riesgo plausible pero no confirmable desde el código.

Veredicto
(B) Adaptación moderada — ni mínima ni arquitectura nueva completa. El backend se reutiliza al 100%; toda la orquestación cliente (pre-chequeo de micrófono, reloj de fases, contador de rotación, teardown de sesión) debe reescribirse contra el SDK JS, cuya paridad exacta es el mayor desconocido real de todo este informe.
11Autenticación
Backend: verificación real de JWT de Supabase por request (supabaseAuth.auth.getUser(token)), no un decode manual. iOS: Keychain para tokens, refresco automático en 401, logout que limpia todo el estado local. Sin cookies en ningún punto del backend — el modelo es 100% Bearer token, lo cual hace CSRF no aplicable hoy pero exige una decisión deliberada de almacenamiento de token para web.

Propuesta para web
Un relay de cookie httpOnly/Secure/SameSite=Lax gestionado por un route handler fino de Next.js que reenvía el token como cabecera Authorization al backend existente — evita guardar el JWT en localStorage (mitiga robo por XSS) sin tocar el modelo Bearer que el backend ya tiene. Ver Arquitectura propuesta.
12Subscription / Entitlements
Modelo "Backend es la única autoridad": RevenueCat/StoreKit en iOS solo vende — EntitlementsService nunca lee CustomerInfo para desbloquear nada localmente, siempre repregunta a GET /api/entitlements. requireQuota() consume cuota atómicamente antes del handler y hace auto-refund si la respuesta falla (≥400) — un fallo de OpenAI no le cuesta cuota al usuario. Job de reconciliación cada 6 horas como red de seguridad ante webhooks perdidos.

El modelo de datos (planes/features/quotas) es 100% reutilizable para web sin cambios. Lo que no existe es un flujo de compra web — StoreKit no tiene equivalente en navegador; hace falta RevenueCat Web Billing o Stripe directo, replicando el mismo patrón de webhook atómico + reconciliación que billing.js ya demuestra que funciona.

13Admin
Cuatro módulos backend, todos puros/stateless (no acceden a la DB directamente, solo componen vistas): adminV2Console.js (diagnóstico del rollout de proficiencia), adminV2Overview.js (salud/calibración por skill), adminWritingEvaluation.js (revisión de evaluaciones), adminTrainerPipeline.js (pipeline de contenido). ~25 rutas protegidas por requireAdminUser real (JWT + is_admin); las rutas de generación de contenido siguen en el mecanismo legacy de secreto compartido.

No existe hoy ninguna interfaz de admin — es API pura, consumida presumiblemente por herramientas internas ad hoc. Para web, un /admin podría ser la primera superficie a construir: bajo riesgo (usuarios internos), backend ya reutilizable al 100%, y sirve de prueba de fuego para el patrón de auth de la nueva app antes de tocar nada de cara al cliente.

14Cloud state vs possible local state
main es hoy la punta más reciente del desarrollo en ambos repos de producto: en iOS, la branch remota coach-phase-4-ios tiene el mismo SHA que main — ya está íntegramente incorporada. El último commit de main en ambos repos es, además, específicamente de Speaking Coach (pantalla de debrief premium en iOS; rotación activa de escenarios en backend).

Lo que sí puede cambiar si se incorpora el commit local pendiente
El commit local pendiente en coach-phase-4-ios mencionado por el usuario está, por definición, por delante de lo último que vimos en remoto — su contenido no puede inventarse desde aquí. Una pista concreta y verificable: el propio código de main mide la latencia de turno del Coach solo localmente y explícitamente no la envía aún al backend — un candidato plausible (no confirmado) para lo que ese commit pendiente añade. Si se incorpora, revisar de nuevo la sección Speaking Coach y el endpoint /api/speaking/coach/webhook por si necesitan un campo nuevo de telemetría.
Hallazgo adicional no solicitado pero relevante: la branch remota feat/ux-convergence (iOS) contiene, según su propio mensaje de commit, un paquete de tests reales (WritingSlp2ContractTests) — pero ese paquete no existe en main, confirmado por búsqueda directa en el checkout actual. Esa branch nunca se fusionó a main; su fecha (14 ago 21:15) es anterior al HEAD de main (14 ago 22:19), así que no es que esté "por delante" — es que diverge y se quedó fuera. Vale la pena confirmar con el equipo si ese trabajo de testing se dio por perdido intencionadamente o si conviene rescatarlo.

15Reuse matrix
Sistema	Clasificación	Por qué
API backend (server.js)	DIRECT REUSE	Misma API sirve ya ambos clientes; CORS ya permite slpcommand.com
Esquema Supabase	DIRECT REUSE (tras 2 fixes)	Diseño agnóstico de dispositivo; arreglar las 2 vistas HIGH antes de más tráfico
Reglas de negocio (entitlements, quotas, proficiencia)	DIRECT REUSE	Ya construidas explícitamente para ser consumidas por cualquier cliente
Lógica de contenido/scoring (Reading/Listening/Writing)	DIRECT REUSE	100% server-side ya hoy
Evaluación IA (Writing/Speaking)	DIRECT REUSE	Aplicar el fix de aislamiento de prompt (beneficia también a iOS)
Autenticación	REUSE WITH ADAPTER	Mismo modelo Supabase JWT; falta decidir estrategia de almacenamiento en navegador
Datos de entitlements/subscripciones	DIRECT REUSE	—
Flujo de compra (StoreKit/RevenueCat)	REBUILD	Sin equivalente web; requiere nuevo proveedor de pago
Storage de audio	DIRECT REUSE	Mismo bucket sirve a ambos clientes
Capa de audio del Speaking Coach	REBUILD (cliente) / DIRECT REUSE (servidor)	SDK Swift no porta; la lógica de orquestación se reimplementa contra el SDK JS
Dashboards de Progress/Intelligence	REUSE WITH ADAPTER	Mismos datos; UI se rediseña para desktop
Panel de Admin	REUSE WITH ADAPTER	Backend puro reutilizable; UI no existe, hay que construirla
Analytics	no determinado	Ningún sistema dedicado fue localizado por ningún agente
16Web feasibility
Puntuación global
7.5 / 10

Qué sostiene la nota alta
Backend/DB reutilizables al 85–90%, CORS ya preparado, auth y entitlements ya son plataforma-agnósticos, RLS es sólido salvo 2 gaps arreglables.

No es un 9–10 porque queda un desconocido real y no verificable desde el código (paridad del SDK JS de ElevenLabs) que puede mover el alcance del Coach en cualquier dirección. No es un 6 o menos porque nada en la evidencia sugiere un desajuste arquitectónico de fondo — todo lo contrario: el sistema ya practicaba la disciplina "backend es la única autoridad" antes de que existiera ningún plan de web.

17Arquitectura web propuesta
Next.js (App Router) + TypeScript + Tailwind + Supabase Auth JS, hablando con el mismo backend Express existente — no una nueva capa BFF/GraphQL. Ya está CORS-configurado exactamente para este origen; reescribirlo sería asumir riesgo nuevo sin beneficio funcional.

Frontend: Vercel (CDN/edge, ISR para páginas públicas de marketing/legal).
Backend: Render, sin cambios de plataforma — solo los fixes de seguridad y CORS ya identificados.
Auth: relay de cookie httpOnly vía route handler de Next.js que reenvía el token como Authorization: Bearer al backend — Next.js actúa de relay consciente de seguridad, no de nueva capa de negocio.
Estado/caché: React Query o equivalente sobre las mismas respuestas JSON que ya consume iOS; sin caché de entitlements en cliente (igual que iOS, por diseño).
Audio/Speaking Coach: SDK JS/React oficial de ElevenLabs, tras el spike de verificación de paridad (ver Roadmap).
Responsive: desktop-first para Coach/estudio enfocado; tablet y móvil cubiertos para el resto de módulos.
18Estructura SLPCommand.com
La estructura propuesta por el usuario es razonable pero aplana skill y modo; el propio backend y el propio iOS organizan siempre skill primero, modo después (/api/reading/practice, /api/reading/exam, /api/reading/academy...). Propuesta ajustada:

Ruta	Contenido
/, /precios, /legal/*	Público, indexable — puede absorber el sitio estático actual
/login, /signup	Auth
/dashboard	"Today's mission" — ya existe /api/session/today
/reading, /reading/exam, /reading/academy, /reading/intelligence	Igual patrón en /listening/*, /writing/*
/speaking, /speaking/coach	Speaking Coach como sub-ruta, no top-level independiente
/profile	Fusiona ajustes + perfil, igual que en iOS
/subscription	Paywall web
/admin/*	Decisión pendiente: ¿misma app o subdominio aislado?
19Estrategia UX/UI web
No debe ser un port literal de SwiftUI. Desktop pide navegación lateral persistente (frente a la tab bar de iOS, que oculta lo menos usado), dashboard-first en vez de scroll-first, y tratamiento propio de gráficos/paneles de Intelligence — la familia de componentes IntelligenceComponents.swift es buen ADN de UX a llevar como concepto, no como código. El público de STANAG estudia de escritorio, en sesiones enfocadas: vale la pena posicionar la web como experiencia de escritorio y recomendar la app iOS para móvil, como decisión explícita, no accidental.

20Security audit
Severidad	Hallazgo	Evidencia
HIGH	2 vistas SECURITY DEFINER (listening_publication_state, content_lifecycle_current) exponen estado editorial a anon/authenticated, sorteando RLS	get_advisors ERROR; sin security_invoker
MEDIUM	6 vistas proficiency_integrity_* con permisos por defecto excesivos (latente, no explotable hoy)	Grants a anon/authenticated sin política en tablas base
MEDIUM	Prompt de evaluación de Writing mezcla rúbrica y texto del alumno sin delimitador — posible manipulación de nota	server.js:7193-7194, 7238-7248
LOW	Comparación no constante en tiempo para el secreto legacy de admin	server.js:1063-1071 — confirmado por 2 agentes independientes
LOW	CORS no permite DELETE; 2 endpoints existentes quedarían inalcanzables desde un cliente web	server.js:347-358
LOW	Bucket de audio de Listening público sin firmar	Deliberado y documentado, pero conviene reconfirmar antes de más tráfico
LOW	Protección de contraseñas filtradas desactivada en Supabase Auth	Advisor WARN
NO ISSUE	Sin secretos hardcodeados en ningún repo	Confirmado independientemente 2 veces (incl. clave de ElevenLabs)
NO ISSUE	Sin SQL injection — 100% supabase-js/PostgREST parametrizado	—
NO ISSUE	Subida de archivos: memoria only, 10 MB, validación por magic bytes, no por mimetype del cliente	server.js:12440-12468
NO ISSUE	Aislamiento de datos por usuario correcto en los endpoints muestreados	req.userId siempre del JWT verificado, nunca de parámetro de cliente
21Análisis de costes
Estimaciones orientativas — no se ha verificado pricing en vivo de ningún proveedor.

Categoría	Driver	Nota
FIXED	Vercel (nuevo), Supabase/Render/Sentry (ya existentes)	El único coste fijo realmente nuevo es Vercel
VARIABLE	OpenAI (Writing eval + Whisper)	Ya tiene telemetría/gobierno de coste (OPENAI-COST-GOVERNANCE-PHASE-6)
PER SESSION	Evaluación de Writing ≈ una llamada OpenAI	Reading/Listening practice ≈ $0 marginal, contenido pre-generado
PER SPEAKING SESSION	Minutos conversacionales de ElevenLabs	El mayor driver de coste real y hoy completamente sin instrumentar
Bandwidth	Bucket público de audio de Listening	Crece con tráfico web; sin métrica actual de egress
Nuevo para web	Email transaccional (magic link/verificación)	No se encontró envío de email en ningún repo — hoy no existe
Driver de coste real #1
Los minutos del Speaking Coach ya son el gasto variable más caro por interacción del producto — y no hay ni una línea de tracking de coste de ElevenLabs en todo el backend. Instrumentar esto es una recomendación concreta y accionable, no genérica, antes de abrir el Coach a tráfico web.
22Estrategia Claude Code
Sonnet para el grueso del trabajo de patrón repetible (pantallas de Reading/Listening/Writing, dashboard, páginas de auth — una vez el primer módulo sirve de plantilla). Reservar mayor esfuerzo/Opus para lo que exige juicio sobre comportamiento externo no verificable desde el código: la integración del SDK JS de ElevenLabs, la integración del nuevo proveedor de pago, y los fixes de seguridad de RLS. PRs por feature, revisión humana antes de merge — nunca auto-merge. Pase de QA en navegador explícito (Playwright, ya preinstalado en este entorno) en cada hito, no solo al final.

23Local vs cloud
Cloud (prácticamente todo)
Scaffolding de Next.js, todo el trabajo de backend, fixes de RLS (ya demostrado en vivo en esta misma sesión vía MCP de Supabase), tests unitarios/integración, la mayoría de componentes, E2E con Playwright y dispositivos de media simulados, git/PRs, la mayor parte de QA.

Local / mixto (mínimo)
Verificación humana final del Speaking Coach con micrófono y oídos reales (latencia percibida, calidad de audio, la pantalla de debrief); comprobación manual en un iPhone Safari real para el caso móvil más difícil. El trabajo nativo de iOS sigue en Mac como siempre, pero eso queda fuera del alcance de este proyecto web.

La dependencia de Mac para este proyecto se reduce a "aceptación humana final de la experiencia de micrófono" — no es un cuello de botella de desarrollo.

24Estimación de desarrollo
Escenario	Alcance	Tiempo	Complejidad	Riesgo principal
MVP	Auth, dashboard, Reading+Listening+Writing (practice/exam/academy/intelligence), Progress. Sin Coach, sin subscripciones de pago.	2.5–4 semanas	Media	Bajo — ejecución, no incertidumbre técnica
FULL PRODUCT	+ Speaking & Speaking Coach (desktop-first), subscripciones web nuevas, Academy/Intelligence completo, panel Admin	10–16 semanas (2.5–4 meses) totales	Alta	Paridad del SDK JS de ElevenLabs; integración de nuevo proveedor de pago
PREMIUM PRODUCTION	+ 2 fixes de RLS desplegados, fix de prompt injection, fix de CORS, a11y/SEO completo, telemetría de coste de ElevenLabs, Coach endurecido para Safari móvil (o decisión explícita de excluirlo), suite E2E real	4–6 meses totales	Alta	Ninguno nuevo — es maduración, no descubrimiento
Calibración honesta
3–6 semanas compra el MVP — y el extremo bajo (3) es optimista incluso para eso, dado que no existe frontend previo del que partir. No compra Speaking Coach ni subscripciones web. Esto hay que dejarlo claro antes de comprometer una fecha.
25Top 20 riesgos
#	Riesgo	Prob.	Impacto	Severidad	Mitigación
1	Paridad no verificada del SDK JS de ElevenLabs para el Coach	Alta	Alto	HIGH	Spike de 2–3 días contra la documentación actual antes de estimar Full Product
2	2 vistas SECURITY DEFINER exponiendo datos internos	Media	Medio-alto	HIGH	Aplicar el patrón ya existente de SECURITY-P0-001
3	Comportamiento de Safari iOS rompe continuidad de sesión del Coach	Alta	Medio	MEDIUM-HIGH	Desktop-first en v1; móvil como decisión posterior con datos reales
4	Sin telemetría de coste de ElevenLabs	Alta	Medio-alto	MEDIUM-HIGH	Instrumentar antes de abrir Coach a tráfico web
5	Bugs de integración del nuevo proveedor de pago (ya hubo un bug de webhook, "C1")	Media	Alto	HIGH	Replicar exactamente el patrón atómico de billing.js
6	Monolito de server.js frena cambios con confianza	Media	Bajo-medio	MEDIUM	Extracción incremental, nunca una reescritura
7	Prompt injection en evaluación de Writing	Baja-media	Medio	MEDIUM	Delimitadores/framing explícito, <1 día
8	Coste de bandwidth del bucket público de Listening al crecer el tráfico web	Baja-media	Bajo-medio	LOW-MEDIUM	Monitorizar egress; firmar URLs si hace falta
9	Gap de CORS bloquea las 2 rutas DELETE existentes desde web	Alta	Bajo	LOW-MEDIUM	Cambio de una línea en la config de CORS
10	Comparación no constante del secreto legacy de admin	Baja	Bajo-medio	LOW	Alinear con el patrón timingSafeEqual de billing.js
11	Estrategia de almacenamiento de token en web mal decidida (localStorage)	Media	Medio-alto	MEDIUM-HIGH	Decidir el relay de cookie httpOnly desde el principio
12	Suite XCTest de iOS no conectada a Xcode — señal de un patrón de disciplina QA	Media	Medio	MEDIUM	Regla explícita: tests corren en CI desde el día 1 del proyecto web
13	Deriva de branches — feat/ux-convergence nunca se fusionó	Baja-media	Bajo-medio	LOW-MEDIUM	Política de "fusionar o archivar explícitamente" para el proyecto web
14	Origen no verificado de tablas base de Writing (predatan migraciones rastreadas)	Baja	Bajo	LOW	Ninguna acción salvo tocar esas tablas a ciegas en el futuro
15	Panel de Admin en el mismo dominio público que la app de clientes	Media	Medio	MEDIUM	Decidir aislamiento por subdominio/app desde el diseño
16	Sistema de analytics para web indeterminado/posiblemente inexistente	Media	Bajo-medio	LOW-MEDIUM	Decidir e instrumentar pronto, no a posteriori
17	Rate limit global de 30 req/60s/IP puede afectar redes compartidas (bases, oficinas)	Baja-media	Bajo-medio	LOW	Monitorizar tras el lanzamiento web
18	Concurrencia de escritura no verificada entre iOS y web simultáneos	Baja-media	Medio	MEDIUM	Revisión focalizada de rutas de progreso/proficiencia antes del lanzamiento
19	Una web mediocre daña más la marca que no lanzar, dado que el público ya paga por Pro	Media	Medio-alto	MEDIUM-HIGH	Proteger tiempo de diseño/QA explícitamente en el roadmap
20	El propio historial del equipo muestra incidentes reales recurrentes (IRT_TABLE, límite de examen, vistas RLS, webhook C1)	Media	Medio	MEDIUM	Mantener el mismo rigor de revisión y cultura de post-mortem en el nuevo código
26Decisiones requeridas
Critical before development
Arreglar las 2 vistas RLS de severidad HIGH
Alcance del Coach en web: ¿solo desktop en v1?
Proveedor de pago para web (RevenueCat Web Billing vs. Stripe directo)
Estrategia de almacenamiento de token (cookie httpOnly)
¿Fusionar el sitio legal/marketing en la nueva app o mantenerlo aparte?
Aislamiento del panel de Admin
Important
Plataforma de analytics
Diseño de telemetría de coste de ElevenLabs
Fixes triviales: CORS DELETE, timing del secreto admin, delimitador de prompt
Deprecar formalmente reading/exam/start v1
Can decide later: ritmo de extracción del monolito server.js; revisar el bucket público de Listening solo si el tráfico/abuso lo justifica; atajos de teclado; pulido responsive de tablet.

27Implementation roadmap
Fase	Objetivo	Tiempo	Modelo Claude	Input humano
0 — Fundaciones	Fixes de seguridad, skeleton Next.js + auth contra el backend real	~1 semana	Sonnet, esfuerzo medio	Revisión del fix de RLS y de la estrategia de token
1 — MVP core	Reading, Listening, Writing, Dashboard, Progress	2–3 semanas	Sonnet (Opus para IA del dashboard)	Diseño del primer módulo (plantilla), UX, QA en staging
2 — Hardening & beta	E2E, accesibilidad, SEO público, pipeline de despliegue	3–5 días	Sonnet	Decisión go/no-go, feedback de beta real
3 — Speaking Coach	Spike de paridad SDK JS → build desktop-first	2–3 días spike + 2–4 semanas	Opus para el SDK, Sonnet para UI	Aceptación de audio/micrófono en hardware real, QA cross-browser
4 — Subscripciones web	Nuevo proveedor de pago, webhook, reconciliación, paywall	2–3 semanas	Opus para webhook/reconciliación, Sonnet para UI	Revisión financiera/compliance, alta de cuenta con el proveedor
5 — Admin + Academy/Intelligence	Puerto de panel Admin, paridad completa de dashboards	2–3 semanas (paralelo a fase 4)	Sonnet	Aceptación por usuarios internos
6 — Premium production	Telemetría de coste, carga, a11y/SEO completo, monitorización, Coach en Safari móvil (o exclusión explícita)	2–4 semanas	Mixto	QA final, cierre de revisión de seguridad
Total realista (con algo de solape entre fases): ~3–5 meses para el alcance premium completo; ~1 mes para el MVP en solitario.

28Final recommendation
Construir SLPCommand.com reutilizando el backend y la base de datos actuales tal cual están, sin reescribirlos. Empezar por la semana de Fundaciones (fixes de seguridad + auth real) en paralelo con el spike de ElevenLabs — ambos son cortos, ambos eliminan la mayor incertidumbre restante del proyecto antes de comprometer una fecha para el resto. Tratar el Coach en web como un hito propio, no como parte del MVP.

29Final scorecard
Technical feasibility
8/10
Backend/DB multi-cliente por diseño; solo una incógnita real (SDK)
Backend reuse
9/10
~150 endpoints, cero reescritura necesaria, CORS ya listo
Database reuse
9/10
Agnóstico de dispositivo; 2 gaps de seguridad, no de arquitectura
iOS reuse
5/10
El código Swift no porta; sus patrones sí sirven de spec
Web feasibility
7.5/10
Ver sección 16
Reading
9/10
Completo, testeado, cero gaps web-específicos
Listening
8/10
Coste de TTS sin instrumentar; endpoint muerto por limpiar
Writing
8/10
Un fix barato de seguridad de prompt pendiente
Speaking
7/10
Practice/exam/eval 100% reutilizables server-side
Speaking Coach
6/10
Mayor incógnita técnica real de todo el proyecto
Authentication
8/10
JWT real; falta decidir almacenamiento en navegador
Subscriptions
6/10
Modelo de datos excelente; flujo de compra a reconstruir entero
Security
6.5/10
Un HIGH real en un sistema por lo demás disciplinado
Scalability
7/10
Puntos blandos operativos, no techos arquitectónicos
Cost
6/10
Marginal salvo el driver de Coach, hoy invisible
Development speed
7/10
MVP rápido; Full Product depende del spike
Claude Code suitability
8/10
Código muy autodocumentado; esta misma auditoría lo demuestra
Cloud suitability
9/10
Casi todo el build es cloud-doable de principio a fin
Mac suitability
2/10
Necesidad de Mac casi nula para este proyecto concreto
Commercial viability
7/10
Base de pago ya existe (Pro); monetización web hay que rehacerla
Overall feasibility
7.5/10
Fundación sólida, riesgos reales pero acotados y conocidos
30Final decision
YES

Con la salvedad explícita de que 3–6 semanas compran el MVP, no la visión completa.

Por qué: las 6 auditorías independientes convergen en lo mismo — este backend y esta base de datos ya se construyeron con disciplina multi-cliente antes de que existiera ningún plan de web (CORS ya incluye el dominio, entitlements/progreso son explícitamente "el backend es la única autoridad", RLS está activo en las 58 tablas, el motor de proficiencia tiene un rollout formal LEGACY/SHADOW/COMPARE/V2). El riesgo real está concentrado en un solo sitio — la capa de audio del Speaking Coach — y es resoluble en días con un spike, no en meses a ciegas.
% reutilizable: ~85–90% de la lógica/API de backend, >90% del esquema de base de datos, ~100% de las reglas de negocio (entitlements, quotas, proficiencia). 0% del código Swift en sí (esperable), pero su disciplina de diseño sí transfiere como especificación.
Qué hay que reconstruir: todo el frontend, la capa cliente de audio/orquestación del Speaking Coach, el flujo de compra de subscripciones, y — como prerrequisito de seguridad, no opcional — las 2 vistas RLS.
Mayor riesgo: la paridad no verificada del SDK JS/React de ElevenLabs frente al SDK Swift realmente usado hoy — el único desconocido capaz de mover el calendario de Full Product en cualquier dirección, y no comprobable desde estos dos repos.
Tiempo más probable: ~3–4 semanas para un MVP real; ~2.5–4 meses para el producto completo con Coach y subscripciones; ~4–6 meses para el nivel "premium" que este público, que ya paga por Pro, merece.
Coste técnico principal: los minutos del Speaking Coach — hoy completamente sin instrumentar, incluso en el producto iOS actual — combinados con la superficie de riesgo genuinamente nueva de un segundo proveedor de pago.
Qué haría primero: la semana de Fundaciones (fixes de RLS + CORS/admin-secret/prompt-injection + auth real) en paralelo al spike de ElevenLabs de 2–3 días — es la única semana cuya ausencia haría más arriesgadas todas las fases siguientes, y no compromete el calendario del MVP.
Qué NO haría: reescribir el backend Express como una nueva API serverless "para modernizarlo" — funciona, está testeado, y ya está configurado para este origen web exacto; tampoco intentaría paridad completa del Coach en Safari móvil en la v1 — la evidencia (quirks documentados de iOS Safari + la incógnita de paridad del SDK) hace de eso la porción más especulativa de todo el proyecto. Lanzar desktop-first y decidir móvil después, con datos reales en vez de suposiciones.