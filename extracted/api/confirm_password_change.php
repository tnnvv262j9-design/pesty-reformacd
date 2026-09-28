<?php
header('Content-Type: application/json');
require_once 'db_connect.php';

$data = json_decode(file_get_contents("php://input"));

if (!isset($data->email, $data->code, $data->new_password)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Datos incompletos.']);
    exit();
}

$email = $data->email;
$code = $data->code;
$new_password = $data->new_password;

// Verificar código y expiración
$stmt = $conn->prepare("SELECT id FROM companies WHERE email = ? AND reset_token = ? AND reset_token_expiry > NOW()");
$stmt->bind_param("ss", $email, $code);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 0) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Código inválido o expirado.']);
    exit();
}

$user = $result->fetch_assoc();
$id = $user['id'];

// Actualizar contraseña y limpiar token
$hashed_password = password_hash($new_password, PASSWORD_DEFAULT);

$update_stmt = $conn->prepare("UPDATE companies SET password = ?, password_hash = ?, reset_token = NULL, reset_token_expiry = NULL WHERE id = ?");
$update_stmt->bind_param("ssi", $hashed_password, $hashed_password, $id);

if ($update_stmt->execute()) {
    echo json_encode(['success' => true, 'message' => 'Contraseña actualizada correctamente.']);
} else {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error al actualizar la contraseña.']);
}

$stmt->close();
$update_stmt->close();
$conn->close();
?>