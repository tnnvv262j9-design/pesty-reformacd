<?php
error_log("=== ADD INVOICE START ===");

// Headers CORS
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

error_log("=== AFTER HEADERS ===");

// Verificar método de solicitud
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    error_log("Invalid request method: " . $_SERVER['REQUEST_METHOD']);
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método no permitido']);
    exit();
}

error_log("=== METHOD CHECK PASSED ===");

// Conexión a base de datos manual
$servername = "db5018491325.hosting-data.io";
$username = "dbu158091";
$password = "G3R0N!M0@L30S";
$dbname = "dbs14688645";

error_log("=== CONNECTING TO DB ===");

$conn = new mysqli($servername, $username, $password, $dbname);

if ($conn->connect_error) {
    error_log("Connection failed: " . $conn->connect_error);
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error de conexión: ' . $conn->connect_error]);
    exit();
}

$conn->set_charset("utf8mb4");
error_log("=== DB CONNECTED ===");

$input = file_get_contents("php://input");
error_log("Raw input: " . $input);

$data = json_decode($input);
error_log("Decoded data: " . print_r($data, true));

// Validación básica
if (!$data) {
    error_log("No data received or invalid JSON");
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Datos JSON inválidos']);
    exit();
}

// Verificar campos requeridos
if (!property_exists($data, 'company_id') || !property_exists($data, 'client_id') || 
    !property_exists($data, 'issue_date') || !property_exists($data, 'items') || 
    !property_exists($data, 'total')) {
    
    $missing = [];
    if (!property_exists($data, 'company_id')) $missing[] = 'company_id';
    if (!property_exists($data, 'client_id')) $missing[] = 'client_id';
    if (!property_exists($data, 'issue_date')) $missing[] = 'issue_date';
    if (!property_exists($data, 'items')) $missing[] = 'items';
    if (!property_exists($data, 'total')) $missing[] = 'total';
    
    error_log("Missing fields: " . implode(', ', $missing));
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Faltan campos: ' . implode(', ', $missing)]);
    exit();
}

error_log("=== VALIDATION PASSED ===");

// SQL completo con todos los campos de la base de datos
$sql = "INSERT INTO invoices (company_id, client_id, quote_id, issue_date, client_rfc, cfdi_use, tax_regime, payment_method, payment_form, issuer_rfc, expedition_place, currency, exchange_rate, items, subtotal, tax, total, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

error_log("=== PREPARING STATEMENT ===");
$stmt = $conn->prepare($sql);

if (!$stmt) {
    error_log("Failed to prepare statement: " . $conn->error);
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error en preparación: ' . $conn->error]);
    exit();
}

error_log("=== STATEMENT PREPARED ===");

// Preparar datos
$items_json = json_encode($data->items);
$quote_id = !empty($data->quote_id) ? intval($data->quote_id) : null;

// Valores por defecto para campos fiscales
$client_rfc = $data->client_rfc ?? '';
$cfdi_use = $data->cfdi_use ?? 'G03';
$tax_regime = $data->tax_regime ?? '601';
$payment_method = $data->payment_method ?? 'PUE';
$payment_form = $data->payment_form ?? '99';
$issuer_rfc = $data->issuer_rfc ?? '';
$expedition_place = $data->expedition_place ?? '';
$currency = $data->currency ?? 'MXN';
$exchange_rate = $data->exchange_rate ?? 1.0000;
$status = $data->status ?? 'pending';
$notes = $data->notes ?? '';

error_log("=== BINDING PARAMETERS ===");

$stmt->bind_param(
    'iiissssssssdsdddss',
    $data->company_id,
    $data->client_id,
    $quote_id,
    $data->issue_date,
    $client_rfc,
    $cfdi_use,
    $tax_regime,
    $payment_method,
    $payment_form,
    $issuer_rfc,
    $expedition_place,
    $currency,
    $exchange_rate,
    $items_json,
    $data->subtotal,
    $data->tax,
    $data->total,
    $status,
    $notes
);

error_log("=== EXECUTING STATEMENT ===");

if ($stmt->execute()) {
    error_log("=== SUCCESS - Invoice ID: " . $stmt->insert_id . " ===");
    echo json_encode(['success' => true, 'message' => 'Factura creada exitosamente.', 'invoice_id' => $stmt->insert_id]);
} else {
    error_log("Execute failed: " . $stmt->error);
    error_log("MySQL error: " . $conn->error);
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error al crear factura: ' . $stmt->error]);
}

$stmt->close();
$conn->close();
error_log("=== ADD INVOICE END ===");
?>