<?php
// api/get_portal_data.php

// Prevent any output before JSON
ob_start();

// Enable error logging but disable display to avoid breaking JSON
ini_set('display_errors', 0);
ini_set('log_errors', 1);
error_reporting(E_ALL);

header('Content-Type: application/json');

// Register shutdown function to catch fatal errors
register_shutdown_function(function() {
    $error = error_get_last();
    if ($error !== null && ($error['type'] & (E_ERROR | E_PARSE | E_CORE_ERROR | E_COMPILE_ERROR))) {
        ob_clean(); // Clear any partial output
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Error interno del servidor: ' . $error['message']]);
    }
});

try {
    if (!file_exists('db_connect.php')) {
        throw new Exception('Archivo de base de datos no encontrado');
    }
    include 'db_connect.php';

    // Polyfill for getallheaders
    if (!function_exists('getallheaders')) {
        function getallheaders() {
            $headers = [];
            foreach ($_SERVER as $name => $value) {
                if (substr($name, 0, 5) == 'HTTP_') {
                    $headers[str_replace(' ', '-', ucwords(strtolower(str_replace('_', ' ', substr($name, 5)))))] = $value;
                }
            }
            return $headers;
        }
    }

    // Get headers case-insensitive
    $headers = getallheaders();
    $headers = array_change_key_case($headers, CASE_LOWER);
    
    $authHeader = $headers['authorization'] ?? '';
    if (empty($authHeader)) {
        // Fallback for Apache/others where Authorization might be in $_SERVER directly
        if (isset($_SERVER['HTTP_AUTHORIZATION'])) {
            $authHeader = $_SERVER['HTTP_AUTHORIZATION'];
        } elseif (isset($_SERVER['Authorization'])) {
            $authHeader = $_SERVER['Authorization'];
        }
    }

    $token = str_replace('Bearer ', '', $authHeader);

    if (empty($token)) {
        // Fallback: Check GET parameter
        if (isset($_GET['token'])) {
            $token = $_GET['token'];
        } else {
            throw new Exception('Token no proporcionado');
        }
    }

    $decoded = json_decode(base64_decode($token), true);
    if (!$decoded || !isset($decoded['client_id'])) {
        throw new Exception('Token inválido o expirado');
    }

    $client_id = $decoded['client_id'];
    $company_id = $decoded['company_id'] ?? null;

    if (!$company_id) {
        // Fallback: Find company_id from client if not in token
        $stmt = $conn->prepare("SELECT company_id FROM clients WHERE id = ?");
        $stmt->bind_param("i", $client_id);
        $stmt->execute();
        $res = $stmt->get_result();
        if ($row = $res->fetch_assoc()) {
            $company_id = $row['company_id'];
        } else {
            throw new Exception('Cliente no encontrado');
        }
        $stmt->close();
    }

    // Get Company Info
    // Note: 'phone' might be named 'contact_phone' in some DB versions, checking both or using 'contact_phone' if standard
    // Based on previous files (get_initial_data.php), it seems 'contact_phone' and 'contact_email' are the column names
    $company_stmt = $conn->prepare("SELECT name, contact_phone as phone, contact_email as email, logo_url FROM companies WHERE id = ?");
    $company_stmt->bind_param("i", $company_id);
    $company_stmt->execute();
    $company = $company_stmt->get_result()->fetch_assoc();
    $company_stmt->close();

    if (!$company) {
        // Provide default empty company if not found to prevent JS errors
        $company = ['name' => 'Empresa', 'phone' => '', 'email' => '', 'logo_url' => ''];
    }

    // Get Services
    $services_stmt = $conn->prepare("SELECT id, service_date, service_time, service_type, status, price, notes, reinforcement_days, report_data, rating, rating_comment FROM services WHERE client_id = ? ORDER BY service_date DESC");
    $services_stmt->bind_param("i", $client_id);
    $services_stmt->execute();
    $services_result = $services_stmt->get_result();
    $services = [];
    while ($row = $services_result->fetch_assoc()) {
        $row['has_report'] = !empty($row['report_data']);
        unset($row['report_data']); // Remove binary blob
        $services[] = $row;
    }
    $services_stmt->close();

    // Get Quotes
    $quotes_stmt = $conn->prepare("SELECT id, issue_date, total, status FROM quotes WHERE client_id = ? ORDER BY issue_date DESC");
    $quotes_stmt->bind_param("i", $client_id);
    $quotes_stmt->execute();
    $quotes_result = $quotes_stmt->get_result();
    $quotes = [];
    while ($row = $quotes_result->fetch_assoc()) {
        $quotes[] = $row;
    }
    $quotes_stmt->close();

    // Clear buffer and send JSON
    ob_end_clean();
    echo json_encode([
        'success' => true,
        'company' => $company,
        'services' => $services,
        'quotes' => $quotes
    ]);

} catch (Exception $e) {
    ob_end_clean();
    http_response_code(200); // Send 200 OK but with success: false to handle it gracefully in frontend
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}

if (isset($conn)) {
    $conn->close();
}
?>