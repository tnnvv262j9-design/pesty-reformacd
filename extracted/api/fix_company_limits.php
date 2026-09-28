
<?php
/**
 * Script to manually update a company's plan and limits
 * Usage: Access via browser with ?company_id=XXX&plan=pesty (or pesty_core or enterprise)
 */

include 'db_connect.php';

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

if (!isset($_GET['company_id']) || !isset($_GET['plan'])) {
    echo "Usage: fix_company_limits.php?company_id=XXX&plan=pesty (or pesty_core or enterprise)";
    exit();
}

$company_id = intval($_GET['company_id']);
$plan_code = $_GET['plan'];

if (!isset($plan_limits[$plan_code])) {
    echo "Invalid plan code. Use pesty, pesty_core or enterprise.";
    exit();
}

$limits = $plan_limits[$plan_code];
$module_access = json_encode(['modules' => $limits['modules'], 'actions' => []]);
$expiry_date = date('Y-m-d H:i:s', strtotime('+1 month'));
$subscription_status = 'active';

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
    $module_access,
    $expiry_date,
    $subscription_status,
    $company_id
);

if ($stmt->execute()) {
    echo "Successfully updated company $company_id to $plan_code plan!";
} else {
    echo "Error updating company: " . $stmt->error;
}
$stmt->close();
$conn->close();

?>
