<?php
// api/generate_token.php
header('Content-Type: application/json');
include 'db_connect.php'; // Para sesión y permisos si fuera necesario
include 'service_security.php';

if (!isset($_GET['id'])) {
    echo json_encode(['success' => false, 'message' => 'ID requerido']);
    exit;
}

$id = intval($_GET['id']);
$token = ServiceSecurity::generateToken($id);

echo json_encode(['success' => true, 'token' => $token]);
?>