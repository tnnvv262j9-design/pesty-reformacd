<?php
ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', 'php-errors.log');

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit(0);
}

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

require_once 'db_connect.php';

function send_welcome_email($to, $company_name, $admin_code) {
    $apiKey = getenv('RESEND_API_KEY');
    $fromEmail = getenv('RESEND_FROM_EMAIL');
    $fromName = getenv('RESEND_FROM_NAME');
    $loginUrl = getenv('APP_LOGIN_URL') ?: getenv('RESEND_LOGIN_URL');
    if (!$apiKey || !$fromEmail) {
        $configPath = __DIR__ . DIRECTORY_SEPARATOR . 'resend_config.json';
        if (file_exists($configPath)) {
            $cfg = json_decode(file_get_contents($configPath), true);
            if (is_array($cfg)) {
                $apiKey = $apiKey ?: ($cfg['api_key'] ?? null);
                $fromEmail = $fromEmail ?: ($cfg['from_email'] ?? null);
                $fromName = $fromName ?: ($cfg['from_name'] ?? null);
                $loginUrl = $loginUrl ?: ($cfg['login_url'] ?? null);
            }
        }
    }
    if (!$apiKey || !$fromEmail) {
        error_log('Resend no configurado: falta RESEND_API_KEY o RESEND_FROM_EMAIL');
        return false;
    }
    $fromName = $fromName ?: $company_name;
    $from = $fromName . ' <' . $fromEmail . '>';
    $loginUrl = $loginUrl ?: 'https://software.pesty.com.mx';
    $subject = 'Bienvenido a tu cuenta - Código de acceso';
    $plain = "Hola {$company_name},\n\nBienvenido.\nTu código de acceso es: {$admin_code}\nGuárdalo en un lugar seguro.\n\nGracias.";
    $html = <<<HTML
<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Bienvenido</title>
<style>
body{margin:0;padding:0;background:#f5f7fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,'Noto Sans',sans-serif;color:#111827}
.container{max-width:600px;margin:0 auto;background:#ffffff}
.header{padding:24px 24px 0 24px;text-align:center}
.brand{font-size:20px;font-weight:600;color:#111827}
.card{margin:24px;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden}
.card-header{background:#111827;color:#fff;padding:16px 20px;font-size:16px;font-weight:600}
.content{padding:24px}
.code{display:block;margin:12px 0;padding:16px 20px;background:#f3f4f6;border:1px dashed #d1d5db;border-radius:8px;font-size:22px;font-weight:700;letter-spacing:.08em;text-align:center;color:#111827}
.btn{display:inline-block;margin-top:12px;padding:12px 18px;background:#111827;color:#fff;text-decoration:none;border-radius:8px;font-weight:600}
.muted{font-size:12px;color:#6b7280;margin-top:16px}
.footer{padding:16px 24px 24px 24px;text-align:center;font-size:12px;color:#6b7280}
</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="brand">Bienvenido</div>
    </div>
    <div class="card">
      <div class="card-header">Tu cuenta está lista</div>
      <div class="content">
        <p>Hola {$company_name},</p>
        <p>Gracias por registrarte. A continuación encontrarás tu código de acceso.</p>
        <span class="code">{$admin_code}</span>
        <p>Guárdalo en un lugar seguro. Si olvidas tu contraseña podrás acceder con este código.</p>
        <a class="btn" href="{$loginUrl}">Iniciar sesión</a>
        <div class="muted">Este correo se genera automáticamente. No respondas a este mensaje.</div>
      </div>
    </div>
    <div class="footer">© {$company_name}</div>
  </div>
</body>
</html>
HTML;
    $payload = [
        'from' => $from,
        'to' => [$to],
        'subject' => $subject,
        'html' => $html,
        'text' => $plain
    ];
    $status = null;
    $response = null;
    if (function_exists('curl_init')) {
        $ch = curl_init('https://api.resend.com/emails');
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Authorization: Bearer ' . $apiKey,
            'Content-Type: application/json'
        ]);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload, JSON_UNESCAPED_UNICODE));
        $response = curl_exec($ch);
        if ($response === false) {
            error_log('Error enviando correo Resend (cURL): ' . curl_error($ch));
            curl_close($ch);
            return false;
        }
        $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
    } else {
        $ctx = stream_context_create([
            'http' => [
                'method' => 'POST',
                'header' => "Authorization: Bearer {$apiKey}\r\nContent-Type: application/json\r\n",
                'content' => json_encode($payload, JSON_UNESCAPED_UNICODE),
                'ignore_errors' => true
            ]
        ]);
        $response = @file_get_contents('https://api.resend.com/emails', false, $ctx);
        if ($response === false) {
            error_log('Error enviando correo Resend (stream): fallo en file_get_contents');
            return false;
        }
        if (isset($http_response_header) && is_array($http_response_header)) {
            foreach ($http_response_header as $hdr) {
                if (preg_match('#^HTTP/\S+\s+(\d{3})#', $hdr, $m)) {
                    $status = (int)$m[1];
                    break;
                }
            }
        }
    }
    if ($status >= 400) {
        error_log('Resend respondió con código ' . $status . ' cuerpo: ' . $response);
        return false;
    }
    if ($status >= 200 && $status < 300) {
        error_log('Correo de bienvenida enviado a ' . $to . ' con código ' . $status);
    }
    return true;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método no permitido']);
    exit;
}

// Obtener datos JSON del cuerpo de la petición
$input = file_get_contents('php://input');
$data = json_decode($input, true);

if (!$data) {
    error_log("Error decodificando JSON: " . json_last_error_msg());
    echo json_encode(['success' => false, 'message' => 'Datos inválidos']);
    exit;
}

// Validar campos requeridos
if (empty($data['company_name']) || empty($data['email']) || empty($data['password'])) {
    echo json_encode(['success' => false, 'message' => 'Todos los campos son obligatorios']);
    exit;
}

$company_name = trim($data['company_name']);
$email = trim(strtolower($data['email']));
$password = $data['password'];

// Validaciones adicionales
if (strlen($company_name) < 2) {
    echo json_encode(['success' => false, 'message' => 'El nombre de la empresa debe tener al menos 2 caracteres']);
    exit;
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    echo json_encode(['success' => false, 'message' => 'Correo electrónico inválido']);
    exit;
}

if (strlen($password) < 8) {
    echo json_encode(['success' => false, 'message' => 'La contraseña debe tener al menos 8 caracteres']);
    exit;
}

try {
    // Verificar si el email ya existe
    $stmt = $conn->prepare("SELECT id FROM companies WHERE email = ?");
    if ($stmt === false) {
        throw new Exception('Error preparando consulta: ' . $conn->error);
    }
    
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows > 0) {
        $stmt->close();
        echo json_encode(['success' => false, 'message' => 'Este correo electrónico ya está registrado']);
        exit;
    }
    $stmt->close();
    
    // Generar un admin_code único
    do {
        $admin_code = strtoupper(substr($company_name, 0, 4)) . '-' . rand(1000, 9999);
        $check_stmt = $conn->prepare("SELECT id FROM companies WHERE admin_code = ?");
        if ($check_stmt === false) {
            throw new Exception('Error preparando consulta de admin_code: ' . $conn->error);
        }
        $check_stmt->bind_param("s", $admin_code);
        $check_stmt->execute();
        $check_result = $check_stmt->get_result();
        $exists = $check_result->num_rows > 0;
        $check_stmt->close();
    } while ($exists);
    
    // Encriptar contraseña
    $hashed_password = password_hash($password, PASSWORD_DEFAULT);
    
    // Permisos por defecto para PRUEBA GRATIS: sin Gastos, Inventario (Químicos), Calendario, Estadísticas ni Biblioteca, y sin Rutas
    $default_permissions = json_encode([
        'modules' => [
            'dashboard',
            'services',
            'clients',
            'techs',
            'quotes',
            'payment-notes',
            'settings',
            'feature_service_report',
            'feature_signature_link',
            'feature_payments',
            'feature_reschedule'
        ],
        'actions' => []
    ]);
    
    // Insertar nueva empresa
    $stmt = $conn->prepare("
        INSERT INTO companies (
            name, 
            email, 
            password, 
            password_hash,
            admin_code,
            module_access, 
            limit_chemicals,
            created_at
        ) VALUES (?, ?, ?, ?, ?, ?, 0, NOW())
    ");
    
    if ($stmt === false) {
        throw new Exception('Error preparando INSERT: ' . $conn->error);
    }
    
    $stmt->bind_param("ssssss", 
        $company_name, 
        $email, 
        $hashed_password,
        $hashed_password,
        $admin_code,
        $default_permissions
    );
    
    if ($stmt->execute()) {
        $company_id = $stmt->insert_id;
        
        error_log("Nueva empresa registrada: ID $company_id, Email: $email, Nombre: $company_name, Admin Code: $admin_code");
        $email_sent = send_welcome_email($email, $company_name, $admin_code);
        
        $trialPlan = 'trial';
        $limits = [
            'limit_services' => 5,
            'limit_clients' => 5,
            'limit_techs' => 1,
            'limit_quotes' => 5,
            'limit_payment_notes' => 5,
            'limit_library' => 0,
            'limit_chemicals' => 0
        ];
        $sqlUpdate = "UPDATE companies SET plan = ?, 
            limit_services = ?, 
            limit_clients = ?, 
            limit_techs = ?, 
            limit_quotes = ?, 
            limit_payment_notes = ?, 
            limit_library = ?,
            limit_chemicals = ?
            WHERE id = ?";
        $stmtUpd = $conn->prepare($sqlUpdate);
        if ($stmtUpd) {
            $stmtUpd->bind_param(
                "siiiiiiii",
                $trialPlan,
                $limits['limit_services'],
                $limits['limit_clients'],
                $limits['limit_techs'],
                $limits['limit_quotes'],
                $limits['limit_payment_notes'],
                $limits['limit_library'],
                $limits['limit_chemicals'],
                $company_id
            );
            $stmtUpd->execute();
            $stmtUpd->close();
        }
        
        // --- AUTO-LOGIN LOGIC ---
        // Fetch company data for auto-login
        $sql_company = "SELECT id, name, email, admin_code, brand_color, logo_url, theme, date_format, time_format, language, currency_code, currency_symbol, currency_decimals, report_footer_text, billing_prefix, billing_next_number, contact_phone, contact_email, contact_address, sanitary_license, module_access, limit_chemicals, plan, trial_used, created_at FROM companies WHERE id = ?";
        $stmt_company = $conn->prepare($sql_company);
        $stmt_company->bind_param("i", $company_id);
        $stmt_company->execute();
        $result_company = $stmt_company->get_result();
        $company_data = $result_company->fetch_assoc();
        $stmt_company->close();
        
        if ($company_data) {
            // Normalize data
            $company_data['module_access'] = json_decode($company_data['module_access'] ?: '{}', true);
            if (!is_array($company_data['module_access'])) {
                $company_data['module_access'] = ['modules' => [], 'actions' => []];
            }
            
            // Add defaults
            $company_data['brand_color'] = $company_data['brand_color'] ?: '#0af066ff';
            $company_data['theme'] = $company_data['theme'] ?: 'dark';
            $company_data['date_format'] = $company_data['date_format'] ?: 'DD/MM/YYYY';
            $company_data['time_format'] = $company_data['time_format'] ?: '24h';
            $company_data['language'] = $company_data['language'] ?: 'es';
            $company_data['currency_code'] = $company_data['currency_code'] ?: 'MXN';
            $company_data['currency_symbol'] = $company_data['currency_symbol'] ?: '$';
            $company_data['currency_decimals'] = $company_data['currency_decimals'] ?: 2;
            
            $user_object = array_merge($company_data, [
                'type' => 'company',
                'companyId' => $company_id,
                'id' => $company_id,
                'isSuperAdmin' => ($company_data['admin_code'] === 'GEMAR_ADMIN')
            ]);
        } else {
            $user_object = null;
        }
        // ------------------------

        echo json_encode([
            'success' => true, 
            'message' => 'Cuenta creada exitosamente. Tu código de acceso es: ' . $admin_code,
            'company_id' => $company_id,
            'admin_code' => $admin_code,
            'email_sent' => isset($email_sent) ? (bool)$email_sent : false,
            'user' => $user_object
        ]);
    } else {
        throw new Exception('Error ejecutando INSERT: ' . $stmt->error);
    }
    
    $stmt->close();
    
} catch (Exception $e) {
    error_log("Error en registro de usuario: " . $e->getMessage());
    
    // Verificar si es error de duplicado
    if (strpos($e->getMessage(), 'Duplicate entry') !== false || strpos($e->getMessage(), '1062') !== false) {
        echo json_encode(['success' => false, 'message' => 'Este correo electrónico o código ya está registrado']);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Error interno del servidor: ' . $e->getMessage()]);
    }
}

if (isset($conn)) {
    $conn->close();
}
?>
