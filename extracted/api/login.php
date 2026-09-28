<?php
// --- LÍNEA DE DEPURACIÓN ELIMINADA ---

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

// Función para personalizar datos de la compañía
function customize_company_data(&$company_data) {
    $company_data['theme_override'] = null;
    switch ($company_data['admin_code']) {
        case 'GEMAR_ADMIN':
            $company_data['logo_url'] = 'gemar.png';
            break;
        case 'SOMAR_ADMIN':
            $company_data['logo_url'] = 'somar.png';
            $company_data['theme_override'] = 'somar-green';
            $company_data['brand_color'] = '#22C55E';
            break;
        case 'ORI_ADMIN':
            $company_data['logo_url'] = 'ori.png';
            break;
    }
    
    // Aplicar valores por defecto si están vacíos
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
    
    // Asegurar que module_access sea un array
    if (is_string($company_data['module_access'])) {
        $company_data['module_access'] = json_decode($company_data['module_access'] ?: '{}', true);
    }
    if (!is_array($company_data['module_access'])) {
        $company_data['module_access'] = ['modules' => [], 'actions' => []];
    }
}

// Función para verificar y procesar expiración de suscripción
function check_subscription_expiry($conn, &$company_data) {
    if (isset($company_data['plan']) && $company_data['plan'] !== 'trial' && isset($company_data['subscription_expiry'])) {
        $expiry = $company_data['subscription_expiry'];
        if ($expiry && strtotime($expiry) < time()) {
            // Suscripción expirada: Downgrade automático
            $company_id = intval($company_data['id']);
            $conn->query("UPDATE companies SET plan = 'trial', subscription_status = 'expired' WHERE id = $company_id");
            $company_data['plan'] = 'trial';
            $company_data['subscription_status'] = 'expired';
            return true;
        }
    }
    return false;
}

$data = json_decode(file_get_contents("php://input"));

if (!isset($data)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'No se proporcionaron datos en la solicitud.']);
    exit();
}

// Determinar tipo de login
$login_type = isset($data->login_type) ? $data->login_type : 'access_code';

if ($login_type === 'email') {
    // Login por email y contraseña
    if (!isset($data->email) || !isset($data->password)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Email y contraseña son requeridos.']);
        exit();
    }
    
    $email = $data->email;
    $password = $data->password;
    $two_factor_code = isset($data->two_factor_code) ? $data->two_factor_code : null;
    
    // Buscar empresa por email
    $sql_email = "SELECT id, name, email, password, password_hash, admin_code, brand_color, logo_url, theme, date_format, time_format, language, currency_code, currency_symbol, currency_decimals, report_footer_text, billing_prefix, billing_next_number, contact_phone, contact_email, contact_address, module_access, limit_chemicals, plan, subscription_expiry, subscription_status, treatment_methods, common_pests, treated_areas, trial_used, created_at FROM companies WHERE email = ?";
    $stmt_email = $conn->prepare($sql_email);
    
    if ($stmt_email === false) {
        error_log("Error preparando consulta de login por email: " . $conn->error);
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Error en la preparación de la consulta.']);
        exit();
    }
    
    $stmt_email->bind_param("s", $email);
    
    if (!$stmt_email->execute()) {
        error_log("Error ejecutando consulta de login por email: " . $stmt_email->error);
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Error al ejecutar la consulta.']);
        $stmt_email->close();
        exit();
    }
    
    $result_email = $stmt_email->get_result();
    
    if ($result_email->num_rows > 0) {
        $company_data = $result_email->fetch_assoc();
        
        $planVal = isset($company_data['plan']) ? $company_data['plan'] : null;
        $createdAt = isset($company_data['created_at']) ? $company_data['created_at'] : null;
        if ($planVal === 'trial' && $createdAt) {

            $limChem = isset($company_data['limit_chemicals']) ? intval($company_data['limit_chemicals']) : 0;
            if ($limChem > 0) {
                $upd2 = $conn->prepare("UPDATE companies SET limit_chemicals = 0 WHERE id = ?");
                if ($upd2) { $upd2->bind_param("i", $company_data['id']); $upd2->execute(); $upd2->close(); }
                $company_data['limit_chemicals'] = 0;
            }
        }
        
        // Verificar contraseña - intentar con password_hash primero, luego con password
        $password_valid = false;
        if (!empty($company_data['password_hash'])) {
            $password_valid = password_verify($password, $company_data['password_hash']);
        }
        if (!$password_valid && !empty($company_data['password'])) {
            $password_valid = password_verify($password, $company_data['password']);
        }
        
        if ($password_valid) {
            check_subscription_expiry($conn, $company_data);
            customize_company_data($company_data);
            
            $isSuperAdmin = ($company_data['admin_code'] === 'GEMAR_ADMIN');
            
            $user_payload = array_merge($company_data, [
                'type' => 'company',
                'companyId' => $company_data['id'],
                'id' => $company_data['id'],
                'isSuperAdmin' => $isSuperAdmin
            ]);

            // Guardar en sesión para seguridad (HttpOnly Cookies)
            $_SESSION['pesty_user'] = $user_payload;
            $_SESSION['company_id'] = $company_data['id'];
            $_SESSION['user_id'] = $company_data['id'];
            
            echo json_encode([
                'success' => true,
                'user' => $user_payload
            ]);
            $stmt_email->close();
            if (isset($conn)) {
                $conn->close();
            }
            exit();
        } else {
            error_log("Contraseña incorrecta para email: " . $email);
            http_response_code(401);
            echo json_encode(['success' => false, 'message' => 'Email o contraseña incorrectos.']);
            $stmt_email->close();
            if (isset($conn)) {
                $conn->close();
            }
            exit();
        }
    } else {
        error_log("Email no encontrado: " . $email);
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Email o contraseña incorrectos.']);
        $stmt_email->close();
        if (isset($conn)) {
            $conn->close();
        }
        exit();
    }
} else {
    // Login por código de acceso (lógica original)
    if (!isset($data->access_code)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'No se proporcionó el código de acceso en la solicitud.']);
        exit();
    }
    
    $access_code = $data->access_code;

if ($access_code === 'PESTYDEMO') {
    echo json_encode([
        'success' => true,
        'user' => [
            'type' => 'company',
            'id' => 999,
            'companyId' => 999,
            'name' => 'Cliente DEMO',
            'admin_code' => 'PESTYDEMO',
            'brand_color' => '#34D399',
            'logo_url' => 'pesty.png', // Usando un logo de ejemplo
            'theme' => 'dark',
            'theme_override' => null,
            'date_format' => 'YYYY-MM-DD',
            'time_format' => '24h',
            'currency_symbol' => '$',
            'currency_decimals' => 2,
            'report_footer_text' => 'Gracias por su preferencia. (Modo DEMO)',
            'billing_prefix' => 'FAC-',
            'billing_next_number' => 1,
            'contact_phone' => '899-000-0000',
            'contact_email' => 'demo@pesty.com',
            'contact_address' => 'Calle Falsa 123, Reynosa',
            // Valores por defecto ya que no se leerán de la BD
            'report_bg_color' => '#1A1A1A',
            'report_text_color' => '#F5F5F5',
            'isSuperAdmin' => false, // <-- CAMBIO CLAVE: El modo DEMO no es super admin
            'limit_chemicals' => 100 // Demo limit
        ]
    ]);
    exit();
}


$sql_company = "SELECT id, name, admin_code, brand_color, logo_url, theme, date_format, time_format, language, currency_code, currency_symbol, currency_decimals, report_footer_text, billing_prefix, billing_next_number, contact_phone, contact_email, contact_address, module_access, limit_chemicals, plan, subscription_expiry, subscription_status, treatment_methods, common_pests, treated_areas, trial_used, created_at FROM companies WHERE admin_code = ?";
$stmt_company = $conn->prepare($sql_company);

if ($stmt_company === false) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error en la preparación de la consulta de compañía: ' . $conn->error]);
    exit();
}

$stmt_company->bind_param("s", $access_code);
$stmt_company->execute();
$result_company = $stmt_company->get_result();

if ($result_company->num_rows > 0) {
    $company_data = $result_company->fetch_assoc();
    
    $planVal = isset($company_data['plan']) ? $company_data['plan'] : null;
    $createdAt = isset($company_data['created_at']) ? $company_data['created_at'] : null;
    if ($planVal === 'trial' && $createdAt) {
        // Se eliminó la lógica que borraba credenciales después de 7 días

        // Forzar químicos deshabilitados en trial
        $limChem = isset($company_data['limit_chemicals']) ? intval($company_data['limit_chemicals']) : 0;
        if ($limChem > 0) {
            $upd2 = $conn->prepare("UPDATE companies SET limit_chemicals = 0 WHERE id = ?");
            if ($upd2) { $upd2->bind_param("i", $company_data['id']); $upd2->execute(); $upd2->close(); }
            $company_data['limit_chemicals'] = 0;
        }
    }
    check_subscription_expiry($conn, $company_data);
    customize_company_data($company_data);
    
    // <-- CAMBIO CLAVE: Verificación segura de Super Admin en el servidor -->
    $isSuperAdmin = ($company_data['admin_code'] === 'GEMAR_ADMIN');

    echo json_encode([
        'success' => true,
        'user' => array_merge($company_data, [
            'type' => 'company', 
            'companyId' => $company_data['id'], 
            'id' => $company_data['id'],
            'isSuperAdmin' => $isSuperAdmin // <-- Se añade la bandera segura a la respuesta
        ])
    ]);
    $stmt_company->close();
    $conn->close();
    exit();
}
$stmt_company->close();

$sql_tech = "SELECT t.id, t.name, t.photo, t.company_id, c.name as company_name, c.admin_code, c.brand_color, c.logo_url, c.theme, c.date_format, c.time_format, c.language, c.currency_code, c.currency_symbol, c.currency_decimals, c.report_footer_text, c.billing_prefix, c.billing_next_number, c.contact_phone, c.contact_email, c.contact_address, c.limit_chemicals, c.plan, c.subscription_expiry, c.subscription_status FROM technicians t JOIN companies c ON t.company_id = c.id WHERE t.access_code = ?";
$stmt_tech = $conn->prepare($sql_tech);

if ($stmt_tech === false) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error en la preparación de la consulta de técnico: ' . $conn->error]);
    exit();
}

$stmt_tech->bind_param("s", $access_code);
$stmt_tech->execute();
$result_tech = $stmt_tech->get_result();

if ($result_tech->num_rows > 0) {
    $tech_data = $result_tech->fetch_assoc();
    
    // Preparar datos para check_subscription_expiry (usando el id de la compañía)
    $temp_company = [
        'id' => $tech_data['company_id'],
        'plan' => $tech_data['plan'],
        'subscription_expiry' => $tech_data['subscription_expiry'],
        'subscription_status' => $tech_data['subscription_status']
    ];
    
    if (check_subscription_expiry($conn, $temp_company)) {
        // Si expiró, actualizar los datos que se enviarán al frontend
        $tech_data['plan'] = $temp_company['plan'];
        $tech_data['subscription_status'] = $temp_company['subscription_status'];
    }

    customize_company_data($tech_data);
    
    // <-- CAMBIO CLAVE: Los técnicos nunca son super admin -->
    $tech_data['isSuperAdmin'] = false;

    echo json_encode([
        'success' => true,
        'user' => array_merge($tech_data, [
            'type' => 'tech', 
            'companyId' => $tech_data['company_id'],
            'isSuperAdmin' => false // <-- Se añade la bandera segura a la respuesta
        ])
    ]);
    $stmt_tech->close();
    $conn->close();
    exit();
}
$stmt_tech->close();

    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Código de acceso no válido.']);
}

$conn->close();
?>
