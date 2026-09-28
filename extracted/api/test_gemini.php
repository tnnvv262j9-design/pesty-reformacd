<?php
header('Content-Type: text/plain');

$apiKey = 'AIzaSyBIL1w_3wR8GL3jYyxB5nemin08OH7B8FE'; 
$model = 'gemini-1.5-flash'; 

$url = "https://generativelanguage.googleapis.com/v1beta/models?key=$apiKey";

$ch = curl_init($url);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
// GET request for listing models
curl_setopt($ch, CURLOPT_HTTPGET, true);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false); 

$response = curl_exec($ch);

if ($response === false) {
    echo "CURL Error: " . curl_error($ch);
} else {
    echo "Response: " . $response;
}
curl_close($ch);
?>