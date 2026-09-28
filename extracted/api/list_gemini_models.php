<?php
$apiKey = 'AIzaSyBIL1w_3wR8GL3jYyxB5nemin08OH7B8FE';
$url = "https://generativelanguage.googleapis.com/v1beta/models?key=$apiKey";

$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
$response = curl_exec($ch);
curl_close($ch);

$data = json_decode($response, true);

if (isset($data['models'])) {
    echo "Modelos disponibles:\n";
    foreach ($data['models'] as $model) {
        if (strpos($model['name'], 'gemini') !== false) {
            echo "- " . $model['name'] . "\n";
        }
    }
} else {
    echo "Error o respuesta inesperada:\n";
    print_r($data);
}
?>