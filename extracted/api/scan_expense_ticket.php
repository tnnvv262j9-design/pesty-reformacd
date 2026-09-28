<?php
header('Content-Type: application/json');

// --- CONFIGURACIÓN IA (Desde ai_config.php) ---
$config = require 'ai_config.php';
$apiKey = trim($config['api_key']);
$model = $config['model'];
$baseUrl = rtrim($config['base_url'], '/');
// ----------------------------

if (!$apiKey || strpos($apiKey, 'sk-') !== 0) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'La clave de IA no está configurada.'
    ]);
    exit;
}

if (!isset($_FILES['image']) || $_FILES['image']['error'] !== UPLOAD_ERR_OK) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'No se recibió ninguna imagen válida.'
    ]);
    exit;
}

$tmpPath = $_FILES['image']['tmp_name'];
$imageData = file_get_contents($tmpPath);

if ($imageData === false) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'No se pudo leer la imagen enviada.'
    ]);
    exit;
}

$mimeType = mime_content_type($tmpPath);
if (!$mimeType) {
    $mimeType = 'image/jpeg';
}

$base64Image = base64_encode($imageData);
$dataUri = "data:$mimeType;base64,$base64Image";

// Prompt para IA
$promptText = "Analiza esta imagen de un ticket de compra o factura. Extrae y devuelve SOLO un JSON válido con este formato: { \"date\": \"YYYY-MM-DD\", \"amount\": numero_decimal_del_total, \"description\": \"breve descripción de los items principales o el comercio\", \"category\": \"categoría sugerida (ej: Combustible, Alimentos, Materiales, Oficina, Mantenimiento, Servicios, Otros)\" }. La fecha debe ser formato ISO YYYY-MM-DD (si no tiene año asume el actual). El monto debe ser numérico puro. No uses bloques de código markdown, solo el JSON puro.";

// Payload para API IA
$url = $baseUrl . "/chat/completions";

$payload = [
    "model" => $model,
    "messages" => [
        [
            "role" => "user",
            "content" => [
                [
                    "type" => "text", 
                    "text" => $promptText
                ],
                [
                    "type" => "image_url",
                    "image_url" => [
                        "url" => $dataUri
                    ]
                ]
            ]
        ]
    ],
    "max_tokens" => 300,
    "response_format" => ["type" => "json_object"]
];

$ch = curl_init($url);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'Authorization: Bearer ' . $apiKey
]);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));

$response = curl_exec($ch);

if ($response === false) {
    $error = curl_error($ch);
    curl_close($ch);
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error al conectar con la API de IA: ' . $error
    ]);
    exit;
}

curl_close($ch);

$responseData = json_decode($response, true);

// Parsear respuesta de IA
try {
    if (isset($responseData['error'])) {
        throw new Exception("API Error: " . ($responseData['error']['message'] ?? 'Unknown error'));
    }

    if (isset($responseData['choices'][0]['message']['content'])) {
        $content = $responseData['choices'][0]['message']['content'];
        
        // Limpiar bloques markdown por si acaso
        $content = preg_replace('/^```json\s*|\s*```$/', '', trim($content));
        
        $jsonResult = json_decode($content, true);
        
        if (json_last_error() === JSON_ERROR_NONE && is_array($jsonResult)) {
            echo json_encode([
                'success' => true,
                'data' => [
                    'date' => $jsonResult['date'] ?? date('Y-m-d'),
                    'amount' => isset($jsonResult['amount']) ? floatval($jsonResult['amount']) : 0,
                    'description' => $jsonResult['description'] ?? '',
                    'category' => $jsonResult['category'] ?? 'Otros'
                ]
            ]);
        } else {
             throw new Exception('La respuesta de IA no fue un JSON válido: ' . $content);
        }
    } else {
        throw new Exception('Formato de respuesta de IA inesperado.');
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error procesando respuesta: ' . $e->getMessage()
    ]);
}
?>
