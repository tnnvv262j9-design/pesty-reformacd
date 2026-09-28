<?php
include 'db_connect.php';

$data = json_decode(file_get_contents("php://input"), true); // Usar true para array asociativo

if (!isset($data['name'], $data['admin_code'], $data['module_access'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Datos incompletos.']);
    exit();
}

$name = $data['name'];
$admin_code = $data['admin_code'];
$plan = isset($data['plan']) ? $data['plan'] : 'basic';
// La estructura de module_access ahora es un objeto/array asociativo
$module_access_json = json_encode($data['module_access']);

// Verificar si el admin_code ya existe
$stmt_check = $conn->prepare("SELECT id FROM companies WHERE admin_code = ?");
$stmt_check->bind_param("s", $admin_code);
$stmt_check->execute();
$stmt_check->store_result();
if ($stmt_check->num_rows > 0) {
    http_response_code(409); // Conflict
    echo json_encode(['success' => false, 'message' => 'El código de acceso ya está en uso. Por favor, elija otro.']);
    $stmt_check->close();
    exit();
}
$stmt_check->close();

$stmt = $conn->prepare("INSERT INTO companies (name, admin_code, module_access, plan, limit_chemicals) VALUES (?, ?, ?, ?, 999999)");
$stmt->bind_param("ssss", $name, $admin_code, $module_access_json, $plan);

if ($stmt->execute()) {
    echo json_encode(['success' => true, 'message' => 'Empresa creada exitosamente.']);
} else {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error al crear la empresa: ' . $stmt->error]);
}

$stmt->close();
$conn->close();
exit();