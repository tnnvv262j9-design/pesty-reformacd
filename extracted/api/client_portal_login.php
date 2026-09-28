<?php
// api/client_portal_login.php
header('Content-Type: application/json');
include 'db_connect.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'message' => 'Método no permitido']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
$access_code = $input['access_code'] ?? '';

if (empty($access_code)) {
    echo json_encode(['success' => false, 'message' => 'Código de acceso requerido']);
    exit;
}

// Buscar cliente por código de acceso
$stmt = $conn->prepare("SELECT id, company_id, full_name FROM clients WHERE access_code = ?");
$stmt->bind_param("s", $access_code);
$stmt->execute();
$result = $stmt->get_result();

if ($client = $result->fetch_assoc()) {
    // Generar un token de sesión simple (en producción usar JWT o sesiones PHP seguras)
    $token = base64_encode(json_encode([
        'client_id' => $client['id'],
        'company_id' => $client['company_id'],
        'created_at' => time()
    ]));

    echo json_encode([
        'success' => true,
        'token' => $token,
        'client_name' => $client['full_name']
    ]);
} else {
    echo json_encode(['success' => false, 'message' => 'Código de acceso inválido']);
}

$stmt->close();
$conn->close();
?>