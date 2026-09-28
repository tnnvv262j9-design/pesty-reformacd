<?php
header('Content-Type: application/json');
$config = require 'ai_config.php';

$apiKey = trim($config['api_key']);
$model = $config['model'];

if (!$apiKey || strpos($apiKey, 'sk-') !== 0) {
    echo json_encode(['success' => false, 'message' => 'API Key no configurada o inválida en ai_config.php']);
    exit;
}

$endpoints = [
    'https://api.moonshot.ai/v1',
    'https://api.moonshot.cn/v1'
];

$results = [];
$success = false;
$workingEndpoint = '';

foreach ($endpoints as $baseUrl) {
    $url = rtrim($baseUrl, '/') . "/chat/completions";
    
    $payload = [
        "model" => $model,
        "messages" => [
            ["role" => "user", "content" => "Hello"]
        ],
        "max_tokens" => 10
    ];

    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'Authorization: Bearer ' . $apiKey
    ]);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    // Disable SSL verify for testing if needed (not recommended for prod but helpful for debug)
    // curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false); 

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);

    if ($httpCode === 200) {
        $success = true;
        $workingEndpoint = $baseUrl;
        $results[$baseUrl] = "SUCCESS: " . substr($response, 0, 100) . "...";
        break; // Found working one
    } else {
        $results[$baseUrl] = "FAILED ($httpCode): " . ($curlError ?: $response);
    }
}

if ($success) {
    // Auto-update config if possible? Maybe dangerous. Just report.
    echo json_encode([
        'success' => true,
        'message' => 'Conexión exitosa con Kimi.',
        'working_endpoint' => $workingEndpoint,
        'details' => $results
    ]);
} else {
    echo json_encode([
        'success' => false,
        'message' => 'Falló la autenticación en ambos servidores.',
        'details' => $results,
        'tip' => 'Verifique que la API Key sea correcta y tenga saldo.'
    ]);
}
?>