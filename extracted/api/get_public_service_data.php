<?php
// api/get_public_service_data.php
header('Content-Type: application/json');
include 'db_connect.php';
include 'service_security.php'; // Incluir la clase de seguridad

if (!isset($_GET['token'])) {
    echo json_encode(['success' => false, 'message' => 'Token de servicio requerido']);
    exit;
}

$token = $_GET['token'];
$service_id = ServiceSecurity::validateToken($token);

if (!$service_id) {
    echo json_encode(['success' => false, 'message' => 'Token inválido o expirado']);
    exit;
}

$sql = "SELECT s.id, s.service_date, s.service_time, s.service_type, s.report_data, 
        c.full_name as client_name, t.name as technician_name 
        FROM services s 
        LEFT JOIN clients c ON s.client_id = c.id 
        LEFT JOIN technicians t ON s.technician_id = t.id 
        WHERE s.id = ?";

$stmt = $conn->prepare($sql);
$stmt->bind_param('i', $service_id);
$stmt->execute();
$result = $stmt->get_result();

if ($row = $result->fetch_assoc()) {
    // Check if already signed
    $report_data = json_decode($row['report_data'] ?? '{}', true);
    $is_signed = !empty($report_data['clientSignature']);

    echo json_encode([
        'success' => true,
        'data' => [
            'id' => $row['id'], // Mantenemos el ID para uso interno del frontend si es necesario, pero el acceso ya fue validado
            'service_date' => $row['service_date'],
            'service_time' => $row['service_time'],
            'service_type' => $row['service_type'],
            'client_name' => $row['client_name'],
            'technician_name' => $row['technician_name'],
            'is_signed' => $is_signed
        ]
    ]);
} else {
    echo json_encode(['success' => false, 'message' => 'Servicio no encontrado']);
}

$stmt->close();
$conn->close();
?>