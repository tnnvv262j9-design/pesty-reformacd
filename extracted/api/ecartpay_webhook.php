<?php
// Ecart Pay Webhook Handler
include 'db_connect.php';
include 'ecartpay_config.php';

// Log file path
$logFile = __DIR__ . '/ecartpay_webhook_log.txt';

function logMessage($message, $level = 'INFO') {
    global $logFile;
    $timestamp = date('Y-m-d H:i:s');
    file_put_contents($logFile, "[$timestamp] [$level] $message\n", FILE_APPEND);
}

// Log full incoming request
$payload = file_get_contents('php://input');
logMessage("Webhook recibido: $payload");

// Handle GET for testing
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    echo "Ecart Pay Webhook Activo";
    exit;
}

// Parse payload
$data = json_decode($payload, true);

// Define plan limits
$plan_limits = [
    'pesty' => [
        'limit_services' => 60,
        'limit_clients' => 60,
        'limit_techs' => 5,
        'limit_quotes' => 60,
        'limit_payment_notes' => 60,
        'limit_library' => 0,
        'limit_chemicals' => 0,
        'modules' => ['dashboard', 'services', 'clients', 'techs', 'quotes', 'payment_notes', 'calendar', 'settings']
    ],
    'pesty_core' => [
        'limit_services' => 200,
        'limit_clients' => 200,
        'limit_techs' => 20,
        'limit_quotes' => 9999,
        'limit_payment_notes' => 9999,
        'limit_library' => 9999,
        'limit_chemicals' => 9999,
        'modules' => [
            'dashboard', 'services', 'clients', 'techs', 'quotes', 'payment_notes',
            'calendar', 'stats', 'expenses', 'chemicals', 'library', 'epp', 'settings',
            'feature_service_report', 'feature_signature_link', 'feature_payments',
            'feature_reschedule', 'routes'
        ]
    ],
    'enterprise' => [
        'limit_services' => 9999,
        'limit_clients' => 9999,
        'limit_techs' => 9999,
        'limit_quotes' => 9999,
        'limit_payment_notes' => 9999,
        'limit_library' => 9999,
        'limit_chemicals' => 9999,
        'modules' => [
            'dashboard', 'services', 'clients', 'techs', 'quotes', 'payment_notes',
            'calendar', 'stats', 'expenses', 'chemicals', 'library', 'epp', 'settings',
            'feature_service_report', 'feature_signature_link', 'feature_payments',
            'feature_reschedule', 'routes', 'feature_custom_reports'
        ]
    ]
];

// 1. Handle old checkout events (reference_id)
if (isset($data['reference_id'])) {
    $referenceParts = explode('|', $data['reference_id']);
    if (count($referenceParts) === 2) {
        $company_id = $conn->real_escape_string($referenceParts[0]);
        $plan_code = $referenceParts[1];

        if (isset($plan_limits[$plan_code])) {
            $limits = $plan_limits[$plan_code];
            $moduleAccess = json_encode(['modules' => $limits['modules'], 'actions' => []]);
            $expiryDate = date('Y-m-d H:i:s', strtotime('+1 month'));
            $subscriptionStatus = 'active';

            $stmt = $conn->prepare("UPDATE companies SET 
                plan = ?,
                limit_services = ?,
                limit_clients = ?,
                limit_techs = ?,
                limit_quotes = ?,
                limit_payment_notes = ?,
                limit_library = ?,
                limit_chemicals = ?,
                module_access = ?,
                subscription_expiry = ?,
                subscription_status = ?
                WHERE id = ?");
            
            $stmt->bind_param(
                "siiiiissssi",
                $plan_code,
                $limits['limit_services'],
                $limits['limit_clients'],
                $limits['limit_techs'],
                $limits['limit_quotes'],
                $limits['limit_payment_notes'],
                $limits['limit_library'],
                $limits['limit_chemicals'],
                $moduleAccess,
                $expiryDate,
                $subscriptionStatus,
                $company_id
            );

            if ($stmt->execute()) {
                logMessage("SUCCESS: Updated company $company_id to $plan_code via old checkout");
            } else {
                logMessage("ERROR: Failed to update company $company_id: " . $stmt->error);
            }
            $stmt->close();
        } else {
            logMessage("ERROR: Invalid plan code $plan_code");
        }
    } else {
        logMessage("ERROR: Invalid reference ID format");
    }
}

// 2. Handle subscription events (event field in payload)
if (isset($data['event'])) {
    $event_type = $data['event'];
    logMessage("Processing event: $event_type");
    
    // Handle subscription created
    if ($event_type === 'subscription.created') {
        if (isset($data['data']['customer_id'])) {
            $ecartpay_customer_id = $conn->real_escape_string($data['data']['customer_id']);
            $stmt_get_company = $conn->prepare("SELECT id, plan, pending_plan FROM companies WHERE ecartpay_customer_id = ?");
            $stmt_get_company->bind_param("s", $ecartpay_customer_id);
            $stmt_get_company->execute();
            $result_company = $stmt_get_company->get_result();
            
            if ($result_company->num_rows > 0) {
                $company = $result_company->fetch_assoc();
                $company_id = $company['id'];
                $current_plan = $company['plan'];
                $pending_plan = $company['pending_plan'];
                $plan_to_use = $pending_plan ?: $current_plan;
                
                $limits = $plan_limits[$plan_to_use] ?? $plan_limits['pesty'];
                $module_access = json_encode(['modules' => $limits['modules'], 'actions' => []]);
                $expiry_date = date('Y-m-d H:i:s', strtotime('+1 month'));
                $subscription_status = 'active';

                $stmt_update = $conn->prepare("UPDATE companies SET 
                    plan = ?,
                    limit_services = ?,
                    limit_clients = ?,
                    limit_techs = ?,
                    limit_quotes = ?,
                    limit_payment_notes = ?,
                    limit_library = ?,
                    limit_chemicals = ?,
                    module_access = ?,
                    subscription_expiry = ?,
                    subscription_status = ?,
                    pending_plan = NULL
                    WHERE id = ?");
                
                $stmt_update->bind_param(
                    "siiiiissssi",
                    $plan_to_use,
                    $limits['limit_services'],
                    $limits['limit_clients'],
                    $limits['limit_techs'],
                    $limits['limit_quotes'],
                    $limits['limit_payment_notes'],
                    $limits['limit_library'],
                    $limits['limit_chemicals'],
                    $module_access,
                    $expiry_date,
                    $subscription_status,
                    $company_id
                );

                if ($stmt_update->execute()) {
                    logMessage("SUCCESS: Updated company $company_id subscription on created event to plan $plan_to_use");
                } else {
                    logMessage("ERROR: Failed to update company $company_id: " . $stmt_update->error);
                }
                $stmt_update->close();
            } else {
                logMessage("ERROR: No company found for customer_id $ecartpay_customer_id");
            }
            $stmt_get_company->close();
        }
    }
    
    // Handle subscription payment success
    if ($event_type === 'subscription.payment_success') {
        if (isset($data['data']['customer_id'])) {
            $ecartpay_customer_id = $conn->real_escape_string($data['data']['customer_id']);
            $stmt_get_company = $conn->prepare("SELECT id, plan, pending_plan FROM companies WHERE ecartpay_customer_id = ?");
            $stmt_get_company->bind_param("s", $ecartpay_customer_id);
            $stmt_get_company->execute();
            $result_company = $stmt_get_company->get_result();
            
            if ($result_company->num_rows > 0) {
                $company = $result_company->fetch_assoc();
                $company_id = $company['id'];
                $current_plan = $company['plan'];
                $pending_plan = $company['pending_plan'];
                $plan_to_use = $pending_plan ?: $current_plan;
                
                $limits = $plan_limits[$plan_to_use] ?? $plan_limits['pesty'];
                $module_access = json_encode(['modules' => $limits['modules'], 'actions' => []]);
                $expiry_date = date('Y-m-d H:i:s', strtotime('+1 month'));
                $subscription_status = 'active';

                $stmt_update = $conn->prepare("UPDATE companies SET 
                    plan = ?,
                    limit_services = ?,
                    limit_clients = ?,
                    limit_techs = ?,
                    limit_quotes = ?,
                    limit_payment_notes = ?,
                    limit_library = ?,
                    limit_chemicals = ?,
                    module_access = ?,
                    subscription_expiry = ?,
                    subscription_status = ?,
                    pending_plan = NULL
                    WHERE id = ?");
                
                $stmt_update->bind_param(
                    "siiiiissssi",
                    $plan_to_use,
                    $limits['limit_services'],
                    $limits['limit_clients'],
                    $limits['limit_techs'],
                    $limits['limit_quotes'],
                    $limits['limit_payment_notes'],
                    $limits['limit_library'],
                    $limits['limit_chemicals'],
                    $module_access,
                    $expiry_date,
                    $subscription_status,
                    $company_id
                );

                if ($stmt_update->execute()) {
                    logMessage("SUCCESS: Updated company $company_id subscription to active with plan $plan_to_use");
                } else {
                    logMessage("ERROR: Failed to update company $company_id: " . $stmt_update->error);
                }
                $stmt_update->close();
            } else {
                logMessage("ERROR: No company found for customer_id $ecartpay_customer_id");
            }
            $stmt_get_company->close();
        }
    }

    // Handle subscription failed/cancelled
    if (in_array($event_type, ['subscription.payment_failed', 'subscription.cancelled', 'subscription.paused'])) {
        if (isset($data['data']['customer_id'])) {
            $ecartpay_customer_id = $conn->real_escape_string($data['data']['customer_id']);
            $stmt_get_company = $conn->prepare("SELECT id FROM companies WHERE ecartpay_customer_id = ?");
            $stmt_get_company->bind_param("s", $ecartpay_customer_id);
            $stmt_get_company->execute();
            $result_company = $stmt_get_company->get_result();
            
            if ($result_company->num_rows > 0) {
                $company = $result_company->fetch_assoc();
                $company_id = $company['id'];
                
                $stmt_cancel = $conn->prepare("UPDATE companies SET subscription_status = 'cancelled' WHERE id = ?");
                $stmt_cancel->bind_param("i", $company_id);
                $stmt_cancel->execute();
                $stmt_cancel->close();
                logMessage("SUCCESS: Updated company $company_id subscription status to cancelled");
            }
            $stmt_get_company->close();
        }
    }

    // Handle orders confirmation (checkout payment success)
    if ($event_type === 'orders.confirmation') {
        logMessage("Processing orders.confirmation event");
        // If there's a reference_id in the order data, use that
        if (isset($data['data']['reference_id'])) {
            $referenceParts = explode('|', $data['data']['reference_id']);
            if (count($referenceParts) === 2) {
                $company_id = $conn->real_escape_string($referenceParts[0]);
                $plan_code = $referenceParts[1];

                if (isset($plan_limits[$plan_code])) {
                    $limits = $plan_limits[$plan_code];
                    $moduleAccess = json_encode(['modules' => $limits['modules'], 'actions' => []]);
                    $expiryDate = date('Y-m-d H:i:s', strtotime('+1 month'));
                    $subscriptionStatus = 'active';

                    $stmt = $conn->prepare("UPDATE companies SET 
                        plan = ?,
                        limit_services = ?,
                        limit_clients = ?,
                        limit_techs = ?,
                        limit_quotes = ?,
                        limit_payment_notes = ?,
                        limit_library = ?,
                        limit_chemicals = ?,
                        module_access = ?,
                        subscription_expiry = ?,
                        subscription_status = ?,
                        pending_plan = NULL
                        WHERE id = ?");
                    
                    $stmt->bind_param(
                        "siiiiissssi",
                        $plan_code,
                        $limits['limit_services'],
                        $limits['limit_clients'],
                        $limits['limit_techs'],
                        $limits['limit_quotes'],
                        $limits['limit_payment_notes'],
                        $limits['limit_library'],
                        $limits['limit_chemicals'],
                        $moduleAccess,
                        $expiryDate,
                        $subscriptionStatus,
                        $company_id
                    );

                    if ($stmt->execute()) {
                        logMessage("SUCCESS: Updated company $company_id to $plan_code via orders.confirmation");
                    } else {
                        logMessage("ERROR: Failed to update company $company_id: " . $stmt->error);
                    }
                    $stmt->close();
                }
            }
        } else {
            // If no reference_id, check for customer_id and use pending_plan
            if (isset($data['data']['customer_id'])) {
                $ecartpay_customer_id = $conn->real_escape_string($data['data']['customer_id']);
                $stmt_get_company = $conn->prepare("SELECT id, plan, pending_plan FROM companies WHERE ecartpay_customer_id = ?");
                $stmt_get_company->bind_param("s", $ecartpay_customer_id);
                $stmt_get_company->execute();
                $result_company = $stmt_get_company->get_result();
                
                if ($result_company->num_rows > 0) {
                    $company = $result_company->fetch_assoc();
                    $company_id = $company['id'];
                    $current_plan = $company['plan'];
                    $pending_plan = $company['pending_plan'];
                    $plan_to_use = $pending_plan ?: $current_plan;
                    
                    $limits = $plan_limits[$plan_to_use] ?? $plan_limits['pesty'];
                    $module_access = json_encode(['modules' => $limits['modules'], 'actions' => []]);
                    $expiry_date = date('Y-m-d H:i:s', strtotime('+1 month'));
                    $subscription_status = 'active';

                    $stmt_update = $conn->prepare("UPDATE companies SET 
                        plan = ?,
                        limit_services = ?,
                        limit_clients = ?,
                        limit_techs = ?,
                        limit_quotes = ?,
                        limit_payment_notes = ?,
                        limit_library = ?,
                        limit_chemicals = ?,
                        module_access = ?,
                        subscription_expiry = ?,
                        subscription_status = ?,
                        pending_plan = NULL
                        WHERE id = ?");
                    
                    $stmt_update->bind_param(
                        "siiiiissssi",
                        $plan_to_use,
                        $limits['limit_services'],
                        $limits['limit_clients'],
                        $limits['limit_techs'],
                        $limits['limit_quotes'],
                        $limits['limit_payment_notes'],
                        $limits['limit_library'],
                        $limits['limit_chemicals'],
                        $module_access,
                        $expiry_date,
                        $subscription_status,
                        $company_id
                    );

                    if ($stmt_update->execute()) {
                        logMessage("SUCCESS: Updated company $company_id via orders.confirmation with plan $plan_to_use");
                    } else {
                        logMessage("ERROR: Failed to update company $company_id: " . $stmt_update->error);
                    }
                    $stmt_update->close();
                }
                $stmt_get_company->close();
            }
        }
    }
}

// Always return 200 OK
http_response_code(200);
echo json_encode(['status' => 'ok']);
$conn->close();
?>
