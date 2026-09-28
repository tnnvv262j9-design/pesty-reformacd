<?php
header('Content-Type: application/json');
require_once 'db_connect.php';
require_once 'encryption_service.php';

$encryption = new EncryptionService();

$company_id = $_GET['company_id'] ?? null;

if (!$company_id) {
    echo json_encode(['success' => false, 'message' => 'Falta company_id.']);
    exit;
}

$stmt = $conn->prepare("SELECT gc.*, c.full_name as client_name, s.service_date, ct.name as template_name 
                        FROM generated_certificates gc 
                        JOIN services s ON gc.service_id = s.id 
                        JOIN clients c ON s.client_id = c.id 
                        LEFT JOIN certificate_templates ct ON gc.template_id = ct.id 
                        WHERE gc.company_id = ? 
                        ORDER BY gc.created_at DESC");
$stmt->bind_param("i", $company_id);
$stmt->execute();
$result = $stmt->get_result();
$certificates = [];

while ($row = $result->fetch_assoc()) {
    // Desencriptar el nombre del cliente para mostrarlo en la lista
    $row['client_name'] = $encryption->decrypt($row['client_name']);
    $certificates[] = $row;
}

echo json_encode(['success' => true, 'certificates' => $certificates]);
?>
