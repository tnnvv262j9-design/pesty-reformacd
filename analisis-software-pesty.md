# Analisis Tecnico del Software Pesty

## Resumen Ejecutivo

- El sistema es una aplicacion web para empresas de control de plagas.
- La arquitectura principal combina un frontend web modular en JavaScript vanilla con un backend PHP procedural.
- No usa framework moderno ni router central; la API se compone de muchos archivos PHP expuestos directamente.
- La base de datos es MySQL/MariaDB y el codigo trabaja de forma multiempresa usando `company_id`.
- El producto ya cubre CRM, operaciones, tecnicos, servicios, cotizaciones, facturacion, gastos, quimicos, cebaderos, EPP, portal cliente, firma remota, pagos y chat interno.

## Estructura General

### Frontend

- `index.html`: shell principal del panel.
- `script.js`: orquestador principal de la app.
- `style.css`: estilos globales.
- `js/`: modulos base compartidos.
- `modulos/`: vistas y scripts por area funcional.
- `client_portal.php`: portal para clientes.
- `sign.php`: pagina publica para firma remota de reportes.

### Backend

- `api/db_connect.php`: conexion a base de datos, CORS y sesion.
- `api/login.php`: login principal por email/password o codigo.
- `api/get_initial_data.php`: carga masiva de datos iniciales.
- `api/*.php`: endpoints CRUD, reportes, pagos, integraciones y soporte.
- `api/admin/`: endpoints de superadmin.
- `api/uploads/`: almacenamiento local de logos, evidencias, mapas y archivos.
- `api/schema.sql`: esquema base de tablas.

## Stack Real

- Frontend: HTML, CSS, JavaScript ES Modules.
- Backend: PHP procedural.
- Base de datos: MySQL/MariaDB.
- Librerias frontend por CDN: Leaflet, FullCalendar, Chart.js, Signature Pad, html2canvas y jsPDF.
- Integraciones backend: Resend, Ecart Pay, Conekta, geocodificacion e IA para lectura de etiquetas.

## Como Funciona

1. El usuario entra a `index.html`.
2. `script.js` levanta la aplicacion y usa `js/api.js`.
3. El login pega a `api/login.php`.
4. El usuario autenticado se guarda en `sessionStorage`.
5. El frontend llama `api/get_initial_data.php` y trae casi toda la data operativa de una sola vez.
6. Cada modulo trabaja sobre ese estado global y consume endpoints PHP directos para guardar, editar o borrar.

## Estado Global del Frontend

- `js/state.js` centraliza:
  - usuario actual
  - datos cargados en memoria
  - modulos disponibles
  - catalogos de plagas, areas y metodos
  - calendario, charts y firma

Esto simplifica el arranque, pero hace que la app dependa mucho de variables globales y efectos secundarios.

## Modulos Funcionales Detectados

- `clients`: clientes y sucursales.
- `techs`: tecnicos.
- `services`: servicios operativos y reportes.
- `calendar`: agenda.
- `routes`: rutas.
- `quotes`: cotizaciones.
- `invoices`: facturas.
- `payment_notes`: notas de pago.
- `expenses`: gastos.
- `stats`: estadisticas.
- `library`: biblioteca documental.
- `chemicals`: inventario y documentos de quimicos.
- `cebaderos`: control e inspecciones.
- `epp`: equipo de proteccion personal.
- `chat`: chat interno.
- `certificates`: certificados.
- `config`: configuracion.
- `admin`: administracion global.
- `analysis`: analisis y funciones complementarias.

## Modulos del Backend

- Autenticacion:
  - `api/login.php`
  - `api/client_portal_login.php`
  - `api/generate_token.php`
  - `api/get_public_service_data.php`

- Datos base:
  - `api/get_initial_data.php`
  - `api/get_dashboard_stats.php`
  - `api/save_settings.php`

- Clientes y sucursales:
  - `api/add_client.php`
  - `api/edit_client.php`
  - `api/delete_client.php`
  - `api/add_client_site.php`
  - `api/edit_client_site.php`

- Tecnicos y operaciones:
  - `api/add_technician.php`
  - `api/edit_technician.php`
  - `api/add_service.php`
  - `api/save_service_report.php`
  - `api/get_all_services_calendar.php`
  - `api/get_daily_route.php`

- Finanzas:
  - `api/add_quote.php`
  - `api/add_invoice.php`
  - `api/add_payment_note.php`
  - `api/add_expense.php`
  - `api/save_recurring_expense.php`

- Quimicos y cumplimiento:
  - `api/add_chemical.php`
  - `api/upload_chemical_document.php`
  - `api/get_chemical_stats.php`
  - `api/scan_chemical_label.php`

- Cebaderos e inspeccion:
  - `api/add_cebadero.php`
  - `api/add_cebadero_inspection.php`
  - `api/save_inspection.php`
  - `api/generate_cebadero_report.php`

- EPP:
  - `api/add_epp_item.php`
  - `api/add_epp_delivery.php`
  - `api/add_epp_training.php`
  - `api/add_epp_maintenance.php`
  - `api/add_epp_usage.php`

- Comunicacion:
  - `api/chat_send.php`
  - `api/chat_get.php`
  - `api/chat_list.php`
  - `api/send_email_helper.php`
  - `api/send_feedback.php`

- Reportes y documentos:
  - `api/generate_service_report.php`
  - `api/generate_certificate.php`
  - `api/report_epp_log_pdf.php`
  - `api/report_epp_log_csv.php`
  - `api/upload_document.php`
  - `api/download_document.php`

- Pagos e integraciones:
  - `api/create_conekta_order.php`
  - `api/create_ecartpay_order.php`
  - `api/create_ecartpay_subscription.php`
  - `api/ecartpay_webhook.php`

## Modelo de Datos Principal

Las entidades mas importantes detectadas son:

- `companies`
- `clients`
- `client_sites`
- `technicians`
- `services`
- `quotes`
- `invoices`
- `expenses`
- `payment_notes`
- `chemicals`
- `chemical_documents`
- `cebaderos`
- `cebadero_inspections`
- `chat_messages`
- `audit_log`
- tablas EPP

La mayor parte del sistema esta organizada por `company_id`, lo cual confirma un modelo multi-tenant simple a nivel logico.

## Puntos Fuertes Actuales

- Producto amplio y ya operativo.
- Cobertura funcional grande para el nicho.
- Separacion razonable en frontend por modulos.
- Estado global claro para la UI.
- La app ya contempla branding por empresa, limites por plan y varias integraciones.
- Existen tablas y helpers para auditoria, mantenimiento y seguridad basica.

## Debilidades Tecnicas

- Backend muy plano: demasiados archivos PHP en raiz.
- Logica de negocio, validacion, acceso a datos y respuesta HTTP mezclados en los mismos archivos.
- No hay capas claras tipo controller/service/repository.
- No se detecta sistema formal de migraciones.
- No se detectan pruebas automatizadas.
- Carga inicial masiva en `get_initial_data.php`, lo que aumenta acoplamiento, memoria y tiempos de carga.
- Uso fuerte de `sessionStorage` y estado global en frontend.
- Dependencia de assets y librerias por CDN.
- Hay logs, scripts de prueba y utilidades de reparacion dentro del codigo productivo.

## Riesgos Importantes

### Seguridad

- Credenciales y secretos embebidos en codigo.
- CORS global abierto.
- Tokens publicos caseros para portal y firma remota.
- Superadmin atado a codigos fijos.
- Existe un acceso DEMO hardcodeado en login.
- Mezcla de buenas practicas con validaciones y controles manuales.

### Mantenibilidad

- Mucha duplicacion de endpoints tipo `add/edit/delete/get`.
- Naming heterogeneo entre archivos y tablas.
- Poca modularidad del backend.
- Logica muy repartida entre frontend y PHP.

### Escalabilidad

- `get_initial_data.php` concentra demasiada carga.
- `uploads/` local puede crecer sin control.
- No hay evidencia clara de colas, cache ni jobs desacoplados.

## Estructura Recomendada Para Mejoras Futuras

### Fase 1: Estabilizacion

- Quitar secretos del codigo y moverlos a variables de entorno.
- Cerrar el acceso DEMO o aislarlo por ambiente.
- Endurecer tokens de portal y firma con expiracion y firma robusta.
- Restringir CORS.
- Ordenar logs y scripts de prueba fuera del runtime productivo.

### Fase 2: Refactor Base

- Crear capas minimas en backend:
  - `api/core/`
  - `api/controllers/`
  - `api/services/`
  - `api/repositories/`
  - `api/middleware/`
- Centralizar autenticacion y autorizacion.
- Extraer helpers compartidos para respuestas JSON, validacion y manejo de errores.
- Definir migraciones en vez de scripts sueltos de alter table.

### Fase 3: Mejora de Frontend

- Reducir `script.js` y dividir responsabilidades por dominio.
- Formalizar router interno o loader de modulos consistente.
- Mover la carga masiva a consultas por modulo.
- Definir una capa unica de permisos, sesion y errores.

### Fase 4: Calidad

- Agregar entorno local reproducible.
- Crear pruebas minimas sobre login, servicios, clientes y reportes.
- Agregar linters y convenciones de codigo.

## Prioridades Reales Si Empezamos Mejoras

Orden recomendado:

1. Seguridad y configuracion sensible.
2. Login, sesion y permisos.
3. `get_initial_data.php` y rendimiento.
4. Servicios, clientes y tecnicos como nucleo operativo.
5. Reportes/firma/portal publico.
6. Finanzas e integraciones de pago.
7. Limpieza estructural y pruebas.

## Conclusiones

Pesty no es un prototipo pequeño. Es una plataforma funcional amplia, con bastante valor operativo, pero montada sobre una base tecnica fragil por el crecimiento organico del codigo.

La mejor estrategia no es "rehacer todo", sino:

- asegurar primero
- modularizar despues
- mejorar rendimiento en los flujos mas usados
- y recien luego atacar mejoras grandes de UX, reportes o nuevas funciones

## Siguiente Paso Sugerido

Cuando quieras empezar mejoras, conviene hacerlo con uno de estos enfoques:

- auditoria de seguridad y endurecimiento
- refactor del login y permisos
- refactor del modulo de servicios
- refactor del modulo de clientes
- optimizacion de carga inicial y dashboard
- limpieza estructural del backend PHP
