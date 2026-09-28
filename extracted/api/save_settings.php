<?php
// Asegurar que no hay output previo
while (ob_get_level()) {
    ob_end_clean();
}

include 'db_connect.php';
include 'audit_log_helper.php';

// Header ya establecido en db_connect.php

$data = json_decode(file_get_contents("php://input"));

// Validación de que el ID de la compañía está presente
if (!isset($data->company_id)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'ID de compañía no proporcionado.']);
    exit();
}

// Asignar valores recibidos con valores por defecto si no vienen
$company_id = $data->company_id;
$name = $data->name ?? '';
$contact_phone = $data->contact_phone ?? '';
$contact_email = $data->contact_email ?? '';
$contact_address = $data->contact_address ?? '';
$sanitary_license = $data->sanitary_license ?? '';
$brand_color = $data->brand_color ?? '#34D399';
$logo_url = $data->logo_url ?? '';
$theme = $data->theme ?? 'dark';
$date_format = $data->date_format ?? 'YYYY-MM-DD';
$time_format = $data->time_format ?? '24h';
$language = $data->language ?? 'es';
$currency_code = $data->currency_code ?? 'USD';
$currency_symbol = $data->currency_symbol ?? '$';
$currency_decimals = $data->currency_decimals ?? 2;
$report_footer_text = $data->report_footer_text ?? '';
$treatment_methods = isset($data->treatment_methods) ? json_encode($data->treatment_methods, JSON_UNESCAPED_UNICODE) : null;
$common_pests = isset($data->common_pests) ? json_encode($data->common_pests, JSON_UNESCAPED_UNICODE) : null;
$treated_areas = isset($data->treated_areas) ? json_encode($data->treated_areas, JSON_UNESCAPED_UNICODE) : null;

// Consulta SQL
$sql = "UPDATE companies SET 
            name = ?, 
            contact_phone = ?, 
            contact_email = ?, 
            contact_address = ?, 
            sanitary_license = ?,
            brand_color = ?, 
            logo_url = ?, 
            theme = ?, 
            date_format = ?, 
            time_format = ?, 
            language = ?, 
            currency_code = ?, 
            currency_symbol = ?, 
            currency_decimals = ?, 
            report_footer_text = ?,
            treatment_methods = ?,
            common_pests = ?,
            treated_areas = ?
        WHERE id = ?";

$stmt = $conn->prepare($sql);

if (!$stmt) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error preparando consulta: ' . $conn->error]);
    exit();
}

$stmt->bind_param("sssssssssssssissssi", 
    $name, 
    $contact_phone, 
    $contact_email, 
    $contact_address, 
    $sanitary_license,
    $brand_color, 
    $logo_url, 
    $theme, 
    $date_format, 
    $time_format, 
    $language, 
    $currency_code, 
    $currency_symbol, 
    $currency_decimals, 
    $report_footer_text,
    $treatment_methods,
    $common_pests,
    $treated_areas,
    $company_id
);

// Ejecutar y responder
if ($stmt->execute()) {
    $message = $stmt->affected_rows > 0 ? 'Configuración guardada correctamente.' : 'No se realizaron cambios nuevos.';
    if ($stmt->affected_rows > 0) {
        $description = 'Actualización de configuración general de la empresa';
        $userId = isset($data->user_id) ? intval($data->user_id) : null;
        log_audit_event($conn, intval($company_id), $userId, 'settings', 'update', 'company', intval($company_id), $description);
    }
    $response = [
        'success' => true,
        'message' => $message
    ];
} else {
    http_response_code(500);
    $response = ['success' => false, 'message' => 'Error al guardar: ' . $stmt->error];
}

$stmt->close();
$conn->close();

// Asegurar salida limpia
while (ob_get_level()) {
    ob_end_clean();
}

// Enviar respuesta JSON (header ya establecido en db_connect.php)
echo json_encode($response, JSON_UNESCAPED_UNICODE);
exit();
