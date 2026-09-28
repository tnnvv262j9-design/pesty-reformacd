<?php
function send_email($to, $subject, $htmlContent, $textContent = '') {
    $apiKey = getenv('RESEND_API_KEY');
    $fromEmail = getenv('RESEND_FROM_EMAIL');
    $fromName = getenv('RESEND_FROM_NAME');
    
    // Fallback to config file
    if (!$apiKey || !$fromEmail) {
        $configPath = __DIR__ . DIRECTORY_SEPARATOR . 'resend_config.json';
        if (file_exists($configPath)) {
            $cfg = json_decode(file_get_contents($configPath), true);
            if (is_array($cfg)) {
                $apiKey = $apiKey ?: ($cfg['api_key'] ?? null);
                $fromEmail = $fromEmail ?: ($cfg['from_email'] ?? null);
                $fromName = $fromName ?: ($cfg['from_name'] ?? null);
            }
        }
    }

    if (!$apiKey || !$fromEmail) {
        error_log('Resend no configurado: falta RESEND_API_KEY o RESEND_FROM_EMAIL');
        return false;
    }

    $fromName = $fromName ?: 'Pesty Software';
    $from = $fromName . ' <' . $fromEmail . '>';

    $payload = [
        'from' => $from,
        'to' => [$to],
        'subject' => $subject,
        'html' => $htmlContent,
        'text' => $textContent
    ];

    $ch = curl_init('https://api.resend.com/emails');
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Authorization: Bearer ' . $apiKey,
        'Content-Type: application/json'
    ]);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode >= 200 && $httpCode < 300) {
        return true;
    } else {
        error_log("Error enviando email: " . $response);
        return false;
    }
}
?>