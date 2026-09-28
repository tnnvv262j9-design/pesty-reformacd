<?php
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');

$address = $_GET['address'] ?? '';

if (empty($address)) {
    echo json_encode([]);
    exit;
}

// Nominatim requiere un User-Agent válido
$userAgent = 'PestySoftware/1.0'; 

$url = "https://nominatim.openstreetmap.org/search?format=json&q=" . urlencode($address) . "&limit=1&countrycodes=mx";

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_USERAGENT, $userAgent);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);

$response = curl_exec($ch);

if (curl_errno($ch)) {
    // Si hay error de curl, devolvemos array vacío para no romper el frontend
    echo json_encode([]);
} else {
    echo $response;
}

curl_close($ch);
?>