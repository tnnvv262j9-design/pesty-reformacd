<?php
header('Content-Type: application/json');
include 'db_connect.php';
include 'audit_log_helper.php';

$data = json_decode(file_get_contents('php://input'), true);

if (!$data || !isset($data['company_id'])) {
    echo json_encode(['success' => false, 'message' => 'ID de empresa no proporcionado.']);
    exit;
}

$company_id = intval($data['company_id']);

// 1. Check if trial was already used
$query = "SELECT trial_used, name FROM companies WHERE id = $company_id";
$result = $conn->query($query);

if (!$result || $result->num_rows === 0) {
    echo json_encode(['success' => false, 'message' => 'Empresa no encontrada.']);
    exit;
}

$company = $result->fetch_assoc();

if ($company['trial_used'] == 1) {
    echo json_encode(['success' => false, 'message' => 'Ya has utilizado tu periodo de prueba gratuita anteriormente.']);
    exit;
}

// 2. Define Pesty Plan Limits
$limits = [
    'limit_services' => 60,
    'limit_clients' => 60,
    'limit_techs' => 5,
    'limit_quotes' => 60,
    'limit_payment_notes' => 60,
    'limit_library' => 0,
    'limit_chemicals' => 0,
    'modules' => ['dashboard', 'services', 'clients', 'techs', 'quotes', 'payment-notes', 'calendar', 'settings']
];

$module_access = json_encode(['modules' => $limits['modules'], 'actions' => []]);
$expiry_date = date('Y-m-d H:i:s', strtotime("+6 days"));

// 3. Update company
$sql = "UPDATE companies SET 
        plan = 'pesty',
        trial_used = 1,
        trial_reminder_sent = 0,
        subscription_expiry = '$expiry_date',
        subscription_status = 'trial_active',
        limit_services = {$limits['limit_services']},
        limit_clients = {$limits['limit_clients']},
        limit_techs = {$limits['limit_techs']},
        limit_quotes = {$limits['limit_quotes']},
        limit_payment_notes = {$limits['limit_payment_notes']},
        limit_library = {$limits['limit_library']},
        limit_chemicals = {$limits['limit_chemicals']},
        module_access = '$module_access'
        WHERE id = $company_id";

if ($conn->query($sql)) {
    // 4. Log in audit_log
    logAction($conn, $company_id, null, 'Suscripción', 'Activación de Prueba Gratis', 'companies', $company_id, "Se activó la prueba gratuita de 6 días para " . $company['name']);
    
    echo json_encode([
        'success' => true, 
        'message' => '¡Prueba gratuita de 6 días activada exitosamente!',
        'expiry' => $expiry_date
    ]);
} else {
    echo json_encode(['success' => false, 'message' => 'Error al activar la prueba: ' . $conn->error]);
}

$conn->close();
?>