<?php
ini_set('display_errors', 0);
header('Content-Type: application/json');
require_once '../db_connect.php';
require_once '../check_limits.php';
require_once 'check_admin_auth.php';

$requester_id = isset($_GET['requesting_user_id']) ? intval($_GET['requesting_user_id']) : (isset($_GET['requester_id']) ? intval($_GET['requester_id']) : 0);

if (!validateSuperAdmin($conn, $requester_id)) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Acceso denegado. Se requieren permisos de Super Administrador.']);
    exit();
}

$sql = "SELECT id, name, email, contact_phone, admin_code, plan
        FROM companies ORDER BY id DESC";

$result = $conn->query($sql);

$companies = [];
if ($result && $result->num_rows > 0) {
    while($row = $result->fetch_assoc()) {
        $id = $row['id'];

        $typesMap = [
            'service' => ['usage_key' => 'usage_services', 'limit_key' => 'limit_services'],
            'client' => ['usage_key' => 'usage_clients', 'limit_key' => 'limit_clients'],
            'technician' => ['usage_key' => 'usage_techs', 'limit_key' => 'limit_techs'],
            'quote' => ['usage_key' => 'usage_quotes', 'limit_key' => 'limit_quotes'],
            'payment_note' => ['usage_key' => 'usage_payment_notes', 'limit_key' => 'limit_payment_notes'],
            'document' => ['usage_key' => 'usage_library', 'limit_key' => 'limit_library'],
            'chemical' => ['usage_key' => 'usage_chemicals', 'limit_key' => 'limit_chemicals'],
        ];

        foreach ($typesMap as $type => $keys) {
            $limitInfo = checkLimit($conn, $id, $type);
            $row[$keys['usage_key']] = isset($limitInfo['current']) ? (int)$limitInfo['current'] : 0;
            $row[$keys['limit_key']] = isset($limitInfo['limit']) ? (int)$limitInfo['limit'] : 0;
        }

        $companies[] = $row;
    }
}

echo json_encode(['success' => true, 'companies' => $companies]);
$conn->close();
?>
