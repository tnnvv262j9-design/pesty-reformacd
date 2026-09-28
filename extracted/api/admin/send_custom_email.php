<?php
require_once '../db_connect.php';
require_once '../send_email_helper.php';
require_once 'check_admin_auth.php';

header('Content-Type: application/json');

// Obtener datos del cuerpo de la solicitud
$input = json_decode(file_get_contents('php://input'), true);

// Validación de sesión y permisos
$requester_id = $input['requesting_user_id'] ?? null;

// Verificar si es Super Admin
if (!validateSuperAdmin($conn, $requester_id)) {
    echo json_encode(['success' => false, 'message' => 'Acceso denegado. Se requieren permisos de Super Administrador.']);
    exit;
}

$subject = $input['subject'] ?? '';
$htmlContent = $input['html_content'] ?? '';
$recipients = $input['recipients'] ?? [];

// Validar datos obligatorios
if (empty($subject) || empty($htmlContent) || empty($recipients)) {
    echo json_encode(['success' => false, 'message' => 'Faltan datos obligatorios (asunto, mensaje o destinatarios).']);
    exit;
}

// Obtener lista de empresas destinatarias
$companies = [];

if (in_array('all', $recipients) || (is_string($recipients) && $recipients === 'all')) {
    // Obtener TODAS las empresas activas con email válido
    $sql = "SELECT id, name as company_name, contact_email FROM companies WHERE contact_email IS NOT NULL AND contact_email != ''";
    $stmt = $conn->prepare($sql);
    $stmt->execute();
    $result = $stmt->get_result();
    while ($row = $result->fetch_assoc()) {
        // Asignar contact_name como 'Usuario' por defecto si no existe la columna
        $row['contact_name'] = 'Usuario';
        $companies[] = $row;
    }
} else {
    // Si recipients es un array de IDs
    if (!is_array($recipients)) {
        $recipients = [$recipients]; // Convertir a array si es un solo valor
    }
    
    // Filtrar IDs para asegurar que sean enteros
    $ids = array_filter($recipients, 'is_numeric');
    
    if (empty($ids)) {
        echo json_encode(['success' => false, 'message' => 'No se seleccionaron destinatarios válidos.']);
        exit;
    }
    
    $placeholders = implode(',', array_fill(0, count($ids), '?'));
    $types = str_repeat('i', count($ids));
    
    // Usar email principal como fallback si contact_email está vacío
    $sql = "SELECT id, name as company_name, 
            CASE 
                WHEN contact_email IS NOT NULL AND contact_email != '' THEN contact_email 
                ELSE email 
            END as contact_email 
            FROM companies WHERE id IN ($placeholders)";
            
    $stmt = $conn->prepare($sql);
    $stmt->bind_param($types, ...$ids);
    $stmt->execute();
    $result = $stmt->get_result();
    while ($row = $result->fetch_assoc()) {
        // Asignar contact_name como 'Usuario' por defecto si no existe la columna
        $row['contact_name'] = 'Usuario';
        
        // Solo agregar si tenemos algún email válido
        if (!empty($row['contact_email'])) {
            $companies[] = $row;
        }
    }
}

if (empty($companies)) {
    echo json_encode(['success' => false, 'message' => 'No se encontraron empresas con correo electrónico válido para los criterios seleccionados.']);
    exit;
}

$sentCount = 0;
$failedCount = 0;
$details = [];

// Procesar envíos
foreach ($companies as $company) {
    // Reemplazo de variables personalizadas
    $personalizedHtml = str_replace('{{company_name}}', htmlspecialchars($company['company_name']), $htmlContent);
    $personalizedHtml = str_replace('{{contact_name}}', htmlspecialchars($company['contact_name']), $personalizedHtml);
    $personalizedHtml = str_replace('{{email}}', htmlspecialchars($company['contact_email']), $personalizedHtml);
    
    // Generar versión de texto plano (simple)
    $textContent = strip_tags($personalizedHtml);
    // Mejorar texto plano añadiendo saltos de línea
    $textContent = html_entity_decode($textContent);

    $result = false;
    $errorMessage = '';

    try {
        // Usar el helper existente para enviar correo vía Resend
        // send_email devuelve true o false
        $result = send_email($company['contact_email'], $subject, $personalizedHtml, $textContent);
    } catch (Exception $e) {
        $errorMessage = $e->getMessage();
    }
        
    if ($result === true) {
        $sentCount++;
        $details[] = [
            'id' => $company['id'],
            'company_name' => $company['company_name'],
            'email' => $company['contact_email'],
            'status' => 'sent',
            'message' => 'Enviado correctamente'
        ];
    } else {
        $failedCount++;
        $details[] = [
            'id' => $company['id'],
            'company_name' => $company['company_name'],
            'email' => $company['contact_email'],
            'status' => 'failed',
            'message' => 'Error al enviar: ' . ($errorMessage ?: 'Fallo desconocido en Resend')
        ];
    }
    
    // Pequeña pausa para no saturar si son muchos (opcional)
    if ($sentCount > 0 && $sentCount % 20 === 0) {
        usleep(500000); // 0.5 segundos cada 20 correos
    }
}

// CORRECCIÓN FINAL: Verificar si hay datos que enviar
// Si no hay detalles, significa que el loop no corrió
if (empty($details)) {
    echo json_encode([
        'success' => false,
        'message' => 'No se intentó enviar ningún correo. Verifique los destinatarios.',
        'sent_count' => 0,
        'failed_count' => 0,
        'details' => []
    ]);
    exit;
}

echo json_encode([
    'success' => true,
    'message' => "Proceso finalizado. Enviados: $sentCount, Fallidos: $failedCount",
    'sent_count' => $sentCount,
    'failed_count' => $failedCount,
    'details' => $details
]);
?>
