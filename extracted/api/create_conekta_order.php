<?php
header('Content-Type: application/json');
include 'db_connect.php';
include 'conekta_config.php';

// Get request data
$data = json_decode(file_get_contents('php://input'), true);

if (!$data || !isset($data['company_id']) || !isset($data['plan'])) {
    echo json_encode(['success' => false, 'message' => 'Datos incompletos.']);
    exit;
}

$company_id = $conn->real_escape_string($data['company_id']);
$plan_code = $data['plan'];
$payer_email = isset($data['payer_email']) ? $conn->real_escape_string($data['payer_email']) : '';

// Plan details and their IDs in Conekta Dashboard
$plans = [
    'pesty' => [
        'name' => 'Suscripción PESTY',
        'price' => 19900,
        'plan_id' => 'PL-01', // Con 6 días de prueba
        'description' => 'Plan base con 6 días de prueba'
    ],
    'pesty_core' => [
        'name' => 'Suscripción PESTY CORE',
        'price' => 39900,
        'plan_id' => 'PL-02', // Cambiar por el ID real de tu dashboard
        'description' => 'Mayor capacidad y módulos ilimitados'
    ],
    'enterprise' => [
        'name' => 'Suscripción PLAN EMPRESARIAL',
        'price' => 69900,
        'plan_id' => 'PL-03', // Cambiar por el ID real de tu dashboard
        'description' => 'Ilimitado y con soporte prioritario'
    ]
];

if (!isset($plans[$plan_code]) && $plan_code !== 'extra_services') {
    echo json_encode(['success' => false, 'message' => 'Plan no válido.']);
    exit;
}

$selected_plan = isset($plans[$plan_code]) ? $plans[$plan_code] : null;

// Get company name
$company_query = $conn->query("SELECT name FROM companies WHERE id = '$company_id'");
$company_name = 'Empresa';
if ($company_query && $company_query->num_rows > 0) {
    $company_name = $company_query->fetch_assoc()['name'];
}

// Prepare Conekta Data
if ($selected_plan && isset($selected_plan['plan_id'])) {
    // FLOW: SUBSCRIPTION (For all 3 main plans)
    $endpoint = '/checkouts';
    $order_data = [
        'name' => $selected_plan['name'],
        'type' => 'PaymentLink', 
        'recurrent' => true,
        'payments_limit_count' => 36, // Ejemplo: 3 años de recurrencia
        'expires_at' => time() + (3 * 24 * 60 * 60), // Link expira en 3 días
        'allowed_payment_methods' => ['card'],
        'needs_shipping_contact' => false,
        'plan_id' => $selected_plan['plan_id'],
        'order_template' => [
            'currency' => 'MXN',
            'customer_info' => [
                'name' => $company_name,
                'email' => $payer_email ?: 'cliente@ejemplo.com',
                'phone' => '+525555555555'
            ],
            'line_items' => [
                [
                    'name' => $selected_plan['name'],
                    'unit_price' => $selected_plan['price'],
                    'quantity' => 1
                ]
            ],
            'metadata' => [
                'company_id' => $company_id,
                'plan_code' => $plan_code,
                'is_subscription' => 'true'
            ]
        ]
    ];
} else {
    echo json_encode(['success' => false, 'message' => 'Plan no válido para suscripción.']);
    exit;
}

// Call Conekta API
$url = CONEKTA_API_BASE . $endpoint;
$payload = json_encode($order_data, JSON_UNESCAPED_UNICODE);

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'POST');
curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Accept: application/vnd.conekta-v2.0.0+json',
    'Content-Type: application/json',
    'Authorization: Basic ' . base64_encode(CONEKTA_API_KEY . ':')
]);

$response = curl_exec($ch);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curl_error = curl_error($ch);
curl_close($ch);

$result = json_decode($response, true);

if ($http_code == 200 || $http_code == 201) {
    // Para suscripciones (/checkouts), la URL viene en el nivel raíz
    // Para órdenes (/orders), viene dentro de ['checkout']['url']
    $checkout_url = '';
    if (isset($result['url'])) {
        $checkout_url = $result['url'];
    } elseif (isset($result['checkout']['url'])) {
        $checkout_url = $result['checkout']['url'];
    }

    if ($checkout_url) {
        echo json_encode([
            'success' => true,
            'checkout_url' => $checkout_url
        ]);
    } else {
        echo json_encode([
            'success' => false,
            'message' => 'Error al generar el link de pago.',
            'debug' => $result
        ]);
    }
} else {
    // Log error details for debugging
    $log_entry = date('Y-m-d H:i:s') . " - Plan: $plan_code - Code: $http_code" . PHP_EOL;
    $log_entry .= "URL: $url" . PHP_EOL;
    $log_entry .= "Payload: $payload" . PHP_EOL;
    $log_entry .= "Response: $response" . PHP_EOL;
    if ($curl_error) $log_entry .= "Curl Error: $curl_error" . PHP_EOL;
    $log_entry .= "-----------------------------------" . PHP_EOL;
    file_put_contents('conekta_error_log.txt', $log_entry, FILE_APPEND);
    
    echo json_encode([
        'success' => false,
        'message' => 'Error en la API de Conekta.',
        'details' => isset($result['details']) ? $result['details'] : 'Error desconocido',
        'http_code' => $http_code
    ]);
}

$conn->close();
?>