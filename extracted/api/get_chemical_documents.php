<?php
header('Content-Type: application/json');
require_once 'db_connect.php';

if (!isset($_GET['chemical_id']) || !isset($_GET['type'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Faltan parámetros.']);
    exit;
}

$chemical_id = intval($_GET['chemical_id']);
$type = $_GET['type'];

$sql = "SELECT id, file_name, file_path, uploaded_at FROM chemical_documents WHERE chemical_id = ? AND type = ? ORDER BY uploaded_at DESC";
$stmt = $conn->prepare($sql);
$stmt->bind_param("is", $chemical_id, $type);
$stmt->execute();
$result = $stmt->get_result();

$documents = [];
while ($row = $result->fetch_assoc()) {
    $documents[] = $row;
}

echo json_encode(['success' => true, 'documents' => $documents]);

$stmt->close();
$conn->close();
?>