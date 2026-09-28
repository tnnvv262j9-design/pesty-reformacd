<?php
header('Content-Type: application/json');
include 'db_connect.php';

$input = json_decode(file_get_contents('php://input'), true);
if (!$input) $input = $_POST;

if (!isset($input['company_id'], $input['epp_delivery_id'], $input['doc_type'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Faltan campos requeridos']);
    exit;
}

$company_id = intval($input['company_id']);
$epp_delivery_id = intval($input['epp_delivery_id']);
$doc_type = $conn->real_escape_string($input['doc_type']);
$file_data = isset($input['file']) ? $input['file'] : '';
$file_path = null;

if (!empty($file_data)) {
    $dir = '../uploads/epp/';
    if (!file_exists($dir)) mkdir($dir, 0755, true);
    $ext = 'bin';
    if (strpos($file_data, 'data:') === 0) {
        $header = substr($file_data, 0, strpos($file_data, ',') + 1);
        $base64 = substr($file_data, strpos($file_data, ',') + 1);
        if (strpos($header, 'application/pdf') !== false) $ext = 'pdf';
        else if (strpos($header, 'image/png') !== false) $ext = 'png';
        else if (strpos($header, 'image/jpeg') !== false) $ext = 'jpg';
        $content = base64_decode($base64);
    } else {
        $content = base64_decode($file_data);
    }
    $name = 'epp_doc_' . uniqid() . '.' . $ext;
    $path = $dir . $name;
    if (file_put_contents($path, $content)) {
        $file_path = 'uploads/epp/' . $name;
    }
}

if (!$file_path) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Archivo inválido']);
    exit;
}

$stmt = $conn->prepare("INSERT INTO epp_documents (company_id, epp_delivery_id, doc_type, file_path) VALUES (?, ?, ?, ?)");
if (!$stmt) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error preparando inserción']);
    exit;
}
$stmt->bind_param("iiss", $company_id, $epp_delivery_id, $doc_type, $file_path);
if ($stmt->execute()) {
    echo json_encode(['success' => true, 'id' => $stmt->insert_id, 'file_path' => $file_path]);
} else {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error al insertar']);
}
$stmt->close();
$conn->close();
?>
