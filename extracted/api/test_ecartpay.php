<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Ecart Pay Config
$publicKey = 'pub6a537b22c79817400b4035b6'; // Replace with your public key
$privateKey = 'priv6a537b22c79817400b4035b7'; // Replace with your private key
$baseUrl = 'https://sandbox.ecartpay.com';

// Step 1: Get Authorization Token
echo "<h2>Step 1: Getting Authorization Token...</h2>";
$authUrl = $baseUrl . '/api/authorizations/token';
$credentials = base64_encode($publicKey . ':' . $privateKey);

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $authUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, ''); // Empty body
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Authorization: Basic ' . $credentials,
    'Accept: application/json',
    'Content-Length: 0'
]);
curl_setopt($ch, CURLOPT_VERBOSE, true); // Enable verbose output
$verbose = fopen('php://temp', 'w+');
curl_setopt($ch, CURLOPT_STDERR, $verbose);

$authResponse = curl_exec($ch);
$authHttpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);

// Show verbose output
rewind($verbose);
$verboseLog = stream_get_contents($verbose);
echo "<h3>cURL Verbose Output:</h3><pre>" . htmlspecialchars($verboseLog) . "</pre>";

curl_close($ch);

echo "<h3>Token Response (HTTP $authHttpCode):</h3><pre>" . htmlspecialchars($authResponse) . "</pre>";

if ($curlError) {
    echo "<h3>cURL Error:</h3><pre>" . htmlspecialchars($curlError) . "</pre>";
    exit;
}

$authData = json_decode($authResponse, true);
if (!$authData || !isset($authData['token'])) {
    echo "<h3>Error: Failed to get token!</h3>";
    exit;
}

$token = $authData['token'];
echo "<h3>Token obtained successfully!</h3><p>Token: " . htmlspecialchars(substr($token, 0, 50)) . "...</p>";

// Step 2: Test Create Checkout
echo "<h2>Step 2: Creating Checkout...</h2>";
$checkoutUrl = $baseUrl . '/api/checkouts';
$checkoutPayload = [
    'title' => 'Plan Pesty',
    'currency' => 'MXN',
    'amounts' => [199],
    'concept' => 'Suscripción mensual',
    'notify_url' => 'https://yourdomain.com/api/ecartpay_webhook.php'
];

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $checkoutUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($checkoutPayload));
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Authorization: Bearer ' . $token,
    'Content-Type: application/json',
    'Accept: application/json'
]);

$checkoutResponse = curl_exec($ch);
$checkoutHttpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "<h3>Checkout Response (HTTP $checkoutHttpCode):</h3><pre>" . htmlspecialchars($checkoutResponse) . "</pre>";
?>
