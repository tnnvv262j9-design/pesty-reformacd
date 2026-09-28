<?php
header('Content-Type: application/json');
include 'db_connect.php';
include 'ecartpay_config.php';

// Log file path
$logFile = __DIR__ . '/ecartpay_error_log.txt';

// Helper function to log messages
function logMessage($message, $level = 'INFO') {
    global $logFile;
    $timestamp = date('Y-m-d H:i:s');
    file_put_contents($logFile, "[$timestamp] [$level] $message\n", FILE_APPEND);
}

// Get request data
$data = json_decode(file_get_contents('php://input'), true);

if (!$data || !isset($data['company_id'], $data['plan'])) {
    logMessage('Datos incompletos en la solicitud', 'ERROR');
    echo json_encode(['success' => false, 'message' => 'Datos incompletos.']);
    exit;
}

$company_id = $conn->real_escape_string($data['company_id']);
$plan_code = $data['plan'];
$payer_email = isset($data['payer_email']) ? $conn->real_escape_string($data['payer_email']) : '';

// Validate plan code
if (!isset(PLAN_PRICES[$plan_code])) {
    logMessage("Plan no válido: $plan_code", 'ERROR');
    echo json_encode(['success' => false, 'message' => 'Plan no válido.']);
    exit;
}

// Save the desired plan in pending_plan (only activate after payment confirmation)
$stmt_set_pending = $conn->prepare("UPDATE companies SET pending_plan = ? WHERE id = ?");
$stmt_set_pending->bind_param("si", $plan_code, $company_id);
$stmt_set_pending->execute();
$stmt_set_pending->close();

// Get company name
$company_name = 'Empresa';
$company_query = $conn->query("SELECT name FROM companies WHERE id = '$company_id'");
if ($company_query && $company_query->num_rows > 0) {
    $company_name = $company_query->fetch_assoc()['name'];
}

// Step 1: Get Authorization Token from Ecart Pay
$authUrl = ECART_PAY_API_URL . '/api/authorizations/token';
$authCredentials = base64_encode(ECART_PAY_API_KEY . ':' . ECART_PAY_API_SECRET);

logMessage("Solicitando token de autorización a: $authUrl");

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $authUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, ''); // Empty body for token request
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Authorization: Basic ' . $authCredentials,
    'Accept: application/json',
    'Content-Length: 0'
]);

$authResponse = curl_exec($ch);
$authHttpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$authCurlError = curl_error($ch);
curl_close($ch);

logMessage("Respuesta token (HTTP $authHttpCode): $authResponse");
if ($authCurlError) {
    logMessage("Error cURL al solicitar token: $authCurlError", 'ERROR');
    echo json_encode(['success' => false, 'message' => 'Error al conectarse con Ecart Pay (token).']);
    exit;
}

$authData = json_decode($authResponse, true);
if (!$authData || !isset($authData['token'])) {
    logMessage("Error al obtener token: " . json_encode($authData), 'ERROR');
    echo json_encode(['success' => false, 'message' => 'Error al obtener token de autorización de Ecart Pay.']);
    exit;
}

$accessToken = $authData['token'];
logMessage("Token obtenido exitosamente");

// Step 2: Prepare Checkout payload
$planNames = [
    'pesty' => 'Plan Pesty',
    'pesty_core' => 'Plan Pesty Core',
    'enterprise' => 'Plan Empresarial'
];
$planName = isset($planNames[$plan_code]) ? $planNames[$plan_code] : 'Plan Pesty';
$planPrice = PLAN_PRICES[$plan_code] / 100; // Convert cents to pesos

$checkoutPayload = [
    'title' => $planName,
    'currency' => 'MXN',
    'amounts' => [$planPrice],
    'concept' => "Suscripción mensual para $company_name",
    'notify_url' => ECART_PAY_WEBHOOK_URL,
    'reference_id' => $company_id . '|' . $plan_code // Store company_id and plan_code here
];

logMessage("Creando Checkout con payload: " . json_encode($checkoutPayload));

// Step 3: Create Checkout in Ecart Pay
$checkoutUrl = ECART_PAY_API_URL . '/api/checkouts';
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $checkoutUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($checkoutPayload));
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Authorization: Bearer ' . $accessToken,
    'Content-Type: application/json',
    'Accept: application/json'
]);

$checkoutResponse = curl_exec($ch);
$checkoutHttpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$checkoutCurlError = curl_error($ch);
curl_close($ch);

logMessage("Respuesta Checkout (HTTP $checkoutHttpCode): $checkoutResponse");

if ($checkoutCurlError) {
    logMessage("Error cURL al crear Checkout: $checkoutCurlError", 'ERROR');
    echo json_encode(['success' => false, 'message' => 'Error al conectarse con Ecart Pay (checkout).']);
    exit;
}

$checkoutData = json_decode($checkoutResponse, true);

if ($checkoutHttpCode >= 200 && $checkoutHttpCode < 300 && isset($checkoutData['link'])) {
    logMessage("Checkout creado exitosamente, link: " . $checkoutData['link']);
    echo json_encode([
        'success' => true,
        'payment_link' => $checkoutData['link'], // For frontend compatibility
        'link' => $checkoutData['link'],
        'checkout_id' => isset($checkoutData['id']) ? $checkoutData['id'] : null
    ]);
} else {
    logMessage("Error al crear Checkout: " . json_encode($checkoutData), 'ERROR');
    echo json_encode([
        'success' => false,
        'message' => 'Error al crear el checkout en Ecart Pay.',
        'details' => $checkoutData,
        'http_code' => $checkoutHttpCode
    ]);
}

$conn->close();
?>
