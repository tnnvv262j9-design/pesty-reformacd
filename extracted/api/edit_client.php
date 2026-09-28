<?php
include 'db_connect.php';
require_once 'encryption_service.php';
require_once 'audit_log_helper.php';

$data = json_decode(file_get_contents("php://input"));
$encryption = new EncryptionService();

if (!isset($data->id)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'ID de cliente no proporcionado.']);
    exit();
}

$id = $data->id;
$full_name = $data->full_name;
$phone = $data->phone ?? '';
$address = !empty($data->address) ? $encryption->encrypt($data->address) : '';
$notes = !empty($data->notes) ? $encryption->encrypt($data->notes) : '';
$zone = $data->zone ?? '';
$frequency = $data->frequency ?? '';
$type = $data->type ?? '';
$access_code = $data->access_code ?? null;

if ($access_code) {
    $stmt = $conn->prepare("UPDATE clients SET full_name = ?, phone = ?, address = ?, notes = ?, zone = ?, frequency = ?, type = ?, access_code = ? WHERE id = ?");
    $stmt->bind_param("ssssssssi", $full_name, $phone, $address, $notes, $zone, $frequency, $type, $access_code, $id);
} else {
    $stmt = $conn->prepare("UPDATE clients SET full_name = ?, phone = ?, address = ?, notes = ?, zone = ?, frequency = ?, type = ? WHERE id = ?");
    $stmt->bind_param("sssssssi", $full_name, $phone, $address, $notes, $zone, $frequency, $type, $id);
}

if ($stmt->execute()) {
    if ($stmt->affected_rows > 0) {
        $company_id = $data->company_id ?? null;
        $requesting_user_id = $data->requesting_user_id ?? null;
        if ($company_id) {
            log_audit_event($conn, $company_id, $requesting_user_id, 'clientes', 'update', 'client', $id, "Se actualizó al cliente: $full_name");
        }
        echo json_encode(['success' => true, 'message' => 'Cliente actualizado.']);
    } else {
        echo json_encode(['success' => false, 'message' => 'No se encontró el cliente o los datos eran los mismos.']);
    }
} else {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error al actualizar: ' . $stmt->error]);
}

$stmt->close();
$conn->close();
?>