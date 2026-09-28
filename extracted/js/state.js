/**
 * Global Application State
 */

export const AppState = {
    currentUser: null,
    maintenance: {},
    db: {
        services: [],
        clients: [],
        technicians: [],
        quotes: [],
        invoices: [],
        expenses: [],
        reminders: [],
        payment_notes: [],
        chemicals: [],
        cebaderos: [],
        inspections: []
    },
    apiBaseUrl: 'api/',
    availableModules: {
        'dashboard': '🧭 Panel',
        'services': '🛠️ Servicios',
        'clients': '👥 Clientes',
        'techs': '👨‍🔧 Técnicos',
        'quotes': '📄 Cotizaciones',
        'invoices': '🧾 Facturas',
        'payment-notes': '💰 Notas de Pago',
        'expenses': '💸 Gastos',
        'calendar': '📅 Calendario',
        'stats': '📊 Estadísticas',
        'library': '📖 Biblioteca',
        'chemicals': '🧪 Químicos',
        'epp': '🦺 EPP',
        'cebaderos': '🐀 Cebaderos',
        'settings': '⚙️ Configuración',
        'feature_service_report': '📝 Reportes de Servicio',
        'feature_signature_link': '🔗 Link de Firma Remota',
        'feature_payments': '💰 Registro de Pagos',
        'feature_reschedule': '🔄 Reagendar Servicios',
        'routes': '📍 Rutas',
        'chat': '💬 Chat Interno',
        'certificates': '📜 Certificados',
    },
    commonPests: ['Cucarachas', 'Roedores (Ratas/Ratones)', 'Hormigas', 'Arañas', 'Mosquitos', 'Alacranes', 'Termitas', 'Pulgas', 'Garrapatas', 'Chinches', 'Moscas', 'Avispas', 'Polillas', 'Gorgojos', 'Ácaros'],
    treatedAreas: ['Cocina', 'Comedor', 'Sala', 'Cuartos', 'Baños', 'Patio/Jardín', 'Perímetro Exterior', 'Bodega'],
    hotelAreas: {
        'Áreas Tratadas – Huéspedes': ['Habitaciones', 'Pasillos de habitaciones', 'Elevadores', 'Escaleras', 'Áreas comunes de pisos', 'Balcones / terrazas'],
        'Áreas Comunes': ['Lobby / recepción', 'Sala de espera', 'Baños públicos', 'Salones de eventos', 'Centro de negocios', 'Gimnasio', 'Spa', 'Alberca y área de camastros', 'Jardines y áreas verdes'],
        'Áreas de Alimentos y Bebidas': ['Cocina', 'Área de preparación de alimentos', 'Almacén de alimentos', 'Restaurante', 'Bar', 'Cuartos fríos', 'Área de lavado de loza'],
        'Áreas Operativas': ['Cuarto de blancos', 'Lavandería', 'Almacenes generales', 'Cuartos de máquinas', 'Área de mantenimiento', 'Oficinas administrativas', 'Vestidores de personal', 'Comedor de empleados'],
        'Áreas Exteriores y de Riesgo': ['Área de basura', 'Cuarto de residuos', 'Estacionamiento', 'Andenes de carga y descarga', 'Perímetro del edificio', 'Drenajes / coladeras']
    },
    casinoAreas: {
        'Áreas de Juego': ['Sala de Juegos', 'Máquinas Tragamonedas', 'Mesas de Juego', 'Área de Bingo', 'Sala VIP', 'Caja / Bóveda'],
        'Áreas de Clientes': ['Recepción / Lobby', 'Bar / Barra', 'Restaurante', 'Baños Públicos', 'Sala de Espectáculos', 'Estacionamiento'],
        'Áreas de Servicio': ['Cocina', 'Almacén de Alimentos', 'Cuarto de Basura', 'Oficinas Administrativas', 'Vestidores de Empleados', 'Comedor de Empleados', 'Mantenimiento / Taller', 'Cuarto de Máquinas', 'CCTV / Seguridad']
    },
    maquiladoraAreas: {
        'Áreas Operativas': ['Líneas de Producción', 'Área de Ensamble', 'Almacén de Materia Prima', 'Almacén de Producto Terminado', 'Cuarto de Máquinas', 'Mantenimiento', 'Laboratorio de Calidad'],
        'Áreas Comunes': ['Comedor General', 'Cocina', 'Baños / Vestidores', 'Lockers', 'Enfermería', 'Oficinas Administrativas', 'Sala de Juntas'],
        'Exterior y Logística': ['Andenes de Carga/Descarga', 'Patio de Maniobras', 'Estacionamiento', 'Casetas de Vigilancia', 'Perímetro Exterior', 'Área de Residuos / Basura']
    },
    almacenAreas: {
        'Almacenamiento': ['Racks / Estantería', 'Pasillos', 'Zona de Picking', 'Cuarentena', 'Devoluciones', 'Cámaras Frías'],
        'Logística': ['Recibo de Mercancía', 'Embarque / Salida', 'Andenes', 'Patio de Maniobras'],
        'Servicios': ['Oficinas', 'Baños', 'Comedor', 'Cuarto de Carga de Baterías', 'Cuarto de Máquinas', 'Área de Limpieza']
    },
    localAreas: {
        'Atención al Cliente': ['Piso de Venta', 'Mostrador / Caja', 'Exhibidores', 'Probadores', 'Sala de Espera'],
        'Operativo': ['Bodega / Almacén', 'Oficina / Gerencia', 'Baño', 'Cuarto de Aseo'],
        'Exterior': ['Fachada / Entrada', 'Estacionamiento', 'Banqueta']
    },
    expenseCategories: ['Combustible', 'Mantenimiento Vehículo', 'Equipo', 'Oficina', 'Sueldos', 'Otros'],
    treatmentMethods: ['Líquido por aspersión', 'Gel', 'Polvo seco', 'Polvo soluble', 'Nebulización fría', 'Termonebulización (humo caliente)', 'Nebulización desinfectante', 'Cebos en bloque o pasta', 'Cebos granulares', 'Trampas adhesivas', 'Trampas mecánicas', 'Lámparas UV', 'Inyección localizada', 'Barreras químicas'],
    calendar: null,
    calendarInitialized: false,
    statsInitialized: false,
    charts: {},
    signaturePad: null,
    currentSignatureTarget: null,
    tempSignatures: { techSignature: null, clientSignature: null },
    resizeHandler: null,
    currentDocumentForPdf: { id: null, type: null }
};
