<?php
header('Content-Type: application/json');
include 'db_connect.php';
include 'ecartpay_config.php';

// Log file path
$logFile = __DIR__ . '/ecartpay_subscription_log.txt';

// Define plan limits
$plan_limits = [
    'pesty' => [
        'limit_services' => 60,
        'limit_clients' => 60,
        'limit_techs' => 5,
        'limit_quotes' => 60,
        'limit_payment_notes' => 60,
        'limit_library' => 0,
        'limit_chemicals' => 0,
        'modules' => ['dashboard', 'services', 'clients', 'techs', 'quotes', 'payment_notes', 'calendar', 'settings']
    ],
    'pesty_core' => [
        'limit_services' => 200,
        'limit_clients' => 200,
        'limit_techs' => 20,
        'limit_quotes' => 9999,
        'limit_payment_notes' => 9999,
        'limit_library' => 9999,
        'limit_chemicals' => 9999,
        'modules' => [
            'dashboard', 'services', 'clients', 'techs', 'quotes', 'payment_notes',
            'calendar', 'stats', 'expenses', 'chemicals', 'library', 'epp', 'settings',
            'feature_service_report', 'feature_signature_link', 'feature_payments',
            'feature_reschedule', 'routes'
        ]
    ],
    'enterprise' => [
        'limit_services' => 9999,
        'limit_clients' => 9999,
        'limit_techs' => 9999,
        'limit_quotes' => 9999,
        'limit_payment_notes' => 9999,
        'limit_library' => 9999,
        'limit_chemicals' => 9999,
        'modules' => [
            'dashboard', 'services', 'clients', 'techs', 'quotes', 'payment_notes',
            'calendar', 'stats', 'expenses', 'chemicals', 'library', 'epp', 'settings',
            'feature_service_report', 'feature_signature_link', 'feature_payments',
            'feature_reschedule', 'routes', 'feature_custom_reports'
        ]
    ]
];

function logMessage($message, $level = 'INFO') {
    global $logFile;
    $timestamp = date('Y-m-d H:i:s');
    file_put_contents($logFile, "[$timestamp] [$level] $message\n", FILE_APPEND);
}

// Get request data
$data = json_decode(file_get_contents('php://input'), true);

if (!isset($data['company_id'], $data['plan'], $data['name'], $data['email'], $data['phone'])) {
    logMessage('Datos incompletos en la solicitud', 'ERROR');
    echo json_encode(['success' => false, 'message' => 'Datos incompletos.']);
    exit();
}

$company_id = $conn->real_escape_string($data['company_id']);
$plan_code = $data['plan'];
$customer_name = $data['name'];
$customer_email = $data['email'];
$customer_phone = $data['phone'];

// Validate plan
if (!isset(PLAN_PRICES[$plan_code])) {
    logMessage("Plan inválido: $plan_code", 'ERROR');
    echo json_encode(['success' => false, 'message' => 'Plan no válido.']);
    exit();
}

// Save the desired plan in pending_plan (only activate after payment confirmation
$stmt_set_pending = $conn->prepare("UPDATE companies SET pending_plan = ? WHERE id = ?");
$stmt_set_pending->bind_param("si", $plan_code, $company_id);
$stmt_set_pending->execute();
$stmt_set_pending->close();

// Get plan price in pesos (not cents)
$plan_price = PLAN_PRICES[$plan_code] / 100;

logMessage("Iniciando suscripción para company_id=$company_id, plan=$plan_code");

// Step 1: Get authorization token
$authUrl = ECART_PAY_API_URL . '/api/authorizations/token';
$authCredentials = base64_encode(ECART_PAY_API_KEY . ':' . ECART_PAY_API_SECRET);

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $authUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, '');
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Authorization: Basic ' . $authCredentials,
    'Accept: application/json',
    'Content-Length: 0'
]);

$authResponse = curl_exec($ch);
$authHttpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$authCurlError = curl_error($ch);
curl_close($ch);

if ($authCurlError) {
    logMessage("Error cURL auth token: $authCurlError", 'ERROR');
    echo json_encode(['success' => false, 'message' => 'Error al conectar con Ecart Pay.']);
    exit();
}

$authData = json_decode($authResponse, true);
if (!$authData || !isset($authData['token'])) {
    logMessage("Error auth token response: $authResponse", 'ERROR');
    echo json_encode(['success' => false, 'message' => 'Error al obtener token de autorización.']);
    exit();
}

$accessToken = $authData['token'];
logMessage('Token de autorización obtenido');

// Step 2: Check if company already has an Ecart Pay customer
$existing_customer_id = null;
$stmt_check = $conn->prepare("SELECT ecartpay_customer_id FROM companies WHERE id = ?");
$stmt_check->bind_param("i", $company_id);
$stmt_check->execute();
$result_check = $stmt_check->get_result();
if ($result_check->num_rows > 0) {
    $row = $result_check->fetch_assoc();
    $existing_customer_id = $row['ecartpay_customer_id'];
}
$stmt_check->close();

// Step 3: Create customer if not exists
$customer_id = $existing_customer_id;
if (!$customer_id) {
    $customerUrl = ECART_PAY_API_URL . '/api/customers';
    $customerData = [
        'first_name' => explode(' ', $customer_name)[0],
        'last_name' => implode(' ', array_slice(explode(' ', $customer_name), 1)),
        'email' => $customer_email,
        'phone' => $customer_phone,
        'user_id' => $company_id
    ];

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $customerUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($customerData));
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Authorization: Bearer ' . $accessToken,
        'Content-Type: application/json',
        'Accept: application/json'
    ]);

    $customerResponse = curl_exec($ch);
    $customerHttpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $customerCurlError = curl_error($ch);
    curl_close($ch);

    if ($customerCurlError) {
        logMessage("Error cURL create customer: $customerCurlError", 'ERROR');
        echo json_encode(['success' => false, 'message' => 'Error al crear cliente en Ecart Pay.']);
        exit();
    }

    $customerResult = json_decode($customerResponse, true);
    if (!isset($customerResult['id'])) {
        logMessage("Error create customer response: $customerResponse", 'ERROR');
        echo json_encode(['success' => false, 'message' => 'Error al crear cliente en Ecart Pay.']);
        exit();
    }

    $customer_id = $customerResult['id'];
    // Update company with customer_id
    $stmt_update_customer = $conn->prepare("UPDATE companies SET ecartpay_customer_id = ? WHERE id = ?");
    $stmt_update_customer->bind_param("si", $customer_id, $company_id);
    $stmt_update_customer->execute();
    $stmt_update_customer->close();

    logMessage("Cliente Ecart Pay creado: $customer_id");
}

// Step 4: Create subscription (merchant managed to get checkout link)
$subscriptionUrl = ECART_PAY_API_URL . '/api/subscriptions';
$planNames = [
    'pesty' => 'Plan Pesty',
    'pesty_core' => 'Plan Pesty Core',
    'enterprise' => 'Plan Empresarial'
];
$planName = isset($planNames[$plan_code]) ? $planNames[$plan_code] : 'Plan Pesty';

// Get base URL for redirects (fix double slashes)
$protocol = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https://' : 'http://';
$host = $_SERVER['HTTP_HOST'];
$script_path = dirname(dirname($_SERVER['PHP_SELF']));
$base_url = $protocol . $host . rtrim($script_path, '/'); // Remove trailing slash
$success_url = $base_url . '/payment_success.php';

$subscriptionData = [
        'customer_id' => $customer_id,
        'amount' => $plan_price,
        'currency' => 'MXN',
        'interval' => 'monthly',
        'frequency' => 1,
        'service' => $planName,
        'trial_period_days' => 7,
        'merchant_management' => true,
        'notify_url' => ECART_PAY_WEBHOOK_URL,
        'redirect_url' => $success_url
    ];

logMessage("Creando suscripción con datos: " . json_encode($subscriptionData));

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $subscriptionUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($subscriptionData));
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Authorization: Bearer ' . $accessToken,
    'Content-Type: application/json',
    'Accept: application/json'
]);

$subscriptionResponse = curl_exec($ch);
$subscriptionHttpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$subscriptionCurlError = curl_error($ch);
curl_close($ch);

if ($subscriptionCurlError) {
    logMessage("Error cURL create subscription: $subscriptionCurlError", 'ERROR');
    echo json_encode(['success' => false, 'message' => 'Error al conectar con Ecart Pay para suscripción.']);
    exit();
}

$subscriptionResult = json_decode($subscriptionResponse, true);
logMessage("Subscription response (HTTP $subscriptionHttpCode): " . json_encode($subscriptionResult));

if ($subscriptionHttpCode >= 200 && $subscriptionHttpCode < 300 && (isset($subscriptionResult['checkout_link']) || isset($subscriptionResult['id']))) {
    $subscription_id = isset($subscriptionResult['id']) ? $subscriptionResult['id'] : null;
    $checkout_link = isset($subscriptionResult['checkout_link']) ? $subscriptionResult['checkout_link'] : null;

    // Update company with subscription_id
    if ($subscription_id) {
        $stmt_update_sub = $conn->prepare("UPDATE companies SET ecartpay_subscription_id = ? WHERE id = ?");
        $stmt_update_sub->bind_param("si", $subscription_id, $company_id);
        $stmt_update_sub->execute();
        $stmt_update_sub->close();
    }

    logMessage("Suscripción creada exitosamente, checkout link: " . ($checkout_link ?? 'N/A'));
    echo json_encode([
        'success' => true,
        'checkout_link' => $checkout_link,
        'subscription_id' => $subscription_id,
        'payment_link' => $checkout_link
    ]);
} else {
    logMessage("Error create subscription: " . json_encode($subscriptionResult), 'ERROR');
    echo json_encode([
        'success' => false,
        'message' => 'Error al crear suscripción en Ecart Pay.',
        'details' => $subscriptionResult
    ]);
}

$conn->close();
?>
