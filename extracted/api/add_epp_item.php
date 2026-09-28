<?php
header('Content-Type: application/json');
include 'db_connect.php';

$input = json_decode(file_get_contents('php://input'), true);
if (!$input) $input = $_POST;

$required = ['company_id','name','category'];
foreach ($required as $r) {
    if (!isset($input[$r]) || $input[$r] === '') {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => "Falta el campo $r"]);
        exit;
    }
}

$company_id = intval($input['company_id']);
$name = $conn->real_escape_string($input['name']);
$category = $conn->real_escape_string($input['category']);
$size = isset($input['size']) ? $conn->real_escape_string($input['size']) : null;
$cert = isset($input['certification']) ? $conn->real_escape_string($input['certification']) : null;
$supplier = isset($input['supplier']) ? $conn->real_escape_string($input['supplier']) : null;
$notes = isset($input['notes']) ? $conn->real_escape_string($input['notes']) : null;

$stmt = $conn->prepare("INSERT INTO epp_catalog (company_id,name,category,size,certification,supplier,notes) VALUES (?,?,?,?,?,?,?)");
if (!$stmt) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error preparando inserción']);
    exit;
}
$stmt->bind_param("issssss", $company_id, $name, $category, $size, $cert, $supplier, $notes);
if ($stmt->execute()) {
    echo json_encode(['success' => true, 'id' => $stmt->insert_id]);
} else {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error al insertar']);
}
$stmt->close();
$conn->close();
?>
