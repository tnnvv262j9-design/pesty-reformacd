<?php
header('Content-Type: application/json');

$url = $_GET['url'] ?? '';

if (empty($url)) {
    echo json_encode(['success' => false, 'message' => 'URL requerida']);
    exit;
}

// Validar que sea un link de google maps
if (!preg_match('/google\.com|goo\.gl|maps\.app\.goo\.gl/', $url)) {
    echo json_encode(['success' => false, 'message' => 'Dominio no válido']);
    exit;
}

function get_final_url($url) {
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_HEADER, true);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_NOBODY, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 15);
    curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

    $response = curl_exec($ch);
    $final_url = curl_getinfo($ch, CURLINFO_EFFECTIVE_URL);
    curl_close($ch);
    
    return $final_url;
}

$final_url = get_final_url($url);

if ($final_url) {
    echo json_encode(['success' => true, 'final_url' => $final_url]);
} else {
    echo json_encode(['success' => false, 'message' => 'No se pudo resolver la URL']);
}
?>