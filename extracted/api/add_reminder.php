<?php
include 'db_connect.php';

$data = json_decode(file_get_contents("php://input"));

if (!isset($data->company_id, $data->date, $data->text)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Datos incompletos para crear el recordatorio.']);
    exit();
}

$company_id = $data->company_id;
$date = $data->date;
$text = $data->text;

$sql = "INSERT INTO reminders (company_id, date, text) VALUES (?, ?, ?)";
$stmt = $conn->prepare($sql);
$stmt->bind_param('iss', $company_id, $date, $text);

if ($stmt->execute()) {
    echo json_encode(['success' => true, 'message' => 'Recordatorio creado.', 'reminder_id' => $stmt->insert_id]);
} else {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error al crear el recordatorio: ' . $stmt->error]);
}
$stmt->close();
$conn->close();
?>