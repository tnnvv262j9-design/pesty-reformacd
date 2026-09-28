<?php
include 'db_connect.php';

$data = json_decode(file_get_contents("php://input"), true); // Usar true para array asociativo

if (!isset($data['company_id'], $data['module_access']) || !is_array($data['module_access'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Datos de permisos incompletos o incorrectos.']);
    exit();
}

$company_id = $data['company_id'];
$module_access_json = json_encode($data['module_access']);

$stmt = $conn->prepare("UPDATE companies SET module_access = ? WHERE id = ?");
$stmt->bind_param("si", $module_access_json, $company_id);

if ($stmt->execute()) {
    echo json_encode(['success' => true, 'message' => 'Permisos actualizados.']);
} else {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error al actualizar permisos: ' . $stmt->error]);
}

$stmt->close();
$conn->close();
exit();