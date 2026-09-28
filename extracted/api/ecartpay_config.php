<?php
// Ecart Pay Configuration
define('ECART_PAY_API_KEY', getenv('ECART_PAY_API_KEY') ?: 'pub6a537acd1cca77ee850edea3');
define('ECART_PAY_API_SECRET', getenv('ECART_PAY_API_SECRET') ?: 'priv6a537acd1cca77ee850edea4');
// Ecart Pay Production Configuration
define('ECART_PAY_API_URL', getenv('ECART_PAY_API_URL') ?: 'https://ecartpay.com');
define('ECART_PAY_WEBHOOK_SECRET', getenv('ECART_PAY_WEBHOOK_SECRET') ?: 'hook_a46fea7b-83b5-4923-be35-fb682e91e2f7'); // This is for verifying signatures, not a URL
define('ECART_PAY_SUCCESS_URL', getenv('ECART_PAY_SUCCESS_URL') ?: (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? "https" : "http") . "://$_SERVER[HTTP_HOST]/payment_success.php");
define('ECART_PAY_FAILURE_URL', getenv('ECART_PAY_FAILURE_URL') ?: (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? "https" : "http") . "://$_SERVER[HTTP_HOST]/payment_failure.php");
define('ECART_PAY_WEBHOOK_URL', getenv('ECART_PAY_WEBHOOK_URL') ?: (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? "https" : "http") . "://$_SERVER[HTTP_HOST]/api/ecartpay_webhook.php");

// Plan prices in cents (MXN)
define('PLAN_PRICES', [
    'pesty' => 19900,
    'pesty_core' => 39900,
    'enterprise' => 69900
]);
?>