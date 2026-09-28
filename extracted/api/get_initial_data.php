<?php
ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', 'php-errors.log');

include 'db_connect.php';

function handle_fatal_error() {
    $error = error_get_last();
    if ($error !== null && in_array($error['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR])) {
        if (!headers_sent()) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error interno del servidor. Contacte al administrador.']);
        }
    }
}
register_shutdown_function('handle_fatal_error');

$company_id = isset($_GET['company_id']) ? intval($_GET['company_id']) : 0;
$user_type = isset($_GET['user_type']) ? $_GET['user_type'] : 'company';
$user_id = isset($_GET['user_id']) ? intval($_GET['user_id']) : 0;

if ($company_id === 0) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'ID de compañía no proporcionado.']);
    exit();
}

$response = ['success' => true, 'data' => [
    'clients' => [],
    'client_sites' => [],
    'technicians' => [],
    'services' => [],
    'reminders' => [],
    'expenses' => [],
    'quotes' => [],
    'invoices' => [],
    'payment_notes' => [],
    'chemicals' => [],
    'cebaderos' => [],
    'inspections' => []
]];

// Obtener datos de configuración de la empresa
$stmt = $conn->prepare("SELECT * FROM companies WHERE id = ?");
if ($stmt === false) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error en la preparación de la consulta: ' . $conn->error]);
    exit();
}
$stmt->bind_param("i", $company_id);
$stmt->execute();
$company_result = $stmt->get_result();

if ($company_result->num_rows > 0) {
    $company_data = $company_result->fetch_assoc();
    
    // Aplicar valores por defecto usando la misma lógica que login.php
    $company_data['brand_color'] = $company_data['brand_color'] ?: '#2563eb';
    $company_data['theme'] = $company_data['theme'] ?: 'dark';
    $company_data['date_format'] = $company_data['date_format'] ?: 'DD/MM/YYYY';
    $company_data['time_format'] = $company_data['time_format'] ?: '24h';
    $company_data['language'] = $company_data['language'] ?: 'es';
    $company_data['currency_code'] = $company_data['currency_code'] ?: 'USD';
    $company_data['currency_symbol'] = $company_data['currency_symbol'] ?: '$';
    $company_data['currency_decimals'] = $company_data['currency_decimals'] ?: 2;
    $company_data['report_footer_text'] = $company_data['report_footer_text'] ?: '';
    $company_data['billing_prefix'] = $company_data['billing_prefix'] ?: 'INV';
    $company_data['billing_next_number'] = $company_data['billing_next_number'] ?: 1;
    $company_data['contact_phone'] = $company_data['contact_phone'] ?: '';
    $company_data['contact_email'] = $company_data['contact_email'] ?: '';
    $company_data['contact_address'] = $company_data['contact_address'] ?: '';
    $company_data['module_access'] = json_decode($company_data['module_access'] ?: '{}', true);
    
    // Agregar datos del usuario a la respuesta
    $response['user'] = $company_data;
}
$stmt->close();

function fetch_all_assoc($stmt) {
    $result = [];
    
    try {
        // Ejecutar el statement
        if (!$stmt->execute()) {
            error_log("Error ejecutando statement: " . $stmt->error);
            return [];
        }
        
        // Obtener el resultado usando get_result() que es más simple y moderno
        $query_result = $stmt->get_result();
        
        if (!$query_result) {
            error_log("Error obteniendo resultado: " . $stmt->error);
            return [];
        }
        
        // Obtener todos los resultados como array asociativo
        while ($row = $query_result->fetch_assoc()) {
            $result[] = $row;
        }
    } catch (Exception $e) {
        error_log("Excepción en fetch_all_assoc: " . $e->getMessage());
        return [];
    }
    
    return $result;
}

// Clientes con desencriptación de datos sensibles
if (!file_exists('encryption_service.php')) {
    error_log("Error: encryption_service.php no encontrado");
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error: servicio de encriptación no disponible.']);
    exit();
}
require_once 'encryption_service.php';
try {
    $encryption = new EncryptionService();
} catch (Exception $e) {
    error_log("Error creando EncryptionService: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error inicializando servicio de encriptación.']);
    exit();
}

$stmt = $conn->prepare("SELECT id, full_name, phone, address, notes, zone, frequency, type, access_code, map_url FROM clients WHERE company_id = ?");
if ($stmt === false) {
    error_log("Error preparando consulta de clientes: " . $conn->error);
    $clients = [];
} else {
    $stmt->bind_param("i", $company_id);
    $clients = fetch_all_assoc($stmt);
    $stmt->close();
}

// Desencriptar datos sensibles de clientes y asegurar código de acceso
foreach ($clients as &$client) {
    // Generar código de acceso si no existe
    if (empty($client['access_code'])) {
        $new_code = substr(str_shuffle("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"), 0, 6);
        $update_stmt = $conn->prepare("UPDATE clients SET access_code = ? WHERE id = ?");
        $update_stmt->bind_param("si", $new_code, $client['id']);
        $update_stmt->execute();
        $update_stmt->close();
        $client['access_code'] = $new_code;
    }

    // El teléfono ya no se encripta, se mantiene tal como está en la base de datos
    
    if (!empty($client['address'])) {
        try {
            $decrypted_address = $encryption->decrypt($client['address']);
            $client['address'] = $decrypted_address !== false ? $decrypted_address : $client['address'];
        } catch (Exception $e) {
            error_log("Error desencriptando dirección cliente {$client['id']}: " . $e->getMessage());
        }
    }
    if (!empty($client['notes'])) {
        try {
            $decrypted_notes = $encryption->decrypt($client['notes']);
            $client['notes'] = $decrypted_notes !== false ? $decrypted_notes : $client['notes'];
        } catch (Exception $e) {
            error_log("Error desencriptando notas cliente {$client['id']}: " . $e->getMessage());
        }
    }
}

$response['data']['clients'] = $clients;

$stmt = $conn->prepare("SELECT id, company_id, client_id, name, code, address, notes, risk_level, created_at FROM client_sites WHERE company_id = ?");
if ($stmt === false) {
    error_log("Error preparando consulta de client_sites: " . $conn->error);
    $client_sites = [];
} else {
    $stmt->bind_param("i", $company_id);
    $client_sites = fetch_all_assoc($stmt);
    $stmt->close();
}

$response['data']['client_sites'] = $client_sites;

$stmt = $conn->prepare("SELECT id, name, phone, address, access_code, start_date, base_salary, photo FROM technicians WHERE company_id = ?");
if ($stmt === false) {
    error_log("Error preparando consulta de técnicos: " . $conn->error);
    $technicians = [];
} else {
    $stmt->bind_param("i", $company_id);
    $technicians = fetch_all_assoc($stmt);
    $stmt->close();
}

// Desencriptar datos sensibles de técnicos
foreach ($technicians as &$technician) {
    if (!empty($technician['phone'])) {
        try {
            $decrypted_phone = $encryption->decrypt($technician['phone']);
            $technician['phone'] = $decrypted_phone !== false ? $decrypted_phone : $technician['phone'];
        } catch (Exception $e) {
            error_log("Error desencriptando teléfono técnico {$technician['id']}: " . $e->getMessage());
        }
    }
    if (!empty($technician['address'])) {
        try {
            $decrypted_address = $encryption->decrypt($technician['address']);
            $technician['address'] = $decrypted_address !== false ? $decrypted_address : $technician['address'];
        } catch (Exception $e) {
            error_log("Error desencriptando dirección técnico {$technician['id']}: " . $e->getMessage());
        }
    }
}

$response['data']['technicians'] = $technicians;

if ($user_type === 'tech') {
    $stmt = $conn->prepare("SELECT * FROM services WHERE technician_id = ? AND service_date >= DATE_SUB(CURDATE(), INTERVAL 2 YEAR)");
    if ($stmt === false) {
        error_log("Error preparando consulta de servicios (tech): " . $conn->error);
        $services = [];
    } else {
        $stmt->bind_param("i", $user_id);
        $services = fetch_all_assoc($stmt);
        $stmt->close();
    }
} else {
    $stmt = $conn->prepare("SELECT * FROM services WHERE company_id = ? AND service_date >= DATE_SUB(CURDATE(), INTERVAL 2 YEAR)");
    if ($stmt === false) {
        error_log("Error preparando consulta de servicios (company): " . $conn->error);
        $services = [];
    } else {
        $stmt->bind_param("i", $company_id);
        $services = fetch_all_assoc($stmt);
        $stmt->close();
    }
}

// Desencriptar notas de servicios
foreach ($services as &$service) {
    if (!empty($service['notes'])) {
        try {
            $decrypted_notes = $encryption->decrypt($service['notes']);
            $service['notes'] = $decrypted_notes !== false ? $decrypted_notes : $service['notes'];
        } catch (Exception $e) {
            error_log("Error desencriptando notas servicio {$service['id']}: " . $e->getMessage());
        }
    }
}

// Los datos de servicios ya no requieren desencriptación (CORRECCIÓN: Sí requieren para las notas)
    $response['data']['services'] = $services;

    $stmt = $conn->prepare("SELECT * FROM reminders WHERE company_id = ?");
    if ($stmt === false) {
        error_log("Error preparando consulta de recordatorios: " . $conn->error);
        $response['data']['reminders'] = [];
    } else {
        $stmt->bind_param("i", $company_id);
        $response['data']['reminders'] = fetch_all_assoc($stmt);
        $stmt->close();
    }

    // Fetch new data only for admin/company users
    if ($user_type === 'company') {
        $stmt = $conn->prepare("SELECT * FROM expenses WHERE company_id = ?");
    if ($stmt === false) {
        error_log("Error preparando consulta de gastos: " . $conn->error);
        $response['data']['expenses'] = [];
    } else {
        $stmt->bind_param("i", $company_id);
        $response['data']['expenses'] = fetch_all_assoc($stmt);
        $stmt->close();
    }

    $stmt = $conn->prepare("SELECT * FROM quotes WHERE company_id = ?");
    if ($stmt === false) {
        error_log("Error preparando consulta de cotizaciones: " . $conn->error);
        $response['data']['quotes'] = [];
    } else {
        $stmt->bind_param("i", $company_id);
        $response['data']['quotes'] = fetch_all_assoc($stmt);
        $stmt->close();
    }

    $stmt = $conn->prepare("SELECT * FROM invoices WHERE company_id = ?");
    if ($stmt === false) {
        error_log("Error preparando consulta de facturas: " . $conn->error);
        $response['data']['invoices'] = [];
    } else {
        $stmt->bind_param("i", $company_id);
        $response['data']['invoices'] = fetch_all_assoc($stmt);
        $stmt->close();
    }

    // --- NUEVO: Fetch Payment Notes ---
    $stmt = $conn->prepare("SELECT * FROM payment_notes WHERE company_id = ?");
    if ($stmt === false) {
        error_log("Error preparando consulta de notas de pago: " . $conn->error);
        $response['data']['payment_notes'] = [];
    } else {
        $stmt->bind_param("i", $company_id);
        $response['data']['payment_notes'] = fetch_all_assoc($stmt);
        $stmt->close();
    }
}

// --- NUEVO: Fetch Chemicals ---
// Available for both company and tech users as they are needed for reports
$stmt = $conn->prepare("SELECT * FROM chemicals WHERE company_id = ?");
if ($stmt === false) {
    error_log("Error preparando consulta de químicos: " . $conn->error);
    $response['data']['chemicals'] = [];
} else {
    $stmt->bind_param("i", $company_id);
    $response['data']['chemicals'] = fetch_all_assoc($stmt);
    $stmt->close();
}

// --- NUEVO: Fetch Cebaderos & Inspections ---
// Available for both company and tech users
$stmt = $conn->prepare("SELECT * FROM cebaderos WHERE company_id = ?");
if ($stmt === false) {
    error_log("Error preparando consulta de cebaderos: " . $conn->error);
    $response['data']['cebaderos'] = [];
} else {
    $stmt->bind_param("i", $company_id);
    $response['data']['cebaderos'] = fetch_all_assoc($stmt);
    $stmt->close();
}

$stmt = $conn->prepare("SELECT i.* FROM cebadero_inspections i JOIN cebaderos c ON i.cebadero_id = c.id WHERE c.company_id = ? ORDER BY i.inspection_date DESC LIMIT 500");
if ($stmt === false) {
    error_log("Error preparando consulta de inspecciones: " . $conn->error);
    $response['data']['inspections'] = [];
} else {
    $stmt->bind_param("i", $company_id);
    $response['data']['inspections'] = fetch_all_assoc($stmt);
    $stmt->close();
}

// --- NUEVO: Unread Chat Count ---
$unread_count = 0;
if ($user_type === 'tech') {
    // Tech: Count messages from company (to_tech) that are unread
    $stmt = $conn->prepare("SELECT COUNT(*) as count FROM chat_messages WHERE company_id = ? AND technician_id = ? AND direction = 'to_tech' AND is_read = 0");
    if ($stmt) {
        $stmt->bind_param("ii", $company_id, $user_id);
        $stmt->execute();
        $res = $stmt->get_result();
        if ($row = $res->fetch_assoc()) $unread_count = $row['count'];
        $stmt->close();
    }
} else {
    // Company: Count messages from any tech (to_company) that are unread
    $stmt = $conn->prepare("SELECT COUNT(*) as count FROM chat_messages WHERE company_id = ? AND direction = 'to_company' AND is_read = 0");
    if ($stmt) {
        $stmt->bind_param("i", $company_id);
        $stmt->execute();
        $res = $stmt->get_result();
        if ($row = $res->fetch_assoc()) $unread_count = $row['count'];
        $stmt->close();
    }
}
$response['unread_chat'] = $unread_count;

try {
    $json_response = json_encode($response);
    if ($json_response === false) {
        error_log("Error codificando JSON: " . json_last_error_msg());
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Error procesando respuesta.']);
    } else {
        echo $json_response;
    }
} catch (Exception $e) {
    error_log("Excepción al generar respuesta JSON: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error interno del servidor.']);
}

if (isset($conn)) {
    $conn->close();
}
